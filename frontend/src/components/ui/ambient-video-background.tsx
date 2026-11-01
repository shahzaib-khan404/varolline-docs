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
      {/* Looping Ambient Video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover opacity-25 dark:opacity-35 transition-opacity duration-500"
        >
          <source src="/videos/overall-video.mp4" type="video/mp4" />
          <source src="/videos/overall%20video%20.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Cyber Tech Grid Overlay */}
      <div className="bg-grid-pattern absolute inset-0 z-10 opacity-[0.12] dark:opacity-[0.08]" />

      {/* Solid non-gradient high-contrast dark overlay to eliminate glare under text on mobile and desktop */}
      <div className="absolute inset-0 z-20 bg-background/85 dark:bg-background/90" />
    </div>
  );
}
