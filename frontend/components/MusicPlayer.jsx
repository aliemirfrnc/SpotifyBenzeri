"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_TRACK =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  const startWithSound = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.1;
    audio.muted = false;
    try {
      await audio.play();
      setIsPlaying(true);
      setIsMuted(false);
      setNeedsInteraction(false);
    } catch {
      setNeedsInteraction(true);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    audio.volume = 0.1;

    audio.play().then(
      () => {
        if (!cancelled) setIsPlaying(true);
      },
      async () => {
        if (cancelled) return;
        audio.muted = true;
        try {
          await audio.play();
          if (!cancelled) {
            setIsPlaying(true);
            setIsMuted(true);
            setNeedsInteraction(true);
          }
        } catch {
          if (!cancelled) setNeedsInteraction(true);
        }
      },
    );

    const resume = () => startWithSound();
    document.addEventListener("pointerdown", resume, { once: true });
    document.addEventListener("keydown", resume, { once: true });

    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
      audio.pause();
    };
  }, [startWithSound]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && !isMuted) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    await startWithSound();
  };

  const trackUrl = process.env.NEXT_PUBLIC_LANDING_AUDIO_URL || DEFAULT_TRACK;

  return (
    <div className="landing-music-wrap">
      <audio ref={audioRef} src={trackUrl} loop preload="metadata" playsInline />
      {needsInteraction && (
        <span className="landing-music-hint">Müziği açmak için dokun</span>
      )}
      <button
        type="button"
        className="landing-music-button"
        onClick={toggle}
        aria-label={isPlaying && !isMuted ? "Müziği durdur" : "Müziği oynat"}
        aria-pressed={isPlaying && !isMuted}
      >
        {isPlaying && !isMuted ? <VolumeIcon /> : <MutedIcon />}
      </button>
    </div>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 10v4h3l4 3V7L8 10H5Z" />
      <path d="M15 9.5c1.2 1.3 1.2 3.7 0 5M17.5 7c2.8 2.8 2.8 7.2 0 10" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 10v4h3l4 3V7L8 10H5Z" />
      <path d="m16 10 4 4m0-4-4 4" />
    </svg>
  );
}
