export const dynamic = "force-dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, users, shop_items, inventory } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const TYPE_LABELS: Record<string, string> = {
  season_pass: "Боевой Пропуск",
  hint_pack:   "Подсказки",
  board_skin:  "Скин доски",
  piece_skin:  "Скин фигур",
  title:       "Титул",
  emote:       "Эмоция",
};

const TYPE_ICONS: Record<string, string> = {
  season_pass: "⚜️",
  hint_pack:   "💡",
  board_skin:  "♟",
  piece_skin:  "♞",
  title:       "🏷️",
  emote:       "🎭",
};

export default async function ShopPage() {
  let userGold = 0;
  let ownedItemIds = new Set<string>();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const [profile] = await db
        .select({ gold_coins: users.gold_coins })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      userGold = profile?.gold_coins ?? 0;

      const owned = await db
        .select({ item_id: inventory.item_id })
        .from(inventory)
        .where(and(eq(inventory.user_id, user.id), eq(inventory.is_active, true)));
      ownedItemIds = new Set(owned.map((o) => o.item_id));
    }
  } catch { /* not logged in */ }

  const items = await db
    .select()
    .from(shop_items)
    .where(eq(shop_items.is_active, true))
    .orderBy(shop_items.sort_order);

  // Group by type
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.item_type]) acc[item.item_type] = [];
    acc[item.item_type].push(item);
    return acc;
  }, {});

  const typeOrder = ["season_pass", "hint_pack", "board_skin", "piece_skin", "title", "emote"];

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      <div className="mx-auto max-w-6xl px-4 py-10">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="section-label">Торговый Пост</span>
            <h1
              className="section-title"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
            >
              Магазин
            </h1>
            <div className="lunar-rule mt-4 w-24" />
          </div>

          {/* Gold balance */}
          {userGold > 0 && (
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-2"
              style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)" }}
            >
              <span style={{ fontSize: "1.1rem" }}>◈</span>
              <span
                className="font-cinzel font-bold"
                style={{ color: "#C9A84C", fontSize: "1.1rem" }}
              >
                {userGold}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#686880" }}>золота</span>
            </div>
          )}
        </div>

        {/* Sections by type */}
        {typeOrder.map((type) => {
          const group = grouped[type];
          if (!group?.length) return null;

          return (
            <section key={type} className="mb-14">
              <div className="mb-6 flex items-center gap-3">
                <span style={{ fontSize: "1.5rem" }}>{TYPE_ICONS[type]}</span>
                <div>
                  <h2
                    className="font-cinzel font-bold"
                    style={{ fontSize: "0.82rem", letterSpacing: "0.18em", color: "#B8B8C8", textTransform: "uppercase" }}
                  >
                    {TYPE_LABELS[type] ?? type}
                  </h2>
                </div>
              </div>

              <div
                className={
                  type === "season_pass"
                    ? "grid gap-6"
                    : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {group.map((item) => {
                  const owned = ownedItemIds.has(item.id);
                  const isSeasonPass = item.is_season_pass;
                  const hasGoldPrice = item.price_gold != null;
                  const hasUsdPrice = item.price_usd_cents != null;

                  return (
                    <div
                      key={item.id}
                      className={isSeasonPass ? "relative overflow-hidden rounded-xl" : "rounded-xl"}
                      style={{
                        background: isSeasonPass
                          ? "linear-gradient(135deg, #1C2333 0%, #111827 50%, #1a1a2e 100%)"
                          : "#111827",
                        border: isSeasonPass
                          ? "1px solid rgba(201,168,76,0.35)"
                          : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: isSeasonPass
                          ? "0 0 40px rgba(201,168,76,0.08)"
                          : "none",
                      }}
                    >
                      {/* Season pass gold shimmer bar */}
                      {isSeasonPass && (
                        <div
                          style={{
                            height: "2px",
                            background: "linear-gradient(to right, transparent, #C9A84C, rgba(201,168,76,0.5), transparent)",
                          }}
                        />
                      )}

                      <div className={isSeasonPass ? "p-8" : "p-5"}>
                        {/* Title row */}
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3
                              className="font-cinzel font-bold"
                              style={{
                                fontSize: isSeasonPass ? "1.1rem" : "0.88rem",
                                letterSpacing: "0.06em",
                                color: isSeasonPass ? "#C9A84C" : "#EDE8DA",
                              }}
                            >
                              {item.name}
                            </h3>
                            <p
                              className={isSeasonPass ? "font-crimson mt-2" : "font-crimson mt-1"}
                              style={{
                                fontSize: isSeasonPass ? "0.95rem" : "0.82rem",
                                color: "#B8B8C8",
                                fontStyle: "italic",
                              }}
                            >
                              {item.description}
                            </p>
                          </div>
                          <span style={{ fontSize: isSeasonPass ? "2rem" : "1.5rem" }}>
                            {TYPE_ICONS[item.item_type]}
                          </span>
                        </div>

                        {/* Price + action */}
                        <div className={`flex items-center justify-between ${isSeasonPass ? "mt-6" : "mt-4"}`}>
                          <div className="flex items-center gap-3">
                            {hasGoldPrice && (
                              <div className="flex items-center gap-1.5">
                                <span style={{ color: "#C9A84C", fontSize: "0.9rem" }}>◈</span>
                                <span
                                  className="font-cinzel font-bold"
                                  style={{ color: "#C9A84C", fontSize: "1rem" }}
                                >
                                  {item.price_gold}
                                </span>
                              </div>
                            )}
                            {hasUsdPrice && (
                              <div
                                className="rounded px-2 py-0.5 font-cinzel font-bold"
                                style={{
                                  background: "rgba(201,168,76,0.15)",
                                  border: "1px solid rgba(201,168,76,0.3)",
                                  color: "#C9A84C",
                                  fontSize: "0.85rem",
                                }}
                              >
                                ${(item.price_usd_cents! / 100).toFixed(2)}
                              </div>
                            )}
                          </div>

                          {owned ? (
                            <span
                              className="font-cinzel rounded px-3 py-1.5"
                              style={{
                                fontSize: "0.62rem",
                                letterSpacing: "0.12em",
                                color: "#2A9D6E",
                                border: "1px solid rgba(42,157,110,0.3)",
                                textTransform: "uppercase",
                              }}
                            >
                              ✓ Куплено
                            </span>
                          ) : (
                            <BuyButton
                              itemId={item.id}
                              priceGold={item.price_gold}
                              priceUsd={item.price_usd_cents}
                              userGold={userGold}
                              isSeasonPass={item.is_season_pass}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* How to earn gold */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3
            className="font-cinzel font-bold mb-4"
            style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#B8B8C8", textTransform: "uppercase" }}
          >
            Как получить золото
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: "⚔️", label: "Победа", value: "+10 ◈" },
              { icon: "🏆", label: "Достижение", value: "+50–700 ◈" },
              { icon: "🛡️", label: "Война фракции", value: "+25 ◈" },
              { icon: "📅", label: "Ежедневно", value: "+5 ◈" },
            ].map((tip) => (
              <div key={tip.label} className="text-center">
                <div className="mb-1 text-2xl">{tip.icon}</div>
                <p style={{ fontSize: "0.78rem", color: "#EDE8DA" }}>{tip.label}</p>
                <p className="font-cinzel font-bold" style={{ color: "#C9A84C", fontSize: "0.82rem" }}>
                  {tip.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Client buy button component
function BuyButton({
  itemId,
  priceGold,
  priceUsd,
  userGold,
  isSeasonPass,
}: {
  itemId: string;
  priceGold: number | null;
  priceUsd: number | null;
  userGold: number;
  isSeasonPass: boolean;
}) {
  const canAfford = priceGold != null && userGold >= priceGold;
  const isUsdOnly = priceGold == null && priceUsd != null;

  if (isUsdOnly || isSeasonPass) {
    return (
      <Link
        href={`/api/shop/checkout?item=${itemId}`}
        className="siege-btn-primary"
        style={{ padding: "0.45rem 1.2rem", fontSize: "0.65rem" }}
      >
        Купить
      </Link>
    );
  }

  return (
    <form action={`/api/shop/buy`} method="POST">
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        className={canAfford ? "siege-btn-secondary" : "siege-btn-ghost"}
        style={{ padding: "0.45rem 1.2rem", fontSize: "0.65rem", opacity: canAfford ? 1 : 0.5 }}
        disabled={!canAfford}
        title={!canAfford ? `Нужно ${priceGold} ◈` : `Купить за ${priceGold} ◈`}
      >
        {canAfford ? "Купить" : "Мало золота"}
      </button>
    </form>
  );
}
