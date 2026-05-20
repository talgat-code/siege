export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 30; // revalidate every 30s

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: allRegions, error: regionsError } = await supabase
      .from('regions')
      .select('*, faction:factions!owner_faction_id(name, slug, color)');
    if (regionsError) throw regionsError;

    // Flatten joined faction fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const regions = (allRegions ?? []).map((r: any) => ({
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
    const { data: activeWarsData, error: warsError } = await supabase
      .from('weekly_wars')
      .select('id, region_id, faction_a_id, faction_b_id, faction_a_points, faction_b_points, start_date, end_date')
      .lte('start_date', now)
      .gte('end_date', now)
      .is('winner_faction_id', null)
      .limit(1);
    if (warsError) throw warsError;

    const activeWar = activeWarsData?.[0] ?? null;

    let warFactions = null;
    if (activeWar) {
      const [{ data: fa }, { data: fb }] = await Promise.all([
        supabase.from('factions').select('*').eq('id', activeWar.faction_a_id).limit(1).maybeSingle(),
        supabase.from('factions').select('*').eq('id', activeWar.faction_b_id).limit(1).maybeSingle(),
      ]);
      warFactions = { a: fa ?? null, b: fb ?? null };
    }

    const { data: allFactions, error: factionsError } = await supabase.from('factions').select('*');
    if (factionsError) throw factionsError;

    return NextResponse.json({
      regions,
      activeWar,
      warFactions,
      factions: allFactions,
    });
  } catch (error) {
    console.error("Map data error:", error);
    return NextResponse.json({ error: "Ошибка загрузки карты" }, { status: 500 });
  }
}
