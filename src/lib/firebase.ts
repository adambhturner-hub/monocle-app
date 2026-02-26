import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with memory cache only.
// Mobile Safari Incognito aggressively blocks IndexedDB and BroadcastChannel APIs.
// If we use `persistentLocalCache`, Firestore's `setDoc` promises hang indefinitely 
// because it cannot acquire the IDB lock. 
// Since Monocle's offline state is robustly managed by Zustand (which gracefully falls back 
// to ephemeral storage in Incognito), we do not need Firebase's offline caching.
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

// Export Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
