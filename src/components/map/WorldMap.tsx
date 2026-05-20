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

const CONNECTION_SLUGS: [string, string][] = [
  // Northern cluster
  ["frost-peak",    "arktania"],
  ["frost-peak",    "stone-ridge"],
  ["arktania",      "stone-ridge"],
  ["arktania",      "iron-hill"],
  // Central-west
  ["stone-ridge",   "misty-pass"],
  ["stone-ridge",   "shadow-wood"],
  ["iron-hill",     "grand-road"],
  ["iron-hill",     "misty-pass"],
  // East coast
  ["grand-road",    "amber-sea"],
  ["grand-road",    "midlands"],
  ["amber-sea",     "hope-port"],
  ["hope-port",     "arcana-ruins"],
  ["hope-port",     "crystal-shore"],
  ["crystal-shore", "arcana-ruins"],
  // West dark
  ["shadow-wood",   "black-rocks"],
  ["shadow-wood",   "misty-pass"],
  ["black-rocks",   "ember-marsh"],
  // Central
  ["misty-pass",    "midlands"],
  ["arcana-ruins",  "midlands"],
  ["gold-valley",   "midlands"],
  ["gold-valley",   "arcana-ruins"],
  ["gold-valley",   "dragon-spine"],
  ["dragon-spine",  "arcana-ruins"],
];

