"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Faction {
  id: string;
  name: string;
  color: string;
  slug: string;
}

interface WarWeekSectionProps {
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
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(endDate).getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(endDate).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  return { d, h, m, s, isOver: remaining === 0 };
}

export function WarWeekSection({
  warRegionName,
  warRegionLore,
  endDate,
  factionA,
  factionB,
  pointsA,
  pointsB,
  userFactionId,
}: WarWeekSectionProps) {
  const { d, h, m, s, isOver } = useCountdown(endDate);
  const total = pointsA + pointsB;
  const pctA = total > 0 ? Math.round((pointsA / total) * 100) : 50;
  const pctB = 100 - pctA;
  const myFactionIsA = userFactionId === factionA.id;
  const myFactionIsB = userFactionId === factionB.id;
  const myFactionInWar = myFactionIsA || myFactionIsB;

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Region name + lore */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <p
          className="font-cinzel font-bold"
          style={{ fontSize: "1.1rem", letterSpacing: "0.12em", color: "#EDE8DA", marginBottom: "0.5rem" }}
        >
          ⚔ {warRegionName}
        </p>
        {warRegionLore && (
          <p
            className="font-crimson"
            style={{ fontSize: "0.95rem", color: "#686880", fontStyle: "italic", maxWidth: "480px", margin: "0 auto" }}
          >
            {warRegionLore}
          </p>
        )}
      </div>

      {/* Main war panel */}
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(201,168,76,0.15)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Countdown strip */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "1rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            background: "rgba(201,168,76,0.04)",
          }}
        >
          <span
            className="font-cinzel"
            style={{ fontSize: "0.62rem", letterSpacing: "0.2em", color: "rgba(201,168,76,0.7)", textTransform: "uppercase" }}
          >
            До конца войны
          </span>
          {isOver ? (
            <span className="font-cinzel font-bold" style={{ fontSize: "0.9rem", color: "#E05540" }}>
              Завершена
            </span>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {d > 0 && (
                <>
                  <TimeUnit value={d} label="д" />
                  <span style={{ color: "rgba(201,168,76,0.4)", fontSize: "1.1rem" }}>·</span>
                </>
              )}
              <TimeUnit value={h} label="ч" />
              <span style={{ color: "rgba(201,168,76,0.4)", fontSize: "1.1rem" }}>·</span>
              <TimeUnit value={m} label="м" />
              <span style={{ color: "rgba(201,168,76,0.4)", fontSize: "1.1rem" }}>·</span>
              <TimeUnit value={s} label="с" />
            </div>
          )}
        </div>

        {/* Versus */}
        <div style={{ padding: "2rem 2rem 1.5rem", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1.5rem", alignItems: "center" }}>
          {/* Faction A */}
          <FactionSide faction={factionA} points={pointsA} pct={pctA} isMine={myFactionIsA} align="left" />

          {/* VS */}
          <div style={{ textAlign: "center" }}>
            <p
              className="font-cinzel font-black"
              style={{ fontSize: "1.6rem", color: "rgba(201,168,76,0.35)", letterSpacing: "0.2em" }}
            >
              VS
            </p>
          </div>

          {/* Faction B */}
          <FactionSide faction={factionB} points={pointsB} pct={pctB} isMine={myFactionIsB} align="right" />
        </div>

        {/* Points bar */}
        <div style={{ padding: "0 2rem 1.5rem" }}>
          <div
            style={{
              height: "6px", display: "flex", overflow: "hidden",
              borderRadius: "3px", background: "#0B0F1A",
            }}
          >
            <div style={{ width: `${pctA}%`, background: factionA.color, transition: "width 0.6s ease" }} />
            <div style={{ width: `${pctB}%`, background: factionB.color, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
            <span style={{ fontSize: "0.65rem", color: factionA.color }}>{pctA}%</span>
            <span style={{ fontSize: "0.65rem", color: factionB.color }}>{pctB}%</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "0 2rem 2rem" }}>
          {myFactionInWar ? (
            <Link
              href="/play/bot"
              className="siege-btn-primary"
              style={{ width: "100%", justifyContent: "center", fontSize: "0.72rem" }}
            >
              ⚔ Сражаться за свою фракцию
            </Link>
          ) : userFactionId ? (
            <p
              className="font-cinzel"
              style={{ textAlign: "center", fontSize: "0.65rem", letterSpacing: "0.1em", color: "#686880" }}
            >
              Твоя фракция не участвует в этой войне
            </p>
          ) : (
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <Link href="/login" className="siege-btn-secondary" style={{ fontSize: "0.7rem", padding: "0.6rem 1.5rem" }}>
                Войти
              </Link>
              <Link href="/register" className="siege-btn-primary" style={{ fontSize: "0.7rem", padding: "0.6rem 1.5rem" }}>
                Присоединиться
              </Link>
            </div>
          )}
          <p
            className="font-cinzel"
            style={{ textAlign: "center", fontSize: "0.58rem", letterSpacing: "0.1em", color: "#686880", marginTop: "0.75rem" }}
          >
            +5 очков за каждую победу в рейтинговой партии
          </p>
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <span
        className="font-cinzel font-bold tabular-nums"
        style={{
          display: "inline-block",
          minWidth: "2.4rem",
          padding: "0.25rem 0.5rem",
          background: "#1C2333",
          border: "1px solid rgba(201,168,76,0.15)",
          borderRadius: "4px",
          fontSize: "1rem",
          color: "#EDE8DA",
          textAlign: "center",
        }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span style={{ display: "block", fontSize: "0.52rem", color: "#686880", marginTop: "0.2rem", letterSpacing: "0.1em" }}>
        {label}
      </span>
    </div>
  );
}

function FactionSide({
  faction, points, isMine, align,
}: {
  faction: Faction;
  points: number;
  pct?: number;
  isMine: boolean;
  align: "left" | "right";
}) {
  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          height: "3px",
          background: faction.color,
          borderRadius: "2px",
          marginBottom: "0.75rem",
          opacity: isMine ? 1 : 0.5,
        }}
      />
      <p
        className="font-cinzel font-bold"
        style={{ fontSize: "1rem", letterSpacing: "0.1em", color: faction.color, marginBottom: "0.25rem" }}
      >
        {faction.name}
      </p>
      <p
        className="font-cinzel font-black"
        style={{ fontSize: "2.2rem", color: "#EDE8DA", lineHeight: 1, marginBottom: "0.25rem" }}
      >
        {points}
      </p>
      <p style={{ fontSize: "0.65rem", color: "#686880" }}>очков</p>
      {isMine && (
        <p
          className="font-cinzel"
          style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: faction.color, marginTop: "0.4rem" }}
        >
          ← Твоя фракция
        </p>
      )}
    </div>
  );
}
