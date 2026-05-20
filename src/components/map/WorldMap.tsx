"use client";

import { useState } from "react";

interface RegionData {
  id: string;
  name: string;
  slug: string;
  x_coord: number;
  y_coord: number;
  contested: boolean;
  owner_faction_id: string | null;
  faction_name: string | null;
  faction_color: string | null;
  lore_description: string;
  neighbors: string[];
}

interface WorldMapProps {
  regions: RegionData[];
  warRegionId: string | null;
}

// Pixel-accurate positions on the fantasy map image (viewBox 0 0 100 56)
const REGION_POSITIONS: Record<string, { x: number; y: number }> = {
  "arktania":   { x: 62, y:  8 },  // Алтай — north peak
  "stone-ridge":{ x: 50, y: 17 },  // Алтай — center
  "iron-hill":  { x: 71, y: 22 },  // Алтай — south-east
  "amber-sea":  { x: 81, y: 24 },  // far east
  "grand-road": { x: 66, y: 33 },  // Балхаш
  "hope-port":  { x: 82, y: 40 },  // Балхаш east coast
  "misty-pass": { x: 27, y: 34 },  // Арал center
  "shadow-wood":{ x: 17, y: 44 },  // Каспий coast / Арал south
  "midlands":   { x: 41, y: 42 },  // Степь west
  "gold-valley":{ x: 51, y: 37 },  // Степь center
  "arcana-ruins":{ x: 68, y: 46 }, // Тянь-Шань east
  "black-rocks":{ x: 50, y: 52 },  // Тянь-Шань center
};

const CONNECTIONS: [string, string][] = [
  ["arktania",    "stone-ridge"],
  ["arktania",    "iron-hill"],
  ["stone-ridge", "iron-hill"],
  ["stone-ridge", "gold-valley"],
  ["stone-ridge", "misty-pass"],
  ["iron-hill",   "grand-road"],
  ["iron-hill",   "amber-sea"],
  ["grand-road",  "amber-sea"],
  ["grand-road",  "hope-port"],
  ["grand-road",  "gold-valley"],
  ["amber-sea",   "hope-port"],
  ["misty-pass",  "shadow-wood"],
  ["misty-pass",  "midlands"],
  ["gold-valley", "midlands"],
  ["gold-valley", "arcana-ruins"],
  ["midlands",    "black-rocks"],
  ["arcana-ruins","black-rocks"],
  ["hope-port",   "arcana-ruins"],
];

