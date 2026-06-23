"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

function msToMin(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlaylistView({
  playlist,
  accentColor,
  onTrackSelect,
  selectedTrackId,
  onClose,
}) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playlistName, setPlaylistName] = useState(playlist?.name || "");
  const loadedIdRef = useRef(null);

  const { r = 120, g = 80, b = 200 } = accentColor || {};

  useEffect(() => {
    if (!playlist?.id || playlist.id === loadedIdRef.current) return;
    loadedIdRef.current = playlist.id;
    setLoading(true);
    setError(null);
    setTracks([]);

    api
      .getPlaylistTracks(playlist.id)
      .then((data) => {
        setPlaylistName(data.playlist_name || playlist.name);
        setTracks(data.tracks || []);
      })
      .catch((err) => setError(err.message || "Şarkılar yüklenemedi."))
      .finally(() => setLoading(false));
  }, [playlist]);

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onClose} aria-label="Geri">
          ←
        </button>
        <div style={styles.headerInfo}>
          {playlist?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playlist.image}
              alt=""
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <p style={styles.playlistLabel}>PLAYLIST</p>
            <p style={styles.playlistName}>{playlistName}</p>
          </div>
        </div>
      </div>

      <div
        style={{ ...styles.divider, background: `rgba(${r},${g},${b},0.15)` }}
      />

      {/* Track listesi */}
      {loading && (
        <div style={styles.center}>
          <div
            style={{ ...styles.spinner, borderTopColor: `rgb(${r},${g},${b})` }}
          />
        </div>
      )}

      {error && !loading && (
        <div style={styles.center}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div style={styles.trackList}>
          {tracks.map((track, i) => {
            const isActive = track.id === selectedTrackId;
            return (
              <button
                key={track.id}
                style={{
                  ...styles.trackBtn,
                  background: isActive ? `rgba(${r},${g},${b},0.15)` : "none",
                }}
                onClick={() => onTrackSelect?.(track)}
              >
                {/* Numara / aktif gösterge */}
                <div style={styles.trackNum}>
                  {isActive ? (
                    <span
                      style={{
                        ...styles.activeIcon,
                        color: `rgb(${r},${g},${b})`,
                      }}
                    >
                      ▶
                    </span>
                  ) : (
                    <span style={styles.numText}>{i + 1}</span>
                  )}
                </div>

                {/* Albüm kapak */}
                <div style={styles.trackCover}>
                  {track.album_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.album_image}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  ) : (
                    <span style={styles.coverFallback}>♪</span>
                  )}
                </div>

                {/* Şarkı bilgisi */}
                <div style={styles.trackInfo}>
                  <p
                    style={{
                      ...styles.trackName,
                      color: isActive ? `rgb(${r},${g},${b})` : "#fff",
                    }}
                  >
                    {track.name}
                  </p>
                  <p style={styles.trackArtist}>
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ""}
                  </p>
                </div>

                {/* Süre */}
                <span style={styles.duration}>
                  {msToMin(track.duration_ms)}
                </span>
              </button>
            );
          })}

          {tracks.length === 0 && (
            <p
              style={{
                ...styles.errorText,
                textAlign: "center",
                marginTop: 40,
              }}
            >
              Bu playlist boş.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "16px 16px 12px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    background: "rgba(255,255,255,0.07)",
    border: "none",
    color: "rgba(255,255,255,0.7)",
    width: 30,
    height: 30,
    borderRadius: "50%",
    fontSize: 15,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  playlistLabel: {
    margin: 0,
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  playlistName: {
    margin: "2px 0 0",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  divider: {
    height: 1,
    margin: "0 16px 8px",
    flexShrink: 0,
  },
  center: {
    display: "flex",
    justifyContent: "center",
    padding: "40px 0",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "2px solid rgba(255,255,255,0.08)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorText: {
    fontSize: 12,
    color: "rgba(255,80,80,0.7)",
    margin: 0,
  },
  trackList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px 16px",
  },
  trackBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "7px 10px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 120ms",
  },
  trackNum: {
    width: 24,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    fontVariantNumeric: "tabular-nums",
  },
  activeIcon: { fontSize: 10 },
  trackCover: {
    width: 38,
    height: 38,
    borderRadius: 5,
    background: "rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  coverFallback: { fontSize: 14, color: "rgba(255,255,255,0.2)" },
  trackInfo: { flex: 1, minWidth: 0 },
  trackName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "color 120ms",
  },
  trackArtist: {
    margin: "2px 0 0",
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  duration: { fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 },
};
