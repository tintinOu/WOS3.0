import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Firebase configuration for client-side storage access
// Note: The apiKey is NOT a secret - it's safe to expose in client-side code
// Security is enforced via Firebase Security Rules
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    projectId: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT || 'wos3-485114',
    storageBucket: `${import.meta.env.VITE_GOOGLE_CLOUD_PROJECT || 'wos3-485114'}.firebasestorage.app`
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
