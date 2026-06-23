"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function NowPlaying({
  onTrackChange,
  onProgress,
  onTrackData,
  accentColor,
}) {
  const [connected, setConnected] = useState(null);
  const [track, setTrack] = useState(null);
  const [error, setError] = useState(null);
  const lastTrackKey = useRef(null);
  const fetchInFlightRef = useRef(false);

  const { r = 120, g = 80, b = 200 } = accentColor || {};

  const checkStatus = useCallback(() => {
    api
      .spotifyStatus()
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify_connected")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    checkStatus();
  }, [checkStatus]);

  const prefetchNext = useCallback(() => {
    api
      .getQueue()
      .then((q) => {
        if (q.track_name)
          api.getLyrics(q.track_name, q.artist || "").catch(() => {});
      })
      .catch(() => {});
  }, []);

  const fetchTrack = useCallback(() => {
    if (!connected || fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    api
      .getCurrentTrack()
      .then((data) => {
        setTrack(data);
        setError(null);
        onTrackData?.(data);
        if (data.track_name) {
          const key = `${data.track_name}::${data.artist}`;
          if (key !== lastTrackKey.current) {
            lastTrackKey.current = key;
            onTrackChange?.(data.track_name, data.artist);
            prefetchNext();
          }
        }
        onProgress?.(data.progress_ms, data.duration_ms, data.is_playing);
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 404) {
          setConnected(false);
          setTrack(null);
          onTrackData?.(null);
        } else {
          setError(err.message || "Spotify verisi alınamadı.");
        }
      })
      .finally(() => {
        fetchInFlightRef.current = false;
      });
  }, [connected, onTrackChange, onProgress, onTrackData, prefetchNext]);

  useEffect(() => {
    if (!connected) return;
    fetchTrack();
    const interval = setInterval(fetchTrack, 2000);
    return () => clearInterval(interval);
  }, [connected, fetchTrack]);

  const handleConnect = () => {
    api
      .spotifyConnectUrl()
      .then((url) => {
        window.location.href = url;
      })
      .catch((err) => setError(err.message || "Bağlantı başlatılamadı."));
  };

  const handlePlayPause = () => {
    const action = track?.is_playing ? api.spotifyPause : api.spotifyPlay;
    action()
      .then(fetchTrack)
      .catch((err) => setError(err.message || "Komut başarısız."));
  };

  const handleNext = () => {
    api
      .spotifyNext()
      .then(() => setTimeout(fetchTrack, 500))
      .catch((err) => setError(err.message || "Sıradaki şarkıya geçilemedi."));
  };

  const handlePrevious = () => {
    api
      .spotifyPrevious()
      .then(() => setTimeout(fetchTrack, 500))
      .catch((err) => setError(err.message || "Önceki şarkıya geçilemedi."));
  };

  if (connected === null) return <div style={{ height: 80 }} />;

  if (!connected) {
    return (
      <div style={styles.connectCard}>
        <p style={styles.connectText}>Spotify ile bağlan</p>
        <button
          onClick={handleConnect}
          style={{ ...styles.connectBtn, background: `rgb(${r},${g},${b})` }}
        >
          Bağlan
        </button>
        {error && <p style={styles.errorText}>{error}</p>}
      </div>
    );
  }

  const progressPct =
    track?.progress_ms && track?.duration_ms
      ? Math.min(100, (track.progress_ms / track.duration_ms) * 100)
      : 0;

  return (
    <div style={styles.card}>
      <div style={styles.trackRow}>
        <div style={styles.cover}>
          {track?.album_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.album_image}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 6,
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.3)" }}>
              ♪
            </span>
          )}
        </div>
        <div style={styles.trackInfo}>
          <p style={styles.trackName}>{track?.track_name || "—"}</p>
          <p style={styles.artistName}>{track?.artist || "—"}</p>
        </div>
      </div>

      <div style={styles.progressBg}>
        <div
          style={{
            ...styles.progressFill,
            width: `${progressPct}%`,
            background: `rgb(${r},${g},${b})`,
          }}
        />
      </div>

      <div style={styles.controls}>
        <button onClick={handlePrevious} style={styles.ctrlBtn}>
          ⏮
        </button>
        <button
          onClick={handlePlayPause}
          style={{ ...styles.playBtn, background: `rgb(${r},${g},${b})` }}
        >
          {track?.is_playing ? "⏸" : "▶"}
        </button>
        <button onClick={handleNext} style={styles.ctrlBtn}>
          ⏭
        </button>
      </div>

      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

const styles = {
  connectCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "20px",
    textAlign: "center",
    marginBottom: 16,
  },
  connectText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    margin: "0 0 12px",
  },
  connectBtn: {
    border: "none",
    color: "#fff",
    borderRadius: 999,
    padding: "9px 22px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(16px)",
    borderRadius: 14,
    padding: "14px",
    marginBottom: 16,
  },
  trackRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  cover: {
    width: 42,
    height: 42,
    borderRadius: 7,
    background: "rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  trackInfo: { minWidth: 0 },
  trackName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  artistName: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    margin: "2px 0 0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  progressBg: {
    height: 2,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 1,
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
    transition: "width 1s linear",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  ctrlBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    cursor: "pointer",
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 12,
  },
  errorText: {
    color: "rgba(255,80,80,0.8)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
};
