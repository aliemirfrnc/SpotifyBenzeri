"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function Sidebar({
  accentColor,
  selectedPlaylistId,
  onPlaylistSelect,
  onHomeClick,
}) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("library"); // "home" | "library"
  const fetchedRef = useRef(false);

  const { r = 120, g = 80, b = 200 } = accentColor || {};

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    api
      .getPlaylists()
      .then((data) => setPlaylists(data.playlists || []))
      .catch((err) => setError(err.message || "Playlistler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  function msToMin(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <span style={{ ...styles.logo, color: `rgb(${r},${g},${b})` }}>
          Lingofy
        </span>
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        <button
          style={{
            ...styles.navBtn,
            color: view === "home" ? "#fff" : "rgba(255,255,255,0.55)",
            background: view === "home" ? "rgba(255,255,255,0.08)" : "none",
          }}
          onClick={() => {
            setView("home");
            onHomeClick?.();
          }}
        >
          <span style={styles.navIcon}>⌂</span>
          Ana Sayfa
        </button>
        <button
          style={{
            ...styles.navBtn,
            color: view === "library" ? "#fff" : "rgba(255,255,255,0.55)",
            background: view === "library" ? "rgba(255,255,255,0.08)" : "none",
          }}
          onClick={() => setView("library")}
        >
          <span style={styles.navIcon}>▤</span>
          Kütüphane
        </button>
      </nav>

      <div style={styles.divider} />

      {/* Playlists */}
      <div style={styles.playlistsHeader}>
        <span style={styles.playlistsTitle}>Playlistler</span>
      </div>

      <div style={styles.playlistsList}>
        {loading && (
          <div style={styles.statusRow}>
            <div
              style={{
                ...styles.spinner,
                borderTopColor: `rgb(${r},${g},${b})`,
              }}
            />
          </div>
        )}

        {error && !loading && <p style={styles.errorText}>{error}</p>}

        {!loading && !error && playlists.length === 0 && (
          <p style={styles.emptyText}>Playlist bulunamadı.</p>
        )}

        {playlists.map((pl) => {
          const isActive = pl.id === selectedPlaylistId;
          return (
            <button
              key={pl.id}
              onClick={() => onPlaylistSelect?.(pl)}
              style={{
                ...styles.playlistBtn,
                background: isActive ? `rgba(${r},${g},${b},0.15)` : "none",
                borderLeft: isActive
                  ? `3px solid rgb(${r},${g},${b})`
                  : "3px solid transparent",
              }}
            >
              <div style={styles.plCover}>
                {pl.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pl.image}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 4,
                    }}
                  />
                ) : (
                  <span
                    style={{ fontSize: 16, color: "rgba(255,255,255,0.25)" }}
                  >
                    ♪
                  </span>
                )}
              </div>
              <div style={styles.plInfo}>
                <p
                  style={{
                    ...styles.plName,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
                  }}
                >
                  {pl.name}
                </p>
                <p style={styles.plCount}>{pl.track_count} şarkı</p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 240,
    flexShrink: 0,
    height: "100vh",
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  logoArea: {
    padding: "20px 16px 8px",
    flexShrink: 0,
  },
  logo: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  nav: {
    padding: "8px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flexShrink: 0,
  },
  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 150ms",
  },
  navIcon: { fontSize: 15, lineHeight: 1 },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "8px 16px",
    flexShrink: 0,
  },
  playlistsHeader: {
    padding: "8px 16px 6px",
    flexShrink: 0,
  },
  playlistsTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  playlistsList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px 16px",
  },
  statusRow: {
    display: "flex",
    justifyContent: "center",
    padding: "20px 0",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid rgba(255,255,255,0.08)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorText: {
    fontSize: 12,
    color: "rgba(255,80,80,0.7)",
    padding: "8px 8px",
    margin: 0,
  },
  emptyText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.25)",
    padding: "8px 8px",
    margin: 0,
  },
  playlistBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 10px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 120ms",
  },
  plCover: {
    width: 36,
    height: 36,
    borderRadius: 5,
    background: "rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  plInfo: { minWidth: 0 },
  plName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  plCount: {
    margin: "2px 0 0",
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
  },
};
