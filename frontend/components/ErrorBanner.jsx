export default function ErrorBanner({ message, onRetry }) {
  return (
    <div style={wrapStyle}>
      <p style={textStyle}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={retryBtnStyle}>
          Tekrar dene
        </button>
      )}
    </div>
  );
}

const wrapStyle = {
  background: "#fdeee7",
  border: "0.5px solid #f0c4ad",
  borderRadius: 10,
  padding: "12px 16px",
  textAlign: "center",
  marginBottom: 20,
};

const textStyle = {
  color: "#D85A30",
  fontSize: 14,
  margin: "0 0 8px",
};

const retryBtnStyle = {
  padding: "6px 16px",
  borderRadius: 8,
  border: "none",
  background: "#D85A30",
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
