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
  ["frost-peak",   "arktania"],
  ["frost-peak",   "stone-ridge"],
  ["arktania",     "stone-ridge"],
  ["arktania",     "iron-hill"],
  // Central-west
  ["stone-ridge",  "misty-pass"],
  ["stone-ridge",  "shadow-wood"],
  ["iron-hill",    "grand-road"],
  ["iron-hill",    "misty-pass"],
  // East coast
  ["grand-road",   "amber-sea"],
  ["grand-road",   "midlands"],
  ["amber-sea",    "hope-port"],
  ["hope-port",    "arcana-ruins"],
  ["hope-port",    "crystal-shore"],
  ["crystal-shore","arcana-ruins"],
  // West dark
  ["shadow-wood",  "black-rocks"],
  ["shadow-wood",  "misty-pass"],
  ["black-rocks",  "ember-marsh"],
  // Central
  ["misty-pass",   "midlands"],
  ["arcana-ruins", "midlands"],
  ["gold-valley",  "midlands"],
  ["gold-valley",  "arcana-ruins"],
  ["gold-valley",  "dragon-spine"],
  ["dragon-spine", "arcana-ruins"],
];

export function WorldMap({ regions, warRegionId }: WorldMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const slugMap = new Map(regions.map((r) => [r.slug, r]));
  const idMap = new Map(regions.map((r) => [r.id, r]));
  const hovered = hoveredId ? idMap.get(hoveredId) : null;

  const connections = CONNECTION_SLUGS.flatMap(([a, b]) => {
    const ra = slugMap.get(a);
    const rb = slugMap.get(b);
    if (!ra || !rb) return [];
    return [{ x1: ra.x_coord, y1: ra.y_coord, x2: rb.x_coord, y2: rb.y_coord, key: `${a}-${b}` }];
  });

  function tooltipX(x: number) {
    if (x > 68) return x - 28;
    return x + 5;
  }
  function tooltipY(y: number) {
    if (y < 15) return y + 6;
    return y - 14;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-2xl"
      style={{ border: "1px solid rgba(201,168,76,0.15)", background: "#050d18" }}>
      <svg
        viewBox="0 0 100 90"
        className="w-full"
        style={{ aspectRatio: "100/90" }}
      >
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#0f1f35" />
            <stop offset="100%" stopColor="#050d18" />
          </radialGradient>
          <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(201,168,76,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowStrong">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="goldFilter">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="100" height="90" fill="url(#bgGrad)" />
        <rect width="100" height="90" fill="url(#goldGlow)" />

        {/* Subtle grid */}
        {[20, 40, 60, 80].map((x) => (
          <line key={`vg${x}`} x1={x} y1="0" x2={x} y2="90" stroke="rgba(201,168,76,0.025)" strokeWidth="0.2" />
        ))}
        {[20, 40, 60, 80].map((y) => (
          <line key={`hg${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(201,168,76,0.025)" strokeWidth="0.2" />
        ))}

        {/* SIEGE title watermark */}
        <text x="50" y="48" textAnchor="middle" fontSize="30" fill="rgba(201,168,76,0.018)"
          fontWeight="900" fontFamily="sans-serif" letterSpacing="4">SIEGE</text>

        {/* Connection lines */}
        {connections.map((c) => (
          <line
            key={c.key}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="rgba(201,168,76,0.12)"
            strokeWidth="0.3"
            strokeDasharray="1.2,1"
          />
        ))}

        {/* Regions */}
        {regions.map((region) => {
          const color = region.faction_color ?? "#3a4a5a";
          const isWar = region.id === warRegionId;
          const isHovered = region.id === hoveredId;
          const isContested = region.contested || isWar;
          const { x_coord: x, y_coord: y } = region;

          return (
            <g
              key={region.id}
              onMouseEnter={() => setHoveredId(region.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Outer territory glow */}
              <circle cx={x} cy={y} r="6" fill={color} opacity="0.1" />

              {/* War pulse */}
              {isWar && (
                <>
                  <circle cx={x} cy={y} r="5" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0">
                    <animate attributeName="r" values="4;9" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="5" fill="none" stroke="#C9A84C" strokeWidth="0.3" opacity="0">
                    <animate attributeName="r" values="4;9" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Hover ring */}
              {isHovered && (
                <circle cx={x} cy={y} r="5.5" fill="none" stroke="rgba(201,168,76,0.6)" strokeWidth="0.4" />
              )}

              {/* Contested spinning ring */}
              {isContested && !isWar && (
                <circle cx={x} cy={y} r="4.5" fill="none"
                  stroke={color} strokeWidth="0.3" strokeDasharray="0.8,0.5" opacity="0.5">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="8s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Main circle */}
              <circle
                cx={x} cy={y} r="3.5"
                fill={color}
                stroke={isHovered ? "rgba(201,168,76,0.8)" : `${color}cc`}
                strokeWidth={isHovered ? 0.6 : 0.2}
                opacity={0.92}
                filter={isHovered ? "url(#glow)" : undefined}
              />

              {/* Inner dot for owned regions */}
              {region.owner_faction_id && (
                <circle cx={x} cy={y} r="1.2" fill="rgba(255,255,255,0.35)" />
              )}

              {/* War swords */}
              {isWar && (
                <text x={x} y={y - 4.8} textAnchor="middle" fontSize="3" filter="url(#goldFilter)">⚔</text>
              )}

              {/* Region label */}
              <text
                x={x} y={y + 5.8}
                textAnchor="middle"
                fontSize="1.9"
                fill={isHovered ? "rgba(201,168,76,0.9)" : "rgba(237,232,218,0.55)"}
                fontFamily="sans-serif"
                fontWeight={isHovered ? "bold" : "normal"}
              >
                {region.name.split(" ")[0]}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {hovered && (
          <g>
            <rect
              x={tooltipX(hovered.x_coord)}
              y={tooltipY(hovered.y_coord)}
              width="29" height="12"
              rx="1"
              fill="rgba(11,15,26,0.96)"
              stroke={hovered.faction_color ?? "rgba(201,168,76,0.3)"}
              strokeWidth="0.3"
            />
            <text
              x={tooltipX(hovered.x_coord) + 14.5}
              y={tooltipY(hovered.y_coord) + 4.5}
              textAnchor="middle"
              fontSize="2.1"
              fill="#EDE8DA"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {hovered.name}
            </text>
            <text
              x={tooltipX(hovered.x_coord) + 14.5}
              y={tooltipY(hovered.y_coord) + 9}
              textAnchor="middle"
              fontSize="1.8"
              fill={hovered.id === warRegionId ? "#C9A84C" : (hovered.faction_color ?? "#686880")}
              fontFamily="sans-serif"
            >
              {hovered.id === warRegionId
                ? "⚔ Война недели"
                : hovered.faction_name ?? "Нейтральная"}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 rounded px-2 py-1"
          style={{ background: "rgba(11,15,26,0.85)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <span className="text-xs" style={{ color: "#C9A84C" }}>⚔</span>
          <span className="text-xs" style={{ color: "#B8B8C8" }}>Война недели</span>
        </div>
        <div className="flex items-center gap-2 rounded px-2 py-1"
          style={{ background: "rgba(11,15,26,0.85)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <div className="h-2 w-2 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.2)", background: "#3a4a5a" }} />
          <span className="text-xs" style={{ color: "#B8B8C8" }}>Нейтральный</span>
        </div>
      </div>
    </div>
  );
}
