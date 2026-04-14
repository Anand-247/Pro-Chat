// Give the service worker access to Firebase Messaging.
// Note: This file MUST be in the public/ directory.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyBQWR4d5Gr-DBmaN5sQaZAyDmi_D7QZai8",
  authDomain: "pro-chat-bafb7.firebaseapp.com",
  projectId: "pro-chat-bafb7",
  storageBucket: "pro-chat-bafb7.firebasestorage.app",
  messagingSenderId: "653929139118",
  appId: "1:653929139118:web:92b8220c20b7dec3d1563f",
  measurementId: "G-018M76E92V"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
