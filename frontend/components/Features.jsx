const features = [
  {
    number: "01",
    title: "Şarkıyla öğren",
    text: "Gerçek şarkıları dinlerken senkronize sözleri satır satır takip et.",
    icon: "wave",
  },
  {
    number: "02",
    title: "Anında çeviri",
    text: "Anlamını kaçırdığın satırı tek dokunuşla doğal Türkçeye çevir.",
    icon: "language",
  },
  {
    number: "03",
    title: "Kelime analizi",
    text: "Kelimenin telaffuzunu, bağlamını ve kullanım örneklerini keşfet.",
    icon: "spark",
  },
];

export default function Features({ onStart }) {
  return (
    <>
      <section id="features" className="landing-section reveal">
        <div className="landing-section-heading">
          <span>NEDEN LINGOFY?</span>
          <h2>Dinlediğin her şarkı,<br />yeni bir derse dönüşür.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-feature-card" key={feature.title}>
              <div className={`landing-feature-icon is-${feature.icon}`} aria-hidden="true">
                <FeatureIcon type={feature.icon} />
              </div>
              <span className="landing-feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-how reveal">
        <div className="landing-how-copy">
          <span className="landing-kicker">3 ADIMDA BAŞLA</span>
          <h2>Müziği aç.<br />Gerisini Lingofy&apos;a bırak.</h2>
          <p>Öğrenmek için ders moduna girmen gerekmiyor. Günlük müzik rutinin yeterli.</p>
          <button className="landing-primary" onClick={() => onStart("register")}>
            İlk şarkını seç <span aria-hidden="true">→</span>
          </button>
        </div>
        <ol className="landing-steps">
          <li><span>1</span><div><strong>Şarkı seç</strong><p>Spotify hesabını bağla ve sevdiğin parçayı aç.</p></div></li>
          <li><span>2</span><div><strong>Dinle ve takip et</strong><p>Senkron sözlerle ritmi ve gerçek telaffuzu yakala.</p></div></li>
          <li><span>3</span><div><strong>Öğren</strong><p>Çevir, kelimeleri keşfet ve AI öğretmenine sor.</p></div></li>
        </ol>
      </section>

      <section id="pricing" className="landing-pricing reveal">
        <div>
          <span className="landing-kicker">ÜCRETSİZ BAŞLA</span>
          <h2>Sıradaki şarkın,<br />ilk İngilizce dersin olsun.</h2>
        </div>
        <div className="landing-price-card">
          <p><span>₺0</span> / başlangıç</p>
          <ul><li>Senkronize şarkı sözleri</li><li>Satır çevirisi</li><li>Kelime analizi</li></ul>
          <button className="landing-primary" onClick={() => onStart("register")}>Hemen başla</button>
        </div>
      </section>
    </>
  );
}

function FeatureIcon({ type }) {
  if (type === "language") return <svg viewBox="0 0 24 24"><path d="M4 5h9M8.5 3v2c0 4-2 7-5 9M6 9c1 2 3 4 6 5M14 19l3.5-9 3.5 9M15.3 16h4.4" /></svg>;
  if (type === "spark") return <svg viewBox="0 0 24 24"><path d="M12 3c.8 4.7 3.3 7.2 8 8-4.7.8-7.2 3.3-8 8-.8-4.7-3.3-7.2-8-8 4.7-.8 7.2-3.3 8-8Z" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="M3 12h2l2-6 3 12 3-9 2 6 2-3h4" /></svg>;
}
