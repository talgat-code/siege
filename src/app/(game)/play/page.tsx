"use client";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { Badge } from "@/components/ui/badge";

export default function PlayPage() {
  function handleGameEnd(result: "white" | "black" | "draw", pgn: string) {
    console.log("Game ended:", result, pgn);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Игра</h1>
        <Badge variant="secondary">Hot-seat</Badge>
      </div>

      <div className="flex gap-8">
        {/* Chess board */}
        <div className="flex-shrink-0">
          <ChessBoard onGameEnd={handleGameEnd} />
        </div>

        {/* Info panel */}
        <div className="flex-1 space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">Режим: Тренировка</h2>
            <p className="text-sm text-muted-foreground">
              Два игрока на одном устройстве. Ходите по очереди.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-white" />
                <span>Белые: Игрок 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-800 ring-1 ring-border" />
                <span>Чёрные: Игрок 2</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Coming Soon
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>⚡ Онлайн-матчмейкинг</p>
              <p>🤖 AI-ассистент с Stockfish</p>
              <p>🏴 Война фракций за регионы</p>
              <p>📊 Анализ партии</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
