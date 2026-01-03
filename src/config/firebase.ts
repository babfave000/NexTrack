// src/config/firebase.ts
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
};

// Add debug function
export const debugFirebaseConfig = () => {
  console.log('🔧 Firebase Configuration Debug:');
  console.log('API Key exists:', !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "your-api-key");
  console.log('Auth Domain exists:', !!firebaseConfig.authDomain && firebaseConfig.authDomain !== "your-project.firebaseapp.com");
  console.log('Project ID exists:', !!firebaseConfig.projectId && firebaseConfig.projectId !== "your-project-id");
  console.log('Full config:', firebaseConfig);
};