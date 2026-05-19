"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TimeControl = "blitz" | "rapid" | "classical";
type Mode = "tournament" | "training";
type MatchStatus = "idle" | "searching" | "found";

const TIME_OPTIONS: { value: TimeControl; label: string; desc: string }[] = [
  { value: "blitz", label: "⚡ Блиц", desc: "5 мин" },
  { value: "rapid", label: "🏃 Рапид", desc: "10 мин" },
  { value: "classical", label: "🏛️ Классика", desc: "30 мин" },
];

const MODE_OPTIONS: { value: Mode; label: string; desc: string }[] = [
  { value: "tournament", label: "🏆 Турнирная", desc: "Влияет на рейтинг ELO" },
  { value: "training", label: "📚 Тренировка", desc: "Без изменения рейтинга" },
];

export default function PlayPage() {
  const router = useRouter();
  const [timeControl, setTimeControl] = useState<TimeControl>("rapid");
  const [mode, setMode] = useState<Mode>("tournament");
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [queueId, setQueueId] = useState<string | null>(null);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [error, setError] = useState("");

  async function startSearch() {
    setError("");
    setMatchStatus("searching");
    setSearchSeconds(0);

    try {
      const res = await fetch("/api/game/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_control: timeControl, mode }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (data.status === "matched") {
        setMatchStatus("found");
        setTimeout(() => router.push(`/play/${data.gameId}`), 800);
        return;
      }

      // Waiting — poll
      setQueueId(data.queueId);
      pollForMatch(data.queueId);
    } catch {
      setError("Ошибка подключения");
      setMatchStatus("idle");
    }
  }

  function pollForMatch(id: string) {
    let seconds = 0;
    const interval = setInterval(async () => {
      seconds += 2;
      setSearchSeconds(seconds);

      try {
        const res = await fetch(`/api/game/match?queueId=${id}`);
        const data = await res.json();

        if (data.status === "matched") {
          clearInterval(interval);
          setMatchStatus("found");
          setTimeout(() => router.push(`/play/${data.gameId}`), 800);
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    // Store interval for cancellation
    (window as unknown as Record<string, ReturnType<typeof setInterval>>).__matchInterval = interval;
  }

  async function cancelSearch() {
    const interval = (window as unknown as Record<string, ReturnType<typeof setInterval>>).__matchInterval;
    if (interval) clearInterval(interval);

    if (queueId) {
      await fetch(`/api/game/match?queueId=${queueId}`, { method: "DELETE" });
    }

    setMatchStatus("idle");
    setQueueId(null);
    setSearchSeconds(0);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-8">
        {/* Left: matchmaking */}
        <div className="w-80 shrink-0 space-y-5">
          <h1 className="text-2xl font-bold">Найти партию</h1>

          {/* Time control */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Контроль времени</p>
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeControl(opt.value)}
                  disabled={matchStatus !== "idle"}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-all",
                    timeControl === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground",
                    matchStatus !== "idle" && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Режим</p>
            <div className="space-y-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  disabled={matchStatus !== "idle"}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                    mode === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground",
                    matchStatus !== "idle" && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {mode === opt.value && (
                    <div className="ml-auto text-primary">✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Action button */}
          {matchStatus === "idle" && (
            <Button className="w-full" size="lg" onClick={startSearch}>
              Найти соперника
            </Button>
          )}

          {matchStatus === "searching" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">Поиск соперника...</span>
                </div>
                <span className="font-mono text-sm text-muted-foreground">
                  {searchSeconds}с
                </span>
              </div>
              <Button variant="outline" className="w-full" onClick={cancelSearch}>
                Отменить
              </Button>
            </div>
          )}

          {matchStatus === "found" && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-center">
              <p className="font-bold text-green-400">Соперник найден!</p>
              <p className="text-sm text-muted-foreground">Загружаем партию...</p>
            </div>
          )}
        </div>

        {/* Right: local game */}
        <div className="flex-1">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-muted-foreground">Или поиграй локально</h2>
            <Badge variant="secondary">Hot-seat</Badge>
          </div>
          <ChessBoard />
        </div>
      </div>
    </div>
  );
}
