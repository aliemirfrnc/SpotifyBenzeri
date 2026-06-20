import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function NowPlaying({ onTrackChange, onProgress }) {
  const [connected, setConnected] = useState(null);
  const [track, setTrack] = useState(null);
  const [error, setError] = useState(null);
  const lastTrackKey = useRef(null);

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
        if (q.track_name) {
          api.getLyrics(q.track_name, q.artist || "").catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const fetchTrack = useCallback(() => {
    if (!connected) return;
    api
      .getCurrentTrack()
      .then((data) => {
        setTrack(data);
        setError(null);

        if (data.is_playing && data.track_name) {
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
        } else {
          setError(err.message || "Spotify verisi alınamadı.");
        }
      });
  }, [connected, onTrackChange, onProgress, prefetchNext]);

  useEffect(() => {
    if (!connected) return;
    fetchTrack();
    const interval = setInterval(fetchTrack, 2000);
    return () => clearInterval(interval);
  }, [connected, fetchTrack]);

  const handleConnect = () => {
    window.location.href = api.spotifyLoginUrl();
  };

  const handlePlayPause = () => {
    const action = track?.is_playing ? api.spotifyPause : api.spotifyPlay;
    action()
      .then(fetchTrack)
      .catch((err) => setError(err.message || "Komut gönderilemedi."));
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

  if (connected === null) return null;

  if (!connected) {
    return (
      <div style={cardStyle}>
        <p
          style={{
            color: "#4A1B0C",
            fontSize: 14,
            margin: "0 0 10px",
            fontFamily: "var(--font-serif, serif)",
          }}
        >
          Spotify hesabını bağla
        </p>
        <button onClick={handleConnect} style={connectBtnStyle}>
          Spotify’a bağlan
        </button>
      </div>
    );
  }

  const progressPct =
    track?.progress_ms && track?.duration_ms
      ? Math.min(100, (track.progress_ms / track.duration_ms) * 100)
      : 0;

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={coverStyle}>
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
            />
          ) : (
            <span style={{ fontSize: 18, color: "#b0a89a" }}>♪</span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={titleStyle}>
            {track?.track_name ||
              (error ? "Veri alınamadı" : "Bir şey çalmıyor")}
          </p>
          <p style={subtitleStyle}>{track?.artist || "—"}</p>
        </div>
      </div>

      <div
        style={{
          height: 3,
          background: "#e8ddc8",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "#D85A30",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <button onClick={handlePrevious} style={iconBtnStyle}>
          ⏮
        </button>
        <button onClick={handlePlayPause} style={playBtnStyle}>
          {track?.is_playing ? "⏸" : "▶"}
        </button>
        <button onClick={handleNext} style={iconBtnStyle}>
          ⏭
        </button>
      </div>

      {error && (
        <p
          style={{
            color: "#D85A30",
            fontSize: 11,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "0.5px solid #e8ddc8",
  borderRadius: 12,
  padding: 14,
  marginBottom: 32,
  textAlign: "center",
};

const coverStyle = {
  width: 44,
  height: 44,
  borderRadius: 6,
  background: "#f0e6d2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  overflow: "hidden",
};

const titleStyle = {
  color: "#4A1B0C",
  fontSize: 14,
  fontWeight: 500,
  margin: 0,
  fontFamily: "var(--font-serif, serif)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
};

const subtitleStyle = {
  color: "#9c8f7a",
  fontSize: 12,
  margin: 0,
  textAlign: "left",
};

const connectBtnStyle = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: "#D85A30",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 14,
};

const iconBtnStyle = {
  background: "none",
  border: "none",
  color: "#9c8f7a",
  fontSize: 16,
  cursor: "pointer",
  padding: 0,
};

const playBtnStyle = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "#D85A30",
  border: "none",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
