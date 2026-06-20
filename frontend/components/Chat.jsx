import { useState } from "react";
import { api } from "../lib/api";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage("");
    setLoading(true);
    setError(null);

    setMessages((prev) => [...prev, { type: "user", text: userMessage }]);

    try {
      const data = await api.chat(userMessage);
      setMessages((prev) => [
        ...prev,
        { type: "assistant", text: data.response },
      ]);
    } catch (err) {
      setError(err.message || "Mesaj gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 16 }}>
        {messages.map((item, index) => (
          <li
            key={index}
            style={{
              marginBottom: 10,
              color: item.type === "user" ? "#4a1b0c" : "#712b13",
              fontFamily: "var(--font-serif, serif)",
              fontSize: 14,
            }}
          >
            <strong>{item.type === "user" ? "Sen" : "Lingofy"}:</strong>{" "}
            {item.text}
          </li>
        ))}
      </ul>

      {error && <p style={{ color: "#D85A30", fontSize: 13 }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={loading}
          placeholder="Mesaj yaz..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: "0.5px solid #e8ddc8",
            background: "#fff",
            color: "#4a1b0c",
            outline: "none",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#D85A30",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {loading ? "..." : "Gönder"}
        </button>
      </form>
    </div>
  );
}
