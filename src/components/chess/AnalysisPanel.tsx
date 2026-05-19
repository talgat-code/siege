"use client";
import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { EvalGraph } from "./EvalGraph";
import { useGameAnalysis, MoveClassification } from "@/hooks/useGameAnalysis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  pgn: string;
  gameId?: string;
}

const CLS_COLOR: Record<MoveClassification, string> = {
  brilliant: "text-cyan-400",
  best: "text-green-400",
  good: "text-green-300",
  inaccuracy: "text-yellow-400",
  mistake: "text-orange-400",
  blunder: "text-red-500",
};

const CLS_BADGE: Record<MoveClassification, string> = {
  brilliant: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  best: "bg-green-500/20 text-green-400 border-green-500/30",
  good: "bg-green-500/10 text-green-300 border-green-500/20",
  inaccuracy: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  mistake: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  blunder: "bg-red-500/20 text-red-500 border-red-500/30",
};

const CLS_LABEL: Record<MoveClassification, string> = {
  brilliant: "Блестящий",
  best: "Точный",
  good: "Хороший",
  inaccuracy: "Неточность",
  mistake: "Ошибка",
  blunder: "Зевок",
};

function cpToDisplay(cp: number): string {
  if (cp >= 30000) return "M+";
  if (cp <= -30000) return "M-";
  const abs = Math.abs(cp / 100);
  return (cp >= 0 ? "+" : "-") + abs.toFixed(1);
}

export function AnalysisPanel({ pgn, gameId }: Props) {
  const { analyze, analyzing, progress, result } = useGameAnalysis();
  const [currentIdx, setCurrentIdx] = useState(0); // position index (0 = start)
  const [currentFen, setCurrentFen] = useState<string>(() => {
    try {
      const c = new Chess();
      if (pgn) {
        c.loadPgn(pgn);
        return c.fen();
      }
    } catch { /* ok */ }
    return new Chess().fen();
  });

  const moves = result?.moves ?? [];

  // Navigate to position
  function goToMove(idx: number) {
    const safe = Math.max(0, Math.min(moves.length, idx));
    setCurrentIdx(safe);
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const history = chess.history({ verbose: true });
      const game = new Chess();
      for (let i = 0; i < safe; i++) {
        game.move(history[i]);
      }
      setCurrentFen(game.fen());
    } catch { /* ok */ }
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!result) return;
      if (e.key === "ArrowLeft") goToMove(currentIdx - 1);
      if (e.key === "ArrowRight") goToMove(currentIdx + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIdx, result, pgn]);

  // Save analysis to DB when done
  useEffect(() => {
    if (!result || !gameId) return;
    const keyMoments = result.moves
      .filter((m) => m.classification === "blunder" || m.classification === "mistake")
      .map((m) => ({
        moveNumber: m.moveNumber,
        color: m.color,
        san: m.san,
        classification: m.classification,
        loss: m.loss,
        comment: m.comment,
      }));

    fetch(`/api/game/${gameId}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evals: result.evals,
        accuracy: result.accuracy,
        key_moments: keyMoments,
        summary: result.summary,
      }),
    }).catch(() => {});
  }, [result, gameId]);

  const currentMove = result?.moves[currentIdx - 1];

  return (
    <div className="space-y-4">
      {/* Start button */}
      {!result && !analyzing && (
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Анализ Stockfish 18 — оценка каждого хода
          </p>
          <Button onClick={() => analyze(pgn)} size="lg" className="gap-2">
            <span>🤖</span> Анализировать партию
          </Button>
        </div>
      )}

      {/* Progress */}
      {analyzing && (
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-2 text-sm font-medium">Анализирую партию...</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{progress}%</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Accuracy */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Белые", acc: result.accuracy.white, color: "#fff" },
              { label: "Чёрные", acc: result.accuracy.black, color: "#888" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.acc}%
                </p>
                <p className="text-xs text-muted-foreground">точность</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            {result.summary}
          </div>

          {/* Eval graph */}
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              График оценки
            </p>
            <EvalGraph
              evals={result.evals}
              currentMove={currentIdx}
              onMoveClick={(i) => goToMove(i)}
            />
          </div>

          {/* Board + move list */}
          <div className="flex gap-4">
            {/* Board */}
            <div className="w-72 shrink-0">
              <Chessboard
                options={{
                  position: currentFen,
                  boardOrientation: "white",
                  allowDragging: false,
                  boardStyle: { borderRadius: "8px" },
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" onClick={() => goToMove(0)}>|&lt;</Button>
                <Button size="sm" variant="outline" onClick={() => goToMove(currentIdx - 1)}>←</Button>
                <span className="text-xs text-muted-foreground">
                  {currentIdx}/{moves.length}
                </span>
                <Button size="sm" variant="outline" onClick={() => goToMove(currentIdx + 1)}>→</Button>
                <Button size="sm" variant="outline" onClick={() => goToMove(moves.length)}>&gt;|</Button>
              </div>
              {currentMove && (
                <div className="mt-2 rounded-lg border bg-card/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{currentMove.san}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${CLS_BADGE[currentMove.classification]}`}
                    >
                      {CLS_LABEL[currentMove.classification]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{currentMove.comment}</p>
                  <p className="mt-1 text-xs font-mono">
                    <span className="text-muted-foreground">Оценка: </span>
                    <span className={currentMove.evalAfter >= 0 ? "text-white" : "text-red-400"}>
                      {cpToDisplay(currentMove.evalAfter)}
                    </span>
                    {currentMove.loss > 50 && (
                      <span className="ml-2 text-orange-400">
                        -{(currentMove.loss / 100).toFixed(1)} пешки
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Move list */}
            <div className="flex-1 overflow-y-auto max-h-96 rounded-xl border bg-card">
              <div className="grid grid-cols-3 divide-y divide-border text-sm">
                {Array.from({ length: Math.ceil(moves.length / 2) }, (_, pairIdx) => {
                  const wMove = moves[pairIdx * 2];
                  const bMove = moves[pairIdx * 2 + 1];
                  return (
                    <React.Fragment key={pairIdx}>
                      <div className="px-3 py-2 text-muted-foreground text-xs flex items-center">
                        {pairIdx + 1}.
                      </div>
                      {[wMove, bMove].map((mv, si) => (
                        <button
                          key={si}
                          onClick={() => mv && goToMove(pairIdx * 2 + si + 1)}
                          className={`px-2 py-2 text-left text-xs font-mono hover:bg-accent/50 transition-colors ${
                            currentIdx === pairIdx * 2 + si + 1
                              ? "bg-primary/20 text-primary"
                              : ""
                          }`}
                        >
                          {mv ? (
                            <span className={CLS_COLOR[mv.classification]}>
                              {mv.san}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
