import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useFirebase } from "../firebase/config";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";

const Login = () => {
  const { user, login } = useFirebase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // If already logged in, redirect to their chats
  if (user) {
    return <Navigate to={`/chats/${user.uid}`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await login(email, password);
      const { uid } = userCredential.user;
      // navigation; auth listener will persist user
      navigate(`/chats/${uid}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: "500px" }}>
      <Card className="p-4 shadow">
        <h2 className="mb-4">Log In to Your Account</h2>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </Form.Group>

          {error && <Alert variant="danger">{error}</Alert>}

          <Button variant="success" type="submit" className="w-100">
            Log In
          </Button>
        </Form>

        <p className="mt-4 text-center">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </p>

        <p className="mt-2 text-center text-muted">
          Are you a spectator?{" "}
          <Link to="/spectator-login" className="text-muted">
            Login here
          </Link>
        </p>
      </Card>
    </Container>
  );
};

export default Login;
