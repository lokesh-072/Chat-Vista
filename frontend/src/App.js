import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useFirebase } from "./firebase/config";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import NewChat from "./pages/Newchat";

import SpectatorDashboard from "./pages/SpectatorDashboard";
import ScheduleMsg from "./pages/scheduleMsg";
import SpectatorLogin from "./pages/SpectatorLogin";

function App() {
  const { user } = useFirebase();

  return (
    <Routes>
      {/* Public routes: redirect if already authenticated */}
      <Route
        path="/signup"
        element={
          user ? <Navigate to={`/chats/${user.uid}`} replace /> : <Signup />
        }
      />
      <Route
        path="/login"
        element={
          user ? <Navigate to={`/chats/${user.uid}`} replace /> : <Login />
        }
      />

      <Route path="/spectator-login" element={<SpectatorLogin />} />

      {/* Protected chat routes */}
      <Route
        path="/chats/:uid"
        element={user ? <Chat /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/new-chat"
        element={user ? <NewChat /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/schedule-msg"
        element={user ? <ScheduleMsg /> : <Navigate to="/login" replace />}
      />

      {/* Spectator dashboard (public, as it has its own auth) */}
      <Route path="/spectator-dashboard" element={<SpectatorDashboard />} />

      {/* Fallback redirect based on auth state */}
      <Route
        path="*"
        element={
          <Navigate to={user ? `/chats/${user.uid}` : "/login"} replace />
        }
      />
    </Routes>
  );
}

export default App;
