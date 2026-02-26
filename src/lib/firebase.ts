import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";

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

// Initialize Firestore with robust offline persistence enabled.
// Using SingleTabManager with forceOwnership ensures that if a mobile PWA or desktop app
// is improperly closed, the new instance forcefully takes the IndexedDB lock, preventing
// all offline writes (setDocs) from hanging indefinitely (endless blue sync cycle).
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true })
    })
});

// Export Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
