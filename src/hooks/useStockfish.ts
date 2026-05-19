"use client";
import { useEffect, useRef, useCallback } from "react";

export type StockfishLine = {
  depth: number;
  score: number; // centipawns, from white's perspective
  mate: number | null; // moves to mate, null if not mate
  pv: string; // best line in UCI notation
};

type MessageHandler = (line: StockfishLine) => void;

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map());
  const readyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const worker = new Worker("/stockfish.js");
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;
      if (line === "uciok") {
        readyRef.current = true;
        worker.postMessage("isready");
      }
      if (line === "readyok") {
        // Ready for use
      }

      // Parse "info depth X score cp Y multipv Z pv ..."
      if (line.startsWith("info") && line.includes("score") && line.includes("pv")) {
        const parsed = parseInfo(line);
        if (parsed) {
          const pvKey = line.match(/multipv (\d+)/)?.[1] ?? "1";
          handlersRef.current.forEach((handler) => {
            handler(parsed);
          });
          void pvKey; // suppress lint
        }
      }
    };

    worker.postMessage("uci");

    return () => {
      worker.postMessage("quit");
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  const analyze = useCallback(
    (fen: string, depth: number, onResult: (line: StockfishLine) => void): (() => void) => {
      const key = fen;
      handlersRef.current.set(key, onResult);

      const send = () => {
        const w = workerRef.current;
        if (!w) return;
        w.postMessage("stop");
        w.postMessage(`position fen ${fen}`);
        w.postMessage(`go depth ${depth}`);
      };

      if (readyRef.current) {
        send();
      } else {
        const interval = setInterval(() => {
          if (readyRef.current) {
            clearInterval(interval);
            send();
          }
        }, 100);
      }

      return () => {
        handlersRef.current.delete(key);
        workerRef.current?.postMessage("stop");
      };
    },
    []
  );

  const stop = useCallback(() => {
    workerRef.current?.postMessage("stop");
  }, []);

  return { analyze, stop };
}

function parseInfo(line: string): StockfishLine | null {
  const depthMatch = line.match(/depth (\d+)/);
  const cpMatch = line.match(/score cp (-?\d+)/);
  const mateMatch = line.match(/score mate (-?\d+)/);
  const pvMatch = line.match(/ pv (.+)$/);

  if (!depthMatch || !pvMatch) return null;

  const depth = parseInt(depthMatch[1]);
  let score = 0;
  let mate: number | null = null;

  if (mateMatch) {
    mate = parseInt(mateMatch[1]);
    score = mate > 0 ? 30000 : -30000;
  } else if (cpMatch) {
    score = parseInt(cpMatch[1]);
  } else {
    return null;
  }

  return {
    depth,
    score,
    mate,
    pv: pvMatch[1].trim(),
  };
}
