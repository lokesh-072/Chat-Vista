import React, { useState, useEffect } from "react";
import { useFirebase } from "../firebase/config";
import { ref, push, onValue } from "firebase/database";
import {
  Container,
  Button,
  Modal,
  Form,
  ListGroup,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import axios from "axios";

const ScheduleMsg = () => {
  const { user, db } = useFirebase();
  const [chats, setChats] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [scheduledMsgs, setScheduledMsgs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [messageText, setMessageText] = useState("");

  // Load user's chats
  useEffect(() => {
    if (!user) return;
    const chatsRef = ref(db, `users/${user.uid}/chats`);
    const unsub = onValue(chatsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.keys(data).map((chatId) => chatId);
      setChats(list);
    });
    return () => unsub();
  }, [db, user]);

  // Load users map for labels
  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snap) => setUsersMap(snap.val() || {}));
    return () => unsub();
  }, [db]);

  // Load scheduled messages
  useEffect(() => {
    if (!user) return;
    const schedRef = ref(db, `scheduledMessages/${user.uid}`);
    const unsub = onValue(schedRef, (snap) => {
      const data = snap.val() || {};
      // Convert to array and sort by scheduledAt desc
      const list = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => b.scheduledAt - a.scheduledAt);
      setScheduledMsgs(list);
    });
    return () => unsub();
  }, [db, user]);

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleSchedule = async () => {
    if (!selectedChat || !scheduleTime || !messageText.trim()) return;
    const scheduledAt = new Date(scheduleTime).getTime();
    const now = Date.now();
    const payload = {
      chatId: selectedChat,
      scheduledAt,
      createdAt: now,
      text: messageText,
    };
    // Save to RTDB
    await push(ref(db, `scheduledMessages/${user.uid}`), payload);
    // Optionally inform backend to schedule a job
    // Get the base URL from environment variables
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    try {
      // Use the variable to build the full URL
      await axios.post(`${API_URL}/schedule-msg`, payload);
    } catch (err) {
      console.error("Error scheduling msg on backend", err);
    }
    // Reset and close
    setSelectedChat("");
    setScheduleTime("");
    setMessageText("");
    handleCloseModal();
  };

  const getOtherEmail = (chatId) => {
    const participants = chatId.split("_");
    const other = participants.find((uid) => uid !== user.uid);
    return usersMap[other]?.email || other;
  };

  return (
    <Container className="mt-5" style={{ maxWidth: "700px" }}>
      <h2 className="mb-4">Schedule Message</h2>
      <Button variant="primary" onClick={handleOpenModal} className="mb-4">
        Schedule Msg
      </Button>

      <h4>Previously Scheduled</h4>
      <ListGroup>
        {scheduledMsgs.length > 0 ? (
          scheduledMsgs.map((msg) => (
            <ListGroup.Item key={msg.id} className="mb-2">
              <strong>Send to:</strong> {getOtherEmail(msg.chatId)}
              <br />
              <strong>Scheduled at:</strong>{" "}
              {new Date(msg.scheduledAt).toLocaleString()}
              <br />
              <strong>Created at:</strong>{" "}
              {new Date(msg.createdAt).toLocaleString()}
              <br />
              <Card className="mt-2">
                <Card.Body>{msg.text}</Card.Body>
              </Card>
            </ListGroup.Item>
          ))
        ) : (
          <ListGroup.Item>No scheduled messages</ListGroup.Item>
        )}
      </ListGroup>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>New Scheduled Message</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Chat Room</Form.Label>
            <Form.Select
              value={selectedChat}
              onChange={(e) => setSelectedChat(e.target.value)}
            >
              <option value="">-- choose --</option>
              {chats.map((chatId) => (
                <option key={chatId} value={chatId}>
                  {getOtherEmail(chatId)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Schedule Time</Form.Label>
            <Form.Control
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSchedule}>
            Schedule
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ScheduleMsg;
