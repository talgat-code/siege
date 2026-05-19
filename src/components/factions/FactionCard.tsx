"use client";

import { cn } from "@/lib/utils";
import type { FactionSlug } from "@/types";

interface FactionCardProps {
  slug: FactionSlug;
  name: string;
  color: string;
  lore: string;
  selected: boolean;
  onSelect: (slug: FactionSlug) => void;
}

export function FactionCard({
  slug,
  name,
  color,
  lore,
  selected,
  onSelect,
}: FactionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slug)}
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border-2 p-5 text-left transition-all duration-200 hover:scale-[1.02]",
        selected
          ? "border-primary shadow-lg"
          : "border-border hover:border-muted-foreground"
      )}
      style={selected ? { boxShadow: `0 0 24px ${color}55` } : undefined}
    >
      {/* Color bar */}
      <div
        className="h-1.5 w-full rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Faction symbol */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl font-bold"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {name[0]}
      </div>

      <div>
        <h3 className="font-bold text-foreground">{name}</h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{lore}</p>
      </div>

      {selected && (
        <div
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-black"
          style={{ backgroundColor: color }}
        >
          ✓
        </div>
      )}
    </button>
  );
}
