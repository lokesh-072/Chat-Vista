import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import {
  Container,
  Form,
  Button,
  Card,
  ListGroup,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import axios from "axios";

const NewChat = () => {
  const { user, auth, db } = useFirebase();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    console.log("NewChat mount - waiting for user", user);
    if (!user) return;
    const usersRef = ref(db, "users");
    console.log("Setting up users ref listener");
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val();
      console.log("Users snapshot:", data);
      const list = Object.entries(data || {})
        .map(([uid, val]) => ({ uid, email: val.email }))
        .filter((u) => u.uid !== user.uid);
      console.log("Available users (excluding self):", list);
      setUsersList(list);
      setFilteredUsers(list);
    });
    return () => {
      console.log("Cleaning up users ref listener");
      unsub();
    };
  }, [db, user]);

  useEffect(() => {
    console.log("Filtering users with term:", searchTerm);
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setFilteredUsers(usersList);
      return;
    }
    const results = usersList.filter((u) => {
      const local = u.email.split("@")[0].toLowerCase();
      return local.includes(term);
    });
    console.log("Filtered results:", results);
    setFilteredUsers(results);
  }, [searchTerm, usersList]);

  const startChat = async (otherUid) => {
    console.log("startChat called with otherUid:", otherUid);
    try {
      const current = auth.currentUser;
      if (!current) throw new Error("Not authenticated");
      const idToken = await current.getIdToken();
      console.log("ID Token obtained");

      const API_URL = process.env.REACT_APP_API_BASE_URL;

      const res = await axios.post(
        `${API_URL}/start-chat`,
        { otherUid },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      console.log("start-chat response:", res.data);
      if (res.data.success) {
        navigate(`/chats/${user.uid}`, {
          state: { newChatId: res.data.chatId },
        });
      }
    } catch (err) {
      console.error("startChat error:", err.response?.data || err.message);
    }
  };

  if (!user) {
    console.log("No user, showing spinner");
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="mt-5" style={{ maxWidth: "500px" }}>
      <Card className="p-4 shadow">
        <h2 className="mb-4">Start a New Chat</h2>

        <InputGroup className="mb-3">
          <Form.Control
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type name or email local-part"
          />
          <Button
            onClick={() => console.log("Search clicked with term", searchTerm)}
            variant="primary"
          >
            Search
          </Button>
        </InputGroup>

        <ListGroup style={{ maxHeight: "250px", overflowY: "auto" }}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <ListGroup.Item
                key={u.uid}
                className="d-flex justify-content-between align-items-center"
              >
                <span>{u.email}</span>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => startChat(u.uid)}
                >
                  Chat
                </Button>
              </ListGroup.Item>
            ))
          ) : (
            <ListGroup.Item className="text-muted">
              No users found
            </ListGroup.Item>
          )}
        </ListGroup>
      </Card>
    </Container>
  );
};

export default NewChat;
