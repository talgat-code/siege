export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Called by Vercel Cron every Sunday at 23:59 UTC
// Also callable manually for testing
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const log: string[] = [];

  try {
    // 1. Find expired wars (end_date <= now, no winner yet)
    const { data: expiredWars } = await supabase
      .from('weekly_wars')
      .select('*')
      .lte('end_date', now)
      .is('winner_faction_id', null);

    for (const war of expiredWars ?? []) {
      const winnerId =
        war.faction_a_points >= war.faction_b_points
          ? war.faction_a_id
          : war.faction_b_id;

      // Mark war as finished
      await supabase
        .from('weekly_wars')
        .update({ winner_faction_id: winnerId })
        .eq('id', war.id);

      // Transfer region to winner
      await supabase
        .from('regions')
        .update({ owner_faction_id: winnerId, contested: false })
        .eq('id', war.region_id);

      // Recalculate territory counts for all factions
      const { data: allRegions } = await supabase
        .from('regions')
        .select('owner_faction_id');

      const counts: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allRegions ?? []).forEach((r: any) => {
        if (r.owner_faction_id) counts[r.owner_faction_id] = (counts[r.owner_faction_id] ?? 0) + 1;
      });

      for (const [factionId, count] of Object.entries(counts)) {
        await supabase
          .from('factions')
          .update({ current_territory_count: count })
          .eq('id', factionId);
      }

      log.push(`Settled war ${war.id}: winner=${winnerId}, region=${war.region_id}`);
    }

    // 2. Start new war if none active
    const { data: activeWars } = await supabase
      .from('weekly_wars')
      .select('*')
      .lte('start_date', now)
      .gte('end_date', now)
      .is('winner_faction_id', null)
      .limit(1);

    if (!activeWars || activeWars.length === 0) {
      // Pick a contested region (prefer regions with owner = null)
      const { data: allRegions } = await supabase.from('regions').select('*');
      const regions = allRegions ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const neutralRegions = regions.filter((r: any) => !r.owner_faction_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contestedRegions = regions.filter((r: any) => r.contested);
      const candidates = neutralRegions.length > 0 ? neutralRegions : contestedRegions;

      if (candidates.length === 0) {
        log.push("No candidate regions for new war");
      } else {
        // Pick random candidate
        const region = candidates[Math.floor(Math.random() * candidates.length)];

        // Pick factions with joined contribution count
        const { data: allFactions } = await supabase.from('factions').select('id');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const factionIds = (allFactions ?? []).map((f: any) => f.id);

        if (factionIds.length < 2) {
          log.push("Not enough factions to start war");
        } else {
          // Shuffle and pick two different ones
          const shuffled = factionIds.sort(() => Math.random() - 0.5);
          const faId = shuffled[0];
          const fbId = shuffled[1];

          const nextEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await supabase.from('weekly_wars').insert({
            region_id: region.id,
            faction_a_id: faId,
            faction_b_id: fbId,
            start_date: now,
            end_date: nextEnd,
          });

          // Mark region as contested
          await supabase.from('regions').update({ contested: true }).eq('id', region.id);

          log.push(`Started new war: region=${region.name}, factions=${faId} vs ${fbId}`);
        }
      }
    } else {
      log.push("Active war exists, no new war needed");
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Weekly war cron error:", error);
    return NextResponse.json({ error: "Cron error", details: String(error) }, { status: 500 });
  }
}
