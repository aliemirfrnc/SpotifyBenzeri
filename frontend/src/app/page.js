"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Auth from "../../components/Auth";
import Chat from "../../components/Chat";
import ErrorBanner from "../../components/ErrorBanner";
import NowPlaying from "../../components/NowPlaying";
import { api, clearTokens } from "../../lib/api";

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState(null);

  const [lyrics, setLyrics] = useState([]);
  const [synced, setSynced] = useState(null);
  const [translation, setTranslation] = useState({});
  const [selectedLine, setSelectedLine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [playback, setPlayback] = useState({ progressMs: 0, isPlaying: false });
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);
  const [autoFollow, setAutoFollow] = useState(true);

  const [translatingAll, setTranslatingAll] = useState(false);
  const [translateAllError, setTranslateAllError] = useState(null);
  const [showFullTranslation, setShowFullTranslation] = useState(false);

  const [selectedWord, setSelectedWord] = useState(null);
  const [wordInfo, setWordInfo] = useState(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordError, setWordError] = useState(null);

  const lineRefs = useRef([]);
  const idleTimerRef = useRef(null);
  const programmaticScrollUntil = useRef(0);
  const lastTrackRef = useRef("test");
  const lastArtistRef = useRef("");

  useEffect(() => {
    const token = localStorage.getItem("lingofy_access_token");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
      return;
    }
    api
      .me()
      .then((data) => setAuthEmail(data.email))
      .catch(() => clearTokens())
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogout = useCallback(() => {
    api.logout().catch(() => {});
    setAuthEmail(null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("lingofy_sync_offset");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSyncOffsetMs(parseInt(stored, 10) || 0);
  }, []);

  const adjustOffset = useCallback((deltaMs) => {
    setSyncOffsetMs((prev) => {
      const next = prev + deltaMs;
      localStorage.setItem("lingofy_sync_offset", String(next));
      return next;
    });
  }, []);

  const pauseAutoFollow = useCallback(() => {
    setAutoFollow(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setAutoFollow(true), 6000);
  }, []);

  const resumeAutoFollow = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setAutoFollow(true);
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (Date.now() < programmaticScrollUntil.current) return;
      pauseAutoFollow();
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pauseAutoFollow]);

  const loadLyrics = useCallback((track, artist = "") => {
    lastTrackRef.current = track;
    lastArtistRef.current = artist;

    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setTranslation({});
    setSelectedLine(null);
    setSynced(null);
    setAutoFollow(true);
    setSelectedWord(null);
    setTranslateAllError(null);
    setShowFullTranslation(false);

    api
      .getLyrics(track, artist)
      .then((data) => {
        setLyrics(data.lyrics);
        setSynced(data.synced && data.synced.length > 0 ? data.synced : null);
      })
      .catch((err) => {
        setError(err.message || "Şarkı sözleri yüklenemedi.");
        setErrorStatus(err.status || null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authEmail) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLyrics("test");
  }, [authEmail, loadLyrics]);

  const handleTrackChange = useCallback(
    (trackName, artist) => {
      setPlayback({ progressMs: 0, isPlaying: false });
      loadLyrics(trackName, artist);
    },
    [loadLyrics],
  );

  const handleProgress = useCallback((progressMs, durationMs, isPlaying) => {
    setPlayback({ progressMs: progressMs ?? 0, isPlaying: !!isPlaying });
  }, []);

  useEffect(() => {
    if (!playback.isPlaying) return;
    const id = setInterval(() => {
      setPlayback((p) => ({ ...p, progressMs: p.progressMs + 1000 }));
    }, 1000);
    return () => clearInterval(id);
  }, [playback.isPlaying]);

  const currentLineIndex = useMemo(() => {
    if (!synced || synced.length === 0) return null;
    const progressSec = (playback.progressMs + syncOffsetMs) / 1000;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= progressSec) idx = i;
      else break;
    }
    return idx >= 0 ? idx : null;
  }, [synced, playback.progressMs, syncOffsetMs]);

  useEffect(() => {
    if (!autoFollow || currentLineIndex === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedLine((prev) =>
      prev === currentLineIndex ? prev : currentLineIndex,
    );
  }, [currentLineIndex, autoFollow]);

  useEffect(() => {
    if (!autoFollow || selectedLine === null) return;
    const el = lineRefs.current[selectedLine];
    if (el) {
      programmaticScrollUntil.current = Date.now() + 800;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedLine, autoFollow]);

  const translateLine = useCallback((line) => {
    if (!line) return;
    setTranslation((prev) => {
      if (prev[line] !== undefined) return prev;
      api
        .translateLine(line)
        .then((data) =>
          setTranslation((p) => ({ ...p, [line]: data.translation })),
        )
        .catch(() => setTranslation((p) => ({ ...p, [line]: null })));
      return prev;
    });
  }, []);

  useEffect(() => {
    if (selectedLine === null) return;
    const line = lyrics[selectedLine];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (line) translateLine(line);

    const nextLine = lyrics[selectedLine + 1];

    if (nextLine) translateLine(nextLine);
  }, [selectedLine, lyrics, translateLine]);

  const handleTranslateAll = useCallback(() => {
    const pending = lyrics.filter(
      (line) => line.trim() && translation[line] === undefined,
    );

    setSelectedWord(null);

    if (pending.length === 0) {
      setShowFullTranslation(true);
      return;
    }

    setTranslatingAll(true);
    setTranslateAllError(null);

    api
      .translateBatch(pending)
      .then((data) => {
        setTranslation((prev) => {
          const next = { ...prev, ...data.translations };
          (data.failed || []).forEach((line) => {
            next[line] = null;
          });
          return next;
        });
        if (data.failed && data.failed.length > 0) {
          setTranslateAllError(
            `${data.failed.length} satır çevrilemedi. Tekrar deneyebilirsin.`,
          );
        }
        setShowFullTranslation(true);
      })
      .catch((err) => {
        setTranslateAllError(err.message || "Çeviri yapılamadı.");
      })
      .finally(() => setTranslatingAll(false));
  }, [lyrics, translation]);

  const handleWordClick = useCallback((rawWord, contextLine) => {
    const cleaned = rawWord.replace(
      /^[.,!?;:"'()[\]{}…—-]+|[.,!?;:"'()[\]{}…—-]+$/g,
      "",
    );
    if (!cleaned) return;

    setShowFullTranslation(false);
    setSelectedWord(cleaned);
    setWordInfo(null);
    setWordError(null);
    setWordLoading(true);

    api
      .getWordInfo(cleaned, contextLine)
      .then((data) => setWordInfo(data))
      .catch((err) => {
        setWordError(err.message || "Kelime bilgisi alınamadı.");
      })
      .finally(() => setWordLoading(false));
  }, []);

  if (!authChecked) {
    return <main style={{ minHeight: "100vh", background: "#faf6ee" }} />;
  }

  if (!authEmail) {
    return (
      <main className="page-auth">
        <h1 className="auth-page-title">Lingofy 🎧</h1>
        <Auth onAuthenticated={(email) => setAuthEmail(email)} />
        <style jsx>{`
          .page-auth {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #faf6ee;
            padding: 20px;
          }
          .auth-page-title {
            color: #4a1b0c;
            font-family: var(--font-serif, serif);
            font-weight: 500;
            margin-bottom: 24px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="content">
        <div className="header-row">
          <h1>Lingofy 🎧</h1>
          <button className="logout-btn" onClick={handleLogout}>
            Çıkış yap ({authEmail})
          </button>
        </div>

        <NowPlaying
          onTrackChange={handleTrackChange}
          onProgress={handleProgress}
        />

        {synced && (
          <div className="offset-control">
            <button onClick={() => adjustOffset(-500)}>−0.5s</button>
            <span>
              {syncOffsetMs > 0 ? "+" : ""}
              {(syncOffsetMs / 1000).toFixed(1)}s senkron
            </span>
            <button onClick={() => adjustOffset(500)}>+0.5s</button>
          </div>
        )}

        {loading ? (
          <p style={{ color: "#4A1B0C", textAlign: "center" }}>Yükleniyor...</p>
        ) : error ? (
          <ErrorBanner
            message={error}
            onRetry={
              errorStatus !== 404
                ? () => loadLyrics(lastTrackRef.current, lastArtistRef.current)
                : undefined
            }
          />
        ) : (
          <>
            {lyrics.length > 0 && (
              <div className="translate-all-row">
                <button
                  className="translate-all-btn"
                  onClick={handleTranslateAll}
                  disabled={translatingAll}
                >
                  {translatingAll ? "Çevriliyor..." : "Tümünü çevir"}
                </button>
              </div>
            )}

            {translateAllError && (
              <ErrorBanner
                message={translateAllError}
                onRetry={handleTranslateAll}
              />
            )}

            <div className="lyrics-container">
              {lyrics.map((line, i) => {
                const isActive = i === selectedLine;
                const lineTranslation = translation[line];

                return (
                  <div className="line-group" key={i}>
                    <p
                      ref={(el) => (lineRefs.current[i] = el)}
                      className={`lyric-line ${isActive ? "selected" : ""}`}
                      onClick={() => {
                        pauseAutoFollow();
                        setSelectedLine(i);
                      }}
                    >
                      {line.split(/(\s+)/).map((token, ti) =>
                        /^\s+$/.test(token) ? (
                          token
                        ) : (
                          <span
                            key={ti}
                            className="word"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseAutoFollow();
                              setSelectedLine(i);
                              handleWordClick(token, line);
                            }}
                          >
                            {token}
                          </span>
                        ),
                      )}
                    </p>

                    {isActive &&
                      (lineTranslation === null ? (
                        <p className="translation translation-failed">
                          Çeviri alınamadı
                        </p>
                      ) : lineTranslation ? (
                        <p className="translation">{lineTranslation}</p>
                      ) : (
                        <p className="translation translation-loading">...</p>
                      ))}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="chat-container">
          <Chat />
        </div>
      </div>

      {selectedWord && (
        <div className="side-panel">
          <button
            className="close-btn"
            onClick={() => setSelectedWord(null)}
            aria-label="Kapat"
          >
            ×
          </button>

          <p className="panel-word">{selectedWord}</p>

          {wordLoading && <p className="panel-status">Yükleniyor...</p>}

          {wordError && (
            <ErrorBanner
              message={wordError}
              onRetry={() => handleWordClick(selectedWord, "")}
            />
          )}

          {wordInfo && !wordLoading && !wordError && (
            <>
              <div className="panel-meta-row">
                {wordInfo.part_of_speech && (
                  <span className="panel-pos">{wordInfo.part_of_speech}</span>
                )}
                {wordInfo.pronunciation && (
                  <span className="panel-pron">/{wordInfo.pronunciation}/</span>
                )}
              </div>

              <p className="panel-translation">{wordInfo.translation}</p>
              <p className="panel-definition">{wordInfo.definition}</p>

              {(wordInfo.register || wordInfo.frequency) && (
                <div className="panel-tags">
                  {wordInfo.register && (
                    <span className="panel-tag">{wordInfo.register}</span>
                  )}
                  {wordInfo.frequency && (
                    <span className="panel-tag">{wordInfo.frequency}</span>
                  )}
                </div>
              )}

              {wordInfo.contextual_meaning && (
                <div className="panel-section panel-context">
                  <p className="panel-label">Bu satırda</p>
                  <p className="panel-context-text">
                    {wordInfo.contextual_meaning}
                  </p>
                </div>
              )}

              {wordInfo.grammar_note && (
                <div className="panel-section">
                  <p className="panel-label">Gramer notu</p>
                  <p className="panel-note-text">{wordInfo.grammar_note}</p>
                </div>
              )}

              {wordInfo.synonyms?.length > 0 && (
                <div className="panel-section">
                  <p className="panel-label">Eş anlamlılar</p>
                  <p className="panel-synonyms">
                    {wordInfo.synonyms.join(", ")}
                  </p>
                </div>
              )}

              {wordInfo.antonyms?.length > 0 && (
                <div className="panel-section">
                  <p className="panel-label">Zıt anlamlılar</p>
                  <p className="panel-synonyms">
                    {wordInfo.antonyms.join(", ")}
                  </p>
                </div>
              )}

              {wordInfo.examples?.length > 0 && (
                <div className="panel-section">
                  <p className="panel-label">Örnek cümleler</p>
                  {wordInfo.examples.map((ex, idx) => (
                    <p key={idx} className="panel-example-text">
                      {ex}
                    </p>
                  ))}
                </div>
              )}

              {wordInfo.usage_note && (
                <div className="panel-section panel-note">
                  <p className="panel-label">Kullanım notu</p>
                  <p className="panel-note-text">{wordInfo.usage_note}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showFullTranslation && !selectedWord && (
        <div className="side-panel translation-full-panel">
          <button
            className="close-btn"
            onClick={() => setShowFullTranslation(false)}
            aria-label="Kapat"
          >
            ×
          </button>

          <p className="panel-title">Tam çeviri</p>

          <div className="full-translation-list">
            {lyrics.map((line, i) => {
              const t = translation[line];
              if (!line.trim()) return null;
              return (
                <div key={i} className="full-translation-item">
                  <p className="full-original">{line}</p>
                  {t === null ? (
                    <p className="full-translated failed">Çeviri alınamadı</p>
                  ) : t ? (
                    <p className="full-translated">{t}</p>
                  ) : (
                    <p className="full-translated failed">...</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {synced && !autoFollow && (
        <button className="resume-btn" onClick={resumeAutoFollow}>
          ▶ Şimdiki satıra dön
        </button>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #faf6ee;
          padding: 0 20px 60px;
        }
        .content {
          width: 100%;
          max-width: 560px;
          margin: 60px auto 0;
        }
        .header-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0;
          text-align: center;
          color: #4a1b0c;
          font-family: var(--font-serif, serif);
          font-weight: 500;
        }
        .logout-btn {
          background: none;
          border: none;
          color: #9c8f7a;
          font-size: 11px;
          cursor: pointer;
          text-decoration: underline;
        }
        .offset-control {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .offset-control button {
          padding: 4px 10px;
          border-radius: 6px;
          border: 0.5px solid #e8ddc8;
          background: #fff;
          color: #4a1b0c;
          font-size: 12px;
          cursor: pointer;
        }
        .offset-control span {
          color: #9c8f7a;
          font-size: 12px;
        }
        .translate-all-row {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .translate-all-btn {
          padding: 8px 18px;
          border-radius: 999px;
          border: 0.5px solid #e8ddc8;
          background: #fff;
          color: #4a1b0c;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .translate-all-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .lyrics-container {
          text-align: center;
          margin-bottom: 40px;
        }
        .line-group {
          margin-bottom: 24px;
        }
        .lyric-line {
          margin: 0;
          padding: 10px 16px;
          border-radius: 10px;
          color: #b0a89a;
          font-size: 16px;
          line-height: 1.6;
          font-family: var(--font-serif, serif);
          cursor: pointer;
          transition:
            background-color 180ms ease,
            color 180ms ease,
            font-size 180ms ease,
            transform 180ms ease;
        }
        .lyric-line:hover {
          color: #8a7c63;
          transform: scale(1.01);
        }
        .lyric-line:active {
          transform: scale(0.99);
        }
        .lyric-line.selected {
          background: #f5c4b3;
          color: #4a1b0c;
          font-size: 22px;
        }
        .word {
          cursor: pointer;
          border-radius: 4px;
          padding: 0 1px;
        }
        .word:hover {
          text-decoration: underline dotted;
        }
        .translation {
          margin: 8px 16px 0;
          color: #712b13;
          font-size: 14px;
          font-style: italic;
          line-height: 1.5;
        }
        .translation-failed,
        .translation-loading {
          color: #c9a98f;
          font-style: normal;
        }

        .side-panel {
          position: fixed;
          top: 50%;
          right: 24px;
          transform: translateY(-50%);
          width: 300px;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
          background: #fff;
          border: 0.5px solid #e8ddc8;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(74, 27, 12, 0.1);
          z-index: 20;
        }
        .close-btn {
          position: absolute;
          top: 10px;
          right: 12px;
          background: none;
          border: none;
          color: #b0a89a;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        }
        .panel-word {
          font-family: var(--font-serif, serif);
          font-size: 22px;
          font-weight: 600;
          color: #4a1b0c;
          margin: 0 0 6px;
        }
        .panel-title {
          font-family: var(--font-serif, serif);
          font-size: 18px;
          font-weight: 600;
          color: #4a1b0c;
          margin: 0 0 16px;
        }
        .panel-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .panel-pos {
          font-size: 11px;
          color: #fff;
          background: #d85a30;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .panel-pron {
          font-size: 13px;
          color: #9c8f7a;
          font-style: italic;
        }
        .panel-translation {
          font-size: 17px;
          color: #d85a30;
          font-weight: 600;
          margin: 0 0 8px;
        }
        .panel-definition {
          font-size: 13px;
          color: #6b5d49;
          line-height: 1.5;
          margin: 0 0 16px;
        }
        .panel-tags {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .panel-tag {
          font-size: 11px;
          color: #8a7c63;
          background: #f0e6d2;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .panel-section {
          margin-bottom: 14px;
          padding-top: 12px;
          border-top: 0.5px solid #f0e6d2;
        }
        .panel-context {
          background: #fdf3ec;
          border-radius: 8px;
          padding: 10px 12px;
          border-top: none;
          margin-top: -2px;
        }
        .panel-context-text {
          font-size: 13px;
          color: #4a1b0c;
          line-height: 1.5;
          margin: 0;
        }
        .panel-label {
          font-size: 11px;
          color: #b0a89a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 6px;
        }
        .panel-synonyms {
          font-size: 13px;
          color: #4a1b0c;
          margin: 0;
        }
        .panel-example-text {
          font-size: 13px;
          color: #4a1b0c;
          font-style: italic;
          line-height: 1.5;
          margin: 0 0 8px;
        }
        .panel-example-text:last-child {
          margin-bottom: 0;
        }
        .panel-note-text {
          font-size: 13px;
          color: #6b5d49;
          line-height: 1.5;
          margin: 0;
        }
        .panel-status {
          font-size: 13px;
          color: #9c8f7a;
        }

        .translation-full-panel {
          width: 340px;
        }
        .full-translation-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .full-translation-item {
          padding-bottom: 12px;
          border-bottom: 0.5px solid #f0e6d2;
        }
        .full-translation-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .full-original {
          font-size: 13px;
          color: #b0a89a;
          margin: 0 0 4px;
          line-height: 1.5;
        }
        .full-translated {
          font-size: 14px;
          color: #4a1b0c;
          font-style: italic;
          margin: 0;
          line-height: 1.5;
        }
        .full-translated.failed {
          color: #c9a98f;
          font-style: normal;
        }

        .resume-btn {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 999px;
          border: none;
          background: #d85a30;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        @media (max-width: 980px) {
          .side-panel {
            position: static;
            transform: none;
            width: 100%;
            max-width: 560px;
            margin: 24px auto 0;
            top: auto;
            right: auto;
          }
        }
      `}</style>
    </main>
  );
}
