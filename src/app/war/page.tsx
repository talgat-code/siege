export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorldMap } from "@/components/map/WorldMap";
import { WarPanel } from "@/components/map/WarPanel";

export default async function MapPage() {
  const supabase = createAdminClient();

  let userFactionId: string | null = null;
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('faction_id')
        .eq('id', user.id)
        .limit(1)
        .maybeSingle();
      userFactionId = profile?.faction_id ?? null;
    }
  } catch { /* not logged in */ }

  const { data: rawRegions } = await supabase
    .from('regions')
    .select('*, faction:factions!owner_faction_id(name, slug, color)');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRegions = (rawRegions ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    owner_faction_id: r.owner_faction_id,
    contested: r.contested,
    x_coord: r.x_coord,
    y_coord: r.y_coord,
    neighbors: r.neighbors,
    lore_description: r.lore_description,
    faction_name: r.faction?.name ?? null,
    faction_slug: r.faction?.slug ?? null,
    faction_color: r.faction?.color ?? null,
  }));

  const now = new Date().toISOString();
  const { data: activeWarsData } = await supabase
    .from('weekly_wars')
    .select('*')
    .lte('start_date', now)
    .gte('end_date', now)
    .is('winner_faction_id', null)
    .limit(1);

  const activeWar = activeWarsData?.[0] ?? null;
  let warFactionA = null, warFactionB = null, warRegion = null;

  if (activeWar) {
    const [{ data: fa }, { data: fb }, { data: wr }] = await Promise.all([
      supabase.from('factions').select('*').eq('id', activeWar.faction_a_id).limit(1).maybeSingle(),
      supabase.from('factions').select('*').eq('id', activeWar.faction_b_id).limit(1).maybeSingle(),
      supabase.from('regions').select('*').eq('id', activeWar.region_id).limit(1).maybeSingle(),
    ]);
    warFactionA = fa ?? null;
    warFactionB = fb ?? null;
    warRegion = wr ?? null;
  }

  const { data: allFactions } = await supabase.from('factions').select('*');
  const factions = allFactions ?? [];

  const ownedCounts: Record<string, number> = {};
  allRegions.forEach((r) => {
    if (r.owner_faction_id) {
      ownedCounts[r.owner_faction_id] = (ownedCounts[r.owner_faction_id] ?? 0) + 1;
    }
  });
  const totalRegions = allRegions.length;

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      <div className="mx-auto max-w-7xl px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <span className="section-label">Театр военных действий</span>
          <h1
            className="section-title"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
          >
            Карта войны
          </h1>
          <div className="lunar-rule mt-4 w-24" />
          <p
            className="font-crimson mt-3"
            style={{ fontSize: "0.95rem", color: "#686880", fontStyle: "italic" }}
          >
            Каждая победа смещает границы. Карта обновляется в реальном времени.
          </p>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Map */}
          <div className="flex-1 min-w-0">
            <WorldMap
              regions={allRegions as Parameters<typeof WorldMap>[0]["regions"]}
              warRegionId={activeWar?.region_id ?? null}
            />

            {/* Faction territory legend */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {factions.map((f: any) => {
                const count = ownedCounts[f.id] ?? 0;
                const pct = totalRegions > 0 ? (count / totalRegions) * 100 : 0;
                return (
                  <div
                    key={f.id}
                    className="rounded-lg px-4 py-3"
                    style={{
                      background: "#111827",
                      border: `1px solid ${f.color}25`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                      <span
                        className="font-cinzel truncate"
                        style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "#B8B8C8" }}
                      >
                        {f.name}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full mb-1" style={{ background: "#1C2333" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: f.color }}
                      />
                    </div>
                    <p className="font-cinzel font-bold" style={{ fontSize: "1.2rem", color: f.color }}>
                      {count}
                    </p>
                    <p style={{ fontSize: "0.62rem", color: "#686880" }}>регионов</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            {activeWar && warFactionA && warFactionB && warRegion ? (
              <WarPanel
                warRegionName={warRegion.name}
                warRegionLore={warRegion.lore_description}
                endDate={new Date(activeWar.end_date).toISOString()}
                factionA={{ id: warFactionA.id, name: warFactionA.name, color: warFactionA.color, slug: warFactionA.slug }}
                factionB={{ id: warFactionB.id, name: warFactionB.name, color: warFactionB.color, slug: warFactionB.slug }}
                pointsA={activeWar.faction_a_points}
                pointsB={activeWar.faction_b_points}
                userFactionId={userFactionId}
              />
            ) : (
              <div
                className="rounded-xl p-6 text-center"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-2xl mb-3">🕊️</p>
                <p
                  className="font-cinzel font-bold"
                  style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "#B8B8C8", textTransform: "uppercase" }}
                >
                  Мир на этой неделе
                </p>
                <p
                  className="font-crimson mt-2"
                  style={{ fontSize: "0.9rem", color: "#686880", fontStyle: "italic" }}
                >
                  Война начнётся в воскресенье
                </p>
              </div>
            )}

            {/* Regions list */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <h3
                  className="font-cinzel font-bold"
                  style={{ fontSize: "0.68rem", letterSpacing: "0.15em", color: "#B8B8C8", textTransform: "uppercase" }}
                >
                  Все регионы ({totalRegions})
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto" style={{ background: "#0B0F1A" }}>
                {allRegions.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: r.faction_color ?? "#3a4a5a" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p style={{ fontSize: "0.82rem", color: "#EDE8DA", fontWeight: 500 }} className="truncate">
                        {r.name}
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "#686880" }} className="truncate">
                        {r.id === activeWar?.region_id
                          ? "⚔️ Война недели"
                          : r.faction_name ?? "Нейтральный"}
                      </p>
                    </div>
                    {r.contested && r.id !== activeWar?.region_id && (
                      <span
                        className="font-cinzel rounded px-1.5 py-0.5 shrink-0"
                        style={{
                          fontSize: "0.5rem",
                          letterSpacing: "0.1em",
                          color: "#C9A84C",
                          border: "1px solid rgba(201,168,76,0.3)",
                        }}
                      >
                        СПОРНЫЙ
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
