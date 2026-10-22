#include <Arduino.h>
#include <driver/i2s_std.h>
#include <arduinoFFT.h>
#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

char calibTopic[64];

// ---- WiFi + MQTT ----
const char* WIFI_SSID = "S10_4G";                     // <-- UPDATE: your hotspot SSID (exact)
const char* WIFI_PASS = "CandS2003";              // <-- UPDATE: your hotspot password
const char* MQTT_HOST = "192.168.1.136";           // <-- UPDATE: laptop's IP from ipconfig
const int   MQTT_PORT = 1883;

// Unique per device:
#define ZONE_ID       "zone_a"                 // <-- "zone_b" on the second device
#define TOPIC_PREFIX  "campus/zones/"

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

char publishTopic[64];
char statusTopic[64];

// --- OPERATION MODE ---
const bool PLOTTER_MODE = false;
const int  UPDATE_INTERVAL_MS = 250;

// --- ROOM ADAPTIVE CALIBRATION SETTINGS ---
const int  CALIBRATION_TIME_MS = 10000;
bool       is_calibrating = true;
unsigned long calibration_start_time = 0;

double calib_sum_rms     = 0;
double calib_sum_rms_sq  = 0;
int    calib_window_count = 0;

float  calib_peak_samples[64];
int    calib_peak_count = 0;

double dynamic_ambient_rms_threshold      = 0;
double dynamic_disruptive_peak_threshold  = 0;

// --- HARDWARE PINS (ESP32-C3) ---
#define I2S_PORT      I2S_NUM_0
#define I2S_SCK_PIN   0
#define I2S_WS_PIN    1
#define I2S_SD_PIN    3
#define RGB_PIN       8

// --- AUDIO CONFIG ---
#define SAMPLE_RATE   16000
#define BUFFER_LEN    512

// --- MFCC CONFIG ---
#define NUM_MEL_FILTERS   26
#define NUM_MFCC_COEFS    13
#define LOW_FREQ_HZ       20.0f
#define HIGH_FREQ_HZ      ((float)SAMPLE_RATE / 2.0f)
#define NUM_BINS          (BUFFER_LEN / 2)

int32_t raw_samples[BUFFER_LEN];
float   vReal[BUFFER_LEN];
float   vImag[BUFFER_LEN];

ArduinoFFT<float> FFT = ArduinoFFT<float>(vReal, vImag, BUFFER_LEN, SAMPLE_RATE, true);
Adafruit_NeoPixel rgb_led(1, RGB_PIN, NEO_GRB + NEO_KHZ800);

i2s_chan_handle_t rx_handle;

// ---- MFCC state ----
float  mel_filterbank[NUM_MEL_FILTERS][NUM_BINS];
float  dct_matrix[NUM_MFCC_COEFS][NUM_MEL_FILTERS];
float  mfcc[NUM_MFCC_COEFS];
double mfcc_sum[NUM_MFCC_COEFS];
double mfcc_avg[NUM_MFCC_COEFS];

unsigned long last_update = 0;
double sum_rms      = 0;
double max_peak     = 0;
int    sum_zcr      = 0;
double sum_centroid = 0;
int    reading_count = 0;

// ---- Timing instrumentation (accumulated per output window) ----
uint32_t sum_i2s_us  = 0;      // time in i2s_channel_read()
uint32_t sum_proc_us = 0;      // time in feature extraction (RMS→MFCC)

// ---------------------------------------------------------------
//  Mel / MFCC helpers
// ---------------------------------------------------------------
float hzToMel(float hz) { return 2595.0f * log10f(1.0f + hz / 700.0f); }
float melToHz(float mel) { return 700.0f * (powf(10.0f, mel / 2595.0f) - 1.0f); }

