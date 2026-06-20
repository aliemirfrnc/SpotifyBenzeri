const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lingofy_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data.detail || "";
    } catch {
      // yanıt JSON değilse sessizce geç
    }
    const err = new Error(detail || `İstek başarısız oldu (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  async register(email, password) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async me() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async logout() {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async translateLine(text) {
    const res = await fetch(`${BASE_URL}/translate-line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  async translateBatch(lines) {
    const res = await fetch(`${BASE_URL}/translate-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    return handleResponse(res);
  },

  async chat(message) {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return handleResponse(res);
  },

  async getLyrics(track, artist = "") {
    const params = new URLSearchParams({ track, artist });
    const res = await fetch(`${BASE_URL}/lyrics?${params}`);
    return handleResponse(res);
  },

  async getWordInfo(word, contextLine = "") {
    const res = await fetch(`${BASE_URL}/word-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, context_line: contextLine }),
    });
    return handleResponse(res);
  },

  spotifyLoginUrl() {
    const token = getToken();
    return `${BASE_URL}/spotify/login?token=${encodeURIComponent(token || "")}`;
  },

  async spotifyStatus() {
    const res = await fetch(`${BASE_URL}/spotify/status`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async getCurrentTrack() {
    const res = await fetch(`${BASE_URL}/spotify/current-track`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async getQueue() {
    const res = await fetch(`${BASE_URL}/spotify/queue`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async spotifyPlay() {
    const res = await fetch(`${BASE_URL}/spotify/play`, {
      method: "PUT",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async spotifyPause() {
    const res = await fetch(`${BASE_URL}/spotify/pause`, {
      method: "PUT",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async spotifyNext() {
    const res = await fetch(`${BASE_URL}/spotify/next`, {
      method: "POST",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  async spotifyPrevious() {
    const res = await fetch(`${BASE_URL}/spotify/previous`, {
      method: "POST",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },
};
