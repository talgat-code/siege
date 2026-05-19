"use client";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/elo";

interface GameTimerProps {
  timeMs: number;
  isActive: boolean;
  label: string;
  color: "white" | "black";
  factionColor?: string;
}

export function GameTimer({ timeMs, isActive, label, color, factionColor }: GameTimerProps) {
  const isLow = timeMs < 30_000; // under 30 seconds
  const isCritical = timeMs < 10_000; // under 10 seconds

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3 transition-all duration-200",
        isActive
          ? "border-primary/60 bg-primary/10"
          : "border-border bg-muted/40 opacity-60",
        isCritical && isActive && "border-destructive/60 bg-destructive/10"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Color chip */}
        <div
          className={cn(
            "h-4 w-4 rounded-sm border",
            color === "white" ? "bg-white border-border" : "bg-gray-900 border-border"
          )}
          style={factionColor && isActive ? { borderColor: factionColor } : undefined}
        />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>

      <span
        className={cn(
          "font-mono text-2xl font-bold tabular-nums",
          isActive ? "text-foreground" : "text-muted-foreground",
          isLow && isActive && "text-yellow-400",
          isCritical && isActive && "text-destructive animate-pulse"
        )}
      >
        {formatTime(timeMs)}
      </span>
    </div>
  );
}
