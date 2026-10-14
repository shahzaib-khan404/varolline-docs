"use client";

import { useEffect, useRef } from "react";

export function FilmGrain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let wWidth = (canvas.width = window.innerWidth);
    let wHeight = (canvas.height = window.innerHeight);
    let loopTimeout: number;
    let frame = 0;
    const noiseData: ImageData[] = [];

    // Pre-generate 10 frames of grain for 60fps/25fps smooth rendering without CPU strain
    const createNoise = () => {
      const idata = ctx.createImageData(wWidth, wHeight);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;
      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.08) {
          buffer32[i] = 0xff000000;
        }
      }
      noiseData.push(idata);
    };

    for (let i = 0; i < 10; i++) {
      createNoise();
    }

    const paintNoise = () => {
      frame = (frame + 1) % 10;
      const current = noiseData[frame];
      if (current) {
        ctx.putImageData(current, 0, 0);
      }
    };

    const loop = () => {
      paintNoise();
      loopTimeout = window.setTimeout(() => {
        window.requestAnimationFrame(loop);
      }, 1000 / 25);
    };

    loop();

    const handleResize = () => {
      if (!canvas) return;
      wWidth = canvas.width = window.innerWidth;
      wHeight = canvas.height = window.innerHeight;
      noiseData.length = 0;
      for (let i = 0; i < 10; i++) {
        createNoise();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.clearTimeout(loopTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.04] dark:opacity-[0.055]"
      aria-hidden="true"
    />
  );
}
