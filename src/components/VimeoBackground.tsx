"use client";

import { useRef, useState, useEffect, useId, type CSSProperties } from "react";
import { preload } from "react-dom";
import type Player from "@vimeo/player";
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/solid";
import styles from "./VimeoBackground.module.css";

function timeLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function VimeoBackground({ videoId, thumbnailUrl }: { videoId: string; thumbnailUrl: string }) {
  preload(thumbnailUrl, { as: "image", fetchPriority: "high" });
  const audioId = useId();
  const audioRef = useRef<HTMLDivElement>(null);
  const [audioOpen, setAudioOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [startedVideoId, setStartedVideoId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoverSeek, setHoverSeek] = useState<{ fraction: number; seconds: number } | null>(null);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [hoverVolume, setHoverVolume] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!audioOpen) { setHoverVolume(null); return; }
    const dismiss = (event: PointerEvent) => {
      if (!audioRef.current?.contains(event.target as Node)) setAudioOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [audioOpen]);

  useEffect(() => {
    setCanFullscreen(!!document.fullscreenEnabled);
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActivated(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { observer.disconnect(); document.removeEventListener("fullscreenchange", syncFullscreen); };
  }, []);

  useEffect(() => {
    if (!activated || !iframeRef.current) return;
    let cancelled = false;
    let activePlayer: Player | null = null;
    const iframe = iframeRef.current;
    setReady(false);
    void import("@vimeo/player").then(async ({ default: Player }) => {
      if (cancelled) return;
      const player = new Player(iframe);
      activePlayer = player;
      playerRef.current = player;
      player.on("play", () => { if (!cancelled) setPlaying(true); });
      player.on("pause", () => { if (!cancelled) setPlaying(false); });
      player.on("ended", () => { if (!cancelled) setPlaying(false); });
      player.on("timeupdate", data => { if (!cancelled) { setSeconds(data.seconds); setDuration(data.duration); if (data.seconds > 0) setStartedVideoId(videoId); } });
      player.on("playing", () => { if (!cancelled) setStartedVideoId(videoId); });
      player.on("volumechange", () => {
        void Promise.all([player.getVolume(), player.getMuted()]).then(([level, isMuted]) => {
          if (!cancelled) { setVolume(level); setMuted(isMuted); }
        }).catch(() => {});
      });
      player.on("error", () => { if (!cancelled) setError("Video unavailable. Try watching on Vimeo."); });
      await player.ready();
      const [length, paused, level, isMuted] = await Promise.all([player.getDuration(), player.getPaused(), player.getVolume(), player.getMuted()]);
      if (cancelled) return;
      setDuration(length); setPlaying(!paused); setVolume(level); setMuted(isMuted); setReady(true);
      // Autoplay remains muted; a blocked autoplay can be started with Play.
      void player.play().catch(() => { if (!cancelled) setPlaying(false); });
    }).catch(() => { if (!cancelled) setError("Video unavailable. Try watching on Vimeo."); });
    return () => {
      cancelled = true; playerRef.current = null;
      if (activePlayer) void activePlayer.destroy().catch(() => {});
    };
  }, [activated, videoId]);

  async function action(run: (player: Player) => Promise<unknown>) {
    const player = playerRef.current;
    if (!player || !ready) return;
    setError("");
    try { await run(player); } catch { setError("That control didn’t respond. Please try again."); }
  }
  const togglePlay = () => void action(async player => (await player.getPaused()) ? player.play() : player.pause());
  async function seek(value: number) {
    await action(async player => { const actual = await player.setCurrentTime(value); setSeconds(actual); });
    setSeekPreview(null);
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === containerRef.current) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch { setError("Fullscreen isn’t available in this browser."); }
  }
  const position = seekPreview ?? seconds;
  const progress = duration ? Math.min(100, position / duration * 100) : 0;
  const PlayPauseIcon = playing ? PauseIcon : PlayIcon;
  const SoundIcon = muted || volume === 0 ? SpeakerXMarkIcon : SpeakerWaveIcon;
  const FullscreenIcon = fullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon;

  return (
    <div ref={containerRef} className={styles.player} role="region" aria-label="BYODP video player">
      <div className={styles.visual}>
        {activated && <iframe ref={iframeRef}
          src={`https://player.vimeo.com/video/${videoId}?autopause=0&autoplay=1&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0&playsinline=1&keyboard=0`}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media" title="BYODP | Design Waterloo & Figma" tabIndex={-1} />}
        {startedVideoId !== videoId && (
          // Load the poster directly with high priority, ahead of the deferred iframe/SDK.
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.poster} src={thumbnailUrl} alt="" width={1200} height={900} loading="eager" fetchPriority="high" decoding="async" />
        )}
        <button type="button" className={styles.surfaceButton} disabled={!ready} onClick={togglePlay} aria-label={playing ? "Pause video" : "Play video"} />
      </div>
      <div className={styles.controls}>
        <div className={styles.row}>
          <button className={styles.iconButton} type="button" onClick={togglePlay} disabled={!ready} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"}><PlayPauseIcon aria-hidden="true" /></button>
          <div className={styles.time}>{timeLabel(position)}</div>
          <div className={styles.seekArea}>
        <input className={styles.seek} name="video-progress" type="range" aria-label="Video progress"
          aria-valuetext={`${timeLabel(position)} of ${timeLabel(duration)}`} min={0} max={duration || 1} step={0.1}
          value={position} disabled={!ready || duration <= 0}
          style={{ '--progress': `${progress}%` } as CSSProperties}
          onPointerMove={event => {
            if (!ready || !duration || event.pointerType === "touch") return;
            const rect = event.currentTarget.getBoundingClientRect();
            // The native 12px thumb travels between centers inset 6px from each edge.
            const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left - 6) / Math.max(1, rect.width - 12)));
            setHoverSeek({ fraction, seconds: fraction * duration });
          }}
          onPointerLeave={() => setHoverSeek(null)}
          onChange={event => setSeekPreview(Number(event.target.value))}
          onPointerUp={event => void seek(Number(event.currentTarget.value))}
          onKeyUp={event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) void seek(Number(event.currentTarget.value)); }}
          onBlur={event => { if (seekPreview !== null) void seek(Number(event.currentTarget.value)); }}
          onPointerCancel={() => setSeekPreview(null)} />
            {hoverSeek && <div className={styles.hoverDot} aria-hidden="true"
              style={{ '--hover-position': `calc(6px + (100% - 12px) * ${hoverSeek.fraction})` } as CSSProperties} />}
            {hoverSeek && <div className={styles.seekTooltip} aria-hidden="true"
              style={{ '--hover-position': `calc(6px + (100% - 12px) * ${hoverSeek.fraction})` } as CSSProperties}>
              {timeLabel(hoverSeek.seconds)}
            </div>}
          </div>
          <div className={`${styles.time} ${styles.duration}`}>{timeLabel(duration)}</div>
          <div className={styles.audio} ref={audioRef}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAudioOpen(false); }}
            onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setAudioOpen(false); audioRef.current?.querySelector("button")?.focus(); } }}>
            <button className={styles.iconButton} type="button" disabled={!ready} aria-label={muted || volume === 0 ? "Unmute" : "Audio controls"} aria-expanded={audioOpen} aria-controls={audioId} onClick={() => {
              if (muted || volume === 0) {
                setVolume(1); setMuted(false); setAudioOpen(true);
                void action(async player => { await player.setVolume(1); await player.setMuted(false); });
              } else setAudioOpen(open => !open);
            }} title={muted || volume === 0 ? "Unmute" : "Audio controls"}><SoundIcon aria-hidden="true" /></button>
            {audioOpen && <div className={styles.audioPopover} id={audioId} role="group" aria-label="Audio">
          <div className={styles.volumeArea}>
            <input className={styles.volume} name="video-volume" type="range" aria-orientation="vertical" min={0} max={1} step={0.01} value={muted ? 0 : volume} disabled={!ready} aria-label="Volume"
              aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
              style={{ '--progress': `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
              onPointerMove={event => {
                if (!ready || event.pointerType === "touch") return;
                const rect = event.currentTarget.getBoundingClientRect();
                setHoverVolume(Math.max(0, Math.min(1, (event.clientY - rect.top - 6) / Math.max(1, rect.height - 12))));
              }}
              onPointerLeave={() => setHoverVolume(null)}
              onPointerCancel={() => setHoverVolume(null)}
              onChange={event => {
                const level = Number(event.target.value);
                setVolume(level); setMuted(level === 0);
                void action(async player => { await player.setVolume(level); await player.setMuted(level === 0); });
              }} />
            {hoverVolume !== null && <div className={`${styles.hoverDot} ${styles.volumeHoverDot}`} aria-hidden="true"
              style={{ '--hover-position': `calc(6px + (100% - 12px) * ${hoverVolume})` } as CSSProperties} />}
          </div>
            </div>}
          </div>
          {canFullscreen && <button className={styles.iconButton} type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title="Fullscreen"><FullscreenIcon aria-hidden="true" /></button>}
        </div>
        {error && <div className={styles.error} role="status">{error} <a href={`https://vimeo.com/${videoId}`} target="_blank" rel="noopener noreferrer">Watch on Vimeo ↗</a></div>}
      </div>
    </div>
  );
}
