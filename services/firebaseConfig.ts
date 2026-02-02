
// @ts-ignore
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do Firebase com suas credenciais reais
const firebaseConfig = {
  apiKey: "AIzaSyAFEPNgZ_lz95kOGmqYan8BHFTtwTGlN5o",
  authDomain: "meujuristaonline.firebaseapp.com",
  projectId: "meujuristaonline",
  storageBucket: "meujuristaonline.firebasestorage.app",
  messagingSenderId: "534397968226",
  appId: "1:534397968226:web:9925ef68e53f0f1b4ed63b",
  measurementId: "G-0F1JFWJRC1"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias de Banco de Dados e Autenticação para uso no app
export const db = getFirestore(app);
export const auth = getAuth(app);
