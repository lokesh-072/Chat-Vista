import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../firebase/config";
import { ref, onValue as onDefaultValue } from "firebase/database";
import { Container, Row, Col, ListGroup, Card, Spinner } from "react-bootstrap";

const SpectatorDashboard = () => {
  const { db, spectatorDb, spectatorAuth } = useFirebase();
  const navigate = useNavigate();

  const [specUser, setSpecUser] = useState(null);
  const [usersMap, setUsersMap] = useState({});
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Monitor spectator auth and redirect if signed out
  useEffect(() => {
    const unsub = spectatorAuth.onAuthStateChanged((user) => {
      if (user) {
        setSpecUser(user);
      } else {
        // If they log out, send them to the public spectator login page
        navigate("/spectator-login");
      }
    });
    return unsub;
  }, [spectatorAuth, navigate]);

  // Fetch allowed chats once specUser is available
  useEffect(() => {
    if (!specUser) return;
    const fetchAllowed = async () => {
      try {
        const { claims } = await specUser.getIdTokenResult();
        const roomAccess = claims.roomAccess || {};
        const chatIds = Object.keys(roomAccess).filter((id) => roomAccess[id]);
        const list = chatIds.map((chatId) => ({
          chatId,
          participants: chatId.split("_"),
        }));
        setChats(list);
        if (list.length) setSelectedChatId(list[0].chatId);
      } catch (err) {
        console.error("Error fetching token claims", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllowed();
  }, [specUser]);

  // Load user emails map
  useEffect(() => {
    const unsub = onDefaultValue(ref(db, "users"), (snap) => {
      setUsersMap(snap.val() || {});
    });
    return () => unsub();
  }, [db]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    const unsub = onDefaultValue(
      ref(spectatorDb, `chats/${selectedChatId}/messages`),
      (snap) => {
        const data = snap.val() || {};
        const msgs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setMessages(msgs);
      }
    );
    return () => unsub();
  }, [spectatorDb, selectedChatId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" />
      </Container>
    );
  }

  const getCreatorUid = (chatId) => chatId.split("_")[0];

  return (
    <Container fluid className="vh-100 overflow-hidden p-2">
      <Row className="h-100">
        <Col
          md={3}
          className="border-end d-flex flex-column h-100 overflow-hidden"
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ListGroup variant="flush">
              {chats.map(({ chatId, participants }) => {
                const [u1, u2] = participants;
                const email1 = usersMap[u1]?.email || u1;
                const email2 = usersMap[u2]?.email || u2;
                return (
                  <ListGroup.Item
                    key={chatId}
                    action
                    active={selectedChatId === chatId}
                    onClick={() => setSelectedChatId(chatId)}
                  >
                    {email1} ↔ {email2}
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
                  const creatorUid = getCreatorUid(selectedChatId);
                  const isCreator = msg.from === creatorUid;
                  const sender = usersMap[msg.from]?.email || msg.from;
                  return (
                    <div
                      key={msg.id}
                      className={`d-flex mb-2 ${
                        isCreator
                          ? "justify-content-end"
                          : "justify-content-start"
                      }`}
                    >
                      <Card
                        className={
                          isCreator
                            ? "bg-success text-white"
                            : "bg-info text-white"
                        }
                        style={{ maxWidth: "60%" }}
                      >
                        <Card.Body className="py-2 px-3">
                          <Card.Subtitle
                            className="mb-1 text-white-50"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {sender}
                          </Card.Subtitle>
                          <Card.Text className="small mb-0 text-break">
                            {msg.text}
                          </Card.Text>

                          <div
                            className="small text-end text-white-50"
                            style={{ fontSize: "0.75rem", marginTop: "4px" }}
                          >
                            {formatTimestamp(msg.timestamp)}
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div
                className="border-top d-flex p-3 text-muted"
                style={{ fontStyle: "italic" }}
              >
                Read-only mode: Spectators cannot send messages.
              </div>
            </>
          ) : (
            <div className="flex-grow-1 d-flex justify-content-center align-items-center text-muted">
              Click on a chat to view messages
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default SpectatorDashboard;
