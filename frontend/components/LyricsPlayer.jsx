"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import ErrorBanner from "./ErrorBanner";

export default function LyricsPlayer({
  accentColor,
  onWordClick,
  onTrackChange,
  onProgress,
}) {
  const [lyrics, setLyrics] = useState([]);
  const [synced, setSynced] = useState(null);
  const [translation, setTranslation] = useState({});
  const [selectedLine, setSelectedLine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [playback, setPlayback] = useState({ progressMs: 0, isPlaying: false });
  const [syncOffsetMs, setSyncOffsetMs] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number.parseInt(localStorage.getItem("lingofy_sync_offset"), 10) || 0;
  });
  const [autoFollow, setAutoFollow] = useState(true);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translateAllError, setTranslateAllError] = useState(null);
  const [showFullTranslation, setShowFullTranslation] = useState(false);

  const lineRefs = useRef([]);
  const containerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const programmaticScrollUntil = useRef(0);
  const lastTrackRef = useRef(null);
  const lastArtistRef = useRef(null);
  const lyricsRequestRef = useRef(0);
  const lyricsAbortRef = useRef(null);
  const translatingLinesRef = useRef(new Set());

  const { r = 120, g = 80, b = 200 } = accentColor || {};

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

  const loadLyrics = useCallback((track, artist = "") => {
    const requestId = lyricsRequestRef.current + 1;
    lyricsRequestRef.current = requestId;
    lyricsAbortRef.current?.abort();
    const controller = new AbortController();
    lyricsAbortRef.current = controller;
    translatingLinesRef.current.clear();

    lastTrackRef.current = track;
    lastArtistRef.current = artist;

    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setTranslation({});
    setSelectedLine(null);
    setSynced(null);
    setAutoFollow(true);
    setTranslateAllError(null);
    setShowFullTranslation(false);

    api
      .getLyrics(track, artist, { signal: controller.signal })
      .then((data) => {
        if (requestId !== lyricsRequestRef.current) return;
        setLyrics(data.lyrics ?? []);
        setSynced(data.synced?.length > 0 ? data.synced : null);
      })
      .catch((err) => {
        if (err.name === "AbortError" || requestId !== lyricsRequestRef.current) return;
        setLyrics([]);
        setError(err.message || "Şarkı sözleri yüklenemedi.");
        setErrorStatus(err.status ?? null);
      })
      .finally(() => {
        if (requestId === lyricsRequestRef.current) setLoading(false);
      });
  }, []);

  useEffect(
    () => () => {
      lyricsAbortRef.current?.abort();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  // Dışarıdan gelen şarkı değişikliği
  useEffect(() => {
    onTrackChange?.((trackName, artist) => {
      setPlayback({ progressMs: 0, isPlaying: false });
      loadLyrics(trackName, artist);
    });
  }, [onTrackChange, loadLyrics]);

  // Progress güncellemesi
  useEffect(() => {
    onProgress?.((progressMs, _dur, isPlaying) => {
      setPlayback({ progressMs: progressMs ?? 0, isPlaying: !!isPlaying });
    });
  }, [onProgress]);

  useEffect(() => {
    if (!playback.isPlaying) return;
    const id = setInterval(() => {
      setPlayback((p) => ({ ...p, progressMs: p.progressMs + 1000 }));
    }, 1000);
    return () => clearInterval(id);
  }, [playback.isPlaying]);

  const currentLineIndex = useMemo(() => {
    if (!synced?.length) return null;
    const progressSec = (playback.progressMs + syncOffsetMs) / 1000;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= progressSec) idx = i;
      else break;
    }
    return idx >= 0 ? idx : null;
  }, [synced, playback.progressMs, syncOffsetMs]);

  const activeLineIndex =
    autoFollow && currentLineIndex !== null ? currentLineIndex : selectedLine;

  useEffect(() => {
    if (!autoFollow || activeLineIndex === null) return;
    const el = lineRefs.current[activeLineIndex];
    if (el) {
      programmaticScrollUntil.current = Date.now() + 800;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLineIndex, autoFollow]);

  const translateLine = useCallback((line) => {
    if (!line || translatingLinesRef.current.has(line)) return;
    const requestId = lyricsRequestRef.current;
    translatingLinesRef.current.add(line);
    api
      .translateLine(line)
      .then((data) => {
        if (requestId !== lyricsRequestRef.current) return;
        setTranslation((current) =>
          current[line] === undefined
            ? { ...current, [line]: data.translation }
            : current,
        );
      })
      .catch(() => {
        if (requestId !== lyricsRequestRef.current) return;
        setTranslation((current) => ({ ...current, [line]: null }));
      });
  }, []);

  useEffect(() => {
    if (activeLineIndex === null) return;
    const line = lyrics[activeLineIndex];
    if (line) translateLine(line);
    const nextLine = lyrics[activeLineIndex + 1];
    if (nextLine) translateLine(nextLine);
  }, [activeLineIndex, lyrics, translateLine]);

  useEffect(() => {
    function handleScroll() {
      if (Date.now() < programmaticScrollUntil.current) return;
      pauseAutoFollow();
    }
    const el = containerRef.current;
    if (el) el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el?.removeEventListener("scroll", handleScroll);
  }, [pauseAutoFollow]);

  const handleTranslateAll = useCallback(() => {
    const pending = [...new Set(lyrics)].filter(
      (line) => line.trim() && translation[line] === undefined,
    );
    if (pending.length === 0) {
      setShowFullTranslation(true);
      return;
    }

    setTranslatingAll(true);
    setTranslateAllError(null);
    const requestId = lyricsRequestRef.current;

    api
      .translateBatch(pending)
      .then((data) => {
        if (requestId !== lyricsRequestRef.current) return;
        setTranslation((prev) => {
          const next = { ...prev, ...data.translations };
          (data.failed || []).forEach((l) => {
            next[l] = null;
          });
          return next;
        });
        if (data.failed?.length) {
          setTranslateAllError(`${data.failed.length} satır çevrilemedi.`);
        }
        setShowFullTranslation(true);
      })
      .catch((err) => {
        if (requestId === lyricsRequestRef.current) {
          setTranslateAllError(err.message || "Çeviri başarısız.");
        }
      })
      .finally(() => {
        if (requestId === lyricsRequestRef.current) setTranslatingAll(false);
      });
  }, [lyrics, translation]);

  if (loading) {
    return (
      <div style={styles.centered}>
        <div
          style={{ ...styles.spinner, borderTopColor: `rgb(${r},${g},${b})` }}
        />
      </div>
    );
  }

  if (error && !lyrics.length) {
    return (
      <div style={styles.centered}>
        <ErrorBanner
          message={error}
          onRetry={
            errorStatus !== 404
              ? () => loadLyrics(lastTrackRef.current, lastArtistRef.current)
              : undefined
          }
        />
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            marginTop: 16,
          }}
        >
          Spotify&apos;da bir şarkı çal — sözler otomatik yüklenecek
        </p>
      </div>
    );
  }

  if (!lyrics.length) {
    return (
      <div style={styles.centered}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>
          Spotify&apos;da bir şarkı çal
        </p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Senkron kontrol + tümünü çevir */}
      <div style={styles.topBar}>
        {synced && (
          <div style={styles.offsetRow}>
            <button style={styles.offsetBtn} onClick={() => adjustOffset(-500)}>
              −0.5s
            </button>
            <span style={styles.offsetLabel}>
              {syncOffsetMs > 0 ? "+" : ""}
              {(syncOffsetMs / 1000).toFixed(1)}s
            </span>
            <button style={styles.offsetBtn} onClick={() => adjustOffset(500)}>
              +0.5s
            </button>
          </div>
        )}
        {lyrics.length > 0 && (
          <button
            style={{
              ...styles.translateAllBtn,
              background: `rgba(${r},${g},${b},0.18)`,
              border: `1px solid rgba(${r},${g},${b},0.35)`,
            }}
            onClick={handleTranslateAll}
            disabled={translatingAll}
          >
            {translatingAll ? "Çevriliyor..." : "Tümünü çevir"}
          </button>
        )}
      </div>

      {translateAllError && (
        <div style={{ padding: "0 24px" }}>
          <ErrorBanner
            message={translateAllError}
            onRetry={handleTranslateAll}
          />
        </div>
      )}

      {/* Lyrics listesi */}
      <div ref={containerRef} style={styles.lyricsScroll}>
        <div style={styles.lyricsInner}>
          {/* Üst dolgu — aktif satır ortaya gelsin */}
          <div style={{ height: "35vh" }} />

          {lyrics.map((line, i) => {
            const isActive = i === activeLineIndex;
            const dist = Math.abs((activeLineIndex ?? 0) - i);
            const opacity = isActive ? 1 : Math.max(0.18, 0.65 - dist * 0.12);
            const scale = isActive ? 1.05 : 1;
            const lineTranslation = translation[line];

            return (
              <div key={i} style={styles.lineGroup}>
                <p
                  ref={(el) => (lineRefs.current[i] = el)}
                  onClick={() => {
                    pauseAutoFollow();
                    setSelectedLine(i);
                  }}
                  style={{
                    ...styles.lyricLine,
                    opacity,
                    transform: `scale(${scale})`,
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.85)",
                    textShadow: isActive
                      ? `0 0 40px rgba(${r},${g},${b},0.6), 0 2px 8px rgba(0,0,0,0.8)`
                      : "none",
                    fontSize: isActive ? 22 : 17,
                    cursor: "pointer",
                  }}
                >
                  {line.split(/(\s+)/).map((token, ti) =>
                    /^\s+$/.test(token) ? (
                      token
                    ) : (
                      <span
                        key={ti}
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseAutoFollow();
                          setSelectedLine(i);
                          onWordClick?.(token, line);
                        }}
                        style={styles.wordToken}
                      >
                        {token}
                      </span>
                    ),
                  )}
                </p>

                {isActive && (
                  <div style={styles.translationRow}>
                    {lineTranslation === null ? (
                      <span style={styles.translationFailed}>
                        Çeviri alınamadı
                      </span>
                    ) : lineTranslation ? (
                      <span
                        style={{
                          ...styles.translationText,
                          color: `rgba(${r},${g},${b},0.9)`,
                        }}
                      >
                        {lineTranslation}
                      </span>
                    ) : (
                      <span style={styles.translationFailed}>•••</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Alt dolgu */}
          <div style={{ height: "45vh" }} />
        </div>
      </div>

      {/* Tam çeviri paneli (overlay) */}
      {showFullTranslation && (
        <div style={styles.fullTransOverlay}>
          <div
            style={{
              ...styles.fullTransPanel,
              borderColor: `rgba(${r},${g},${b},0.2)`,
            }}
          >
            <div style={styles.fullTransHeader}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Tam çeviri</span>
              <button
                style={styles.closeBtn}
                onClick={() => setShowFullTranslation(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.fullTransList}>
              {lyrics.map((line, i) => {
                if (!line.trim()) return null;
                const t = translation[line];
                return (
                  <div key={i} style={styles.fullTransItem}>
                    <p style={styles.fullOriginal}>{line}</p>
                    <p
                      style={{
                        ...styles.fullTranslated,
                        color: t
                          ? `rgba(${r},${g},${b},0.85)`
                          : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {t === null ? "Çeviri alınamadı" : t || "•••"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Şimdiki satıra dön */}
      {synced && !autoFollow && (
        <button
          style={{
            ...styles.resumeBtn,
            background: `rgba(${r},${g},${b},0.85)`,
          }}
          onClick={resumeAutoFollow}
        >
          ↓ Şimdiki satıra dön
        </button>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 12,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(255,255,255,0.1)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px 8px",
    flexShrink: 0,
  },
  offsetRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  offsetBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.7)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  offsetLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    minWidth: 52,
    textAlign: "center",
  },
  translateAllBtn: {
    color: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    padding: "6px 16px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  lyricsScroll: {
    flex: 1,
    overflowY: "auto",
  },
  lyricsInner: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "0 32px",
    textAlign: "center",
  },
  lineGroup: {
    marginBottom: 8,
  },
  lyricLine: {
    margin: 0,
    padding: "6px 0",
    lineHeight: 1.5,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
    userSelect: "none",
  },
  wordToken: {
    cursor: "pointer",
    borderRadius: 3,
    padding: "0 1px",
    transition: "background 150ms",
  },
  translationRow: {
    marginTop: 6,
    marginBottom: 10,
    minHeight: 20,
  },
  translationText: {
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: 400,
  },
  translationFailed: {
    fontSize: 13,
    color: "rgba(255,255,255,0.2)",
  },
  fullTransOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  fullTransPanel: {
    background: "rgba(18,18,18,0.96)",
    border: "1px solid",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    maxHeight: "78vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  fullTransHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    fontSize: 20,
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
  },
  fullTransList: {
    overflowY: "auto",
    padding: "12px 20px 20px",
  },
  fullTransItem: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  fullOriginal: {
    margin: "0 0 4px",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 1.4,
  },
  fullTranslated: {
    margin: 0,
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  resumeBtn: {
    position: "absolute",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    border: "none",
    color: "#fff",
    borderRadius: 999,
    padding: "9px 20px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    zIndex: 5,
  },
};
