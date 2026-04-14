import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import api from "./api";

// YOUR FIREBASE CONFIG HERE
// You can get this from Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let messaging = null;

export const initNotifications = async (user) => {
  if (!user) return;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging is not supported in this browser/context.");
      return;
    }

    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { 
        vapidKey: "YOUR_VAPID_KEY" // Get this from Firebase Console -> Messaging -> Web push certificates
      });

      if (token) {
        console.log("FCM Token:", token);
        await api.post("/user/push-token", {
          token,
          platform: "web"
        });
      }
    }

    onMessage(messaging, (payload) => {
      console.log("Message received. ", payload);
      // Custom handling for foreground notifications if needed
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/logo192.png"
      });
    });

  } catch (error) {
    console.error("Firebase Notification Error:", error);
  }
};
