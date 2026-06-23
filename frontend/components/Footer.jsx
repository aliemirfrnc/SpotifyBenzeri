export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-brand">
        <strong>Lingofy</strong>
        <span>İngilizceyi duyduğun gibi öğren.</span>
      </div>
      <div className="landing-footer-links">
        <a href="#features">Features</a>
        <a href="#how-it-works">Nasıl Çalışır</a>
        <a href="#pricing">Fiyatlandırma</a>
      </div>
      <div className="landing-socials" aria-label="Sosyal medya">
        <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">ig</a>
        <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">x</a>
        <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">yt</a>
      </div>
      <p className="landing-copyright">© {new Date().getFullYear()} Lingofy. Tüm hakları saklıdır.</p>
    </footer>
  );
}
