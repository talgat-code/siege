export const dynamic = "force-dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorldMap } from "@/components/map/WorldMap";
import { WarWeekSection } from "@/components/war/WarWeekSection";

export default async function WarPage() {
  const supabase = createAdminClient();

  let userFactionId: string | null = null;
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("faction_id")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle();
      userFactionId = profile?.faction_id ?? null;
    }
  } catch { /* not logged in */ }

  // Parallel fetches
  const [{ data: rawRegions }, { data: allFactionsData }, activeWarData] = await Promise.all([
    supabase.from("regions").select("*, faction:factions!owner_faction_id(name, slug, color)"),
    supabase.from("factions").select("*"),
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("weekly_wars")
        .select("*")
        .lte("start_date", now)
        .gte("end_date", now)
        .is("winner_faction_id", null)
        .limit(1);
      return data;
    })(),
  ]);

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

  const factions = allFactionsData ?? [];
  const activeWar = activeWarData?.[0] ?? null;

  // Fetch war factions if there's an active war
  let warFactionA = null, warFactionB = null, warRegion = null;
  if (activeWar) {
    const [{ data: fa }, { data: fb }, { data: wr }] = await Promise.all([
      supabase.from("factions").select("*").eq("id", activeWar.faction_a_id).limit(1).maybeSingle(),
      supabase.from("factions").select("*").eq("id", activeWar.faction_b_id).limit(1).maybeSingle(),
      supabase.from("regions").select("*").eq("id", activeWar.region_id).limit(1).maybeSingle(),
    ]);
    warFactionA = fa ?? null;
    warFactionB = fb ?? null;
    warRegion = wr ?? null;
  }

  // Territory stats
  const ownedCounts: Record<string, number> = {};
  allRegions.forEach((r) => {
    if (r.owner_faction_id) {
      ownedCounts[r.owner_faction_id] = (ownedCounts[r.owner_faction_id] ?? 0) + 1;
    }
  });

  // Group territories
  const warRegionId = activeWar?.region_id ?? null;
  const atWarRegions = allRegions.filter((r) => r.id === warRegionId);
  const contestedRegions = allRegions.filter((r) => r.contested && r.id !== warRegionId);
  const controlledRegions = allRegions.filter((r) => r.owner_faction_id && !r.contested && r.id !== warRegionId);
  const neutralRegions = allRegions.filter((r) => !r.owner_faction_id && !r.contested && r.id !== warRegionId);

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          minHeight: "560px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "url('/war-map.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          overflow: "hidden",
        }}
      >
        {/* Layered overlays */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(11,15,26,0.55) 0%, rgba(11,15,26,0.78) 60%, rgba(11,15,26,1) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 70% at 50% 40%, transparent 40%, rgba(11,15,26,0.4) 100%)",
        }} />

        <div style={{ position: "relative", textAlign: "center", padding: "5rem 1.5rem 6rem" }}>
          <p
            className="font-cinzel"
            style={{
              fontSize: "0.68rem", letterSpacing: "0.38em",
              color: "rgba(201,168,76,0.8)", textTransform: "uppercase",
              marginBottom: "1.25rem",
            }}
          >
            Театр военных действий
          </p>

          <h1
            className="font-cinzel"
            style={{
              fontSize: "clamp(3.5rem, 10vw, 7rem)",
              fontWeight: 900,
              letterSpacing: "0.25em",
              color: "#EDE8DA",
              lineHeight: 1,
              marginBottom: "1.5rem",
              textShadow: "0 0 60px rgba(201,168,76,0.25)",
            }}
          >
            ВОЙНА
          </h1>

          <div className="lunar-rule" style={{ width: "80px", margin: "0 auto 1.5rem" }} />

          <p
            className="font-crimson"
            style={{
              fontSize: "1.25rem", fontStyle: "italic",
              color: "#B8B8C8", marginBottom: "2.5rem",
              maxWidth: "480px", margin: "0 auto 2.5rem",
              lineHeight: 1.7,
            }}
          >
            Каждая партия смещает границы.<br />Каждый ход — история.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/play/bot"
              className="siege-btn-primary"
              style={{ padding: "0.85rem 2.4rem", fontSize: "0.75rem" }}
            >
              ♟ Начать битву
            </Link>
            <Link
              href="/play/friend"
              className="siege-btn-secondary"
              style={{ padding: "0.85rem 2.4rem", fontSize: "0.75rem" }}
            >
              👥 С другом
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ WHAT IS WAR ════════════════════════════════════════ */}
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "6rem 1.5rem 5rem", textAlign: "center" }}>
        <span className="section-label">Система</span>
        <h2
          className="section-title"
          style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", marginBottom: "1.5rem" }}
        >
          Что такое Война?
        </h2>
        <div className="lunar-rule" style={{ width: "60px", margin: "0 auto 1.75rem" }} />

        <p
          className="font-crimson"
          style={{ fontSize: "1.1rem", color: "#B8B8C8", lineHeight: 1.9, fontStyle: "italic", marginBottom: "3rem" }}
        >
          Каждую неделю две великие фракции сражаются за спорный регион.
          Побеждай в рейтинговых партиях — и твоя фракция получает очки войны.
          Фракция, набравшая больше очков к концу недели, завоёвывает регион
          и расширяет своё господство на карте.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            { icon: "♟", step: "01", title: "Сыграй", desc: "Рейтинговую партию за свою фракцию" },
            { icon: "⚡", step: "02", title: "+5 очков", desc: "Каждая победа приносит очки войны" },
            { icon: "🏰", step: "03", title: "Завоюй", desc: "Регион переходит к победившей фракции" },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: "#111827",
                border: "1px solid rgba(201,168,76,0.1)",
                borderRadius: "8px",
                padding: "1.5rem 1rem",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{item.icon}</div>
              <p
                className="font-cinzel"
                style={{ fontSize: "0.55rem", letterSpacing: "0.2em", color: "rgba(201,168,76,0.6)", marginBottom: "0.4rem" }}
              >
                {item.step}
              </p>
              <p
                className="font-cinzel font-bold"
                style={{ fontSize: "0.85rem", letterSpacing: "0.08em", color: "#EDE8DA", marginBottom: "0.5rem" }}
              >
                {item.title}
              </p>
              <p style={{ fontSize: "0.78rem", color: "#686880", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ WAR OF THE WEEK ════════════════════════════════════ */}
      <section
        style={{
          borderTop: "1px solid rgba(201,168,76,0.1)",
          borderBottom: "1px solid rgba(201,168,76,0.1)",
          background: "rgba(17,24,39,0.6)",
          padding: "4rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="section-label">Актуальный конфликт</span>
            <h2 className="section-title" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)" }}>
              Война недели
            </h2>
          </div>

          {activeWar && warFactionA && warFactionB && warRegion ? (
            <WarWeekSection
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
              style={{
                maxWidth: "480px",
                margin: "0 auto",
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "3rem 2rem",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🕊️</p>
              <p
                className="font-cinzel font-bold"
                style={{ fontSize: "0.8rem", letterSpacing: "0.18em", color: "#B8B8C8", textTransform: "uppercase" }}
              >
                Мир на этой неделе
              </p>
              <p
                className="font-crimson"
                style={{ fontSize: "1rem", color: "#686880", fontStyle: "italic", marginTop: "0.75rem" }}
              >
                Новая война начнётся в воскресенье
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ WORLD MAP ══════════════════════════════════════════ */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="section-label">Живая карта</span>
            <h2 className="section-title" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)" }}>
              Карта мира
            </h2>
            <p
              className="font-crimson"
              style={{ fontSize: "0.95rem", color: "#686880", fontStyle: "italic", marginTop: "0.75rem" }}
            >
              Наведи на регион, чтобы узнать его статус
            </p>
          </div>

          <WorldMap
            regions={allRegions as Parameters<typeof WorldMap>[0]["regions"]}
            warRegionId={warRegionId}
          />
        </div>
      </section>

      {/* ═══ GREAT HOUSES ═══════════════════════════════════════ */}
      <section
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "5rem 1.5rem",
          background: "rgba(17,24,39,0.4)",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="section-label">Великие дома</span>
            <h2 className="section-title" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)" }}>
              Фракции
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {factions.map((f: any) => {
              const count = ownedCounts[f.id] ?? 0;
              const isUserFaction = f.id === userFactionId;
              const pct = allRegions.length > 0 ? Math.round((count / allRegions.length) * 100) : 0;
              return (
                <div
                  key={f.id}
                  style={{
                    background: "#111827",
                    border: `1px solid ${f.color}${isUserFaction ? "50" : "1a"}`,
                    borderRadius: "10px",
                    padding: "1.75rem 1.5rem",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: isUserFaction ? `0 0 24px ${f.color}15` : "none",
                  }}
                >
                  {/* Faction color accent strip */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0,
                      height: "3px",
                      background: f.color,
                      opacity: isUserFaction ? 1 : 0.45,
                    }}
                  />

                  {isUserFaction && (
                    <span
                      className="font-cinzel"
                      style={{
                        position: "absolute", top: "1rem", right: "1rem",
                        fontSize: "0.5rem", letterSpacing: "0.12em",
                        color: f.color,
                        backgroundColor: `${f.color}18`,
                        border: `1px solid ${f.color}35`,
                        borderRadius: "3px",
                        padding: "0.2rem 0.5rem",
                        textTransform: "uppercase",
                      }}
                    >
                      Твоя
                    </span>
                  )}

                  <h3
                    className="font-cinzel font-bold"
                    style={{ fontSize: "1rem", letterSpacing: "0.1em", color: f.color, marginBottom: "0.6rem" }}
                  >
                    {f.name}
                  </h3>

                  {f.lore_description && (
                    <p
                      className="font-crimson"
                      style={{
                        fontSize: "0.88rem", color: "#686880", fontStyle: "italic",
                        lineHeight: 1.6, marginBottom: "1.25rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {f.lore_description}
                    </p>
                  )}

                  {/* Territory bar */}
                  <div style={{ marginBottom: "0.4rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.65rem", color: "#686880" }}>Регионов</span>
                    <span
                      className="font-cinzel font-bold"
                      style={{ fontSize: "1.1rem", color: f.color }}
                    >
                      {count}
                    </span>
                  </div>
                  <div style={{ height: "3px", background: "#1C2333", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%", width: `${pct}%`,
                        background: f.color, borderRadius: "2px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <p style={{ fontSize: "0.62rem", color: "#686880", marginTop: "0.3rem" }}>
                    {pct}% карты
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ TERRITORIES ════════════════════════════════════════ */}
      <section style={{ padding: "5rem 1.5rem 6rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="section-label">Контроль</span>
            <h2 className="section-title" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)" }}>
              Все территории
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

            {/* At war */}
            {atWarRegions.length > 0 && (
              <TerritoryGroup
                icon="⚔"
                label="Война недели"
                color="#C9A84C"
                regions={atWarRegions}
              />
            )}

            {/* Contested */}
            {contestedRegions.length > 0 && (
              <TerritoryGroup
                icon="🔥"
                label="Спорные"
                color="#E05540"
                regions={contestedRegions}
              />
            )}

            {/* Controlled — group by faction */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {factions.map((f: any) => {
              const owned = controlledRegions.filter((r) => r.owner_faction_id === f.id);
              if (owned.length === 0) return null;
              return (
                <TerritoryGroup
                  key={f.id}
                  icon="🏰"
                  label={`Под контролем — ${f.name}`}
                  color={f.color}
                  regions={owned}
                />
              );
            })}

            {/* Neutral */}
            {neutralRegions.length > 0 && (
              <TerritoryGroup
                icon="🌫"
                label="Нейтральные"
                color="#686880"
                regions={neutralRegions}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Helper: territory group ─────────────────────────────────── */
function TerritoryGroup({
  icon, label, color, regions,
}: {
  icon: string;
  label: string;
  color: string;
  regions: Array<{ id: string; name: string; lore_description: string; faction_name: string | null; faction_color: string | null }>;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <h3
          className="font-cinzel font-bold"
          style={{ fontSize: "0.72rem", letterSpacing: "0.18em", color, textTransform: "uppercase" }}
        >
          {label}
        </h3>
        <span
          className="font-cinzel"
          style={{
            fontSize: "0.58rem", letterSpacing: "0.1em",
            color,
            backgroundColor: `${color}12`,
            border: `1px solid ${color}28`,
            borderRadius: "3px",
            padding: "0.15rem 0.5rem",
          }}
        >
          {regions.length}
        </span>
        <div style={{ flex: 1, height: "1px", background: `${color}20` }} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {regions.map((r) => (
          <div
            key={r.id}
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.05)",
              borderLeft: `3px solid ${r.faction_color ?? color}`,
              borderRadius: "6px",
              padding: "0.9rem 1rem",
            }}
          >
            <p style={{ fontSize: "0.85rem", color: "#EDE8DA", fontWeight: 600, marginBottom: "0.25rem" }}>
              {r.name}
            </p>
            {r.lore_description && (
              <p
                style={{
                  fontSize: "0.72rem", color: "#686880", lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.lore_description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
