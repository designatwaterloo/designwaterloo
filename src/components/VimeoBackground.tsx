"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type Player from "@vimeo/player";

interface VimeoBackgroundProps {
  videoId: string;
  thumbnailUrl: string;
}

export default function VimeoBackground({ videoId, thumbnailUrl }: VimeoBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setActivated(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activated || !iframeRef.current) return;
    let cancelled = false;
    let activePlayer: Player | null = null;
    const iframe = iframeRef.current;
    void import("@vimeo/player").then(({ default: Player }) => {
      if (cancelled) return;
      const player = new Player(iframe);
      activePlayer = player;
      playerRef.current = player;
      player.on("play", () => setIsPlaying(true));
      player.on("pause", () => setIsPlaying(false));
      void player.ready().then(() => {
        if (!cancelled) return player.play();
      }).catch(() => {});
    }).catch(() => {});
    return () => {
      cancelled = true;
      playerRef.current = null;
      if (activePlayer) void activePlayer.destroy().catch(() => {});
    };
  }, [activated]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative bg-[var(--black)] cursor-pointer"
      style={{
        backgroundImage: `url(${thumbnailUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {activated && <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0`}
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        title="BYODP | Design Waterloo & Figma"
      />}

      {activated && <button
        onClick={(event) => { event.stopPropagation(); togglePlay(); }}
        aria-label={isPlaying ? "Pause video" : "Play video"}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-[10px] px-5 py-2 rounded-2xl border-2 border-white text-white cursor-pointer transition-all duration-200 hover:opacity-80"
        style={{ background: "rgba(14, 14, 14, 0.5)", backdropFilter: "blur(8px)" }}
      >
        {isPlaying ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="1" width="3.5" height="12" rx="1" fill="white" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="white" />
            </svg>
            <span className="text-base leading-tight tracking-tight">Pause</span>
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 1.5V12.5L12 7L3 1.5Z" fill="white" />
            </svg>
            <span className="text-base leading-tight tracking-tight">Play</span>
          </>
        )}
      </button>}
    </div>
  );
}