void initMFCC() {
  float melLow  = hzToMel(LOW_FREQ_HZ);
  float melHigh = hzToMel(HIGH_FREQ_HZ);
  float melStep = (melHigh - melLow) / (NUM_MEL_FILTERS + 1);

  for (int m = 0; m < NUM_MEL_FILTERS; m++) {
    float leftMel   = melLow  + m       * melStep;
    float centerMel = melLow  + (m + 1) * melStep;
    float rightMel  = melLow  + (m + 2) * melStep;

    float leftBin   = melToHz(leftMel)   * BUFFER_LEN / SAMPLE_RATE;
    float centerBin = melToHz(centerMel) * BUFFER_LEN / SAMPLE_RATE;
    float rightBin  = melToHz(rightMel)  * BUFFER_LEN / SAMPLE_RATE;

    for (int k = 0; k < NUM_BINS; k++) {
      float w = 0.0f;
      if (k >= leftBin && k <= centerBin && centerBin > leftBin) {
        w = (k - leftBin) / (centerBin - leftBin);
      } else if (k > centerBin && k <= rightBin && rightBin > centerBin) {
        w = (rightBin - k) / (rightBin - centerBin);
      }
      mel_filterbank[m][k] = w;
    }
  }

  for (int c = 0; c < NUM_MFCC_COEFS; c++) {
    for (int m = 0; m < NUM_MEL_FILTERS; m++) {
      dct_matrix[c][m] = cosf(PI * c * (m + 0.5f) / NUM_MEL_FILTERS);
    }
  }
}

void computeMFCC(const float* spectrum) {
  float melEnergies[NUM_MEL_FILTERS];
  for (int m = 0; m < NUM_MEL_FILTERS; m++) {
    float e = 0.0f;
    for (int k = 0; k < NUM_BINS; k++) {
      e += spectrum[k] * mel_filterbank[m][k];
    }
    melEnergies[m] = logf(e + 1e-10f);
  }
  for (int c = 0; c < NUM_MFCC_COEFS; c++) {
    float s = 0.0f;
    for (int m = 0; m < NUM_MEL_FILTERS; m++) {
      s += melEnergies[m] * dct_matrix[c][m];
    }
    mfcc[c] = s;
  }
}

// ---------------------------------------------------------------
//  MQTT publish — one JSON payload per 250 ms window
//  Now includes timing instrumentation fields
// ---------------------------------------------------------------
void publishWindow(double avg_rms, double max_peak, double avg_zcr,
                   double avg_centroid, const double* mfcc_avg_in,
                   uint32_t avg_i2s_us, uint32_t avg_proc_us) {

  StaticJsonDocument<640> doc;      // slightly larger to fit timing fields
  doc["zone_id"]   = ZONE_ID;
  doc["ts_ms"]     = millis();
  doc["rms"]       = round(avg_rms      * 100.0) / 100.0;
  doc["peak"]      = round(max_peak     * 100.0) / 100.0;
  doc["zcr"]       = round(avg_zcr      * 100.0) / 100.0;
  doc["centroid"]  = round(avg_centroid * 100.0) / 100.0;

  // --- Timing instrumentation ---
  doc["t_i2s_us"]  = avg_i2s_us;    // average I2S read time per iteration
  doc["t_proc_us"] = avg_proc_us;   // average feature extraction time

  JsonArray mf = doc.createNestedArray("mfcc");
  for (int c = 0; c < NUM_MFCC_COEFS; c++) {
    mf.add(round(mfcc_avg_in[c] * 100.0) / 100.0);
  }

  char payload[640];
  size_t n = serializeJson(doc, payload, sizeof(payload));

  if (mqtt.connected()) {
    bool ok = mqtt.publish(publishTopic, payload, n);
    if (!ok) Serial.printf("[MQTT] publish failed (len %u)\n", (unsigned)n);
  }
}

