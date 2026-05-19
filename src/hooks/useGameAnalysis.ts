"use client";
import { useState, useCallback, useRef } from "react";
import { Chess } from "chess.js";

export type MoveClassification = "brilliant" | "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export type AnalyzedMove = {
  moveNumber: number;
  color: "white" | "black";
  san: string;
  fen: string;
  evalBefore: number; // centipawns, white POV
  evalAfter: number;
  loss: number; // centipawn loss from mover's perspective
  classification: MoveClassification;
  bestMoveSan: string;
  comment: string;
};

export type GameAnalysisResult = {
  moves: AnalyzedMove[];
  evals: number[]; // one per position including initial, white POV
  accuracy: { white: number; black: number };
  summary: string;
};

const DEPTH = 15;
const CP_BLUNDER = 200;
const CP_MISTAKE = 100;
const CP_INACCURACY = 50;

function classify(loss: number): MoveClassification {
  if (loss >= CP_BLUNDER) return "blunder";
  if (loss >= CP_MISTAKE) return "mistake";
  if (loss >= CP_INACCURACY) return "inaccuracy";
  return "good";
}

function comment(cls: MoveClassification, san: string): string {
  const m: Record<MoveClassification, string[]> = {
    brilliant: [`${san} — блестящий ход!`],
    best: [`${san} — точный ход.`],
    good: [`${san} — хороший ход.`],
    inaccuracy: [`${san} — небольшая неточность.`, `${san} — можно было сыграть точнее.`],
    mistake: [`${san} — ошибка!`, `${san} — серьёзный промах.`],
    blunder: [`${san} — грубый зевок!`, `${san} — решающая ошибка.`],
  };
  const arr = m[cls];
  return arr[Math.floor(Math.random() * arr.length)];
}

function evalFen(worker: Worker, fen: string, depth: number): Promise<number> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      worker.onmessage = null;
      resolve(0);
    }, 6000);

    let best = 0;
    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;
      if (typeof line !== "string") return;

      if (line.includes("score cp") && line.includes(" pv ")) {
        const m = line.match(/score cp (-?\d+)/);
        if (m) best = parseInt(m[1]);
      }
      if (line.includes("score mate") && line.includes(" pv ")) {
        const m = line.match(/score mate (-?\d+)/);
        if (m) best = parseInt(m[1]) > 0 ? 30000 : -30000;
      }
      if (line.startsWith("bestmove")) {
        clearTimeout(t);
        worker.onmessage = null;
        resolve(best);
      }
    };

    worker.postMessage("stop");
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  });
}

export function useGameAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GameAnalysisResult | null>(null);
  const abortRef = useRef(false);

  const analyze = useCallback(async (pgn: string) => {
    if (!pgn || typeof window === "undefined") return;

    setAnalyzing(true);
    setProgress(0);
    setResult(null);
    abortRef.current = false;

    const worker = new Worker("/stockfish.js");

    // Wait for UCI init
    await new Promise<void>((res) => {
      const t = setTimeout(res, 3000);
      worker.onmessage = (e: MessageEvent<string>) => {
        if (e.data === "uciok" || e.data === "readyok") {
          clearTimeout(t);
          res();
        }
      };
      worker.postMessage("uci");
    });

    worker.postMessage("ucinewgame");

    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const history = chess.history({ verbose: true });

      if (history.length === 0) {
        setAnalyzing(false);
        worker.terminate();
        return;
      }

      // Build FEN list
      const game = new Chess();
      const fens: string[] = [game.fen()];
      for (const mv of history) {
        game.move(mv);
        fens.push(game.fen());
      }

      // Evaluate each position
      const evals: number[] = [];
      for (let i = 0; i < fens.length; i++) {
        if (abortRef.current) break;
        setProgress(Math.round((i / fens.length) * 90));
        const score = await evalFen(worker, fens[i], DEPTH);
        evals.push(score);
      }

      if (abortRef.current) {
        setAnalyzing(false);
        worker.terminate();
        return;
      }

      // Classify moves
      const moves: AnalyzedMove[] = [];
      let wAcc = 0, bAcc = 0, wN = 0, bN = 0;

      for (let i = 0; i < history.length; i++) {
        const mv = history[i];
        const isW = mv.color === "w";
        const before = evals[i] ?? 0;
        const after = evals[i + 1] ?? 0;
        // Loss from mover's perspective
        const loss = Math.max(0, isW ? before - after : after - before);
        const cls = classify(loss);
        const acc = Math.max(0, Math.min(100, 100 - loss / 10));

        if (isW) { wAcc += acc; wN++; } else { bAcc += acc; bN++; }

        moves.push({
          moveNumber: Math.floor(i / 2) + 1,
          color: isW ? "white" : "black",
          san: mv.san,
          fen: fens[i + 1],
          evalBefore: before,
          evalAfter: after,
          loss,
          classification: cls,
          bestMoveSan: mv.san,
          comment: comment(cls, mv.san),
        });
      }

      const blunders = moves.filter((m) => m.classification === "blunder").length;
      const mistakes = moves.filter((m) => m.classification === "mistake").length;
      const summary =
        blunders === 0 && mistakes === 0
          ? "Партия сыграна точно — без грубых ошибок."
          : blunders > 0
          ? `${blunders} зевок${blunders > 1 ? "а" : ""} и ${mistakes} ошибок${mistakes !== 1 ? "и" : "а"}. Работайте над тактикой!`
          : `${mistakes} ошибок${mistakes !== 1 ? "и" : "а"}. Партия могла быть точнее.`;

      setProgress(100);
      setResult({
        moves,
        evals,
        accuracy: {
          white: wN > 0 ? Math.round(wAcc / wN) : 0,
          black: bN > 0 ? Math.round(bAcc / bN) : 0,
        },
        summary,
      });
    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      setAnalyzing(false);
      worker.terminate();
    }
  }, []);

  const abort = useCallback(() => { abortRef.current = true; }, []);

  return { analyze, analyzing, progress, result, abort };
}
