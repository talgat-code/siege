import { NextResponse } from "next/server";
import { db, weekly_wars, regions, factions, faction_contributions } from "@/lib/db";
import { eq, isNull, lte, gte, and, asc, sql } from "drizzle-orm";

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

  const now = new Date();
  const log: string[] = [];

  try {
    // 1. Find expired wars (end_date <= now, no winner yet)
    const expiredWars = await db
      .select()
      .from(weekly_wars)
      .where(and(lte(weekly_wars.end_date, now), isNull(weekly_wars.winner_faction_id)));

    for (const war of expiredWars) {
      const winnerId =
        war.faction_a_points >= war.faction_b_points
          ? war.faction_a_id
          : war.faction_b_id;

      // Mark war as finished
      await db
        .update(weekly_wars)
        .set({ winner_faction_id: winnerId })
        .where(eq(weekly_wars.id, war.id));

      // Transfer region to winner
      await db
        .update(regions)
        .set({ owner_faction_id: winnerId, contested: false })
        .where(eq(regions.id, war.region_id));

      // Recalculate territory counts for all factions
      const allRegions = await db.select({ owner_faction_id: regions.owner_faction_id }).from(regions);
      const counts: Record<string, number> = {};
      allRegions.forEach((r) => {
        if (r.owner_faction_id) counts[r.owner_faction_id] = (counts[r.owner_faction_id] ?? 0) + 1;
      });

      for (const [factionId, count] of Object.entries(counts)) {
        await db
          .update(factions)
          .set({ current_territory_count: count })
          .where(eq(factions.id, factionId));
      }

      log.push(`Settled war ${war.id}: winner=${winnerId}, region=${war.region_id}`);
    }

    // 2. Start new war if none active
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

    if (activeWars.length === 0) {
      // Pick a contested region (prefer regions with owner = null)
      const allRegions = await db.select().from(regions);
      const neutralRegions = allRegions.filter((r) => !r.owner_faction_id);
      const contestedRegions = allRegions.filter((r) => r.contested);
      const candidates = neutralRegions.length > 0 ? neutralRegions : contestedRegions;

      if (candidates.length === 0) {
        log.push("No candidate regions for new war");
      } else {
        // Pick random candidate
        const region = candidates[Math.floor(Math.random() * candidates.length)];

        // Pick two most active factions (most contributions this month)
        const allFactions = await db
          .select({
            id: factions.id,
            contributions: sql<number>`COALESCE(SUM(${faction_contributions.points_contributed}), 0)`.as("contributions"),
          })
          .from(factions)
          .leftJoin(faction_contributions, eq(factions.id, faction_contributions.faction_id))
          .groupBy(factions.id)
          .orderBy(asc(sql`contributions`)) // pick varied factions — rotate
          .limit(4);

        if (allFactions.length < 2) {
          log.push("Not enough factions to start war");
        } else {
          // Shuffle and pick two different ones
          const shuffled = allFactions.sort(() => Math.random() - 0.5);
          const fa = shuffled[0];
          const fb = shuffled[1];

          const nextEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

          await db.insert(weekly_wars).values({
            region_id: region.id,
            faction_a_id: fa.id,
            faction_b_id: fb.id,
            start_date: now,
            end_date: nextEnd,
          });

          // Mark region as contested
          await db.update(regions).set({ contested: true }).where(eq(regions.id, region.id));

          log.push(`Started new war: region=${region.name}, factions=${fa.id} vs ${fb.id}`);
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
