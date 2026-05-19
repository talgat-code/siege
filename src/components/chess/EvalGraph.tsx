"use client";
import React, { useRef, useEffect } from "react";

interface Props {
  evals: number[]; // one per position, white POV centipawns
  currentMove?: number; // index (0 = start, 1 = after move 1, ...)
  onMoveClick?: (index: number) => void;
}

function clampEval(cp: number): number {
  return Math.max(-800, Math.min(800, cp));
}

function evalToY(cp: number, height: number): number {
  const clamped = clampEval(cp);
  // 0 (middle) = draw, positive = white advantage (drawn at top)
  return height / 2 - (clamped / 800) * (height / 2 - 8);
}

export function EvalGraph({ evals, currentMove, onMoveClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || evals.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, W, H);

    // Center line (draw)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    const n = evals.length;
    const xStep = W / (n - 1);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(255,255,255,0.15)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0.2)");

    ctx.beginPath();
    ctx.moveTo(0, evalToY(evals[0], H));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(i * xStep, evalToY(evals[i], H));
    }
    ctx.lineTo((n - 1) * xStep, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(0, evalToY(evals[0], H));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(i * xStep, evalToY(evals[i], H));
    }
    ctx.strokeStyle = "#7c85f5";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current move marker
    if (currentMove != null && currentMove < n) {
      const cx = currentMove * xStep;
      const cy = evalToY(evals[currentMove], H);
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      // Vertical line
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();
    }
  }, [evals, currentMove]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onMoveClick || evals.length < 2) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (evals.length - 1));
    onMoveClick(Math.max(0, Math.min(evals.length - 1, index)));
  }

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      onClick={handleClick}
      className="w-full cursor-pointer rounded-lg"
      style={{ height: 80 }}
    />
  );
}
