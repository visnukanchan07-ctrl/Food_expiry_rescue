
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:8000";

export default function Chat() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please log in to use chat.");
      return;
    }

    if (!requestId) {
      setError("Chat request ID is missing.");
      return;
    }

    let active = true;

    async function loadMessages() {
      try {
        const response = await fetch(
          `${API}/chat/${requestId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          throw new Error(
            data.detail ||
              (response.status === 403
                ? "You do not have access to this chat."
                : "Could not load chat messages.")
          );
        }

        const data = await response.json();

        if (active) {
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load chat messages.");
        }
      }
    }

    loadMessages();

    const protocol =
      window.location.protocol === "https:" ? "wss" : "ws";

    const socket = new WebSocket(
      `${protocol}://${window.location.hostname}:8000/ws/chat/${requestId}?token=${encodeURIComponent(token)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      if (active) {
        setConnected(true);
        setError("");
      }
    };

    socket.onmessage = (event) => {
      if (!active) return;

      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.id) {
          setMessages((previous) => {
            if (previous.some((item) => item.id === data.id)) {
              return previous;
            }

            return [...previous, data];
          });
        }
      } catch {
        setError("Could not read the incoming message.");
      }
    };

    socket.onerror = () => {
      if (active) {
        setError(
          "Chat connection failed. Check that the backend is running on port 8000."
        );
      }
    };

    socket.onclose = () => {
      if (active) {
        setConnected(false);
      }
    };

    return () => {
      active = false;
      socket.close();
      socketRef.current = null;
    };
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    const socket = socketRef.current;

    if (!text) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Chat is not connected yet. Please wait.");
      return;
    }

    setSending(true);
    setError("");

    try {
      socket.send(text);
      setMessage("");
    } catch {
      setError("Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.chatBox}>
        <div style={styles.header}>
          <button
            style={styles.back}
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <div>
            <h2 style={styles.heading}>Food Rescue Chat</h2>
            <p style={styles.subheading}>
              Request #{requestId}
            </p>
          </div>

          <span
            style={{
              ...styles.status,
              color: connected ? "#15803d" : "#dc2626",
            }}
          >
            {connected ? "● Connected" : "● Connecting"}
          </span>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.messages}>
          {messages.length === 0 && (
            <p style={styles.empty}>
              No messages yet. Start the conversation!
            </p>
          )}

          {messages.map((item) => {
            const mine =
              String(item.sender_id) ===
              String(localStorage.getItem("user_id"));

            return (
              <div
                key={item.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: mine
                    ? "flex-end"
                    : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    background: mine
                      ? "#dcfce7"
                      : "#f1f5f9",
                  }}
                >
                  <strong>
                    {item.sender_name ||
                      (mine ? "You" : "Participant")}
                  </strong>

                  <p style={styles.messageText}>
                    {item.message}
                  </p>

                  <small style={styles.time}>
                    {item.created_at
                      ? new Date(
                          item.created_at
                        ).toLocaleString()
                      : ""}
                  </small>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} style={styles.form}>
          <input
            style={styles.input}
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            placeholder="Type your message..."
            maxLength={2000}
            disabled={!connected}
          />

          <button
            style={{
              ...styles.send,
              opacity:
                !connected || !message.trim() || sending
                  ? 0.6
                  : 1,
            }}
            type="submit"
            disabled={
              !connected || !message.trim() || sending
            }
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f0fdf4",
    padding: "30px 15px",
    fontFamily: "Arial, sans-serif",
  },
  chatBox: {
    maxWidth: "750px",
    height: "80vh",
    minHeight: "450px",
    margin: "auto",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    borderBottom: "1px solid #e5e7eb",
  },
  back: {
    padding: "9px 12px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  heading: {
    margin: 0,
    fontSize: "20px",
  },
  subheading: {
    margin: "5px 0 0",
    color: "#64748b",
  },
  status: {
    marginLeft: "auto",
    fontSize: "13px",
  },
  error: {
    padding: "10px",
    margin: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "18px",
  },
  empty: {
    textAlign: "center",
    color: "#64748b",
    marginTop: "50px",
  },
  messageRow: {
    display: "flex",
    marginBottom: "12px",
  },
  bubble: {
    maxWidth: "75%",
    padding: "12px",
    borderRadius: "12px",
    overflowWrap: "anywhere",
  },
  messageText: {
    margin: "7px 0",
    whiteSpace: "pre-wrap",
  },
  time: {
    color: "#64748b",
    fontSize: "10px",
  },
  form: {
    display: "flex",
    gap: "10px",
    padding: "15px",
    borderTop: "1px solid #e5e7eb",
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "13px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
  },
  send: {
    padding: "12px 22px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};
