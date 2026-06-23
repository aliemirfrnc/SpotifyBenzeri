"use client";
import { useRef, useState } from "react";
import { api } from "../lib/api";

export default function Chat({ accentColor }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const { r = 120, g = 80, b = 200 } = accentColor || {};

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage("");
    setLoading(true);
    setError(null);

    setMessages((prev) => [...prev, { type: "user", text: userMessage }]);
    setTimeout(
      () => listRef.current?.scrollTo({ top: 9999, behavior: "smooth" }),
      50,
    );

    try {
      const data = await api.chat(userMessage);
      setMessages((prev) => [
        ...prev,
        { type: "assistant", text: data.response },
      ]);
      setTimeout(
        () => listRef.current?.scrollTo({ top: 9999, behavior: "smooth" }),
        50,
      );
    } catch (err) {
      setError(err.message || "Mesaj gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div ref={listRef} style={styles.messageList}>
        {messages.length === 0 && (
          <p style={styles.emptyText}>Şarkı sözleri hakkında bir şey sor</p>
        )}
        {messages.map((item, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              alignSelf: item.type === "user" ? "flex-end" : "flex-start",
              background:
                item.type === "user"
                  ? `rgba(${r},${g},${b},0.25)`
                  : "rgba(255,255,255,0.06)",
              border:
                item.type === "user"
                  ? `1px solid rgba(${r},${g},${b},0.3)`
                  : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {item.text}
          </div>
        ))}
        {loading && (
          <div
            style={{
              ...styles.bubble,
              alignSelf: "flex-start",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <span style={styles.typingDot} />
            <span style={styles.typingDot} />
            <span style={styles.typingDot} />
          </div>
        )}
      </div>

      {error && <p style={styles.errorText}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={loading}
          placeholder="Sözler hakkında sor..."
          style={styles.input}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          style={{
            ...styles.sendBtn,
            background: `rgb(${r},${g},${b})`,
            opacity: loading || !message.trim() ? 0.5 : 1,
          }}
        >
          →
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    background: "rgba(18,18,18,0.85)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflow: "hidden",
    height: "100%",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 0,
  },
  emptyText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 13,
    textAlign: "center",
    margin: "auto",
  },
  bubble: {
    maxWidth: "88%",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.85)",
    display: "flex",
    gap: 4,
  },
  typingDot: {
    display: "inline-block",
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.4)",
    animation: "typingBlink 1.2s infinite",
  },
  errorText: {
    color: "rgba(255,80,80,0.8)",
    fontSize: 11,
    padding: "0 14px",
    margin: 0,
  },
  form: {
    display: "flex",
    gap: 8,
    padding: "10px 12px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "9px 12px",
    color: "#fff",
    fontSize: 13,
    outline: "none",
  },
  sendBtn: {
    border: "none",
    color: "#fff",
    borderRadius: 8,
    width: 36,
    height: 36,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
    transition: "opacity 150ms",
  },
};
