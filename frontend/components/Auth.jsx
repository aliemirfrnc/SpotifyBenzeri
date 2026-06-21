"use client";

import { useState } from "react";
import { api } from "../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Geçerli bir e-posta adresi gir.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      const data =
        mode === "login"
          ? await api.login(trimmedEmail, password)
          : await api.register(trimmedEmail, password);
      onAuthenticated(data.email);
    } catch (err) {
      setError(err.message || "İşlem başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => {
            setMode("login");
            setError(null);
          }}
        >
          Giriş yap
        </button>
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => {
            setMode("register");
            setError(null);
          }}
        >
          Kayıt ol
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@email.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </label>

        {mode === "register" && (
          <label>
            Şifre tekrar
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifreni tekrar gir"
              autoComplete="new-password"
              required
            />
          </label>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Bekle..." : mode === "login" ? "Giriş yap" : "Kayıt ol"}
        </button>
      </form>

      <style jsx>{`
        .auth-card {
          width: 100%;
          max-width: 380px;
          background: #fff;
          border-radius: 12px;
          padding: 28px;
          box-shadow: 0 4px 24px rgba(74, 27, 12, 0.08);
        }
        .auth-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .auth-tabs button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: #f5efe3;
          color: #4a1b0c;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .auth-tabs button.active {
          background: #c45c3e;
          color: #fff;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .auth-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: #4a1b0c;
          font-weight: 500;
        }
        .auth-form input {
          padding: 10px 12px;
          border: 1px solid #e8ddd0;
          border-radius: 8px;
          font-size: 14px;
          color: #4a1b0c;
          background: #faf6ee;
        }
        .auth-form input:focus {
          outline: none;
          border-color: #c45c3e;
        }
        .auth-error {
          margin: 0;
          font-size: 13px;
          color: #b91c1c;
        }
        .auth-form button[type="submit"] {
          margin-top: 4px;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: #4a1b0c;
          color: #fff;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
        }
        .auth-form button[type="submit"]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
