"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Chat from "../../components/Chat";
import DynamicBackground from "../../components/DynamicBackground";
import LandingPage from "../../components/LandingPage";
import LyricsPlayer from "../../components/LyricsPlayer";
import NowPlaying from "../../components/NowPlaying";
import WordPanel from "../../components/WordPanel";
import { api, clearTokens } from "../../lib/api";

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState(null);

  const [accentColor, setAccentColor] = useState({ r: 60, g: 60, b: 100 });
  const [albumImage, setAlbumImage] = useState(null);

  const [currentTrackName, setCurrentTrackName] = useState(null);
  const [currentArtist, setCurrentArtist] = useState(null);

  const [selectedWord, setSelectedWord] = useState(null);
  const [wordInfo, setWordInfo] = useState(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordError, setWordError] = useState(null);
  const [lastContextLine, setLastContextLine] = useState("");
  const wordRequestRef = useRef(0);

  // Callbacks refs — LyricsPlayer'a iletmek için
  const trackChangeCallbackRef = useRef(null);
  const progressCallbackRef = useRef(null);
  const registerTrackChange = useCallback((callback) => {
    trackChangeCallbackRef.current = callback;
  }, []);
  const registerProgress = useCallback((callback) => {
    progressCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("lingofy_access_token");
    const authRequest = token ? api.me() : Promise.resolve(null);
    authRequest
      .then((data) => {
        if (data) setAuthEmail(data.email);
      })
      .catch(() => {
        clearTokens();
        setAuthEmail(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogout = useCallback(() => {
    api.logout().catch(() => {});
    setAuthEmail(null);
  }, []);

  // NowPlaying → LyricsPlayer köprüsü
  const handleTrackChange = useCallback((trackName, artist) => {
    setCurrentTrackName(trackName);
    setCurrentArtist(artist);
    trackChangeCallbackRef.current?.(trackName, artist);
  }, []);

  const handleProgress = useCallback((progressMs, dur, isPlaying) => {
    progressCallbackRef.current?.(progressMs, dur, isPlaying);
  }, []);

  const handleTrackData = useCallback((trackData) => {
    setAlbumImage(trackData?.album_image ?? null);
  }, []);

  const handleWordClose = useCallback(() => {
    wordRequestRef.current += 1;
    setSelectedWord(null);
    setWordLoading(false);
  }, []);

  const handleWordClick = useCallback((rawWord, contextLine) => {
    const cleaned = rawWord.replace(
      /^[.,!?;:"'()[\]{}…—-]+|[.,!?;:"'()[\]{}…—-]+$/g,
      "",
    );
    if (!cleaned) return;
    const requestId = wordRequestRef.current + 1;
    wordRequestRef.current = requestId;

    setSelectedWord(cleaned);
    setLastContextLine(contextLine);
    setWordInfo(null);
    setWordError(null);
    setWordLoading(true);

    api
      .getWordInfo(cleaned, contextLine)
      .then((data) => {
        if (requestId === wordRequestRef.current) setWordInfo(data);
      })
      .catch((err) => {
        if (requestId === wordRequestRef.current) {
          setWordError(err.message || "Kelime bilgisi alınamadı.");
        }
      })
      .finally(() => {
        if (requestId === wordRequestRef.current) setWordLoading(false);
      });
  }, []);

  if (!authChecked) {
    return <div style={{ minHeight: "100vh", background: "#0a0a0a" }} />;
  }

  if (!authEmail) {
    return <LandingPage onAuthenticated={(email) => setAuthEmail(email)} />;
  }

  return (
    <main style={styles.page}>
      <DynamicBackground
        albumImage={albumImage}
        onColorExtracted={setAccentColor}
      />

      <div style={styles.layout}>
        {/* SOL: Player (%68) */}
        <div style={styles.leftCol}>
          {/* Header */}
          <div style={styles.header}>
            <span
              style={{
                ...styles.logoMini,
                color: `rgb(${accentColor.r},${accentColor.g},${accentColor.b})`,
              }}
            >
              Lingofy
            </span>
            {currentTrackName && (
              <span style={styles.nowPlayingLabel}>
                {currentTrackName}
                {currentArtist ? ` — ${currentArtist}` : ""}
              </span>
            )}
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Çıkış
            </button>
          </div>

          <NowPlaying
            onTrackChange={handleTrackChange}
            onProgress={handleProgress}
            onTrackData={handleTrackData}
            accentColor={accentColor}
          />

          <div style={styles.lyricsArea}>
            <LyricsPlayer
              accentColor={accentColor}
              onWordClick={handleWordClick}
              onTrackChange={registerTrackChange}
              onProgress={registerProgress}
            />
          </div>
        </div>

        {/* SAĞ: Sidebar (%32) */}
        <div style={styles.rightCol}>
          {selectedWord ? (
            <WordPanel
              selectedWord={selectedWord}
              wordInfo={wordInfo}
              wordLoading={wordLoading}
              wordError={wordError}
              accentColor={accentColor}
              onRetry={() => handleWordClick(selectedWord, lastContextLine)}
              onClose={handleWordClose}
            />
          ) : (
            <Chat accentColor={accentColor} />
          )}

          {selectedWord && (
            <div style={{ marginTop: 12, flexShrink: 0 }}>
              <Chat accentColor={accentColor} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes typingBlink {
          0%, 60%, 100% { opacity: 0.2; }
          30% { opacity: 1; }
        }
        input::placeholder { color: rgba(255,255,255,0.25); }
        button:focus-visible { outline: 2px solid rgba(255,255,255,0.4); outline-offset: 2px; }
      `}</style>
    </main>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
  },
  layout: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    height: "100vh",
    gap: 0,
  },
  leftCol: {
    flex: "0 0 68%",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    padding: "16px 20px 0 24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    flexShrink: 0,
  },
  logoMini: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    flexShrink: 0,
  },
  nowPlayingLabel: {
    flex: 1,
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  logoutBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.35)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
    flexShrink: 0,
  },
  lyricsArea: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  rightCol: {
    flex: "0 0 32%",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    padding: "16px 20px 20px 4px",
    gap: 12,
    overflow: "hidden",
  },
};
