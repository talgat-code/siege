export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db, regions, factions, weekly_wars } from "@/lib/db";
import { eq, isNull, lte, gte, and } from "drizzle-orm";

export const revalidate = 30; // revalidate every 30s

export async function GET() {
  try {
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
      .select({
        id: weekly_wars.id,
        region_id: weekly_wars.region_id,
        faction_a_id: weekly_wars.faction_a_id,
        faction_b_id: weekly_wars.faction_b_id,
        faction_a_points: weekly_wars.faction_a_points,
        faction_b_points: weekly_wars.faction_b_points,
        start_date: weekly_wars.start_date,
        end_date: weekly_wars.end_date,
      })
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

    let warFactions = null;
    if (activeWar) {
      const [fa, fb] = await Promise.all([
        db.select().from(factions).where(eq(factions.id, activeWar.faction_a_id)).limit(1),
        db.select().from(factions).where(eq(factions.id, activeWar.faction_b_id)).limit(1),
      ]);
      warFactions = { a: fa[0] ?? null, b: fb[0] ?? null };
    }

    const allFactions = await db.select().from(factions);

    return NextResponse.json({
      regions: allRegions,
      activeWar,
      warFactions,
      factions: allFactions,
    });
  } catch (error) {
    console.error("Map data error:", error);
    return NextResponse.json({ error: "Ошибка загрузки карты" }, { status: 500 });
  }
}
