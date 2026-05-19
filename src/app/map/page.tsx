import { db, regions, factions, weekly_wars, users } from "@/lib/db";
import { eq, isNull, lte, gte, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { WorldMap } from "@/components/map/WorldMap";
import { WarPanel } from "@/components/map/WarPanel";
import { Badge } from "@/components/ui/badge";

export const revalidate = 30;

export default async function MapPage() {
  // Get current user faction
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

  // Fetch all regions with faction info
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

  // Active weekly war
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
  let warRegion = null;

  if (activeWar) {
    const [fa, fb, wr] = await Promise.all([
      db.select().from(factions).where(eq(factions.id, activeWar.faction_a_id)).limit(1),
      db.select().from(factions).where(eq(factions.id, activeWar.faction_b_id)).limit(1),
      db.select().from(regions).where(eq(regions.id, activeWar.region_id)).limit(1),
    ]);
    warFactionA = fa[0] ?? null;
    warFactionB = fb[0] ?? null;
    warRegion = wr[0] ?? null;
  }

  // Faction territory stats
  const allFactions = await db.select().from(factions);
  const ownedCounts: Record<string, number> = {};
  allRegions.forEach((r) => {
    if (r.owner_faction_id) {
      ownedCounts[r.owner_faction_id] = (ownedCounts[r.owner_faction_id] ?? 0) + 1;
    }
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Карта войны</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Захвати регионы для своей фракции. Карта обновляется каждые 30 секунд.
        </p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <WorldMap
            regions={allRegions as Parameters<typeof WorldMap>[0]["regions"]}
            warRegionId={activeWar?.region_id ?? null}
            factionAId={activeWar?.faction_a_id ?? null}
            factionBId={activeWar?.faction_b_id ?? null}
          />

          {/* Faction legend */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {allFactions.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border bg-card px-3 py-2"
                style={{ borderColor: `${f.color}33` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="text-xs font-medium truncate">{f.name}</span>
                </div>
                <p className="text-lg font-bold">{ownedCounts[f.id] ?? 0}</p>
                <p className="text-xs text-muted-foreground">регионов</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
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
            <div className="rounded-xl border bg-card p-5 text-center text-muted-foreground">
              <p className="text-2xl mb-2">🕊️</p>
              <p className="font-medium">Мир на этой неделе</p>
              <p className="text-sm mt-1">Война начнётся в воскресенье</p>
            </div>
          )}

          {/* Regions list */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-semibold text-sm">Все регионы</h3>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {allRegions.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.faction_color ?? "#3a4a5a" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.id === activeWar?.region_id
                        ? "⚔️ Война недели"
                        : r.faction_name ?? "Нейтральный"}
                    </p>
                  </div>
                  {r.contested && r.id !== activeWar?.region_id && (
                    <Badge variant="outline" className="text-xs shrink-0">Спорный</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
