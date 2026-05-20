export const dynamic = "force-dynamic";
import type { CSSProperties } from "react";
import { db, regions, factions, weekly_wars, users } from "@/lib/db";
import { eq, isNull, lte, gte, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { WorldMap } from "@/components/map/WorldMap";
import { WarPanel } from "@/components/map/WarPanel";

export default async function MapPage() {
  let userFactionId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [profile] = await db
        .select({ faction_id: users.faction_id })
        .from(users).where(eq(users.id, user.id)).limit(1);
      userFactionId = profile?.faction_id ?? null;
    }
  } catch { /* not logged in */ }

  const allRegions = await db
    .select({
      id: regions.id,
      name: regions.name,
      slug: regions.slug,
      owner_faction_id: regions.owner_faction_id,
      contested: regions.contested,
      x_coord: regions.x_coord,
      y_coord: regions.y_coord,
      neighbors: regions.neighbors,
      lore_description: regions.lore_description,
      faction_name: factions.name,
      faction_slug: factions.slug,
      faction_color: factions.color,
    })
    .from(regions)
    .leftJoin(factions, eq(regions.owner_faction_id, factions.id));

  const now = new Date();
  const activeWars = await db
    .select()
    .from(weekly_wars)
    .where(
      and(
        lte(weekly_wars.start_date, now),
        gte(weekly_wars.end_date, now),
        isNull(weekly_wars.winner_faction_id)
      )
    )
    .limit(1);

  const activeWar = activeWars[0] ?? null;

  let warFactionA = null;
  let warFactionB = null;
  let warRegion   = null;

  if (activeWar) {
    const [fa, fb, wr] = await Promise.all([
      db.select().from(factions).where(eq(factions.id, activeWar.faction_a_id)).limit(1),
      db.select().from(factions).where(eq(factions.id, activeWar.faction_b_id)).limit(1),
      db.select().from(regions).where(eq(regions.id, activeWar.region_id)).limit(1),
    ]);
    warFactionA = fa[0] ?? null;
    warFactionB = fb[0] ?? null;
    warRegion   = wr[0] ?? null;
  }

  const allFactions = await db.select().from(factions);
  const ownedCounts: Record<string, number> = {};
  allRegions.forEach((r) => {
    if (r.owner_faction_id) {
      ownedCounts[r.owner_faction_id] = (ownedCounts[r.owner_faction_id] ?? 0) + 1;
    }
  });

  const totalRegions = allRegions.length;

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "#0b1628" }}
    >
      {/* Subtle page background texture */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/hero-bg.jpg')", opacity: 0.04 }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-10">

        {/* ── Page header ──────────────────────────────── */}
        <div className="mb-8">
          <span
            className="font-cinzel block mb-2"
            style={{
              fontSize: "0.62rem",
              letterSpacing: "0.35em",
              color: "rgba(201,168,76,0.6)",
              textTransform: "uppercase",
            }}
          >
            Театр военных действий
          </span>
          <h1
            className="font-cinzel font-bold"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              letterSpacing: "0.18em",
              color: "#ede8da",
              textShadow: "0 0 25px rgba(201,168,76,0.3)",
            }}
          >
            Карта Войны
          </h1>
          <div
            className="mt-3 w-48 h-px"
            style={{
              background: "linear-gradient(to right, rgba(201,168,76,0.6), transparent)",
            }}
          />
          <p
            className="font-crimson mt-2"
            style={{ fontSize: "0.95rem", fontStyle: "italic", color: "#8da8c4" }}
          >
            Каждая победа смещает границы. Карта обновляется в реальном времени.
          </p>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">

          {/* ── Map + faction stats ──────────────────── */}
          <div className="flex-1 min-w-0">
            <WorldMap
              regions={allRegions as Parameters<typeof WorldMap>[0]["regions"]}
              warRegionId={activeWar?.region_id ?? null}
            />

            {/* Faction territory cards */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {allFactions.map((f) => {
                const count = ownedCounts[f.id] ?? 0;
                const pct   = totalRegions > 0 ? Math.round((count / totalRegions) * 100) : 0;
                return (
                  <div
                    key={f.id}
                    className="relative overflow-hidden"
                    style={{
                      background: "#152240",
                      border: `1px solid ${f.color}33`,
                      borderRadius: "3px",
                      padding: "0.85rem 1rem",
                    }}
                  >
                    {/* Top color accent */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0,
                        height: "2px",
                        background: `linear-gradient(to right, ${f.color}, ${f.color}44, transparent)`,
                      }}
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: f.color, boxShadow: `0 0 6px ${f.color}88` }}
                      />
                      <span
                        className="font-cinzel text-xs font-medium truncate"
                        style={{ color: "#ede8da", letterSpacing: "0.06em" }}
                      >
                        {f.name}
                      </span>
                    </div>
                    <p
                      className="font-cinzel font-bold"
                      style={{ fontSize: "1.5rem", color: f.color, lineHeight: 1 }}
                    >
                      {count}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#6a8aaa" }}>
                      регионов · {pct}%
                    </p>
                    {/* Progress bar */}
                    <div
                      className="mt-2 h-0.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: f.color,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right sidebar ────────────────────────── */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">

            {/* War panel */}
            {activeWar && warFactionA && warFactionB && warRegion ? (
              <WarPanel
                warRegionName={warRegion.name}
                warRegionLore={warRegion.lore_description}
                endDate={activeWar.end_date.toISOString()}
                factionA={{ id: warFactionA.id, name: warFactionA.name, color: warFactionA.color, slug: warFactionA.slug }}
                factionB={{ id: warFactionB.id, name: warFactionB.name, color: warFactionB.color, slug: warFactionB.slug }}
                pointsA={activeWar.faction_a_points}
                pointsB={activeWar.faction_b_points}
                userFactionId={userFactionId}
              />
            ) : (
              <div
                className="text-center p-6"
                style={{
                  background: "#152240",
                  border: "1px solid rgba(201,168,76,0.15)",
                  borderRadius: "3px",
                }}
              >
                <p className="text-3xl mb-3">🕊️</p>
                <p
                  className="font-cinzel font-medium"
                  style={{ color: "#ede8da", letterSpacing: "0.1em", fontSize: "0.85rem" }}
                >
                  Мир на этой неделе
                </p>
                <p className="font-crimson mt-1 text-sm italic" style={{ color: "#6a8aaa" }}>
                  Война начнётся в воскресенье
                </p>
              </div>
            )}

            {/* Regions list */}
            <div
              className="overflow-hidden"
              style={{
                background: "#152240",
                border: "1px solid rgba(201,168,76,0.15)",
                borderRadius: "3px",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}
              >
                <h3
                  className="font-cinzel font-semibold"
                  style={{ fontSize: "0.75rem", letterSpacing: "0.12em", color: "#ede8da" }}
                >
                  Все регионы
                </h3>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto"
                style={{ "--tw-divide-opacity": 1, borderColor: "rgba(201,168,76,0.06)" } as CSSProperties}
              >
                {allRegions.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: "1px solid rgba(201,168,76,0.06)" }}
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: r.faction_color ?? "#3a4a5a",
                        boxShadow: r.faction_color ? `0 0 5px ${r.faction_color}66` : "none",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: "#ede8da" }}
                      >
                        {r.name}
                      </p>
                      <p
                        className="truncate text-xs font-crimson italic"
                        style={{
                          color: r.id === activeWar?.region_id
                            ? "#c9a84c"
                            : r.faction_color ?? "#6a8aaa",
                        }}
                      >
                        {r.id === activeWar?.region_id
                          ? "⚔ Война недели"
                          : r.faction_name ?? "Нейтральный"}
                      </p>
                    </div>
                    {r.contested && r.id !== activeWar?.region_id && (
                      <span
                        className="font-cinzel text-xs shrink-0 px-1.5 py-0.5"
                        style={{
                          color: "rgba(201,168,76,0.8)",
                          border: "1px solid rgba(201,168,76,0.3)",
                          borderRadius: "2px",
                          fontSize: "0.6rem",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Спорный
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
