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
          className="absolute inset-0 h-full w-full object-cover opacity-85 dark:opacity-70 transition-opacity duration-500"
        >
          <source src="/videos/overall-video.mp4" type="video/mp4" />
          <source src="/videos/overall%20video%20.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Cyber Tech Grid Overlay */}
      <div className="bg-grid-pattern absolute inset-0 z-10 opacity-40 dark:opacity-20" />

      {/* Subtle overlay that lets video motion & details pop while keeping text crisp */}
      <div className="absolute inset-0 z-20 bg-background/25 dark:bg-background/45" />
    </div>
  );
}
