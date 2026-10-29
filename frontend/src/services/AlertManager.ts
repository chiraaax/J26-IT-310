import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

// App එක පාවිච්චි කරන වෙලාවෙත් Notification එක සහ Sound එක වැඩ කිරීමට මෙය අනිවාර්ය වේ
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

class AlertManager {
  // කුමන alert එක අවසානයට ගියේද යන්න සහ ගිය වේලාව මතක තබාගන්නා Object එක
  private lastAlerts: { [key: string]: number } = {};
  
  // විනාඩි 5ක Cooldown එකක් මිලි තත්පර වලින් (5 * 60 * 1000)
  private COOLDOWN_MS = 5 * 60 * 1000; 

  constructor() {
    this.requestPermissions();
  }

  // Phone එකෙන් Notification යැවීමට අවසර (Permissions) ඉල්ලීම
  private async requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted!');
    }
  }

  // Lecturer සහ Admin ගේ Dashboard එකෙන් සජීවී දත්ත මෙයට ලබා දේ
  public evaluateMicroClimate(data: any) {
    if (!data) return;
    const now = Date.now();

    // 1. TTT (Time-to-Threshold) Alert Logic
    // TTT අගය විනාඩි 15 ට වඩා අඩු නම් Alert එක යවයි
    const ttt = parseInt(data.ttt_minutes);
    if (!isNaN(ttt) && ttt <= 15) { 
      this.triggerAlert(
        'CO2_TTT', // Alert Type
        '⚠️ Air Quality Warning', // Title
        `CO₂ level is rising rapidly. Danger threshold in ${ttt} mins.\n\nSuggestion: Turn on HVAC Max Cooling or open windows immediately.`, // Body with Suggestion
        now
      );
    }

    // 2. Acoustic (Noise) Alert Logic
    if (data.label === 'disruptive' || data.acoustic_status === 'disruptive') {
      this.triggerAlert(
        'NOISE', // Alert Type
        '🔊 High Noise Level Detected', // Title
        'Disruptive acoustic levels detected in the classroom.\n\nSuggestion: Send a silence request to the students.', // Body with Suggestion
        now
      );
    }
  }

  // Alert එක යැවීමේ ප්‍රධාන Function එක
  private async triggerAlert(type: string, title: string, body: string, now: number) {
    const lastTime = this.lastAlerts[type] || 0;

    // අවසන් වරට මේ වර්ගයේ Alert එකක් ගොස් විනාඩි 5ක් ගතවී ඇත්දැයි බැලීම
    if (now - lastTime > this.COOLDOWN_MS) {
      // අලුත් වේලාව සටහන් කරගැනීම (Update last alert time)
      this.lastAlerts[type] = now; 

      // 1. App එක ඇතුළේ Popup Alert එකක් පෙන්වීම
      Alert.alert(title, body);

      // 2. Phone එකට Push Notification එකක් යැවීම (මෙය Default Notification ශබ්දයද නාද කරයි)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: true, // ශබ්දය ක්‍රියාත්මක කිරීම
        },
        trigger: null, // ප්‍රමාදයකින් තොරව වහාම යැවීම
      });
    }
  }
}

// මුළු App එකටම භාවිතා කිරීම සඳහා Service එක Export කිරීම
export const alertService = new AlertManager();