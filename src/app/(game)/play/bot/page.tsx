"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs } from "react-chessboard";
import Link from "next/link";

const DIFFICULTY_LEVELS = [
  { value: 1,  label: "Новобранец",   elo: "~600",  depth: 3,  moveTime: 500  },
  { value: 2,  label: "Солдат",       elo: "~900",  depth: 5,  moveTime: 800  },
  { value: 3,  label: "Капитан",      elo: "~1200", depth: 8,  moveTime: 1200 },
  { value: 4,  label: "Полководец",   elo: "~1500", depth: 12, moveTime: 1500 },
  { value: 5,  label: "Гроссмейстер", elo: "~1800", depth: 18, moveTime: 2000 },
];

type GameStatus = "setup" | "playing" | "over";

export default function BotGamePage() {
  const [status, setStatus] = useState<GameStatus>("setup");
  const [difficulty, setDifficulty] = useState(3);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const level = DIFFICULTY_LEVELS.find((d) => d.value === difficulty)!;

  // Initialize Stockfish worker
  useEffect(() => {
    const worker = new Worker("/stockfish.js");
    workerRef.current = worker;
    worker.postMessage("uci");
    worker.postMessage("isready");
    return () => worker.terminate();
  }, []);

  const makeBotMove = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || chess.isGameOver()) return;

    setThinking(true);

    worker.onmessage = (e: MessageEvent<string>) => {
      const msg = e.data;
      if (msg.startsWith("bestmove")) {
        const uci = msg.split(" ")[1];
        if (!uci || uci === "(none)") {
          setThinking(false);
          return;
        }
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length === 5 ? uci[4] : undefined;

        try {
          chess.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
          setFen(chess.fen());
          setLastMove({ from, to });
          checkGameOver();
        } catch { /* invalid move */ }
        setThinking(false);
      }
    };

    worker.postMessage(`position fen ${chess.fen()}`);
    worker.postMessage(`go depth ${level.depth} movetime ${level.moveTime}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, level]);

  function checkGameOver() {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "Чёрные" : "Белые";
      setGameResult(`${winner} победили — мат!`);
      setStatus("over");
    } else if (chess.isDraw()) {
      setGameResult("Ничья");
      setStatus("over");
    } else if (chess.isStalemate()) {
      setGameResult("Пат — ничья");
      setStatus("over");
    }
  }

  // Bot moves automatically when it's bot's turn
  useEffect(() => {
    if (status !== "playing") return;
    const botColor = playerColor === "white" ? "b" : "w";
    if (chess.turn() === botColor && !chess.isGameOver()) {
      const timer = setTimeout(makeBotMove, 300);
      return () => clearTimeout(timer);
    }
  }, [fen, status, playerColor, chess, makeBotMove]);

  function onDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (status !== "playing" || thinking || !targetSquare) return false;
    const myColor = playerColor === "white" ? "w" : "b";
    if (chess.turn() !== myColor) return false;

    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;
      setFen(chess.fen());
      setLastMove({ from: sourceSquare, to: targetSquare! });
      checkGameOver();
      return true;
    } catch {
      return false;
    }
  }

  function startGame() {
    chess.reset();
    setFen(chess.fen());
    setLastMove(null);
    setGameResult(null);
    setStatus("playing");
  }

  function resign() {
    const winnerName = playerColor === "white" ? "Чёрные" : "Белые";
    setGameResult(`${winnerName} победили — сдача`);
    setStatus("over");
  }

  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    customSquareStyles[lastMove.from] = { background: "rgba(201,168,76,0.25)" };
    customSquareStyles[lastMove.to] = { background: "rgba(201,168,76,0.4)" };
  }
  if (chess.inCheck()) {
    const kingSquare = findKingSquare(chess);
    if (kingSquare) {
      customSquareStyles[kingSquare] = { background: "rgba(224,85,64,0.5)" };
    }
  }

  if (status === "setup") {
    return (
      <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
        <div className="mx-auto max-w-lg px-4 py-16">
          <div className="mb-8 text-center">
            <span className="section-label">Тренировочный зал</span>
            <h1 className="section-title" style={{ fontSize: "1.8rem" }}>
              Игра с ботом
            </h1>
            <div className="lunar-rule mx-auto mt-4 w-24" />
          </div>

          <div
            className="rounded-xl p-8"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* Color choice */}
            <div className="mb-8">
              <p
                className="font-cinzel mb-3"
                style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}
              >
                Ваш цвет
              </p>
              <div className="flex gap-3">
                {(["white", "black"] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() => setPlayerColor(color)}
                    className="flex-1 rounded-lg py-3 transition-all"
                    style={{
                      background: playerColor === color
                        ? color === "white" ? "rgba(237,232,218,0.15)" : "rgba(17,24,39,0.8)"
                        : "#1C2333",
                      border: playerColor === color
                        ? `1px solid ${color === "white" ? "rgba(237,232,218,0.4)" : "rgba(100,100,120,0.6)"}`
                        : "1px solid rgba(255,255,255,0.06)",
                      color: color === "white" ? "#EDE8DA" : "#B8B8C8",
                    }}
                  >
                    <div className="text-2xl mb-1">{color === "white" ? "♔" : "♚"}</div>
                    <div className="font-cinzel" style={{ fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                      {color === "white" ? "Белые" : "Чёрные"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-8">
              <p
                className="font-cinzel mb-3"
                style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}
              >
                Сложность
              </p>
              <div className="flex flex-col gap-2">
                {DIFFICULTY_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => setDifficulty(lvl.value)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 transition-all text-left"
                    style={{
                      background: difficulty === lvl.value ? "rgba(201,168,76,0.1)" : "#1C2333",
                      border: difficulty === lvl.value
                        ? "1px solid rgba(201,168,76,0.35)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span style={{ fontSize: "0.88rem", color: difficulty === lvl.value ? "#EDE8DA" : "#B8B8C8" }}>
                      {lvl.label}
                    </span>
                    <span
                      className="font-cinzel"
                      style={{ fontSize: "0.68rem", color: "#686880", letterSpacing: "0.08em" }}
                    >
                      ELO {lvl.elo}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startGame} className="siege-btn-primary w-full">
              Начать партию
            </button>

            <div className="mt-4 text-center">
              <Link href="/play" className="font-cinzel" style={{ fontSize: "0.68rem", color: "#686880", letterSpacing: "0.1em" }}>
                ← Назад к матчмейкингу
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Board */}
          <div className="flex-1 min-w-0">
            {/* Opponent info */}
            <div
              className="mb-3 flex items-center gap-3 rounded-lg px-4 py-2.5"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-xl">{playerColor === "white" ? "♚" : "♔"}</span>
              <div className="flex-1">
                <p style={{ fontSize: "0.88rem", color: "#EDE8DA", fontWeight: 500 }}>
                  🤖 NPC: {level.label}
                </p>
                <p style={{ fontSize: "0.7rem", color: "#686880" }}>ELO {level.elo}</p>
              </div>
              {thinking && (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{ background: "#C9A84C", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                  <span style={{ fontSize: "0.7rem", color: "#686880", marginLeft: "4px" }}>думает...</span>
                </div>
              )}
            </div>

            <Chessboard
              options={{
                position: fen,
                onPieceDrop: onDrop,
                boardOrientation: playerColor,
                allowDragging: status === "playing" && !thinking,
                boardStyle: {
                  borderRadius: "8px",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                },
                squareStyles: customSquareStyles,
                lightSquareStyle: { backgroundColor: "#EDE8DA" },
                darkSquareStyle:  { backgroundColor: "#3D2B1F" },
              }}
            />

            {/* Player info */}
            <div
              className="mt-3 flex items-center gap-3 rounded-lg px-4 py-2.5"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-xl">{playerColor === "white" ? "♔" : "♚"}</span>
              <p style={{ fontSize: "0.88rem", color: "#EDE8DA", fontWeight: 500 }}>Вы</p>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full lg:w-64 shrink-0 space-y-4">
            {/* Status */}
            <div
              className="rounded-xl p-4"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p
                className="font-cinzel mb-2"
                style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "#686880", textTransform: "uppercase" }}
              >
                Статус
              </p>
              {gameResult ? (
                <p className="font-cinzel font-bold" style={{ color: "#C9A84C", fontSize: "0.95rem" }}>
                  {gameResult}
                </p>
              ) : (
                <p style={{ color: "#B8B8C8", fontSize: "0.85rem" }}>
                  {thinking
                    ? "Бот думает..."
                    : chess.turn() === (playerColor === "white" ? "w" : "b")
                      ? "Ваш ход"
                      : "Ход бота"}
                </p>
              )}
              {chess.inCheck() && !gameResult && (
                <p className="mt-1 font-cinzel" style={{ color: "#E05540", fontSize: "0.72rem", letterSpacing: "0.1em" }}>
                  ШАХ!
                </p>
              )}
            </div>

            {/* Move count */}
            <div
              className="rounded-xl p-4"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p style={{ fontSize: "0.72rem", color: "#686880" }}>Ходов сыграно</p>
              <p className="font-cinzel font-bold" style={{ color: "#EDE8DA", fontSize: "1.5rem" }}>
                {Math.ceil(chess.history().length / 2)}
              </p>
            </div>

            {/* Actions */}
            {status === "playing" && (
              <button
                onClick={resign}
                className="siege-btn-ghost w-full"
                style={{ padding: "0.6rem" }}
              >
                Сдаться
              </button>
            )}

            {status === "over" && (
              <div className="space-y-2">
                <button
                  onClick={startGame}
                  className="siege-btn-primary w-full"
                >
                  Ещё раз
                </button>
                <button
                  onClick={() => setStatus("setup")}
                  className="siege-btn-ghost w-full"
                >
                  Сменить уровень
                </button>
                <Link href="/play" className="siege-btn-secondary w-full justify-center block text-center">
                  Против людей
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function findKingSquare(chess: Chess): string | null {
  const board = chess.board();
  const turn = chess.turn();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.type === "k" && piece.color === turn) {
        return `${"abcdefgh"[c]}${8 - r}`;
      }
    }
  }
  return null;
}
