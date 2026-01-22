import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    // We only need storageBucket for photo uploads. 
    // Auth is handled via Google OAuth and backend verification.
    storageBucket: `${import.meta.env.VITE_GOOGLE_CLOUD_PROJECT || 'wos3-485114'}.firebasestorage.app`
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
