"use client";

import { useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { cn } from "@/lib/utils";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";

interface ChessBoardProps {
  orientation?: "white" | "black";
  onGameEnd?: (result: "white" | "black" | "draw", pgn: string) => void;
}

export function ChessBoard({ orientation = "white", onGameEnd }: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const [status, setStatus] = useState<string>("Ход белых");

  function getMoveOptions(square: Square, chess: Chess) {
    const moves = chess.moves({ square, verbose: true });
    if (moves.length === 0) return false;

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move) => {
      const isCapture = chess.get(move.to as Square);
      newSquares[move.to] = {
        background: isCapture
          ? "radial-gradient(circle, rgba(255,0,0,0.35) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(255,215,0,0.5) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    newSquares[square] = { background: "rgba(255,215,0,0.4)" };
    setSquareStyles(newSquares);
    return true;
  }

  function updateStatus(chess: Chess) {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "black" : "white";
      setStatus(`Мат! Победили ${winner === "white" ? "белые" : "чёрные"}`);
      onGameEnd?.(winner, chess.pgn());
    } else if (chess.isDraw()) {
      setStatus("Ничья!");
      onGameEnd?.("draw", chess.pgn());
    } else if (chess.isCheck()) {
      setStatus(`Шах! Ход ${chess.turn() === "w" ? "белых" : "чёрных"}`);
    } else {
      setStatus(`Ход ${chess.turn() === "w" ? "белых" : "чёрных"}`);
    }
  }

  function onSquareClick({ square }: SquareHandlerArgs) {
    if (game.isGameOver()) return;
    const sq = square as Square;

    if (!moveFrom) {
      const piece = game.get(sq);
      if (!piece || piece.color !== game.turn()) {
        setSquareStyles({});
        return;
      }
      const hasMoves = getMoveOptions(sq, game);
      if (hasMoves) setMoveFrom(sq);
      return;
    }

    // Attempt move
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move({ from: moveFrom, to: sq, promotion: "q" });
      if (result) {
        setGame(gameCopy);
        setSquareStyles({
          [moveFrom]: { background: "rgba(255,215,0,0.3)" },
          [sq]: { background: "rgba(255,215,0,0.3)" },
        });
        setMoveFrom(null);
        updateStatus(gameCopy);
        return;
      }
    } catch {
      // invalid move
    }

    // Reselect another piece
    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) {
      const hasMoves = getMoveOptions(sq, game);
      if (hasMoves) setMoveFrom(sq);
      else {
        setMoveFrom(null);
        setSquareStyles({});
      }
    } else {
      setMoveFrom(null);
      setSquareStyles({});
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (game.isGameOver() || !targetSquare) return false;

    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });
      if (!result) return false;

      setGame(gameCopy);
      setSquareStyles({
        [sourceSquare]: { background: "rgba(255,215,0,0.3)" },
        [targetSquare]: { background: "rgba(255,215,0,0.3)" },
      });
      setMoveFrom(null);
      updateStatus(gameCopy);
      return true;
    } catch {
      return false;
    }
  }

  const handleReset = useCallback(() => {
    setGame(new Chess());
    setMoveFrom(null);
    setSquareStyles({});
    setStatus("Ход белых");
  }, []);

  const history = game.history();

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div
        className={cn(
          "rounded-lg border px-4 py-2 text-center text-sm font-medium",
          game.isGameOver()
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-muted text-foreground"
        )}
      >
        {status}
      </div>

      {/* Board — v5 API: all options via the `options` prop */}
      <div className="w-full max-w-[560px]">
        <Chessboard
          options={{
            position: game.fen(),
            boardOrientation: orientation,
            squareStyles,
            onSquareClick,
            onPieceDrop,
            darkSquareStyle: { backgroundColor: "#2d4a6b" },
            lightSquareStyle: { backgroundColor: "#b8cfe8" },
            boardStyle: {
              borderRadius: "8px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            },
            animationDurationInMs: 150,
          }}
        />
      </div>

      {/* Move history */}
      {history.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Ходы</p>
          <div className="flex flex-wrap gap-1 text-xs">
            {history.map((move, i) => (
              <span key={i} className="font-mono">
                {i % 2 === 0 && (
                  <span className="mr-1 text-muted-foreground">
                    {Math.floor(i / 2) + 1}.
                  </span>
                )}
                <span className="rounded bg-accent px-1 py-0.5">{move}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <button
        onClick={handleReset}
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        Новая партия
      </button>
    </div>
  );
}
