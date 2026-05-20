export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const itemId = formData.get("itemId") as string;
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: item } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', itemId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.price_gold == null) return NextResponse.json({ error: "Use Stripe checkout for USD items" }, { status: 400 });
  if (item.is_season_pass) return NextResponse.json({ error: "Use Stripe checkout" }, { status: 400 });

  // Check already owned
  const { data: existing } = await supabase
    .from('inventory')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', itemId)
    .eq('is_active', true)
    .limit(1);
  if ((existing ?? []).length > 0) return NextResponse.redirect(new URL("/shop", req.url));

  // Check gold (read-then-write)
  const { data: profile } = await supabase
    .from('users')
    .select('gold_coins')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();
  if (!profile || (profile.gold_coins ?? 0) < item.price_gold) {
    return NextResponse.redirect(new URL("/shop?error=not_enough_gold", req.url));
  }

  // Deduct gold
  await supabase
    .from('users')
    .update({ gold_coins: (profile.gold_coins ?? 0) - item.price_gold })
    .eq('id', user.id);

  const expiresAt = item.duration_days
    ? new Date(Date.now() + item.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await supabase.from('inventory').insert({
    user_id: user.id,
    item_id: itemId,
    expires_at: expiresAt,
  });

  return NextResponse.redirect(new URL("/shop?success=1", req.url));
}
