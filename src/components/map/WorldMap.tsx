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

// Neighbor connections by slug pairs
const CONNECTION_SLUGS: [string, string][] = [
  ["arktania", "stone-ridge"],
  ["arktania", "iron-hill"],
  ["stone-ridge", "misty-pass"],
  ["stone-ridge", "shadow-wood"],
  ["iron-hill", "grand-road"],
  ["iron-hill", "misty-pass"],
  ["grand-road", "amber-sea"],
  ["grand-road", "midlands"],
  ["amber-sea", "hope-port"],
  ["hope-port", "arcana-ruins"],
  ["shadow-wood", "black-rocks"],
  ["shadow-wood", "misty-pass"],
  ["gold-valley", "midlands"],
  ["gold-valley", "arcana-ruins"],
  ["misty-pass", "midlands"],
  ["arcana-ruins", "midlands"],
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

  // Tooltip positioning: clamp to SVG bounds
  function tooltipX(x: number) {
    if (x > 68) return x - 28;
    return x + 5;
  }
  function tooltipY(y: number) {
    if (y < 15) return y + 5;
    return y - 14;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-[#050d18] shadow-2xl">
      <svg
        viewBox="0 0 100 90"
        className="w-full"
        style={{ aspectRatio: "100/90" }}
      >
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#0f1f35" />
            <stop offset="100%" stopColor="#050d18" />
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
        </defs>

        {/* Background */}
        <rect width="100" height="90" fill="url(#bgGrad)" />

        {/* Subtle grid */}
        {[20, 40, 60, 80].map((x) => (
          <line key={`vg${x}`} x1={x} y1="0" x2={x} y2="90" stroke="rgba(255,255,255,0.02)" strokeWidth="0.2" />
        ))}
        {[20, 40, 60, 80].map((y) => (
          <line key={`hg${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.02)" strokeWidth="0.2" />
        ))}

        {/* SIEGE title watermark */}
        <text x="50" y="45" textAnchor="middle" fontSize="28" fill="rgba(255,255,255,0.015)"
          fontWeight="900" fontFamily="sans-serif" letterSpacing="4">SIEGE</text>

        {/* Connection lines */}
        {connections.map((c) => (
          <line
            key={c.key}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.25"
            strokeDasharray="1,1"
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
              <circle cx={x} cy={y} r="6" fill={color} opacity="0.08" />

              {/* War pulse animation */}
              {isWar && (
                <>
                  <circle cx={x} cy={y} r="5" fill="none" stroke="#ffd700" strokeWidth="0.4" opacity="0">
                    <animate attributeName="r" values="4;8" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="5" fill="none" stroke="#ffd700" strokeWidth="0.3" opacity="0">
                    <animate attributeName="r" values="4;8" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Hover ring */}
              {isHovered && (
                <circle cx={x} cy={y} r="5" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
              )}

              {/* Contested ring */}
              {isContested && !isWar && (
                <circle cx={x} cy={y} r="4.5" fill="none"
                  stroke={color} strokeWidth="0.3" strokeDasharray="0.8,0.5" opacity="0.6">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="8s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Main circle */}
              <circle
                cx={x} cy={y} r="3.5"
                fill={color}
                stroke={isHovered ? "white" : `${color}cc`}
                strokeWidth={isHovered ? 0.5 : 0.2}
                opacity={0.92}
                filter={isHovered ? "url(#glow)" : undefined}
              />

              {/* Inner dot for owned regions */}
              {region.owner_faction_id && (
                <circle cx={x} cy={y} r="1.2" fill="rgba(255,255,255,0.4)" />
              )}

              {/* War crossed swords */}
              {isWar && (
                <text x={x} y={y - 4.5} textAnchor="middle" fontSize="3">⚔</text>
              )}

              {/* Region label */}
              <text
                x={x} y={y + 5.8}
                textAnchor="middle"
                fontSize="1.9"
                fill={isHovered ? "white" : "rgba(255,255,255,0.6)"}
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
              width="27" height="11"
              rx="1"
              fill="rgba(5,13,24,0.95)"
              stroke={hovered.faction_color ?? "rgba(255,255,255,0.2)"}
              strokeWidth="0.25"
            />
            <text
              x={tooltipX(hovered.x_coord) + 13.5}
              y={tooltipY(hovered.y_coord) + 4}
              textAnchor="middle"
              fontSize="2.1"
              fill="white"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {hovered.name}
            </text>
            <text
              x={tooltipX(hovered.x_coord) + 13.5}
              y={tooltipY(hovered.y_coord) + 8.5}
              textAnchor="middle"
              fontSize="1.8"
              fill={hovered.faction_color ?? "#888"}
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
        <div className="flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <span className="text-xs text-yellow-400">⚔</span>
            <span className="text-xs text-muted-foreground">Война недели</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full border border-white/20 bg-muted" />
          <span className="text-xs text-muted-foreground">Нейтральный регион</span>
        </div>
      </div>
    </div>
  );
}