// ---------------------------------------------------------------
//  I2S setup
// ---------------------------------------------------------------
void setupI2S() {
  i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_PORT, I2S_ROLE_MASTER);
  chan_cfg.auto_clear = true;
  ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, NULL, &rx_handle));

  i2s_std_config_t std_cfg = {
    .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(SAMPLE_RATE),
    .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(
                    I2S_DATA_BIT_WIDTH_32BIT,
                    I2S_SLOT_MODE_MONO),
    .gpio_cfg = {
      .mclk = I2S_GPIO_UNUSED,
      .bclk = (gpio_num_t)I2S_SCK_PIN,
      .ws   = (gpio_num_t)I2S_WS_PIN,
      .dout = I2S_GPIO_UNUSED,
      .din  = (gpio_num_t)I2S_SD_PIN,
      .invert_flags = { .mclk_inv = false, .bclk_inv = false, .ws_inv = false },
    },
  };
  std_cfg.slot_cfg.slot_mask = I2S_STD_SLOT_LEFT;

  ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx_handle, &std_cfg));
  ESP_ERROR_CHECK(i2s_channel_enable(rx_handle));
}

// ---------------------------------------------------------------
//  WiFi + MQTT helpers
// ---------------------------------------------------------------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] connected. IP = %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] FAILED — will retry in loop()");
  }
}

void connectMQTT() {
  if (mqtt.connected()) return;
  Serial.printf("[MQTT] connecting to %s:%d ... ", MQTT_HOST, MQTT_PORT);

  const char* willMsg = "{\"status\":\"offline\"}";
  bool ok = mqtt.connect(
      ZONE_ID,
      NULL, NULL,
      statusTopic,
      1,
      true,
      willMsg);

  if (ok) {
    Serial.println("connected.");
    mqtt.publish(statusTopic, "{\"status\":\"online\"}", true);
  } else {
    Serial.printf("failed (rc=%d). Retrying soon.\n", mqtt.state());
  }
}

// ---------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  delay(1000);
  Serial.printf("[BOOT] Reset reason: %d\n", (int)esp_reset_reason());

  rgb_led.begin();
  rgb_led.setBrightness(30);
  rgb_led.clear();
  rgb_led.show();

  delay(2000);
  initMFCC();
  setupI2S();

  // ---- WiFi + MQTT init ----
  snprintf(publishTopic, sizeof(publishTopic),
           "%s%s/acoustic", TOPIC_PREFIX, ZONE_ID);
  snprintf(statusTopic, sizeof(statusTopic),
           "%s%s/status", TOPIC_PREFIX, ZONE_ID);
  snprintf(calibTopic, sizeof(calibTopic),
           "%s%s/calibration", TOPIC_PREFIX, ZONE_ID);

  connectWiFi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(640);      // must match doc size (increase from 512)
  connectMQTT();

  Serial.printf("[MQTT] will publish to: %s\n", publishTopic);
  Serial.printf("[MQTT] calibration topic: %s\n", calibTopic);

  if (!PLOTTER_MODE) {
    Serial.print("RMS,Peak,ZCR,Centroid");
    for (int i = 0; i < NUM_MFCC_COEFS; i++) Serial.printf(",MFCC%d", i + 1);
    Serial.println();
  }
}

