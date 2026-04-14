const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

let firebaseAdmin = null;

try {
  // You need to place your serviceAccountKey.json in the be-prochat root or 
  // provide the path via GOOGLE_APPLICATION_CREDENTIALS env var.
  const serviceAccount = require("../serviceAccountKey.json");

  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log("✅ Firebase Admin initialized");
} catch (error) {
  console.error("⚠️ Firebase Admin initialization failed. Push notifications will be disabled.");
  console.error("Error:", error.message);
  console.log("To enable FCM, download serviceAccountKey.json from Firebase Console and place it in be-prochat directory.");
}

const sendPushNotification = async (token, payload) => {
  if (!firebaseAdmin) return;

  try {
    const response = await admin.messaging().send({
      token: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
      },
    });
    console.log("Successfully sent message:", response);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

module.exports = { admin, sendPushNotification };
