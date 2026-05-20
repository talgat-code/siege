"use client";

import { useEffect, useState } from "react";

interface QuestProgress {
  id: string;
  title: string;
  desc: string;
  current: number;
  target: number;
  reward: number;
}

interface DailyQuestsPanelProps {
  quests: QuestProgress[];
}

function useMidnightCountdown() {
  const [secs, setSecs] = useState(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setSecs(Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DailyQuestsPanel({ quests }: DailyQuestsPanelProps) {
  const countdown = useMidnightCountdown();

  return (
    <div
      className="mb-8 rounded-xl overflow-hidden"
      style={{ background: "#111827", border: "1px solid rgba(201,168,76,0.12)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2
          className="font-cinzel font-bold"
          style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#C9A84C", textTransform: "uppercase" }}
        >
          ◈ Ежедневные задания
        </h2>
        <span
          className="font-cinzel"
          style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "#686880" }}
        >
          обновится через {countdown}
        </span>
      </div>

      {/* Quests */}
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {quests.map((q) => {
          const done = q.current >= q.target;
          const pct = Math.min(100, Math.round((q.current / q.target) * 100));

          return (
            <div key={q.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                {/* Left: status icon + text */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: "1px",
                      fontSize: "0.85rem",
                      color: done ? "#2A9D6E" : "#686880",
                    }}
                  >
                    {done ? "✓" : "·"}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="font-cinzel"
                      style={{
                        fontSize: "0.75rem",
                        letterSpacing: "0.06em",
                        color: done ? "#EDE8DA" : "#B8B8C8",
                        fontWeight: 600,
                      }}
                    >
                      {q.title}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "#686880", marginTop: "1px" }}>
                      {q.desc}
                    </p>
                  </div>
                </div>

                {/* Right: progress + reward */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="font-cinzel"
                    style={{ fontSize: "0.65rem", color: done ? "#2A9D6E" : "#686880", whiteSpace: "nowrap" }}
                  >
                    {q.current}/{q.target}
                  </span>
                  <span
                    className="font-cinzel rounded px-1.5 py-0.5"
                    style={{
                      fontSize: "0.58rem",
                      letterSpacing: "0.08em",
                      color: done ? "#C9A84C" : "#686880",
                      backgroundColor: done ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${done ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    +{q.reward} ◈
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="ml-5 h-1 overflow-hidden rounded-full"
                style={{ background: "#1C2333" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: done
                      ? "linear-gradient(to right, #2A9D6E, #C9A84C)"
                      : "rgba(201,168,76,0.4)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
