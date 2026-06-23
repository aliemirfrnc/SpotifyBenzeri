"use client";

export default function Hero({ onStart }) {
  return (
    <section id="top" className="landing-hero">
      <div className="landing-hero-copy">
        <div className="landing-eyebrow">
          <span /> Müzik artık senin İngilizce öğretmenin
        </div>
        <h1>
          İngilizceyi <span>şarkılarla</span> öğren.
        </h1>
        <p className="landing-hero-lead">Dinle, anla, çevir ve konuş.</p>
        <p className="landing-hero-subcopy">
          Sevdiğin şarkıların sözlerini anlık takip et, bilmediğin kelimelere
          dokun ve her nakaratta biraz daha akıcı ol.
        </p>
        <div className="landing-hero-actions">
          <button className="landing-primary" onClick={() => onStart("register")}>
            Ücretsiz Başla <span aria-hidden="true">→</span>
          </button>
          <a className="landing-secondary" href="#how-it-works">
            <PlayIcon /> Nasıl Çalışır
          </a>
        </div>
        <div className="landing-trust-row">
          <div className="landing-avatars" aria-hidden="true">
            <span>AK</span><span>SL</span><span>ME</span>
          </div>
          <p><strong>Her gün 10 dakika.</strong> Ezber değil, gerçek müzik.</p>
        </div>
      </div>

      <div className="landing-hero-visual" aria-label="Lingofy şarkı sözü arayüzü önizlemesi">
        <div className="landing-orbit landing-orbit-one" />
        <div className="landing-orbit landing-orbit-two" />
        <div className="landing-float-card landing-float-translation">
          <span>EN → TR</span>
          Anında çeviri
        </div>
        <div className="landing-float-card landing-float-word">
          <span>flow</span>
          /floʊ/ · akış
        </div>

        <div className="landing-player-card">
          <div className="landing-player-top">
            <div className="landing-cover-art">
              <span className="landing-cover-glow" />
              <span className="landing-cover-disc" />
            </div>
            <div className="landing-track-meta">
              <small>ŞİMDİ ÇALIYOR</small>
              <strong>Midnight Feelings</strong>
              <span>Lingofy Sessions</span>
            </div>
            <div className="landing-playing-bars" aria-label="Çalıyor">
              <i /><i /><i /><i />
            </div>
          </div>

          <div className="landing-progress"><span /></div>
          <div className="landing-lyrics-preview">
            <p>I was waiting for the right time</p>
            <p className="is-active">Now I&apos;m learning how to <em>fly</em></p>
            <span>Şimdi nasıl uçacağımı öğreniyorum</span>
            <p>Every word becomes a new light</p>
            <p>Shining brighter in my mind</p>
          </div>

          <div className="landing-player-controls">
            <span>↶</span>
            <span className="landing-preview-play" aria-hidden="true"><PlayIcon /></span>
            <span>↷</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 7 8 5-8 5V7Z" />
    </svg>
  );
}
