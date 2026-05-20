"use client";

import React, {
  useState, useEffect, useRef, useCallback, useMemo, useReducer,
} from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import Link from "next/link";

// ─── Config ───────────────────────────────────────────────────────────────────

type DifficultyKey = "newbie" | "amateur" | "veteran" | "master" | "legend";
type PlayerColor = "white" | "black";

interface DifficultyConfig {
  label: string;
  elo: number;
  skill: number;
  movetime: number;
  icon: string;
}

const DIFFICULTY_LEVELS: Record<DifficultyKey, DifficultyConfig> = {
  newbie:  { label: "Новобранец",    elo: 600,  skill: 0,  movetime: 400,  icon: "⚔️" },
  amateur: { label: "Солдат",        elo: 1000, skill: 5,  movetime: 800,  icon: "🛡️" },
  veteran: { label: "Ветеран",       elo: 1400, skill: 10, movetime: 1500, icon: "🎖️" },
  master:  { label: "Полководец",    elo: 1800, skill: 15, movetime: 2500, icon: "👑" },
  legend:  { label: "Гроссмейстер",  elo: 2300, skill: 20, movetime: 4000, icon: "🏆" },
};

const TIMER_SECONDS = 600;

// ─── State ────────────────────────────────────────────────────────────────────

interface GameState {
  fen: string;
  history: { san: string; color: "w" | "b" }[];
  lastMove: { from: string; to: string } | null;
  isThinking: boolean;
  result: { title: string; reason: string; isWin: boolean | null } | null;
  selectedSquare: string | null;
  legalSquares: string[];
  capturedByWhite: string[];
  capturedByBlack: string[];
  gameStarted: boolean;
}

type GameAction =
  | { type: "MOVE"; fen: string; from: string; to: string; captured?: string; san: string; color: "w" | "b" }
  | { type: "BOT_THINKING"; v: boolean }
  | { type: "SELECT"; square: string | null; legal: string[] }
  | { type: "RESULT"; result: GameState["result"] }
  | { type: "RESET"; fen: string };

function reducer(s: GameState, a: GameAction): GameState {
  switch (a.type) {
    case "MOVE": {
      const byWhite = a.color === "w" && a.captured ? [...s.capturedByWhite, a.captured] : s.capturedByWhite;
      const byBlack = a.color === "b" && a.captured ? [...s.capturedByBlack, a.captured] : s.capturedByBlack;
      return {
        ...s, fen: a.fen, lastMove: { from: a.from, to: a.to },
        selectedSquare: null, legalSquares: [],
        capturedByWhite: byWhite, capturedByBlack: byBlack,
        history: [...s.history, { san: a.san, color: a.color }],
        gameStarted: true, isThinking: false,
      };
    }
    case "BOT_THINKING": return { ...s, isThinking: a.v };
    case "SELECT": return { ...s, selectedSquare: a.square, legalSquares: a.legal };
    case "RESULT": return { ...s, result: a.result, isThinking: false };
    case "RESET": return { ...initState, fen: a.fen };
    default: return s;
  }
}

function makeInitState(chess: Chess): GameState {
  return {
    fen: chess.fen(), history: [], lastMove: null, isThinking: false, result: null,
    selectedSquare: null, legalSquares: [], capturedByWhite: [], capturedByBlack: [],
    gameStarted: false,
  };
}
const initState = makeInitState(new Chess());

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function findKing(chess: Chess): string | null {
  const board = chess.board();
  const t = chess.turn();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p?.type === "k" && p.color === t) return `${"abcdefgh"[c]}${8 - r}`;
    }
  return null;
}

