// backend/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const app = express();
app.use(cors());
app.use(express.json());

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // We are on the deployed server
  // Parse the JSON string from the environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // We are on localhost
  // Load the file directly
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

app.post("/spectator-token", async (req, res) => {
  const { roomIds } = req.body;

  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Missing or invalid roomIds (array expected)" });
  }

  try {
    const uid = `spectator_${Date.now()}`;
    const roomAccess = {};
    roomIds.forEach((id) => (roomAccess[id] = true));

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const token = await admin.auth().createCustomToken(uid, {
      role: "spectator",
      roomAccess,
      expiresAt,
    });

    return res.json({ token });
  } catch (err) {
    console.error("Token creation error:", err);
    return res.status(500).json({ error: "Failed to generate token" });
  }
});

// NEW: start-chat endpoint
app.post("/start-chat", async (req, res) => {
  const { otherUid } = req.body;
  // you’ll need to pass the caller’s uid—either via a header or (better) via a Firebase ID token:
  const idToken = req.header("Authorization")?.split("Bearer ")[1];
  if (!idToken) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    // Verify the caller’s identity
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid1 = decoded.uid;
    if (!otherUid || typeof otherUid !== "string" || uid1 === otherUid) {
      return res.status(400).json({ error: "Invalid otherUid" });
    }

    // Compute chatId
    const chatId = [uid1, otherUid].sort().join("_");
    const db = admin.database();

    // 1) Write participants
    await db.ref(`chats/${chatId}/participants`).set({
      [uid1]: true,
      [otherUid]: true,
    });

    // 2) Update both users’ chat lists
    await db.ref(`users/${uid1}/chats`).update({ [chatId]: otherUid });
    await db.ref(`users/${otherUid}/chats`).update({ [chatId]: uid1 });

    return res.json({ chatId, success: true });
  } catch (err) {
    console.error("start-chat error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Schedule a message for future sending
app.post("/schedule-message", async (req, res) => {
  const { chatId, text, scheduledAt, uid } = req.body;

  if (!chatId || !text || !scheduledAt || !uid) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = admin.database();
    await db.ref(`scheduledMessages/${uid}`).push({
      chatId,
      text,
      scheduledAt,
      createdAt: Date.now(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving scheduled message:", err);
    return res.status(500).json({ error: "Failed to schedule message" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT}`)
);

// At the bottom of backend/index.js, after app.listen(...)
const cron = require("node-cron");

// Every minute, scan for due scheduled messages
cron.schedule("* * * * *", async () => {
  try {
    console.log("🕒 Running scheduled message dispatch job");
    const dbRef = admin.database().ref("scheduledMessages");
    const snapshot = await dbRef.once("value");
    const all = snapshot.val() || {};
    const now = Date.now();

    for (const [userUid, messages] of Object.entries(all)) {
      for (const [msgId, msg] of Object.entries(messages)) {
        if (msg.scheduledAt <= now) {
          const chatId = msg.chatId;
          // Dispatch the message into the chat
          await admin.database().ref(`chats/${chatId}/messages`).push({
            text: msg.text,
            from: userUid,
            timestamp: now,
          });
          console.log(`📨 Dispatched msg ${msgId} to chat ${chatId}`);
          // Remove the scheduled entry
          await admin
            .database()
            .ref(`scheduledMessages/${userUid}/${msgId}`)
            .remove();
        }
      }
    }
  } catch (err) {
    console.error("Error in scheduled dispatch job", err);
  }
});