export function WorldMap({ regions, warRegionId }: WorldMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const slugMap = new Map(regions.map((r) => [r.slug, r]));
  const idMap  = new Map(regions.map((r) => [r.id, r]));
  const hovered = hoveredId ? idMap.get(hoveredId) : null;

  const connections = CONNECTION_SLUGS.flatMap(([a, b]) => {
    const ra = slugMap.get(a);
    const rb = slugMap.get(b);
    if (!ra || !rb) return [];
    return [{ x1: ra.x_coord, y1: ra.y_coord, x2: rb.x_coord, y2: rb.y_coord, key: `${a}-${b}` }];
  });

  function tooltipX(x: number) { return x > 68 ? x - 30 : x + 5; }
  function tooltipY(y: number)  { return y < 15  ? y + 5  : y - 15; }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        borderRadius: "4px",
        border: "1px solid rgba(201,168,76,0.25)",
        boxShadow: "0 0 60px rgba(0,0,0,0.7), inset 0 0 80px rgba(0,0,0,0.3)",
      }}
    >
      <svg
        viewBox="0 0 100 90"
        className="w-full"
        style={{ aspectRatio: "100/90", display: "block" }}
      >
        <defs>
          {/* Vignette — darkens edges of map image */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="68%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(5,12,25,0.72)" />
          </radialGradient>

          {/* Top bar for navbar readability */}
          <linearGradient id="topBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(5,12,25,0.65)" />
            <stop offset="22%"  stopColor="transparent" />
          </linearGradient>

          {/* Bottom bar for legend */}
          <linearGradient id="botBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="78%"  stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(5,12,25,0.75)" />
          </linearGradient>

          {/* Gold glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong glow for war nodes */}
          <filter id="glowWar" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Text shadow for labels */}
          <filter id="textShadow">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="rgba(0,0,0,0.95)" />
          </filter>

          {/* Mist / fog at the bottom edge */}
          <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(11,22,40,0)" />
            <stop offset="100%" stopColor="rgba(11,22,40,0.55)" />
          </linearGradient>
        </defs>

        {/* ── Fantasy map image ──────────────────────────── */}
        <image
          href="/map-fantasy.jpg"
          x="0" y="0"
          width="100" height="90"
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Dark overlay for readability */}
        <rect width="100" height="90" fill="rgba(5,12,25,0.35)" />

        {/* Vignette edges */}
        <rect width="100" height="90" fill="url(#vignette)" />

        {/* Top / bottom gradient bars */}
        <rect width="100" height="90" fill="url(#topBar)" />
        <rect width="100" height="90" fill="url(#botBar)" />

        {/* Animated bottom fog */}
        <rect width="100" height="25" y="65" fill="url(#mistGrad)" opacity="0.6">
          <animate
            attributeName="opacity"
            values="0.5;0.75;0.5"
            dur="7s"
            repeatCount="indefinite"
          />
        </rect>

        {/* ── Connection lines (gold dashed roads) ─────── */}
        {connections.map((c) => (
          <line
            key={c.key}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="rgba(201,168,76,0.3)"
            strokeWidth="0.28"
            strokeDasharray="1.2,0.9"
          />
        ))}

        {/* ── Region nodes ──────────────────────────────── */}
        {regions.map((region) => {
          const color     = region.faction_color ?? "#4a5a6a";
          const isWar      = region.id === warRegionId;
          const isHovered  = region.id === hoveredId;
          const isContested = region.contested || isWar;
          const { x_coord: x, y_coord: y } = region;

          return (
            <g
              key={region.id}
              onMouseEnter={() => setHoveredId(region.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Wide ambient territory glow */}
              <circle cx={x} cy={y} r="8" fill={color} opacity="0.1" />
              <circle cx={x} cy={y} r="6" fill={color} opacity="0.07" />

              {/* ── War: triple pulse rings (gold) ── */}
              {isWar && (
                <>
                  <circle cx={x} cy={y} r="5" fill="none" stroke="#c9a84c" strokeWidth="0.55" opacity="0">
                    <animate attributeName="r"       values="4.5;11"  dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.75;0"  dur="2.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="5" fill="none" stroke="#c9a84c" strokeWidth="0.4" opacity="0">
                    <animate attributeName="r"       values="4.5;11"  dur="2.2s" begin="0.73s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0"   dur="2.2s" begin="0.73s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="5" fill="none" stroke="#c9a84c" strokeWidth="0.25" opacity="0">
                    <animate attributeName="r"       values="4.5;11"  dur="2.2s" begin="1.46s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0"   dur="2.2s" begin="1.46s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Hover ring */}
              {isHovered && (
                <circle cx={x} cy={y} r="6.5" fill="none"
                  stroke="rgba(237,232,218,0.45)" strokeWidth="0.35" />
              )}

              {/* Contested: slow rotating dashed ring */}
              {isContested && !isWar && (
                <circle cx={x} cy={y} r="5.8" fill="none"
                  stroke={color} strokeWidth="0.4" strokeDasharray="1,0.65" opacity="0.7">
                  <animateTransform
                    attributeName="transform" type="rotate"
                    from={`0 ${x} ${y}`} to={`360 ${x} ${y}`}
                    dur="10s" repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Node outer ring */}
              <circle cx={x} cy={y} r="4.6"
                fill="none"
                stroke={isWar ? "#c9a84c" : `${color}aa`}
                strokeWidth={isWar ? 0.5 : 0.25}
              />

              {/* Main circle */}
              <circle
                cx={x} cy={y} r="3.8"
                fill={color}
                stroke={isHovered ? "rgba(237,232,218,0.9)" : `${color}dd`}
                strokeWidth={isHovered ? 0.5 : 0.2}
                opacity={0.95}
                filter={isWar ? "url(#glowWar)" : isHovered ? "url(#glow)" : undefined}
              />

              {/* Owned: inner ring */}
              {region.owner_faction_id && (
                <circle cx={x} cy={y} r="2.2" fill="none"
                  stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
              )}

              {/* Center dot */}
              <circle cx={x} cy={y} r="1.1" fill="rgba(255,255,255,0.5)" />

              {/* War crossed swords */}
              {isWar && (
                <text x={x} y={y - 6.2} textAnchor="middle" fontSize="3.2">⚔</text>
              )}

              {/* Region label */}
              <text
                x={x} y={y + 7}
                textAnchor="middle"
                fontSize="2"
                fill={isHovered ? "rgba(237,232,218,1)" : "rgba(237,232,218,0.88)"}
                fontFamily="Georgia, serif"
                fontWeight={isHovered ? "bold" : "normal"}
                filter="url(#textShadow)"
              >
                {region.name.split(" ")[0]}
              </text>
            </g>
          );
        })}

        {/* ── Tooltip ─────────────────────────────────── */}
        {hovered && (
          <g>
            <rect
              x={tooltipX(hovered.x_coord)}
              y={tooltipY(hovered.y_coord)}
              width="30" height="13"
              rx="1.5"
              fill="rgba(5,12,25,0.93)"
              stroke={hovered.faction_color ?? "rgba(201,168,76,0.5)"}
              strokeWidth="0.3"
            />
            {/* Gold top accent line */}
            <rect
              x={tooltipX(hovered.x_coord) + 0.3}
              y={tooltipY(hovered.y_coord) + 0.3}
              width="29.4" height="0.5"
              rx="1"
              fill={hovered.faction_color ?? "#c9a84c"}
              opacity="0.6"
            />
            <text
              x={tooltipX(hovered.x_coord) + 15}
              y={tooltipY(hovered.y_coord) + 5.5}
              textAnchor="middle"
              fontSize="2.3"
              fill="rgba(237,232,218,0.97)"
              fontFamily="Georgia, serif"
              fontWeight="bold"
            >
              {hovered.name}
            </text>
            <text
              x={tooltipX(hovered.x_coord) + 15}
              y={tooltipY(hovered.y_coord) + 10.2}
              textAnchor="middle"
              fontSize="1.8"
              fill={hovered.faction_color ?? "#c9a84c"}
              fontFamily="sans-serif"
            >
              {hovered.id === warRegionId
                ? "⚔ Война недели"
                : hovered.faction_name ?? "Нейтральный"}
            </text>
          </g>
        )}

        {/* Gold border frame */}
        <rect width="100" height="90" fill="none"
          stroke="rgba(201,168,76,0.18)" strokeWidth="0.6" />
        {/* Corner ornaments */}
        {([[2,2],[98,2],[2,88],[98,88]] as [number,number][]).map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="0.8"
            fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth="0.3" />
        ))}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
        <div
          className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm"
          style={{
            background: "rgba(5,12,25,0.8)",
            border: "1px solid rgba(201,168,76,0.22)",
            borderRadius: "3px",
          }}
        >
          <span className="text-xs" style={{ color: "#c9a84c" }}>⚔</span>
          <span className="text-xs" style={{ color: "rgba(237,232,218,0.7)", fontFamily: "Georgia,serif" }}>
            Война недели
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm"
          style={{
            background: "rgba(5,12,25,0.8)",
            border: "1px solid rgba(201,168,76,0.14)",
            borderRadius: "3px",
          }}
        >
          <div className="h-2 w-2 rounded-full"
            style={{ background: "#4a5a6a", border: "1px solid rgba(255,255,255,0.2)" }} />
          <span className="text-xs" style={{ color: "rgba(237,232,218,0.6)", fontFamily: "Georgia,serif" }}>
            Нейтральный
          </span>
        </div>
      </div>
    </div>
  );
}