export function WorldMap({ regions, warRegionId }: WorldMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const slugMap = new Map(regions.map((r) => [r.slug, r]));
  const idMap   = new Map(regions.map((r) => [r.id,   r]));
  const hovered = hoveredId ? idMap.get(hoveredId) : null;

  // Merge DB data with image coordinates
  const positioned = regions.map((r) => ({
    ...r,
    px: REGION_POSITIONS[r.slug]?.x ?? r.x_coord,
    py: REGION_POSITIONS[r.slug]?.y ?? r.y_coord,
  }));

  const connections = CONNECTIONS.flatMap(([a, b]) => {
    const ra = slugMap.get(a);
    const rb = slugMap.get(b);
    if (!ra || !rb) return [];
    const pa = REGION_POSITIONS[ra.slug] ?? { x: ra.x_coord, y: ra.y_coord };
    const pb = REGION_POSITIONS[rb.slug] ?? { x: rb.x_coord, y: rb.y_coord };
    return [{ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, key: `${a}-${b}` }];
  });

  function tooltipX(x: number) { return x > 70 ? x - 30 : x + 3; }
  function tooltipY(y: number) { return y < 12 ? y + 5  : y - 12; }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl shadow-2xl"
      style={{
        backgroundImage:    "url('/war-map.jpg')",
        backgroundSize:     "cover",
        backgroundPosition: "center",
        border: "2px solid rgba(201,168,76,0.35)",
        boxShadow: "0 0 40px rgba(201,168,76,0.12), 0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Vignette overlay so edges blend with the dark UI */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(5,13,24,0.45) 100%)",
        }}
      />

      <svg
        viewBox="0 0 100 56"
        className="relative w-full"
        style={{ aspectRatio: "100/56", display: "block" }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowStrong">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="rgba(0,0,0,0.9)" floodOpacity="1" />
          </filter>
          <filter id="tooltipBlur">
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
        </defs>

        {/* Connection lines — subtle dashes */}
        {connections.map((c) => (
          <line
            key={c.key}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="rgba(201,168,76,0.22)"
            strokeWidth="0.25"
            strokeDasharray="1.4,0.9"
          />
        ))}

        {/* Region markers */}
        {positioned.map((region) => {
          const color    = region.faction_color ?? "#5a6a7a";
          const isWar    = region.id === warRegionId;
          const isHovered= region.id === hoveredId;
          const { px: x, py: y } = region;

          return (
            <g
              key={region.id}
              onMouseEnter={() => setHoveredId(region.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Territory glow */}
              <circle cx={x} cy={y} r="5.5" fill={color} opacity="0.08" />

              {/* War pulse rings */}
              {isWar && (
                <>
                  <circle cx={x} cy={y} r="4" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0">
                    <animate attributeName="r"       values="3.5;8"  dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0"  dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="4" fill="none" stroke="#C9A84C" strokeWidth="0.3" opacity="0">
                    <animate attributeName="r"       values="3.5;8"  dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0"  dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Hover ring */}
              {isHovered && (
                <circle cx={x} cy={y} r="5" fill="none"
                  stroke="rgba(201,168,76,0.7)" strokeWidth="0.45" />
              )}

              {/* Main dot */}
              <circle
                cx={x} cy={y} r="3"
                fill={color}
                stroke={isHovered ? "rgba(255,255,255,0.9)" : `${color}ee`}
                strokeWidth={isHovered ? 0.6 : 0.25}
                opacity={0.95}
                filter={isHovered || isWar ? "url(#glow)" : undefined}
              />

              {/* Inner highlight for owned regions */}
              {region.owner_faction_id && (
                <circle cx={x} cy={y} r="1" fill="rgba(255,255,255,0.45)" />
              )}

              {/* War swords icon */}
              {isWar && (
                <text x={x} y={y - 4.2} textAnchor="middle" fontSize="2.8"
                  filter="url(#textShadow)">⚔</text>
              )}

              {/* Region name label */}
              <text
                x={x} y={y + 5}
                textAnchor="middle"
                fontSize="1.65"
                fill={isHovered ? "#C9A84C" : "rgba(237,232,218,0.75)"}
                fontFamily="'Cinzel', serif"
                fontWeight={isHovered ? "bold" : "normal"}
                filter="url(#textShadow)"
              >
                {region.name.split(" ")[0]}
              </text>
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hovered && (() => {
          const { px: x, py: y } = positioned.find(p => p.id === hovered.id)!;
          const tx = tooltipX(x);
          const ty = tooltipY(y);
          return (
            <g>
              <rect
                x={tx} y={ty}
                width="28" height="11"
                rx="1"
                fill="rgba(5,13,24,0.94)"
                stroke={hovered.faction_color ?? "rgba(201,168,76,0.4)"}
                strokeWidth="0.3"
              />
              <text x={tx + 14} y={ty + 4}
                textAnchor="middle" fontSize="2"
                fill="#EDE8DA" fontFamily="'Cinzel', serif" fontWeight="bold">
                {hovered.name}
              </text>
              <text x={tx + 14} y={ty + 8.5}
                textAnchor="middle" fontSize="1.7"
                fill={hovered.id === warRegionId ? "#C9A84C" : (hovered.faction_color ?? "#686880")}
                fontFamily="sans-serif">
                {hovered.id === warRegionId
                  ? "⚔ Война недели"
                  : hovered.faction_name ?? "Нейтральная"}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Corner legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-sm px-2.5 py-1"
          style={{ background: "rgba(5,13,24,0.88)", border: "1px solid rgba(201,168,76,0.25)", backdropFilter: "blur(4px)" }}>
          <span className="text-xs" style={{ color: "#C9A84C" }}>⚔</span>
          <span className="text-xs font-cinzel" style={{ color: "#B8B8C8", letterSpacing: "0.05em" }}>Война недели</span>
        </div>
        <div className="flex items-center gap-2 rounded-sm px-2.5 py-1"
          style={{ background: "rgba(5,13,24,0.88)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}>
          <div className="h-2 w-2 rounded-full" style={{ background: "#5a6a7a", border: "1px solid rgba(255,255,255,0.2)" }} />
          <span className="text-xs font-cinzel" style={{ color: "#686880", letterSpacing: "0.05em" }}>Нейтральный</span>
        </div>
      </div>
    </div>
  );
}
