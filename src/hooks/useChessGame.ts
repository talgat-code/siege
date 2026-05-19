"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { TIME_CONTROL_MS } from "@/lib/elo";

export type GameStatus =
  | "playing"
  | "white_won"
  | "black_won"
  | "draw"
  | "waiting_opponent";

interface InitialGameData {
  pgn: string;
  time_control: string;
  mode: string;
  white_time_ms: number | null;
  black_time_ms: number | null;
  white_player_id: string;
  black_player_id: string;
  result: string | null;
}

interface MoveBroadcast {
  from: string;
  to: string;
  promotion?: string;
  pgn: string;
  white_time_ms: number;
  black_time_ms: number;
}

export function useChessGame(
  gameId: string,
  myColor: "white" | "black",
  initialData: InitialGameData
) {
  const initialTimeMs =
    initialData.white_time_ms ?? TIME_CONTROL_MS[initialData.time_control] ?? TIME_CONTROL_MS.rapid;

  const [chess, setChess] = useState<Chess>(() => {
    const c = new Chess();
    if (initialData.pgn) {
      try { c.loadPgn(initialData.pgn); } catch { /* start fresh */ }
    }
    return c;
  });
  const [whiteTimeMs, setWhiteTimeMs] = useState(
    initialData.white_time_ms ?? initialTimeMs
  );
  const [blackTimeMs, setBlackTimeMs] = useState(
    initialData.black_time_ms ?? initialTimeMs
  );
  const [status, setStatus] = useState<GameStatus>(
    initialData.result ? (
      initialData.result === "white" ? "white_won" :
      initialData.result === "black" ? "black_won" : "draw"
    ) : "playing"
  );
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [ratingChanges, setRatingChanges] = useState<{ white: number; black: number } | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Use refs to always have fresh values inside setInterval callbacks
  const whiteTimeMsRef = useRef(whiteTimeMs);
  const blackTimeMsRef = useRef(blackTimeMs);
  const chessRef = useRef(chess);
  const statusRef = useRef(status);

  whiteTimeMsRef.current = whiteTimeMs;
  blackTimeMsRef.current = blackTimeMs;
  chessRef.current = chess;
  statusRef.current = status;

  // ── Timer ──────────────────────────────────────────────────────────────
  const startTimer = useCallback((turn: "w" | "b") => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      if (statusRef.current !== "playing") {
        clearInterval(timerIntervalRef.current!);
        return;
      }
      if (turn === "w") {
        setWhiteTimeMs((prev) => {
          const next = prev - 100;
          if (next <= 0) {
            clearInterval(timerIntervalRef.current!);
            handleTimeout("white");
            return 0;
          }
          return next;
        });
      } else {
        setBlackTimeMs((prev) => {
          const next = prev - 100;
          if (next <= 0) {
            clearInterval(timerIntervalRef.current!);
            handleTimeout("black");
            return 0;
          }
          return next;
        });
      }
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start timer on mount if game is live
  useEffect(() => {
    if (status === "playing" && !chess.isGameOver()) {
      startTimer(chess.turn());
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // ── Realtime setup ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`game:${gameId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "move" }, ({ payload }: { payload: MoveBroadcast }) => {
        const newChess = new Chess();
        try { newChess.loadPgn(payload.pgn); } catch { return; }

        setChess(newChess);
        setWhiteTimeMs(payload.white_time_ms);
        setBlackTimeMs(payload.black_time_ms);
        setLastMove({ from: payload.from, to: payload.to });

        if (newChess.isGameOver()) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          resolveGameOver(newChess);
        } else {
          // Switch timer to current player's turn
          startTimer(newChess.turn());
        }
      })
      .on("broadcast", { event: "resign" }, ({ payload }: { payload: { color: string } }) => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        const winner = payload.color === "white" ? "black" : "white";
        setStatus(winner === "white" ? "white_won" : "black_won");
      })
      .on("broadcast", { event: "timeout" }, ({ payload }: { payload: { loser: string } }) => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        const winner = payload.loser === "white" ? "black" : "white";
        setStatus(winner === "white" ? "white_won" : "black_won");
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOpponentConnected(count >= 2);
      })
      .on("presence", { event: "join" }, () => {
        const state = channel.presenceState();
        setOpponentConnected(Object.keys(state).length >= 2);
      })
      .on("presence", { event: "leave" }, () => {
        const state = channel.presenceState();
        setOpponentConnected(Object.keys(state).length >= 2);
      })
      .subscribe(async (subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") {
          await channel.track({ color: myColor, joined_at: Date.now() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, myColor]);

  // ── Helpers ────────────────────────────────────────────────────────────
  function resolveGameOver(c: Chess) {
    let newStatus: GameStatus;
    if (c.isCheckmate()) {
      newStatus = c.turn() === "w" ? "black_won" : "white_won";
    } else {
      newStatus = "draw";
    }
    setStatus(newStatus);
    return newStatus;
  }

  async function submitResult(
    result: "white" | "black" | "draw",
    reason: string,
    pgn: string
  ) {
    try {
      const res = await fetch(`/api/game/${gameId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, pgn, reason }),
      });
      const data = await res.json();
      if (data.whiteRatingChange !== undefined) {
        setRatingChanges({ white: data.whiteRatingChange, black: data.blackRatingChange });
      }
    } catch (e) {
      console.error("Submit result error:", e);
    }
  }

  async function handleTimeout(loser: "white" | "black") {
    if (statusRef.current !== "playing") return;
    const winner = loser === "white" ? "black" : "white";
    setStatus(winner === "white" ? "white_won" : "black_won");

    channelRef.current?.send({
      type: "broadcast",
      event: "timeout",
      payload: { loser },
    });

    // Only the loser reports the result (they triggered the timeout)
    if (loser === myColor) {
      await submitResult(winner as "white" | "black", "timeout", chessRef.current.pgn());
    }
  }

  // ── Public actions ─────────────────────────────────────────────────────
  const makeMove = useCallback(
    async (from: Square, to: Square, promotion?: string): Promise<boolean> => {
      if (statusRef.current !== "playing") return false;

      const currentTurn = chessRef.current.turn();
      const isMyTurn =
        (currentTurn === "w") === (myColor === "white");
      if (!isMyTurn) return false;

      const gameCopy = new Chess(chessRef.current.fen());
      try {
        const move = gameCopy.move({ from, to, promotion: promotion ?? "q" });
        if (!move) return false;
      } catch {
        return false;
      }

      // Snapshot timer values before updating state
      const wTime = whiteTimeMsRef.current;
      const bTime = blackTimeMsRef.current;

      setChess(gameCopy);
      setLastMove({ from, to });

      // Stop current timer, start opponent's
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (!gameCopy.isGameOver()) {
        startTimer(gameCopy.turn());
      }

      // Broadcast move
      channelRef.current?.send({
        type: "broadcast",
        event: "move",
        payload: {
          from,
          to,
          promotion,
          pgn: gameCopy.pgn(),
          white_time_ms: wTime,
          black_time_ms: bTime,
        },
      });

      // Persist to DB (fire-and-forget)
      fetch(`/api/game/${gameId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: gameCopy.pgn(), white_time_ms: wTime, black_time_ms: bTime }),
      }).catch(console.error);

      // Handle game over
      if (gameCopy.isGameOver()) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        const finalStatus = resolveGameOver(gameCopy);
        const result =
          finalStatus === "white_won" ? "white" :
          finalStatus === "black_won" ? "black" : "draw";
        const reason = gameCopy.isCheckmate() ? "checkmate" : "draw";
        // Both sides call submit (idempotent on server)
        await submitResult(result as "white" | "black" | "draw", reason, gameCopy.pgn());
      }

      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameId, myColor, startTimer]
  );

  const resign = useCallback(async () => {
    if (statusRef.current !== "playing") return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    channelRef.current?.send({
      type: "broadcast",
      event: "resign",
      payload: { color: myColor },
    });

    const winner = myColor === "white" ? "black" : "white";
    setStatus(myColor === "white" ? "black_won" : "white_won");
    await submitResult(winner as "white" | "black", "resign", chessRef.current.pgn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, myColor]);

  const isMyTurn =
    status === "playing" &&
    (chess.turn() === "w") === (myColor === "white");

  return {
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
  };
}
