// frontend/src/pages/SpectatorLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../firebase/config";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";

const SpectatorLogin = () => {
  const { spectatorAuth, signInWithCustomToken } = useFirebase();
  const [token, setToken] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSpectatorLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Please paste a valid token.");
      return;
    }

    try {
      await signInWithCustomToken(spectatorAuth, token);
      console.log("Logged in as spectator");
      navigate("/spectator-dashboard"); // Send them to the dashboard
    } catch (err) {
      console.error("Spectator login error", err);
      setError("Invalid token. Please try again.");
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: "500px" }}>
      <Card className="p-4 shadow">
        <h2 className="mb-4">Spectator Login</h2>
        <Form onSubmit={handleSpectatorLogin}>
          <Form.Group className="mb-3" controlId="formToken">
            <Form.Label>Paste Your Spectator Token</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here..."
              required
            />
          </Form.Group>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button variant="primary" type="submit" className="w-100">
            Login as Spectator
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default SpectatorLogin;
