const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const ACCESS_KEY = "lingofy_access_token";
const REFRESH_KEY = "lingofy_refresh_token";
const LEGACY_KEY = "lingofy_token";

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken, refreshToken) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.removeItem(LEGACY_KEY);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

function authHeaders() {
  const token = getAccessToken();
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

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Oturum süresi dolmuş, tekrar giriş yap.");
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(handleResponse)
      .then((data) => {
        setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function authFetch(url, options = {}, retried = false) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders(),
    },
  });

  if (res.status === 401 && !retried) {
    try {
      await refreshAccessToken();
    } catch {
      clearTokens();
      throw new Error("Oturum süresi dolmuş, tekrar giriş yap.");
    }
    return authFetch(url, options, true);
  }

  return handleResponse(res);
}

export const api = {
  async register(email, password) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async me() {
    return authFetch(`${BASE_URL}/auth/me`);
  },

  async logout() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return { status: "ok" };
    }
    try {
      await authFetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // oturum zaten geçersiz olabilir
    } finally {
      clearTokens();
    }
    return { status: "ok" };
  },

  async translateLine(text) {
    return authFetch(`${BASE_URL}/translate-line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

  async translateBatch(lines) {
    return authFetch(`${BASE_URL}/translate-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
  },

  async chat(message) {
    return authFetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  },

  async getLyrics(track, artist = "") {
    const params = new URLSearchParams({ track, artist });
    const res = await fetch(`${BASE_URL}/lyrics?${params}`);
    return handleResponse(res);
  },

  async getWordInfo(word, contextLine = "") {
    return authFetch(`${BASE_URL}/word-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, context_line: contextLine }),
    });
  },

  async spotifyConnectUrl() {
    const data = await authFetch(`${BASE_URL}/spotify/connect-token`);
    return `${BASE_URL}/spotify/login?token=${encodeURIComponent(data.connect_token)}`;
  },

  async spotifyStatus() {
    return authFetch(`${BASE_URL}/spotify/status`);
  },

  async getCurrentTrack() {
    return authFetch(`${BASE_URL}/spotify/current-track`);
  },

  async getQueue() {
    return authFetch(`${BASE_URL}/spotify/queue`);
  },

  async spotifyPlay() {
    return authFetch(`${BASE_URL}/spotify/play`, { method: "PUT" });
  },

  async spotifyPause() {
    return authFetch(`${BASE_URL}/spotify/pause`, { method: "PUT" });
  },

  async spotifyNext() {
    return authFetch(`${BASE_URL}/spotify/next`, { method: "POST" });
  },

  async spotifyPrevious() {
    return authFetch(`${BASE_URL}/spotify/previous`, { method: "POST" });
  },
};
