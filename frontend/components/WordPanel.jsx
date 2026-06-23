"use client";
import ErrorBanner from "./ErrorBanner";

export default function WordPanel({
  selectedWord,
  wordInfo,
  wordLoading,
  wordError,
  accentColor,
  onRetry,
  onClose,
}) {
  const { r = 120, g = 80, b = 200 } = accentColor || {};

  if (!selectedWord) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <p style={styles.word}>{selectedWord}</p>
        <button style={styles.closeBtn} onClick={onClose} aria-label="Kapat">
          ×
        </button>
      </div>

      {wordLoading && (
        <div style={styles.loadingRow}>
          <div
            style={{ ...styles.spinner, borderTopColor: `rgb(${r},${g},${b})` }}
          />
        </div>
      )}

      {wordError && !wordLoading && (
        <ErrorBanner message={wordError} onRetry={onRetry} />
      )}

      {wordInfo && !wordLoading && !wordError && (
        <>
          <div style={styles.metaRow}>
            {wordInfo.part_of_speech && (
              <span
                style={{
                  ...styles.badge,
                  background: `rgba(${r},${g},${b},0.2)`,
                  color: `rgb(${r},${g},${b})`,
                  border: `1px solid rgba(${r},${g},${b},0.3)`,
                }}
              >
                {wordInfo.part_of_speech}
              </span>
            )}
            {wordInfo.pronunciation && (
              <span style={styles.pron}>/{wordInfo.pronunciation}/</span>
            )}
          </div>

          <p style={{ ...styles.translation, color: `rgb(${r},${g},${b})` }}>
            {wordInfo.translation}
          </p>
          <p style={styles.definition}>{wordInfo.definition}</p>

          {(wordInfo.register || wordInfo.frequency) && (
            <div style={styles.tagRow}>
              {wordInfo.register && (
                <span style={styles.tag}>{wordInfo.register}</span>
              )}
              {wordInfo.frequency && (
                <span style={styles.tag}>{wordInfo.frequency}</span>
              )}
            </div>
          )}

          {wordInfo.contextual_meaning && (
            <div
              style={{
                ...styles.section,
                background: `rgba(${r},${g},${b},0.07)`,
                borderRadius: 8,
                border: `1px solid rgba(${r},${g},${b},0.12)`,
              }}
            >
              <p style={styles.label}>Bu satırda</p>
              <p style={styles.sectionText}>{wordInfo.contextual_meaning}</p>
            </div>
          )}

          {wordInfo.grammar_note && (
            <div style={styles.section}>
              <p style={styles.label}>Gramer notu</p>
              <p style={styles.sectionText}>{wordInfo.grammar_note}</p>
            </div>
          )}

          {wordInfo.synonyms?.length > 0 && (
            <div style={styles.section}>
              <p style={styles.label}>Eş anlamlılar</p>
              <p style={styles.sectionText}>{wordInfo.synonyms.join(", ")}</p>
            </div>
          )}

          {wordInfo.antonyms?.length > 0 && (
            <div style={styles.section}>
              <p style={styles.label}>Zıt anlamlılar</p>
              <p style={styles.sectionText}>{wordInfo.antonyms.join(", ")}</p>
            </div>
          )}

          {wordInfo.examples?.length > 0 && (
            <div style={styles.section}>
              <p style={styles.label}>Örnek cümleler</p>
              {wordInfo.examples.map((ex, i) => (
                <p
                  key={i}
                  style={{
                    ...styles.sectionText,
                    fontStyle: "italic",
                    marginBottom: i < wordInfo.examples.length - 1 ? 8 : 0,
                  }}
                >
                  {ex}
                </p>
              ))}
            </div>
          )}

          {wordInfo.usage_note && (
            <div style={styles.section}>
              <p style={styles.label}>Kullanım notu</p>
              <p style={styles.sectionText}>{wordInfo.usage_note}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  panel: {
    background: "rgba(18,18,18,0.85)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  word: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.35)",
    fontSize: 18,
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  },
  loadingRow: { display: "flex", justifyContent: "center", padding: "20px 0" },
  spinner: {
    width: 24,
    height: 24,
    border: "2px solid rgba(255,255,255,0.08)",
    borderRadius: "50%",
  },
  metaRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  pron: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontStyle: "italic" },
  translation: { margin: "0 0 6px", fontSize: 18, fontWeight: 700 },
  definition: {
    margin: "0 0 12px",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.5,
  },
  tagRow: { display: "flex", gap: 6, marginBottom: 12 },
  tag: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    background: "rgba(255,255,255,0.07)",
    padding: "2px 8px",
    borderRadius: 999,
  },
  section: { marginTop: 10, padding: "10px 0 0" },
  label: {
    margin: "0 0 4px",
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  sectionText: {
    margin: 0,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.5,
  },
};
