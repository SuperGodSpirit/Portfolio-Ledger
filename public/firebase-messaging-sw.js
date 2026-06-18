// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// We get these from the URL query params we will pass when registering the SW, or hardcode them here.
// Since it's a static file, we must hardcode them or use a build step. We'll use a build step or hardcode.
// To keep it simple, we hardcode the config (since it is public anyway).
const firebaseConfig = {
  apiKey: "AIzaSyAbQ4DwZXSyqPbqtYjGFhIIcM1T71nhyEY",
  authDomain: "portfolio-ledger-518c8.firebaseapp.com",
  projectId: "portfolio-ledger-518c8",
  storageBucket: "portfolio-ledger-518c8.firebasestorage.app",
  messagingSenderId: "427571657340",
  appId: "1:427571657340:web:b29b016feaa4608cc8e7f9",
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/pwa-192x192.svg",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
