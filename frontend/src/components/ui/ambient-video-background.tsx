"use client";

interface AmbientVideoBackgroundProps {
  className?: string;
}

export function AmbientVideoBackground({
  className = "",
}: AmbientVideoBackgroundProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden z-0 isolate ${className}`}
      aria-hidden="true"
    >
      {/* ── High-Definition Looping Video (Hardware-Accelerated) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden transform-gpu [backface-visibility:hidden]">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover opacity-65 dark:opacity-75 transition-opacity duration-700 transform-gpu"
        >
          <source src="/videos/overall-video.mp4" type="video/mp4" />
          <source src="/videos/overall%20video%20.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── Static Soft Ambient Glows (Zero GPU Compositor Overhead) ── */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-40 dark:opacity-50">
        <div className="absolute -top-[15%] left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-400/25 via-cyan-500/20 to-transparent blur-[90px]" />
        <div className="absolute top-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-cyan-400/20 via-sky-500/15 to-transparent blur-[90px]" />
      </div>

      {/* ── Cyber Tech Grid Overlay ── */}
      <div className="bg-grid-pattern absolute inset-0 z-20 opacity-[0.25] dark:opacity-[0.15]" />

      {/* ── Vignette for Focus & Cinematic Depth ── */}
      <div className="absolute inset-0 z-30 bg-gradient-to-b from-background/70 via-background/20 dark:via-transparent to-background/95" />
      <div className="absolute inset-0 z-30 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_90%)] opacity-60" />
    </div>
  );
}
