"use client";

import { useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Square } from "chess.js";
import { cn } from "@/lib/utils";
import { useChessGame, type GameStatus } from "@/hooks/useChessGame";
import { GameTimer } from "./GameTimer";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";

interface OnlineChessBoardProps {
  gameId: string;
  myColor: "white" | "black";
  opponentUsername: string;
  myUsername: string;
  myFactionColor?: string;
  initialData: {
    pgn: string;
    time_control: string;
    mode: string;
    white_time_ms: number | null;
    black_time_ms: number | null;
    white_player_id: string;
    black_player_id: string;
    result: string | null;
  };
}

const STATUS_LABELS: Record<GameStatus, string> = {
  playing: "",
  white_won: "Белые победили!",
  black_won: "Чёрные победили!",
  draw: "Ничья!",
  waiting_opponent: "Ожидаем соперника...",
};

export function OnlineChessBoard({
  gameId,
  myColor,
  opponentUsername,
  myUsername,
  myFactionColor,
  initialData,
}: OnlineChessBoardProps) {
  const {
    chess,
    isMyTurn,
    status,
    whiteTimeMs,
    blackTimeMs,
    lastMove,
    opponentConnected,
    ratingChanges,
    makeMove,
    resign,
  } = useChessGame(gameId, myColor, initialData);

  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // Build last-move highlight
  const lastMoveStyles: Record<string, React.CSSProperties> = lastMove
    ? {
        [lastMove.from]: { background: "rgba(255,215,0,0.3)" },
        [lastMove.to]: { background: "rgba(255,215,0,0.3)" },
      }
    : {};

  function getMoveOptions(square: Square) {
    const moves = chess.moves({ square, verbose: true });
    if (!moves.length) return false;

    const styles: Record<string, React.CSSProperties> = {};
    moves.forEach((m) => {
      const isCapture = chess.get(m.to as Square);
      styles[m.to] = {
        background: isCapture
          ? "radial-gradient(circle, rgba(255,0,0,0.35) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(255,215,0,0.5) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    styles[square] = { background: "rgba(255,215,0,0.4)" };
    setSquareStyles(styles);
    return true;
  }

  function onSquareClick({ square }: SquareHandlerArgs) {
    if (!isMyTurn) return;
    const sq = square as Square;

    if (!moveFrom) {
      const piece = chess.get(sq);
      if (!piece || piece.color !== chess.turn()) { setSquareStyles({}); return; }
      if (getMoveOptions(sq)) setMoveFrom(sq);
      return;
    }

    // Try move
    makeMove(moveFrom, sq).then((success) => {
      if (success) {
        setMoveFrom(null);
        setSquareStyles({});
      } else {
        // Reselect
        const piece = chess.get(sq);
        if (piece && piece.color === chess.turn()) {
          if (getMoveOptions(sq)) setMoveFrom(sq);
          else { setMoveFrom(null); setSquareStyles({}); }
        } else {
          setMoveFrom(null);
          setSquareStyles({});
        }
      }
    });
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!isMyTurn || !targetSquare) return false;
    makeMove(sourceSquare as Square, targetSquare as Square);
    setMoveFrom(null);
    setSquareStyles({});
    return true;
  }

  const topColor = myColor === "white" ? "black" : "white";
  const bottomColor = myColor;
  const topUsername = myColor === "white" ? opponentUsername : myUsername;
  const bottomUsername = myColor === "white" ? myUsername : opponentUsername;
  const topTimeMs = topColor === "white" ? whiteTimeMs : blackTimeMs;
  const bottomTimeMs = bottomColor === "white" ? whiteTimeMs : blackTimeMs;
  const topActive = status === "playing" && chess.turn() === (topColor === "white" ? "w" : "b");
  const bottomActive = status === "playing" && chess.turn() === (bottomColor === "white" ? "w" : "b");

  const history = chess.history();

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-3">
      {/* Opponent (top) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              opponentConnected ? "bg-green-400" : "bg-gray-500"
            )}
          />
          <span className="text-sm font-medium">{topUsername}</span>
        </div>
      </div>
      <GameTimer
        timeMs={topTimeMs}
        isActive={topActive}
        label={topColor === "white" ? "Белые" : "Чёрные"}
        color={topColor}
        factionColor={topColor !== myColor ? undefined : myFactionColor}
      />

      {/* Board */}
      <div className="relative">
        <Chessboard
          options={{
            position: chess.fen(),
            boardOrientation: myColor,
            squareStyles: { ...lastMoveStyles, ...squareStyles },
            onSquareClick,
            onPieceDrop,
            darkSquareStyle: { backgroundColor: "#2d4a6b" },
            lightSquareStyle: { backgroundColor: "#b8cfe8" },
            boardStyle: {
              borderRadius: "8px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            },
            animationDurationInMs: 150,
            allowDragging: isMyTurn && status === "playing",
          }}
        />

        {/* Game-over overlay */}
        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/60 backdrop-blur-sm">
            <p className="text-3xl font-black text-primary">{STATUS_LABELS[status]}</p>

            {ratingChanges && initialData.mode === "tournament" && (
              <div className="flex gap-4 text-sm">
                <span className={cn("font-bold", ratingChanges.white >= 0 ? "text-green-400" : "text-red-400")}>
                  Белые: {ratingChanges.white > 0 ? "+" : ""}{ratingChanges.white}
                </span>
                <span className={cn("font-bold", ratingChanges.black >= 0 ? "text-green-400" : "text-red-400")}>
                  Чёрные: {ratingChanges.black > 0 ? "+" : ""}{ratingChanges.black}
                </span>
              </div>
            )}

            <a
              href="/play"
              className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Новая партия
            </a>
          </div>
        )}
      </div>

      {/* My timer */}
      <GameTimer
        timeMs={bottomTimeMs}
        isActive={bottomActive}
        label={bottomColor === "white" ? "Белые" : "Чёрные"}
        color={bottomColor}
        factionColor={myFactionColor}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{bottomUsername}</span>
        {status === "playing" && (
          <div>
            {showResignConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Сдаться?</span>
                <button
                  onClick={() => { resign(); setShowResignConfirm(false); }}
                  className="rounded bg-destructive px-3 py-1 text-xs font-bold text-white"
                >
                  Да
                </button>
                <button
                  onClick={() => setShowResignConfirm(false)}
                  className="rounded border border-border px-3 py-1 text-xs"
                >
                  Нет
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResignConfirm(true)}
                className="rounded border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                Сдаться
              </button>
            )}
          </div>
        )}
      </div>

      {/* Move list */}
      {history.length > 0 && (
        <div className="max-h-28 overflow-y-auto rounded-lg border bg-muted/40 p-3">
          <div className="flex flex-wrap gap-1 text-xs font-mono">
            {history.map((move, i) => (
              <span key={i}>
                {i % 2 === 0 && (
                  <span className="mr-1 text-muted-foreground">{Math.floor(i / 2) + 1}.</span>
                )}
                <span className="rounded bg-accent/60 px-1 py-0.5">{move}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
