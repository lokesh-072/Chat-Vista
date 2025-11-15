// src/firebase/AuthProvider.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { useFirebase } from "./config";

export const AuthContext = createContext({
  currentUser: null,
  isSpectator: false,
});

export function AuthProvider({ children }) {
  const { auth, spectatorAuth } = useFirebase();
  const [currentUser, setCurrentUser] = useState(() => {
    const u = localStorage.getItem("currentUser");
    return u ? JSON.parse(u) : null;
  });
  const [isSpectator, setIsSpectator] = useState(false);

  // Listen for normal auth changes
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const minimal = { uid: user.uid, email: user.email };
        setCurrentUser(minimal);
        setIsSpectator(false);
        localStorage.setItem("currentUser", JSON.stringify(minimal));
      } else {
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
      }
    });
    return unsub;
  }, [auth]);

  // Listen for spectator auth changes and enforce expiry
  useEffect(() => {
    const unsubSpec = onIdTokenChanged(spectatorAuth, async (user) => {
      if (user) {
        try {
          const { claims } = await user.getIdTokenResult();
          const expiresAt = claims.expiresAt || 0;
          if (Date.now() > expiresAt) {
            console.warn("Spectator token expired; signing out.");
            await spectatorAuth.signOut();
            setIsSpectator(false);
          } else {
            const minimal = { uid: user.uid, email: user.email };
            setCurrentUser(minimal);
            setIsSpectator(true);
            localStorage.setItem("currentUser", JSON.stringify(minimal));
          }
        } catch (err) {
          console.error("Error checking spectator token claims", err);
          setIsSpectator(false);
        }
      }
    });
    return unsubSpec;
  }, [spectatorAuth]);

  return (
    <AuthContext.Provider value={{ currentUser, isSpectator }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
