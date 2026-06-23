"use client";

import MusicPlayer from "./MusicPlayer";

export default function Navbar({ onAuth }) {
  return (
    <header className="landing-nav-shell">
      <nav className="landing-nav" aria-label="Ana navigasyon">
        <a className="landing-brand" href="#top" aria-label="Lingofy ana sayfa">
          <span className="landing-brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Lingofy
        </a>

        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">Nasıl Çalışır</a>
          <a href="#pricing">Fiyatlandırma</a>
        </div>

        <div className="landing-nav-actions">
          <MusicPlayer />
          <button className="landing-login" onClick={() => onAuth("login")}>
            Giriş Yap
          </button>
          <button className="landing-signup" onClick={() => onAuth("register")}>
            Kayıt Ol
          </button>
        </div>
      </nav>
    </header>
  );
}
