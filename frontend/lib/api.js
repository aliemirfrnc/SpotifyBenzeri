const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

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

async function request(path, options = {}) {
  if (!BASE_URL) {
    throw new Error(
      "API adresi yapılandırılmamış. NEXT_PUBLIC_API_URL değerini kontrol et.",
    );
  }

  try {
    return await fetch(`${BASE_URL}${path}`, options);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(
      "Sunucuya ulaşılamadı. Bağlantını ve API adresini kontrol et.",
      {
        cause: error,
      },
    );
  }
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Oturum süresi dolmuş, tekrar giriş yap.");
  }

  if (!refreshPromise) {
    refreshPromise = request("/auth/refresh", {
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

async function authFetch(path, options = {}, retried = false) {
  const res = await request(path, {
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
    return authFetch(path, options, true);
  }

  return handleResponse(res);
}

export const api = {
  async register(email, password) {
    const res = await request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async login(email, password) {
    const res = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async me() {
    return authFetch("/auth/me");
  },

  async logout() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return { status: "ok" };
    }
    try {
      await authFetch("/auth/logout", {
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
    return authFetch("/translate-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

  async translateBatch(lines) {
    return authFetch("/translate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
  },

  async chat(message) {
    return authFetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  },

  async getLyrics(track, artist = "", options = {}) {
    const params = new URLSearchParams({ track, artist });
    const res = await request(`/lyrics?${params}`, options);
    return handleResponse(res);
  },

  async getWordInfo(word, contextLine = "") {
    return authFetch("/word-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, context_line: contextLine }),
    });
  },

  async spotifyConnectUrl() {
    const data = await authFetch("/spotify/connect-token");
    return `${BASE_URL}/spotify/login?token=${encodeURIComponent(data.connect_token)}`;
  },

  async spotifyStatus() {
    return authFetch("/spotify/status");
  },

  async getCurrentTrack() {
    return authFetch("/spotify/current-track");
  },

  async getQueue() {
    return authFetch("/spotify/queue");
  },

  async spotifyPlay() {
    return authFetch("/spotify/play", { method: "PUT" });
  },

  async spotifyPause() {
    return authFetch("/spotify/pause", { method: "PUT" });
  },

  async spotifyNext() {
    return authFetch("/spotify/next", { method: "POST" });
  },

  async spotifyPrevious() {
    return authFetch("/spotify/previous", { method: "POST" });
  },
};
