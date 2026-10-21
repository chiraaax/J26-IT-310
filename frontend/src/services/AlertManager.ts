import { Audio } from 'expo-av';
import { Alert } from 'react-native';

class AlertManager {
  private sound: Audio.Sound | null = null;
  private lastAlertTime: number = 0;
  // Prevent spamming the alarm: Only ring once every 60 seconds per critical event
  private ALERT_COOLDOWN_MS = 60000; 

  async playAlertSound() {
    try {
      // Unloads any previous sound from memory
      if (this.sound) {
        await this.sound.unloadAsync();
      }
      
      // Load a crisp system notification sound
      // (Using a default iOS/Android notification chime approach)
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alert-chime.mp3') // We will add this file next
      );
      this.sound = sound;
      
      await this.sound.playAsync();
    } catch (error) {
      console.error("Failed to play alert sound:", error);
    }
  }

  // The main function the UI will call to evaluate data
  evaluateMicroClimate(telemetry: any) {
    if (!telemetry) return;

    const now = Date.now();
    
    // Check for Critical Drowsiness Triggers (e.g., High CO2)
    if (telemetry.co2_ppm > 1000 || telemetry.status === 'High Drowsiness Risk') {
      
      // Only alert if the cooldown period has passed
      if (now - this.lastAlertTime > this.ALERT_COOLDOWN_MS) {
        this.lastAlertTime = now;
        
        this.playAlertSound();
        Alert.alert(
          "⚠️ Micro-Climate Warning",
          `High risk of student drowsiness detected.\nCO₂ Levels: ${telemetry.co2_ppm} ppm.\n\nPlease activate HVAC cooling immediately to improve air quality.`,
          [{ text: "Take Action", style: "destructive" }]
        );
      }
    }
  }
}

// Export a single instance so it can be reused anywhere in the app
export const alertService = new AlertManager();