const SYM: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛" };
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({ onStart }: { onStart: (c: PlayerColor, d: DifficultyKey) => void }) {
  const [color, setColor] = useState<PlayerColor>("white");
  const [diff, setDiff] = useState<DifficultyKey>("veteran");

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="mb-8 text-center">
          <span className="section-label">Тренировочный зал</span>
          <h1 className="section-title" style={{ fontSize: "1.8rem" }}>Игра с ботом</h1>
          <div className="lunar-rule mx-auto mt-4 w-24" />
        </div>

        <div className="rounded-xl p-8" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Color */}
          <div className="mb-8">
            <p className="font-cinzel mb-3" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}>Ваш цвет</p>
            <div className="flex gap-3">
              {(["white", "black"] as const).map((c) => (
                <button key={c} onClick={() => setColor(c)} className="flex-1 rounded-lg py-3 transition-all"
                  style={{
                    background: color === c ? (c === "white" ? "rgba(237,232,218,0.15)" : "rgba(30,30,50,0.8)") : "#1C2333",
                    border: color === c ? `1px solid ${c === "white" ? "rgba(237,232,218,0.4)" : "rgba(120,120,150,0.5)"}` : "1px solid rgba(255,255,255,0.06)",
                    color: c === "white" ? "#EDE8DA" : "#B8B8C8",
                  }}>
                  <div className="text-2xl mb-1">{c === "white" ? "♔" : "♚"}</div>
                  <div className="font-cinzel" style={{ fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                    {c === "white" ? "Белые" : "Чёрные"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="mb-8">
            <p className="font-cinzel mb-3" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}>Сложность</p>
            <div className="grid grid-cols-5 gap-2">
              {(Object.entries(DIFFICULTY_LEVELS) as [DifficultyKey, DifficultyConfig][]).map(([key, lvl]) => (
                <button key={key} onClick={() => setDiff(key)} className="rounded-lg p-3 transition-all text-center"
                  style={{
                    background: diff === key ? "rgba(201,168,76,0.12)" : "#1C2333",
                    border: diff === key ? "1px solid rgba(201,168,76,0.45)" : "1px solid rgba(255,255,255,0.06)",
                  }}>
                  <div style={{ fontSize: "1.3rem", marginBottom: "4px" }}>{lvl.icon}</div>
                  <div className="font-cinzel" style={{ fontSize: "0.58rem", color: diff === key ? "#C9A84C" : "#B8B8C8", fontWeight: 700 }}>
                    {lvl.label}
                  </div>
                  <div style={{ fontSize: "0.55rem", color: "#686880", marginTop: "2px" }}>~{lvl.elo}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => onStart(color, diff)} className="siege-btn-primary w-full">
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

// ─── Post-Game Modal ───────────────────────────────────────────────────────────

function PostGameModal({
  result, moveCount, onRematch, onNewLevel,
}: {
  result: NonNullable<GameState["result"]>;
  moveCount: number;
  onRematch: () => void;
  onNewLevel: () => void;
}) {
  const color = result.isWin === true ? "#C9A84C" : result.isWin === false ? "#E05540" : "#B8B8C8";
  const borderColor = result.isWin === true ? "rgba(201,168,76,0.4)" : result.isWin === false ? "rgba(224,85,64,0.3)" : "rgba(255,255,255,0.1)";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(11,15,26,0.88)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-8 text-center"
        style={{ background: "#111827", border: `1px solid ${borderColor}` }}>
        <p className="font-cinzel font-black" style={{ fontSize: "2rem", color, letterSpacing: "0.12em" }}>
          {result.title}
        </p>
        <p className="font-crimson mt-2" style={{ fontSize: "1rem", color: "#686880", fontStyle: "italic" }}>
          {result.reason}
        </p>
        <div className="my-6" style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />
        <p style={{ fontSize: "0.85rem", color: "#B8B8C8" }}>
          Ходов сыграно: <span style={{ color: "#EDE8DA" }}>{Math.ceil(moveCount / 2)}</span>
        </p>
        <div className="my-6" style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />
        <div className="space-y-2">
          <button onClick={onRematch} className="siege-btn-primary w-full">🔄 Реванш</button>
          <button onClick={onNewLevel} className="siege-btn-ghost w-full" style={{ padding: "0.6rem" }}>
            ⚔️ Другой уровень
          </button>
          <Link href="/" className="siege-btn-secondary block w-full text-center">🏠 Главная</Link>
        </div>
      </div>
    </div>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

function GameScreen({
  playerColor, difficultyKey, onChangeLevel, onRematch,
}: {
  playerColor: PlayerColor;
  difficultyKey: DifficultyKey;
  onChangeLevel: () => void;
  onRematch: () => void;
}) {
  const lvl = DIFFICULTY_LEVELS[difficultyKey];
  const chess = useRef(new Chess()).current;
  const workerRef = useRef<Worker | null>(null);
  const thinkingRef = useRef(false);
  const isReadyRef = useRef(false);

  const [state, dispatch] = useReducer(reducer, undefined, () => makeInitState(chess));
  const [playerMs, setPlayerMs] = useState(TIMER_SECONDS * 1000);
  const [botMs, setBotMs] = useState(TIMER_SECONDS * 1000);

  const botTurn = playerColor === "white" ? "b" : "w";
  const isPlayerTurn = chess.turn() !== botTurn;

  // ── Worker init ─────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker("/stockfish.js");
    workerRef.current = worker;

    const onReady = (e: MessageEvent<string>) => {
      if (e.data === "readyok") isReadyRef.current = true;
    };
    worker.addEventListener("message", onReady);
    worker.postMessage("uci");
    worker.postMessage("isready");

    return () => {
      worker.postMessage("stop");
      worker.postMessage("quit");
      setTimeout(() => worker.terminate(), 100);
      workerRef.current = null;
      isReadyRef.current = false;
    };
  }, []);

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.gameStarted || state.result) return;
    const id = setInterval(() => {
      if (thinkingRef.current) return;
      if (chess.turn() === (playerColor === "white" ? "w" : "b")) {
        setPlayerMs((p) => { if (p <= 0) return 0; return p - 1000; });
      } else {
        setBotMs((p) => { if (p <= 0) return 0; return p - 1000; });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [state.gameStarted, state.result, playerColor, chess]);

  // ── Timer flagfall ───────────────────────────────────────────────
  useEffect(() => {
    if (state.result) return;
    if (playerMs <= 0) dispatch({ type: "RESULT", result: { title: "ПОРАЖЕНИЕ", reason: "Время истекло", isWin: false } });
  }, [playerMs, state.result]);
  useEffect(() => {
    if (state.result) return;
    if (botMs <= 0) dispatch({ type: "RESULT", result: { title: "ПОБЕДА", reason: "Бот просрочил время", isWin: true } });
  }, [botMs, state.result]);

  // ── Check game over ──────────────────────────────────────────────
  function checkEnd() {
    if (chess.isCheckmate()) {
      const win = chess.turn() === botTurn;
      dispatch({ type: "RESULT", result: { title: win ? "ПОБЕДА" : "ПОРАЖЕНИЕ", reason: "Мат", isWin: win } });
    } else if (chess.isDraw() || chess.isStalemate()) {
      dispatch({ type: "RESULT", result: { title: "НИЧЬЯ", reason: chess.isStalemate() ? "Пат" : "Ничья", isWin: null } });
    }
  }

  // ── Bot move ─────────────────────────────────────────────────────
  const makeBotMove = useCallback(async () => {
    const worker = workerRef.current;
    if (!worker || chess.isGameOver() || thinkingRef.current) return;

    thinkingRef.current = true;
    dispatch({ type: "BOT_THINKING", v: true });

    const fen = chess.fen();

    const movePromise = new Promise<string>((resolve) => {
      const handler = (e: MessageEvent<string>) => {
        if (e.data.startsWith("bestmove")) {
          worker.removeEventListener("message", handler);
          resolve(e.data.split(" ")[1] ?? "(none)");
        }
      };
      worker.addEventListener("message", handler);
      worker.postMessage(`setoption name Skill Level value ${lvl.skill}`);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go movetime ${lvl.movetime}`);
    });

    // Min 500ms so move doesn't appear before player registers their own move
    const [uci] = await Promise.all([movePromise, sleep(500)]);
    thinkingRef.current = false;

    if (!uci || uci === "(none)") {
      dispatch({ type: "BOT_THINKING", v: false });
      return;
    }

    const from = uci.slice(0, 2);
    const to   = uci.slice(2, 4);
    const promo = uci.length === 5 ? uci[4] : undefined;

    try {
      const move = chess.move({ from, to, promotion: promo as "q" | "r" | "b" | "n" | undefined });
      if (!move) throw new Error("invalid");
      dispatch({ type: "MOVE", fen: chess.fen(), from, to, captured: move.captured, san: move.san, color: move.color });
      checkEnd();
    } catch {
      dispatch({ type: "BOT_THINKING", v: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvl]);

  // ── Auto-trigger bot ─────────────────────────────────────────────
  useEffect(() => {
    if (state.result || chess.isGameOver()) return;
    if (chess.turn() === botTurn) {
      const t = setTimeout(makeBotMove, 250);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fen, state.result]);

  // ── Player drop ──────────────────────────────────────────────────
  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (state.result || !isPlayerTurn || thinkingRef.current || !targetSquare) return false;
    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;
      dispatch({ type: "MOVE", fen: chess.fen(), from: sourceSquare, to: targetSquare, captured: move.captured, san: move.san, color: move.color });
      checkEnd();
      return true;
    } catch { return false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result, isPlayerTurn, chess]);

  // ── Square click (click-to-move + highlight) ─────────────────────
  const onSquareClick = useCallback(({ square }: SquareHandlerArgs) => {
    if (state.result || !isPlayerTurn || thinkingRef.current) return;
    const myColor = playerColor === "white" ? "w" : "b";

    // If a square is selected: try to move there
    if (state.selectedSquare && state.legalSquares.includes(square)) {
      try {
        const move = chess.move({ from: state.selectedSquare, to: square, promotion: "q" });
        if (move) {
          dispatch({ type: "MOVE", fen: chess.fen(), from: state.selectedSquare, to: square, captured: move.captured, san: move.san, color: move.color });
          checkEnd();
          return;
        }
      } catch { /* fall through to reselect */ }
    }

    // Select a friendly piece
    const piece = chess.get(square as Parameters<typeof chess.get>[0]);
    if (piece && piece.color === myColor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moves = chess.moves({ square: square as any, verbose: true }) as { to: string }[];
      dispatch({ type: "SELECT", square, legal: moves.map((m) => m.to) });
      return;
    }

    dispatch({ type: "SELECT", square: null, legal: [] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result, state.selectedSquare, state.legalSquares, isPlayerTurn, playerColor, chess]);

  // ── Resign / Draw ────────────────────────────────────────────────
  const resign = useCallback(() => {
    dispatch({ type: "RESULT", result: { title: "ПОРАЖЕНИЕ", reason: "Сдача", isWin: false } });
  }, []);

  const offerDraw = useCallback(() => {
    dispatch({ type: "RESULT", result: { title: "НИЧЬЯ", reason: "По соглашению", isWin: null } });
  }, []);

  // ── Square styles ─────────────────────────────────────────────────
  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const s: Record<string, React.CSSProperties> = {};
    if (state.lastMove) {
      s[state.lastMove.from] = { background: "rgba(201,168,76,0.22)" };
      s[state.lastMove.to]   = { background: "rgba(201,168,76,0.38)" };
    }
    if (state.selectedSquare) s[state.selectedSquare] = { background: "rgba(123,167,199,0.42)" };
    for (const sq of state.legalSquares) {
      s[sq] = { background: "radial-gradient(circle, rgba(123,167,199,0.5) 28%, transparent 32%)" };
    }
    if (chess.inCheck()) {
      const k = findKing(chess);
      if (k) s[k] = { background: "rgba(180,74,58,0.6)" };
    }
    return s;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastMove, state.selectedSquare, state.legalSquares, state.fen]);

  // ── Captured + material ───────────────────────────────────────────
  const { playerCap, botCap, diff } = useMemo(() => {
    const sort = (ps: string[]) => [...ps].sort((a, b) => (VAL[b] ?? 0) - (VAL[a] ?? 0));
    const pCap = sort(playerColor === "white" ? state.capturedByWhite : state.capturedByBlack);
    const bCap = sort(playerColor === "white" ? state.capturedByBlack : state.capturedByWhite);
    const pVal = pCap.reduce((s, p) => s + (VAL[p] ?? 0), 0);
    const bVal = bCap.reduce((s, p) => s + (VAL[p] ?? 0), 0);
    return { playerCap: pCap, botCap: bCap, diff: pVal - bVal };
  }, [state.capturedByWhite, state.capturedByBlack, playerColor]);

  // ── Move history pairs ────────────────────────────────────────────
  const movePairs = useMemo(() => {
    const pairs: { num: number; w: string; b: string }[] = [];
    for (let i = 0; i < state.history.length; i += 2)
      pairs.push({ num: i / 2 + 1, w: state.history[i]?.san ?? "", b: state.history[i + 1]?.san ?? "" });
    return pairs;
  }, [state.history]);

  const histRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (histRef.current) histRef.current.scrollTop = histRef.current.scrollHeight;
  }, [movePairs.length]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      {state.result && (
        <PostGameModal
          result={state.result}
          moveCount={state.history.length}
          onRematch={onRematch}
          onNewLevel={onChangeLevel}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-4 items-start">

          {/* ── Left col ─────────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col gap-3 shrink-0" style={{ width: "232px" }}>
            {/* Opponent */}
            <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(201,168,76,0.2)" }}>
              <p className="font-cinzel" style={{ fontSize: "0.58rem", letterSpacing: "0.2em", color: "#686880", textTransform: "uppercase" }}>Соперник</p>
              <p className="font-cinzel font-bold mt-3" style={{ fontSize: "1.05rem", color: "#EDE8DA" }}>
                {lvl.icon} {lvl.label}
              </p>
              <p style={{ fontSize: "0.75rem", color: "#B8B8C8", marginTop: "4px" }}>ELO ~{lvl.elo}</p>
              <p style={{ fontSize: "0.65rem", color: "#686880", marginTop: "2px" }}>
                Stockfish · skill {lvl.skill}
              </p>
            </div>

            {/* Status */}
            <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="font-cinzel mb-3" style={{ fontSize: "0.58rem", letterSpacing: "0.2em", color: "#686880", textTransform: "uppercase" }}>Статус</p>
              {state.isThinking ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", animation: "thinking 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "#B8B8C8" }}>Думает...</span>
                </div>
              ) : (
                <p style={{ fontSize: "0.82rem", color: chess.inCheck() ? "#E05540" : isPlayerTurn ? "#C9A84C" : "#B8B8C8", fontWeight: 500 }}>
                  {chess.inCheck() ? "⚠️ Шах!" : isPlayerTurn ? "Ваш ход" : "Ход бота"}
                </p>
              )}
              <p style={{ fontSize: "0.68rem", color: "#686880", marginTop: "6px" }}>
                Ход {Math.ceil(state.history.length / 2) + 1}
              </p>
            </div>
          </div>

          {/* ── Center: board ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Bot row */}
            <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: "#111827", border: `1px solid ${!isPlayerTurn && !state.isThinking ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.04)"}`, transition: "border-color 0.3s" }}>
              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.1rem" }}>{playerColor === "white" ? "♚" : "♔"}</span>
                <span style={{ fontSize: "0.8rem", color: "#B8B8C8" }}>{lvl.label}</span>
                <span style={{ fontSize: "0.8rem", color: "#888" }}>{botCap.map((p) => SYM[p] ?? p).join("")}</span>
                {diff < 0 && <span className="font-cinzel" style={{ fontSize: "0.7rem", color: "#E05540" }}>+{Math.abs(diff)}</span>}
              </div>
              <span className="font-cinzel font-bold" style={{ fontSize: "0.9rem", color: botMs < 30000 ? "#E05540" : "#EDE8DA", fontVariantNumeric: "tabular-nums" }}>
                {fmtTime(botMs)}
              </span>
            </div>

            {/* Board */}
            <Chessboard
              options={{
                position: state.fen,
                boardOrientation: playerColor,
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                allowDragging: !state.result && !state.isThinking && isPlayerTurn,
                animationDurationInMs: 180,
                boardStyle: {
                  borderRadius: "4px",
                  border: "1px solid rgba(201,168,76,0.28)",
                  boxShadow: "0 0 30px rgba(201,168,76,0.07), 0 4px 24px rgba(0,0,0,0.55)",
                },
                squareStyles: squareStyles,
                lightSquareStyle: { backgroundColor: "#C9B998" },
                darkSquareStyle:  { backgroundColor: "#2A3A5C" },
              }}
            />

            {/* Player row */}
            <div className="mt-2 flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: "#111827", border: `1px solid ${isPlayerTurn && !state.isThinking ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.04)"}`, transition: "border-color 0.3s" }}>
              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.1rem" }}>{playerColor === "white" ? "♔" : "♚"}</span>
                <span style={{ fontSize: "0.8rem", color: "#EDE8DA", fontWeight: 500 }}>Вы</span>
                <span style={{ fontSize: "0.8rem", color: "#888" }}>{playerCap.map((p) => SYM[p] ?? p).join("")}</span>
                {diff > 0 && <span className="font-cinzel" style={{ fontSize: "0.7rem", color: "#2A9D6E" }}>+{diff}</span>}
              </div>
              <span className="font-cinzel font-bold" style={{ fontSize: "0.9rem", color: playerMs < 30000 ? "#E05540" : "#EDE8DA", fontVariantNumeric: "tabular-nums" }}>
                {fmtTime(playerMs)}
              </span>
            </div>

            {/* Mobile controls */}
            <div className="lg:hidden mt-3 flex gap-2">
              <button onClick={resign} disabled={!!state.result}
                className="flex-1 rounded-lg py-2 text-sm transition-all"
                style={{ background: "transparent", border: "1px solid rgba(224,85,64,0.3)", color: "#E05540" }}>
                🏳️ Сдаться
              </button>
              <button onClick={offerDraw} disabled={!!state.result}
                className="flex-1 rounded-lg py-2 text-sm transition-all"
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#B8B8C8" }}>
                🤝 Ничья
              </button>
            </div>
          </div>

          {/* ── Right col ────────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col gap-3 shrink-0" style={{ width: "232px" }}>
            {/* History */}
            <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="font-cinzel mb-3" style={{ fontSize: "0.58rem", letterSpacing: "0.2em", color: "#686880", textTransform: "uppercase" }}>История</p>
              <div ref={histRef} style={{ maxHeight: "280px", overflowY: "auto", fontFamily: "monospace" }}>
                {movePairs.length === 0 ? (
                  <p style={{ fontSize: "0.7rem", color: "#686880", textAlign: "center", padding: "12px 0" }}>Сделайте первый ход</p>
                ) : movePairs.map(({ num, w, b }) => (
                  <div key={num} className="flex gap-2" style={{ fontSize: "0.72rem", padding: "1.5px 0" }}>
                    <span style={{ color: "#686880", minWidth: "22px" }}>{num}.</span>
                    <span style={{ color: "#EDE8DA", minWidth: "54px" }}>{w}</span>
                    <span style={{ color: "#B8B8C8" }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {(
                [
                  { label: "💡 Подсказка", color: "#C9A84C", border: "rgba(201,168,76,0.35)", fn: () => alert("Подсказки скоро появятся"), disabled: false },
                  { label: "🤝 Ничья",     color: "#B8B8C8", border: "rgba(255,255,255,0.12)", fn: offerDraw, disabled: !!state.result },
                  { label: "🏳️ Сдаться",   color: "#E05540", border: "rgba(224,85,64,0.3)",   fn: resign,    disabled: !!state.result },
                ] as const
              ).map(({ label, color, border, fn, disabled }) => (
                <button key={label} onClick={fn as () => void} disabled={disabled}
                  className="w-full rounded-lg py-2.5 text-sm transition-all"
                  style={{ background: "transparent", border: `1px solid ${border}`, color, opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                  onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 10px ${color}22`; }}}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = "none"; }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Back link */}
            <div className="text-center mt-1">
              <button onClick={onChangeLevel} style={{ fontSize: "0.65rem", color: "#686880", background: "none", border: "none", cursor: "pointer" }}>
                ← Сменить уровень
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes thinking {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.75); }
          40%            { opacity: 1;   transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BotGamePage() {
  const [config, setConfig] = useState<{ color: PlayerColor; difficulty: DifficultyKey } | null>(null);
  const [gameKey, setGameKey] = useState(0);

  if (!config) {
    return <SetupScreen onStart={(color, difficulty) => { setConfig({ color, difficulty }); setGameKey((k) => k + 1); }} />;
  }

  return (
    <GameScreen
      key={gameKey}
      playerColor={config.color}
      difficultyKey={config.difficulty}
      onChangeLevel={() => setConfig(null)}
      onRematch={() => setGameKey((k) => k + 1)}
    />
  );
}
