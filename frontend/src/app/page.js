"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Chat from "../../components/Chat";
import DynamicBackground from "../../components/DynamicBackground";
import LandingPage from "../../components/LandingPage";
import LyricsPlayer from "../../components/LyricsPlayer";
import NowPlaying from "../../components/NowPlaying";
import PlaylistView from "../../components/PlaylistView";
import Sidebar from "../../components/Sidebar";
import WordPanel from "../../components/WordPanel";
import { api, clearTokens } from "../../lib/api";

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState(null);

  const [accentColor, setAccentColor] = useState({ r: 60, g: 60, b: 100 });
  const [albumImage, setAlbumImage] = useState(null);

  // Playlist state
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [centerView, setCenterView] = useState("lyrics"); // "lyrics" | "playlist"

  // NowPlaying state
  const [currentTrackName, setCurrentTrackName] = useState(null);
  const [currentArtist, setCurrentArtist] = useState(null);

  // Word panel state
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordInfo, setWordInfo] = useState(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordError, setWordError] = useState(null);
  const [lastContextLine, setLastContextLine] = useState("");
  const wordRequestRef = useRef(0);

  // LyricsPlayer callbacks
  const trackChangeCallbackRef = useRef(null);
  const progressCallbackRef = useRef(null);
  const registerTrackChange = useCallback((cb) => {
    trackChangeCallbackRef.current = cb;
  }, []);
  const registerProgress = useCallback((cb) => {
    progressCallbackRef.current = cb;
  }, []);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("lingofy_access_token");
    const req = token ? api.me() : Promise.resolve(null);
    req
      .then((data) => {
        if (data) setAuthEmail(data.email);
      })
      .catch(() => clearTokens())
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogout = useCallback(() => {
    api.logout().catch(() => {});
    setAuthEmail(null);
  }, []);

  // Spotify → LyricsPlayer bridge
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

  // Playlist → şarkı seç
  const handlePlaylistSelect = useCallback((playlist) => {
    setSelectedPlaylist(playlist);
    setCenterView("playlist");
    setSelectedTrack(null);
  }, []);

  const handleTrackSelect = useCallback((track) => {
    setSelectedTrack(track);
    setAlbumImage(track.album_image ?? null);

    // LyricsPlayer'a şarkı bilgisini ilet
    trackChangeCallbackRef.current?.(track.name, track.artist);

    // Spotify Premium kullanıcısı için çalmayı başlat (başarısız olursa sessizce geç)
    api.playTrack(`spotify:track:${track.id}`).catch(() => {});

    // Lyrics ekranına geç
    setCenterView("lyrics");
  }, []);

  // Word panel
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
    const reqId = ++wordRequestRef.current;

    setSelectedWord(cleaned);
    setLastContextLine(contextLine);
    setWordInfo(null);
    setWordError(null);
    setWordLoading(true);

    api
      .getWordInfo(cleaned, contextLine)
      .then((data) => {
        if (reqId === wordRequestRef.current) setWordInfo(data);
      })
      .catch((err) => {
        if (reqId === wordRequestRef.current)
          setWordError(err.message || "Kelime bilgisi alınamadı.");
      })
      .finally(() => {
        if (reqId === wordRequestRef.current) setWordLoading(false);
      });
  }, []);

  if (!authChecked)
    return <div style={{ minHeight: "100vh", background: "#0a0a0a" }} />;
  if (!authEmail)
    return <LandingPage onAuthenticated={(email) => setAuthEmail(email)} />;

  return (
    <main style={styles.page}>
      <DynamicBackground
        albumImage={albumImage}
        onColorExtracted={setAccentColor}
      />

      <div style={styles.layout}>
        {/* SOL: Sidebar */}
        <Sidebar
          accentColor={accentColor}
          selectedPlaylistId={selectedPlaylist?.id}
          onPlaylistSelect={handlePlaylistSelect}
          onHomeClick={() => setCenterView("lyrics")}
        />

        {/* ORTA: Lyrics veya Playlist */}
        <div style={styles.centerCol}>
          {/* Ortak header */}
          <div style={styles.header}>
            <span
              style={{
                ...styles.logoMini,
                color: `rgb(${accentColor.r},${accentColor.g},${accentColor.b})`,
              }}
            >
              {centerView === "playlist" && selectedPlaylist
                ? selectedPlaylist.name
                : currentTrackName
                  ? `${currentTrackName}${currentArtist ? ` — ${currentArtist}` : ""}`
                  : "Lingofy"}
            </span>
            <div style={{ flex: 1 }} />
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Çıkış ({authEmail})
            </button>
          </div>

          <NowPlaying
            onTrackChange={handleTrackChange}
            onProgress={handleProgress}
            onTrackData={handleTrackData}
            accentColor={accentColor}
          />

          <div style={styles.contentArea}>
            {centerView === "playlist" && selectedPlaylist ? (
              <PlaylistView
                playlist={selectedPlaylist}
                accentColor={accentColor}
                onTrackSelect={handleTrackSelect}
                selectedTrackId={selectedTrack?.id}
                onClose={() => setCenterView("lyrics")}
              />
            ) : (
              <LyricsPlayer
                accentColor={accentColor}
                onWordClick={handleWordClick}
                onTrackChange={registerTrackChange}
                onProgress={registerProgress}
              />
            )}
          </div>
        </div>

        {/* SAĞ: Word panel veya Chat */}
        <div style={styles.rightCol}>
          {selectedWord ? (
            <>
              <WordPanel
                selectedWord={selectedWord}
                wordInfo={wordInfo}
                wordLoading={wordLoading}
                wordError={wordError}
                accentColor={accentColor}
                onRetry={() => handleWordClick(selectedWord, lastContextLine)}
                onClose={handleWordClose}
              />
              <div style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
                <Chat accentColor={accentColor} />
              </div>
            </>
          ) : (
            <Chat accentColor={accentColor} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
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
  },
  centerCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    padding: "16px 12px 0 16px",
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    flexShrink: 0,
  },
  logoMini: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    flexShrink: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 300,
  },
  logoutBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.3)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  rightCol: {
    width: 300,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    padding: "16px 16px 20px 4px",
    gap: 0,
    overflow: "hidden",
  },
};
