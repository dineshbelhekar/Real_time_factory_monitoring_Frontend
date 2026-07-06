import { useEffect, useRef } from "react";

export default function DotGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animId;
    let dots = [];
    let W, H;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      buildDots();
    }

    function buildDots() {
      dots = [];
      const gap = 38;
      for (let x = 0; x < W; x += gap) {
        for (let y = 0; y < H; y += gap) {
          dots.push({
            x,
            y,
            base:  0.18 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 0.012;
      dots.forEach((d) => {
        const pulse = d.base + 0.12 * Math.sin(t + d.phase);
        const dx    = d.x / W - 0.5;
        const dy    = d.y / H - 0.5;
        const dist  = Math.sqrt(dx * dx + dy * dy);
        const alpha = Math.max(0, pulse * (1 - dist * 0.7));
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
