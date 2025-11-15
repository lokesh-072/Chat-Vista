// src/firebase/config.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { initializeApp as initApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  databaseURL: process.env.REACT_APP_DATABASE_URL,
};

// Initialize default app
const app = initApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
console.log("[Firebase] Default app initialized:", app.name);

// Initialize spectator app
let spectatorApp;
if (!getApps().find((a) => a.name === "spectator")) {
  spectatorApp = initApp(firebaseConfig, "spectator");
  console.log("[Firebase] Spectator app initialized:", spectatorApp.name);
} else {
  spectatorApp = getApps().find((a) => a.name === "spectator");
}
const spectatorAuth = getAuth(spectatorApp);
const spectatorDb = getDatabase(spectatorApp);

// Create Context
const FirebaseContext = createContext({});

export const FirebaseProvider = ({ children }) => {
  // Real user state
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  // Spectator user state
  const [spectatorUser, setSpectatorUser] = useState(null);

  // Sync real user auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const minimal = { uid: firebaseUser.uid, email: firebaseUser.email };
        console.log("[Firebase] Auth state changed:", minimal);
        setUser(minimal);
        localStorage.setItem("user", JSON.stringify(minimal));
      } else {
        console.log("[Firebase] Auth state changed: signed out");
        setUser(null);
        localStorage.removeItem("user");
      }
    });
    return unsubscribe;
  }, []);

  // Sync spectator auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(spectatorAuth, (fbUser) => {
      if (fbUser) {
        const minimal = { uid: fbUser.uid };
        console.log("[Firebase] Spectator login:", minimal);
        setSpectatorUser(minimal);
      } else {
        console.log("[Firebase] Spectator logout");
        setSpectatorUser(null);
      }
    });
    return unsubscribe;
  }, []);

  // Auth actions
  const signup = (email, password) => {
    console.log("[Firebase] signup called for", email);
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => {
    console.log("[Firebase] login called for", email);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    console.log("[Firebase] logout called");
    return signOut(auth);
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        spectatorUser,
        signup,
        login,
        logout,
        auth,
        db,
        spectatorAuth,
        spectatorDb,
        signInWithCustomToken,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
export const useAuth = () => useContext(FirebaseContext).user;
