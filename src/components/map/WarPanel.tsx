"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Faction {
  id: string;
  name: string;
  color: string;
  slug: string;
}

interface WarPanelProps {
  warRegionName: string;
  warRegionLore: string;
  endDate: string;
  factionA: Faction;
  factionB: Faction;
  pointsA: number;
  pointsB: number;
  userFactionId?: string | null;
}

function useCountdown(endDate: string) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, diff);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(endDate).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((remaining % (1000 * 60)) / 1000);

  return { days, hours, mins, secs, isOver: remaining === 0 };
}

export function WarPanel({
  warRegionName,
  warRegionLore,
  endDate,
  factionA,
  factionB,
  pointsA,
  pointsB,
  userFactionId,
}: WarPanelProps) {
  const countdown = useCountdown(endDate);
  const totalPoints = pointsA + pointsB;
  const pctA = totalPoints > 0 ? Math.round((pointsA / totalPoints) * 100) : 50;
  const pctB = 100 - pctA;

  const isLeadingA = pointsA >= pointsB;
  const myFactionIsA = userFactionId === factionA.id;
  const myFactionIsB = userFactionId === factionB.id;
  const myFactionInWar = myFactionIsA || myFactionIsB;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-card to-accent/20 px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚔️</span>
              <h2 className="font-bold text-lg">Война недели</h2>
            </div>
            <p className="mt-0.5 text-sm font-medium text-primary">{warRegionName}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 max-w-xs">{warRegionLore}</p>
          </div>

          {/* Countdown */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">До конца</p>
            {countdown.isOver ? (
              <p className="text-sm font-bold text-destructive">Завершена</p>
            ) : (
              <div className="flex gap-1 font-mono text-sm">
                {countdown.days > 0 && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-bold">{countdown.days}д</span>
                )}
                <span className="rounded bg-muted px-1.5 py-0.5 font-bold">
                  {String(countdown.hours).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">:</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-bold">
                  {String(countdown.mins).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">:</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-bold tabular-nums">
                  {String(countdown.secs).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Battle */}
      <div className="px-5 py-4 space-y-4">
        {/* Factions */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Faction A */}
          <div className={cn("flex flex-col", myFactionIsA && "opacity-100", !myFactionIsA && "opacity-80")}>
            <div
              className="h-1 w-full rounded-full mb-2"
              style={{ backgroundColor: factionA.color }}
            />
            <p className="font-bold text-sm" style={{ color: factionA.color }}>
              {factionA.name}
            </p>
            <p className="text-2xl font-black tabular-nums mt-1">{pointsA}</p>
            <p className="text-xs text-muted-foreground">очков</p>
            {myFactionIsA && (
              <span className="mt-1 text-xs text-primary font-medium">← Твоя фракция</span>
            )}
          </div>

          {/* VS */}
          <div className="text-center">
            <p className="text-xl font-black text-muted-foreground">VS</p>
          </div>

          {/* Faction B */}
          <div className={cn("flex flex-col text-right", myFactionIsB && "opacity-100", !myFactionIsB && "opacity-80")}>
            <div
              className="h-1 w-full rounded-full mb-2"
              style={{ backgroundColor: factionB.color }}
            />
            <p className="font-bold text-sm" style={{ color: factionB.color }}>
              {factionB.name}
            </p>
            <p className="text-2xl font-black tabular-nums mt-1">{pointsB}</p>
            <p className="text-xs text-muted-foreground">очков</p>
            {myFactionIsB && (
              <span className="mt-1 text-xs text-primary font-medium">Твоя фракция →</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${pctA}%`, backgroundColor: factionA.color }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${pctB}%`, backgroundColor: factionB.color }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pctA}%</span>
            <span className="font-medium">
              {isLeadingA ? `${factionA.name} ведёт` : `${factionB.name} ведёт`}
            </span>
            <span>{pctB}%</span>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-1">
          {myFactionInWar ? (
            <Link
              href="/play"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              ⚔️ Сражаться за свою фракцию
            </Link>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Твоя фракция не участвует в этой войне
            </p>
          )}
        </div>

        {/* Points info */}
        <p className="text-center text-xs text-muted-foreground">
          +5 очков за победу в турнирной партии
        </p>
      </div>
    </div>
  );
}