// ---------------------------------------------------------------
void loop() {
  // ---- Keep WiFi + MQTT alive ----
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected())             connectMQTT();
  mqtt.loop();

  // ---- TIMING: start of I2S read ----
  uint32_t t_start = micros();

  size_t bytes_read = 0;
  esp_err_t result = i2s_channel_read(rx_handle,
                                      raw_samples,
                                      sizeof(raw_samples),
                                      &bytes_read,
                                      portMAX_DELAY);

  // ---- TIMING: end of I2S read ----
  uint32_t t_read = micros();

  if (result != ESP_OK || bytes_read != sizeof(raw_samples)) return;

  int samples_read = bytes_read / sizeof(int32_t);

  int64_t sum = 0;
  for (int i = 0; i < samples_read; i++) sum += (raw_samples[i] >> 8);
  int32_t mean = sum / samples_read;

  int64_t sum_squares = 0;
  int32_t peak = 0;
  int     zcr_count = 0;
  int32_t previous_sample = (raw_samples[0] >> 8) - mean;

  for (int i = 0; i < samples_read; i++) {
    int32_t s = (raw_samples[i] >> 8) - mean;
    sum_squares += ((int64_t)s * s);
    if (labs(s) > peak) peak = labs(s);
    if ((s >= 0 && previous_sample < 0) || (s < 0 && previous_sample >= 0)) zcr_count++;
    previous_sample = s;

    vReal[i] = (float)s;
    vImag[i] = 0.0f;
  }

  float rms         = sqrtf((float)sum_squares / samples_read) / 100.0f;
  float peak_scaled = (float)peak / 100.0f;

  FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward);
  FFT.compute(FFTDirection::Forward);
  FFT.complexToMagnitude();

  float sum_mag = 0.0f, sum_freq_mag = 0.0f;
  for (int i = 1; i < NUM_BINS; i++) {
    float freq = (i * 1.0f * SAMPLE_RATE) / BUFFER_LEN;
    sum_mag      += vReal[i];
    sum_freq_mag += (freq * vReal[i]);
  }
  float spectral_centroid = (sum_mag > 0.0f) ? (sum_freq_mag / sum_mag) : 0.0f;

  computeMFCC(vReal);

  // ---- TIMING: end of feature extraction (RMS → MFCC) ----
  uint32_t t_after_features = micros();

  // Accumulate timing for this iteration
  sum_i2s_us  += (t_read - t_start);
  sum_proc_us += (t_after_features - t_read);

  // Aggregate features across frames within the window
  sum_rms += rms;
  if (peak_scaled > max_peak) max_peak = peak_scaled;
  sum_zcr += zcr_count;
  sum_centroid += spectral_centroid;
  for (int c = 0; c < NUM_MFCC_COEFS; c++) mfcc_sum[c] += mfcc[c];
  reading_count++;

  // ---- Output window ----
  if (millis() - last_update >= UPDATE_INTERVAL_MS) {
    double avg_rms      = sum_rms / reading_count;
    double avg_zcr      = (double)sum_zcr / reading_count;
    double avg_centroid = sum_centroid / reading_count;
    double scaled_centroid = avg_centroid / 100.0;
    for (int c = 0; c < NUM_MFCC_COEFS; c++) mfcc_avg[c] = mfcc_sum[c] / reading_count;

    // Average timing values for the window
    uint32_t avg_i2s_us  = sum_i2s_us  / reading_count;
    uint32_t avg_proc_us = sum_proc_us / reading_count;

    // Learning phase - calibration
    if (is_calibrating) {
      if (calibration_start_time == 0) calibration_start_time = millis();

      if ((millis() / 250) % 2 == 0)
        rgb_led.setPixelColor(0, rgb_led.Color(150, 100, 0));
      else
        rgb_led.clear();
      rgb_led.show();

      calib_sum_rms     += avg_rms;
      calib_sum_rms_sq  += avg_rms * avg_rms;

      if (calib_peak_count < 64) {
        calib_peak_samples[calib_peak_count++] = (float)max_peak;
      }

      calib_window_count++;

      if (millis() - calibration_start_time >= CALIBRATION_TIME_MS) {
        is_calibrating = false;

        // ---------- RMS threshold: mean + 2σ ----------
        double baseline_rms      = calib_sum_rms / calib_window_count;
        double baseline_rms_var  = (calib_sum_rms_sq / calib_window_count)
                                   - (baseline_rms * baseline_rms);
        double baseline_rms_std  = sqrt(fmax(baseline_rms_var, 0.0));

        dynamic_ambient_rms_threshold = baseline_rms + 2.0 * baseline_rms_std;
        if (dynamic_ambient_rms_threshold < 2.0)
          dynamic_ambient_rms_threshold = 2.0;

        // ---------- Peak threshold: percentile-based ----------
        for (int i = 0; i < calib_peak_count - 1; i++) {
          for (int j = i + 1; j < calib_peak_count; j++) {
            if (calib_peak_samples[i] > calib_peak_samples[j]) {
              float t = calib_peak_samples[i];
              calib_peak_samples[i] = calib_peak_samples[j];
              calib_peak_samples[j] = t;
            }
          }
        }

        float baseline_peak = calib_peak_samples[calib_peak_count / 2];
        float p90_peak      = calib_peak_samples[(calib_peak_count * 9) / 10];

        dynamic_disruptive_peak_threshold = p90_peak * 1.5;

        if (dynamic_disruptive_peak_threshold < 350.0)
          dynamic_disruptive_peak_threshold = 350.0;
        if (dynamic_disruptive_peak_threshold > 70000.0)
          dynamic_disruptive_peak_threshold = 70000.0;

        Serial.printf("\n--- CALIBRATION COMPLETE ---\n");
        Serial.printf("RMS  : mean=%.2f sigma=%.2f -> AMBER threshold=%.2f\n",
                      baseline_rms, baseline_rms_std, dynamic_ambient_rms_threshold);
        Serial.printf("Peak : median=%.2f P90=%.2f -> RED   threshold=%.2f\n",
                      baseline_peak, p90_peak, dynamic_disruptive_peak_threshold);

        // ---------- Publish calibration statistics to MQTT (retained) ----------
        StaticJsonDocument<256> calDoc;
        calDoc["zone_id"]        = ZONE_ID;
        calDoc["ts_ms"]          = millis();
        calDoc["baseline_rms"]   = round(baseline_rms        * 100.0) / 100.0;
        calDoc["rms_std"]        = round(baseline_rms_std    * 100.0) / 100.0;
        calDoc["baseline_peak"]  = round(baseline_peak       * 100.0) / 100.0;
        calDoc["p90_peak"]       = round(p90_peak            * 100.0) / 100.0;
        calDoc["ambient_thr"]    = round(dynamic_ambient_rms_threshold     * 100.0) / 100.0;
        calDoc["disruptive_thr"] = round(dynamic_disruptive_peak_threshold * 100.0) / 100.0;

        char calPayload[256];
        size_t cn = serializeJson(calDoc, calPayload, sizeof(calPayload));
        if (mqtt.connected()) {
          mqtt.publish(calibTopic, (const uint8_t*)calPayload, cn, true);
          Serial.printf("[MQTT] calibration published to %s\n", calibTopic);
        }

        rgb_led.setPixelColor(0, rgb_led.Color(255, 255, 255));
        rgb_led.show();
        delay(500);
      }
    } else {
      if (PLOTTER_MODE) {
        Serial.printf("RMS:%.2f Peak:%.2f ZCR:%.2f Centroid:%.2f",
                      avg_rms, max_peak, avg_zcr, scaled_centroid);
        for (int c = 0; c < NUM_MFCC_COEFS; c++) Serial.printf(" M%d:%.2f", c + 1, mfcc_avg[c]);
        Serial.printf("  t_i2s=%uus t_proc=%uus\n", avg_i2s_us, avg_proc_us);
      } else {
        Serial.printf("%.2f,%.2f,%.2f,%.2f", avg_rms, max_peak, avg_zcr, avg_centroid);
        for (int c = 0; c < NUM_MFCC_COEFS; c++) Serial.printf(",%.4f", mfcc_avg[c]);
        Serial.println();
      }

      // LED classification
      if (max_peak > dynamic_disruptive_peak_threshold) {
        rgb_led.setPixelColor(0, rgb_led.Color(255, 0, 0));
      } else if (avg_rms > dynamic_ambient_rms_threshold) {
        rgb_led.setPixelColor(0, rgb_led.Color(255, 200, 0));
      } else {
        rgb_led.setPixelColor(0, rgb_led.Color(0, 255, 0));
      }
      rgb_led.show();

      // ---- Publish to MQTT (with timing) ----
      publishWindow(avg_rms, max_peak, avg_zcr, avg_centroid, mfcc_avg,
                    avg_i2s_us, avg_proc_us);
    }

    // Reset accumulators
    sum_rms = 0; max_peak = 0; sum_zcr = 0; sum_centroid = 0;
    for (int c = 0; c < NUM_MFCC_COEFS; c++) mfcc_sum[c] = 0;
    reading_count = 0;
    sum_i2s_us  = 0;
    sum_proc_us = 0;
    last_update = millis();
  }
}