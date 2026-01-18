import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Configuração do Firebase (Colada pelo utilizador)
export const firebaseConfig = {
  apiKey: "AIzaSyC1syikigApBQX71pdwHm0a6zONovV3r04",
  authDomain: "platforma-e0c48.firebaseapp.com",
  projectId: "platforma-e0c48",
  storageBucket: "platforma-e0c48.firebasestorage.app",
  messagingSenderId: "340462126502",
  appId: "1:340462126502:web:bb775d7fa76c6ea9947b67",
  measurementId: "G-3K11NK4GHY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);