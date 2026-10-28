import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  // @ts-ignore
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAbdFeKbfWedDCZHzsfqqDmtcmFZLpKJJQ',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'trino-app-br.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'trino-app-br',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'trino-app-br.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '568224864472',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:568224864472:web:a9aa2844424ececc6e9fad',
};

// Inicializa o app do Firebase apenas uma vez
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Configura autenticação resiliente para Web e Mobile (React Native / Expo)
let authInstance: Auth;

try {
  if (Platform.OS === 'web') {
    authInstance = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  // Caso já tenha sido inicializado anteriormente
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);
