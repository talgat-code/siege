"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChessBoard } from "@/components/chess/ChessBoard";

type TimeControl = "blitz" | "rapid" | "classical";
type Mode = "tournament" | "training";
type MatchStatus = "idle" | "searching" | "found";

const TIME_OPTIONS: { value: TimeControl; label: string; desc: string }[] = [
  { value: "blitz",     label: "⚡ Блиц",     desc: "5 мин"  },
  { value: "rapid",     label: "🏃 Рапид",    desc: "10 мин" },
  { value: "classical", label: "🏛️ Классика", desc: "30 мин" },
];

const MODE_OPTIONS: { value: Mode; label: string; desc: string }[] = [
  { value: "tournament", label: "🏆 Турнирная", desc: "Влияет на рейтинг ELO" },
  { value: "training",   label: "📚 Тренировка", desc: "Без изменения рейтинга" },
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

      if (res.status === 401) { router.push("/login"); return; }

      const data = await res.json();

      if (data.status === "matched") {
        setMatchStatus("found");
        setTimeout(() => router.push(`/play/${data.gameId}`), 800);
        return;
      }

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
      } catch { /* continue polling */ }
    }, 2000);
    (window as unknown as Record<string, ReturnType<typeof setInterval>>).__matchInterval = interval;
  }

  async function cancelSearch() {
    const interval = (window as unknown as Record<string, ReturnType<typeof setInterval>>).__matchInterval;
    if (interval) clearInterval(interval);
    if (queueId) await fetch(`/api/game/match?queueId=${queueId}`, { method: "DELETE" });
    setMatchStatus("idle");
    setQueueId(null);
    setSearchSeconds(0);
  }

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex gap-8 flex-col lg:flex-row">

          {/* ── Left: matchmaking ──────────────────────────── */}
          <div className="w-full lg:w-80 shrink-0 space-y-5">
            <div>
              <span className="section-label">Арена</span>
              <h1 className="section-title" style={{ fontSize: "1.5rem" }}>
                Найти партию
              </h1>
              <div className="lunar-rule mt-3 w-20" />
            </div>

            {/* Time control */}
            <div className="space-y-2">
              <p
                className="font-cinzel"
                style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}
              >
                Контроль времени
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTimeControl(opt.value)}
                    disabled={matchStatus !== "idle"}
                    className="flex flex-col items-center gap-1 rounded-lg p-3 text-sm transition-all"
                    style={{
                      background: timeControl === opt.value ? "rgba(201,168,76,0.1)" : "#111827",
                      border: timeControl === opt.value
                        ? "1px solid rgba(201,168,76,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                      color: timeControl === opt.value ? "#C9A84C" : "#B8B8C8",
                      opacity: matchStatus !== "idle" ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: "0.82rem" }}>{opt.label}</span>
                    <span style={{ fontSize: "0.65rem", color: "#686880" }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <p
                className="font-cinzel"
                style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}
              >
                Режим
              </p>
              <div className="space-y-2">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    disabled={matchStatus !== "idle"}
                    className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all"
                    style={{
                      background: mode === opt.value ? "rgba(201,168,76,0.08)" : "#111827",
                      border: mode === opt.value
                        ? "1px solid rgba(201,168,76,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                      opacity: matchStatus !== "idle" ? 0.5 : 1,
                    }}
                  >
                    <div className="flex-1">
                      <p style={{ fontSize: "0.85rem", color: mode === opt.value ? "#EDE8DA" : "#B8B8C8", fontWeight: 500 }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "#686880" }}>{opt.desc}</p>
                    </div>
                    {mode === opt.value && (
                      <span style={{ color: "#C9A84C", fontSize: "0.9rem" }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p style={{ fontSize: "0.82rem", color: "#E05540" }}>{error}</p>
            )}

            {/* Action button */}
            {matchStatus === "idle" && (
              <button className="siege-btn-primary w-full" onClick={startSearch}>
                ⚔ Найти соперника
              </button>
            )}

            {matchStatus === "searching" && (
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between rounded-lg px-4 py-3"
                  style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full animate-bounce"
                          style={{ background: "#C9A84C", animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "#EDE8DA" }}>Поиск соперника...</span>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#686880" }}>
                    {searchSeconds}с
                  </span>
                </div>
                <button className="siege-btn-ghost w-full" onClick={cancelSearch}>
                  Отменить
                </button>
              </div>
            )}

            {matchStatus === "found" && (
              <div
                className="rounded-lg px-4 py-3 text-center"
                style={{ background: "rgba(42,157,110,0.1)", border: "1px solid rgba(42,157,110,0.3)" }}
              >
                <p className="font-cinzel font-bold" style={{ color: "#2A9D6E" }}>Соперник найден!</p>
                <p style={{ fontSize: "0.78rem", color: "#686880" }}>Загружаем партию...</p>
              </div>
            )}

            {/* Divider */}
            <div className="lunar-rule" />

            {/* Other modes */}
            <div className="space-y-2">
              <p
                className="font-cinzel"
                style={{ fontSize: "0.62rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}
              >
                Другие режимы
              </p>
              <Link
                href="/play/bot"
                className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <span style={{ fontSize: "1.3rem" }}>🤖</span>
                <div>
                  <p style={{ fontSize: "0.85rem", color: "#EDE8DA", fontWeight: 500 }}>Против бота</p>
                  <p style={{ fontSize: "0.7rem", color: "#686880" }}>5 уровней сложности</p>
                </div>
              </Link>
              <Link
                href="/play/friend"
                className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <span style={{ fontSize: "1.3rem" }}>👥</span>
                <div>
                  <p style={{ fontSize: "0.85rem", color: "#EDE8DA", fontWeight: 500 }}>С другом</p>
                  <p style={{ fontSize: "0.7rem", color: "#686880" }}>Пригласи по коду</p>
                </div>
              </Link>
            </div>
          </div>

          {/* ── Right: local board ─────────────────────────── */}
          <div className="flex-1 min-w-0">
            <p
              className="font-cinzel mb-4"
              style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}
            >
              Или поиграй локально (hot-seat)
            </p>
            <ChessBoard />
          </div>
        </div>
      </div>
    </div>
  );
}
