import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { useFirebase } from "../firebase/config";
import { ref, push, onValue as onDefaultValue } from "firebase/database";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  ListGroup,
  Card,
  Spinner,
  Modal,
  InputGroup,
  Dropdown,
} from "react-bootstrap";
import axios from "axios";

const Chat = () => {
  const {
    user,
    auth,
    db,
    spectatorDb,
    spectatorAuth,
    signInWithCustomToken: signInSpectatorToken,
    logout,
  } = useFirebase();

  const { uid: routeUid } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();

  const [usersMap, setUsersMap] = useState({});
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginToken, setLoginToken] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [selectedChatsForToken, setSelectedChatsForToken] = useState([]);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Extract chatId from query
  useEffect(() => {
    const params = new URLSearchParams(search);
    const chatFromParam = params.get("chatId");
    if (chatFromParam) setSelectedChatId(chatFromParam);
  }, [search]);

  // Ensure correct user route
  useEffect(() => {
    if (user && routeUid && routeUid !== user.uid) {
      navigate("/login");
    }
  }, [user, routeUid, navigate]);

  // Load users map
  useEffect(() => {
    return onDefaultValue(ref(db, "users"), (snap) => {
      setUsersMap(snap.val() || {});
    });
  }, [db]);

  // Load chats for user
  useEffect(() => {
    if (!user) return;
    const unsub = onDefaultValue(ref(db, `users/${user.uid}/chats`), (snap) => {
      const obj = snap.val() || {};
      const list = Object.keys(obj).map((chatId) => ({
        chatId,
        participants: chatId.split("_"),
      }));
      setChats(list);
    });
    return () => unsub();
  }, [db, user]);

  // Load messages
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    const unsub = onDefaultValue(
      ref(db, `chats/${selectedChatId}/messages`),
      (snap) => {
        const data = snap.val() || {};
        const msgs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setMessages(msgs);
      }
    );
    return () => unsub();
  }, [selectedChatId, db]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedChatId) return;
    await push(ref(db, `chats/${selectedChatId}/messages`), {
      text: newMsg,
      from: user.uid,
      timestamp: Date.now(),
    });
    setNewMsg("");
  };

  const toggleChatSelection = (chatId) => {
    setSelectedChatsForToken((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };

  const API_URL = process.env.REACT_APP_API_BASE_URL;

  const handleGenerateToken = async () => {
    try {
      const res = await axios.post(`${API_URL}/spectator-token`, {
        roomIds: selectedChatsForToken,
      });
      setLoginToken(res.data.token);
      setGeneratedToken(res.data.token);
    } catch (err) {
      console.error("Token generation error", err);
    }
  };

  const handleCopyToken = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generatedToken;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy token: ", err);
    }
    document.body.removeChild(textArea);
  };

  const handleSpectatorLogin = async () => {
    try {
      await signInSpectatorToken(spectatorAuth, loginToken);
      const tokenResult = await spectatorAuth.currentUser.getIdTokenResult();
      console.log("Logged in as spectator", tokenResult.claims);
      setShowLoginModal(false);
      setLoginToken("");
      navigate("/spectator-dashboard");
    } catch (err) {
      console.error("Spectator login error", err);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  if (!user) {
    return (
      <Container
        fluid
        className="vh-100 d-flex justify-content-center align-items-center"
      >
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container fluid className="vh-100 overflow-hidden p-2">
      <Row className="h-100">
        <Col
          md={3}
          className="border-end d-flex flex-column h-100 overflow-hidden"
        >
          {/* User/Logout Dropdown */}
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
            <Dropdown>
              <Dropdown.Toggle
                variant="link"
                id="dropdown-user"
                className="p-0 text-decoration-none text-dark"
              >
                <strong>You:</strong> {user.email}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={logout} className="text-danger">
                  Log Out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>

          {/* Buttons */}
          <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom p-3 gap-2">
            <Link to="/new-chat">
              <Button size="sm" variant="success">
                Start New chat
              </Button>
            </Link>
            <Button
              size="sm"
              variant="warning"
              onClick={() => navigate("/schedule-msg")}
            >
              📅 Schedule Msg
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowTokenModal(true)}
            >
              🎟 Token
            </Button>
            <Button
              size="sm"
              variant="info"
              onClick={() => setShowLoginModal(true)}
            >
              Spectate
            </Button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ListGroup variant="flush">
              {chats.map(({ chatId, participants }) => {
                const [u1, u2] = participants;
                const otherUid = u1 === user.uid ? u2 : u1;
                const label = usersMap[otherUid]?.email || otherUid;
                return (
                  <ListGroup.Item
                    key={chatId}
                    action
                    active={selectedChatId === chatId}
                    onClick={() => setSelectedChatId(chatId)}
                  >
                    {label}
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </div>
        </Col>
        <Col md={9} className="d-flex flex-column h-100 overflow-hidden">
          {selectedChatId ? (
            <>
              <div
                ref={scrollRef}
                className="flex-grow-1 p-3 d-flex flex-column"
                style={{ overflowY: "auto" }}
              >
                {messages.map((msg) => {
                  const mine = msg.from === user.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`d-flex mb-2 ${
                        mine ? "justify-content-end" : "justify-content-start"
                      }`}
                    >
                      <Card
                        className={`${
                          mine ? "bg-success text-white" : "bg-light"
                        }`}
                        style={{ maxWidth: "60%" }}
                      >
                        <Card.Body className="py-2 px-3">
                          <Card.Text className="small mb-0 text-break">
                            {msg.text}
                          </Card.Text>
                          {/* --- ADDED TIMESTAMP DISPLAY --- */}
                          <div
                            className={`small text-end ${
                              mine ? "text-white-50" : "text-muted"
                            }`}
                            style={{ fontSize: "0.75rem", marginTop: "4px" }}
                          >
                            {formatTimestamp(msg.timestamp)}
                          </div>
                          {/* --- END OF ADDITION --- */}
                        </Card.Body>
                      </Card>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <Form onSubmit={handleSend} className="border-top d-flex p-3">
                <Form.Control
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="me-2"
                />
                <Button type="submit" variant="primary">
                  Send
                </Button>
              </Form>
            </>
          ) : (
            <div className="flex-grow-1 d-flex justify-content-center align-items-center text-muted">
              Click on a chat to start conversation
            </div>
          )}
        </Col>
      </Row>

      {/* Token Modal */}
      <Modal show={showTokenModal} onHide={() => setShowTokenModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Generate Spectator Token</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Select chat rooms:</p>
          <ListGroup>
            {chats.map(({ chatId, participants }) => {
              const [u1, u2] = participants;
              const otherUid = u1 === user.uid ? u2 : u1;
              const label = usersMap[otherUid]?.email || otherUid;
              const active = selectedChatsForToken.includes(chatId);
              return (
                <ListGroup.Item
                  key={chatId}
                  action
                  active={active}
                  onClick={() => toggleChatSelection(chatId)}
                >
                  {label}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          <Button onClick={handleGenerateToken} className="mt-3">
            Generate Token
          </Button>
          {generatedToken && (
            <>
              <Form.Label className="mt-3">Token:</Form.Label>
              <InputGroup>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={generatedToken}
                  readOnly
                />
                <Button variant="outline-secondary" onClick={handleCopyToken}>
                  Copy
                </Button>
              </InputGroup>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Spectator Login Modal */}
      <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Spectator Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Paste Token</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={loginToken}
              onChange={(e) => setLoginToken(e.target.value)}
            />
          </Form.Group>
          <Button onClick={handleSpectatorLogin} className="mt-3">
            Login as Spectator
          </Button>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Chat;
