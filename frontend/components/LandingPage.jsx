"use client";

import { useEffect, useState } from "react";
import Auth from "./Auth";
import Features from "./Features";
import Footer from "./Footer";
import Hero from "./Hero";
import Navbar from "./Navbar";

export default function LandingPage({ onAuthenticated }) {
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.12 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!authMode) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAuthMode(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("landing-modal-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("landing-modal-open");
    };
  }, [authMode]);

  return (
    <main className="landing-page">
      <div className="landing-ambient landing-ambient-one" aria-hidden="true" />
      <div className="landing-ambient landing-ambient-two" aria-hidden="true" />
      <Navbar onAuth={setAuthMode} />
      <Hero onStart={setAuthMode} />
      <Features onStart={setAuthMode} />
      <Footer />

      {authMode && (
        <div className="landing-modal" role="dialog" aria-modal="true" aria-label="Lingofy hesabı">
          <button className="landing-modal-backdrop" onClick={() => setAuthMode(null)} aria-label="Pencereyi kapat" />
          <div className="landing-modal-panel">
            <button className="landing-modal-close" onClick={() => setAuthMode(null)} aria-label="Kapat">×</button>
            <div className="landing-modal-heading">
              <span>Lingofy</span>
              <h2>{authMode === "login" ? "Tekrar hoş geldin" : "Müzikle öğrenmeye başla"}</h2>
              <p>{authMode === "login" ? "Kaldığın şarkıdan devam et." : "Ücretsiz hesabını birkaç saniyede oluştur."}</p>
            </div>
            <Auth key={authMode} initialMode={authMode} onAuthenticated={onAuthenticated} />
          </div>
        </div>
      )}
    </main>
  );
}
