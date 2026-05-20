export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, users, shop_items, inventory } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const itemId = formData.get("itemId") as string;
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const [item] = await db.select().from(shop_items)
    .where(and(eq(shop_items.id, itemId), eq(shop_items.is_active, true)))
    .limit(1);

  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.price_gold == null) return NextResponse.json({ error: "Use Stripe checkout for USD items" }, { status: 400 });
  if (item.is_season_pass) return NextResponse.json({ error: "Use Stripe checkout" }, { status: 400 });

  // Check already owned
  const existing = await db.select().from(inventory)
    .where(and(eq(inventory.user_id, user.id), eq(inventory.item_id, itemId), eq(inventory.is_active, true)))
    .limit(1);
  if (existing.length > 0) return NextResponse.redirect(new URL("/shop", req.url));

  // Check gold
  const [profile] = await db.select({ gold_coins: users.gold_coins })
    .from(users).where(eq(users.id, user.id)).limit(1);
  if (!profile || (profile.gold_coins ?? 0) < item.price_gold) {
    return NextResponse.redirect(new URL("/shop?error=not_enough_gold", req.url));
  }

  // Deduct gold + add to inventory (both in same logical transaction)
  await db.update(users)
    .set({ gold_coins: sql`${users.gold_coins} - ${item.price_gold}` })
    .where(eq(users.id, user.id));

  const expiresAt = item.duration_days
    ? new Date(Date.now() + item.duration_days * 24 * 60 * 60 * 1000)
    : null;

  await db.insert(inventory).values({
    user_id: user.id,
    item_id: itemId,
    expires_at: expiresAt,
  });

  return NextResponse.redirect(new URL("/shop?success=1", req.url));
}
