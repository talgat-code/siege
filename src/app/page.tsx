export const dynamic = "force-dynamic";
import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ─── Static data ───────────────────────────────────────────── */

const FACTIONS = [
  {
    slug: "northern-horde",
    name: "Северная Орда",
    color: "#E05540",
    borderColor: "rgba(224,85,64,0.3)",
    glowColor: "rgba(224,85,64,0.25)",
    symbol: "⚔",
    tagline: "Агрессия · Давление · Огонь",
    lore: "Непобедимые воины севера. Их тактика — неустанная агрессия и давление. Они не защищают позиции — они их сжигают.",
    playstyle: "Агрессивный",
  },
  {
    slug: "iron-empire",
    name: "Железная Империя",
    color: "#4A7FA5",
    borderColor: "rgba(74,127,165,0.3)",
    glowColor: "rgba(74,127,165,0.25)",
    symbol: "⚙",
    tagline: "Дисциплина · Стратегия · Порядок",
    lore: "Древняя держава на железной дисциплине. Каждый ход — манёвр армий. Каждая пешка — солдат, павший за империю.",
    playstyle: "Стратегический",
  },
  {
    slug: "sea-republic",
    name: "Морская Республика",
    color: "#2A9D6E",
    borderColor: "rgba(42,157,110,0.3)",
    glowColor: "rgba(42,157,110,0.25)",
    symbol: "⚓",
    tagline: "Скорость · Гибкость · Ветер",
    lore: "Торговцы и стратеги видят доску как карту морских путей. Гибкие, быстрые, непредсказуемые — они везде и нигде.",
    playstyle: "Тактический",
  },
  {
    slug: "shadow-guild",
    name: "Гильдия Теней",
    color: "#7C4DAA",
    borderColor: "rgba(124,77,170,0.3)",
    glowColor: "rgba(124,77,170,0.25)",
    symbol: "◈",
    tagline: "Терпение · Засада · Тьма",
    lore: "Мастера позиционной игры. Они ждут ошибки врага, растворяясь во тьме. Терпение — их оружие, тень — их дом.",
    playstyle: "Позиционный",
  },
] as const;

const FEATURES = [
  {
    icon: "♟",
    title: "Классические шахматы",
    desc: "Без модификаций. Все правила ФИДЕ. Честный Elo рейтинг на каждом уровне.",
  },
  {
    icon: "🗺",
    title: "Живая карта войны",
    desc: "Регионы меняют владельца в реальном времени. Каждая победа сдвигает границы.",
  },
  {
    icon: "🤖",
    title: "AI-тренер",
    desc: "Stockfish анализирует каждую партию. Ошибки, моменты, рекомендации.",
  },
] as const;

const STEPS = [
  {
    num: "I",
    title: "Выбери фракцию",
    desc: "Четыре великих дома делят мир. Каждый — уникальный стиль и стратегия игры.",
  },
  {
    num: "II",
    title: "Сыграй партию",
    desc: "Каждая шахматная партия — настоящая битва за реальный регион на карте мира.",
  },
  {
    num: "III",
    title: "Захвати регион",
    desc: "Победы меняют живую карту. Помогите своей фракции захватить господство.",
  },
] as const;

/* ─── Page ──────────────────────────────────────────────────── */

export default async function HomePage() {
  let isLoggedIn = false;
  let totalPlayers = 0;
  let totalGames = 0;
  let capturedRegions = 0;

  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    isLoggedIn = !!user;

    const supabase = createAdminClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: pCount },
      { count: gCount },
      { count: rCount },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('games').select('*', { count: 'exact', head: true }).gte('played_at', weekAgo),
      supabase.from('regions').select('*', { count: 'exact', head: true }).not('owner_faction_id', 'is', null),
    ]);
    totalPlayers = pCount ?? 0;
    totalGames = gCount ?? 0;
    capturedRegions = rCount ?? 0;
  } catch {
    // DB not connected — show static layout
  }

  return (
    <div style={{ background: "#0B0F1A" }}>

      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section
        className="relative flex h-screen flex-col overflow-hidden"
        aria-label="Главная"
      >
        {/* Hero background — castle/war image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            opacity: 0.25,
          }}
        />

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(11,15,26,0.5) 0%, rgba(11,15,26,0.15) 30%, rgba(11,15,26,0.4) 65%, rgba(11,15,26,1) 100%)",
          }}
        />

        {/* Subtle gold vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 60%, rgba(201,168,76,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-20 md:pb-24">
          <div className="mx-auto max-w-3xl px-4 text-center">

            {/* Floating chess king */}
            <div
              className="mb-5 select-none"
              style={{
                fontSize: "3rem",
                color: "rgba(201,168,76,0.7)",
                animation: "floatPiece 4s ease-in-out infinite",
              }}
            >
              ♚
            </div>

            {/* SIEGE title */}
            <h1
              className="font-cinzel mb-4 select-none leading-none"
              style={{
                fontSize: "clamp(5rem, 17vw, 10.5rem)",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "#C9A84C",
                textShadow: "0 0 80px rgba(201,168,76,0.3), 0 0 160px rgba(201,168,76,0.1)",
                animation: "titleReveal 1.4s ease-out forwards",
              }}
            >
              SIEGE
            </h1>

            <p
              className="font-crimson mb-3"
              style={{
                fontSize: "1.35rem",
                fontStyle: "italic",
                color: "#EDE8DA",
                letterSpacing: "0.05em",
              }}
            >
              Шахматы. Война. Фракции.
            </p>

            <p
              className="font-crimson mx-auto mb-10 max-w-md leading-relaxed"
              style={{
                fontSize: "1rem",
                color: "#B8B8C8",
                letterSpacing: "0.02em",
              }}
            >
              Каждая партия — битва за регион. Каждая победа укрепляет
              твою фракцию. Карта мира меняется в реальном времени.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              {isLoggedIn ? (
                <>
                  <Link href="/play" className="siege-btn-primary">
                    ⚔&nbsp; В бой
                  </Link>
                  <Link href="/map" className="siege-btn-secondary">
                    🗺&nbsp; К карте
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="siege-btn-primary">
                    Вступить в SIEGE
                  </Link>
                  <Link href="/play" className="siege-btn-secondary">
                    Играть как гость
                  </Link>
                </>
              )}
            </div>

            {/* Secondary links */}
            <div className="flex items-center justify-center gap-8">
              <Link
                href="/map"
                className="font-cinzel text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 hover:text-[#C9A84C]"
                style={{ color: "rgba(201,168,76,0.45)" }}
              >
                Карта войны →
              </Link>
              {!isLoggedIn && (
                <Link
                  href="/login"
                  className="font-cinzel text-[11px] uppercase tracking-[0.14em] transition-colors duration-300 hover:text-[#EDE8DA]"
                  style={{ color: "rgba(237,232,218,0.35)" }}
                >
                  Войти
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          LIVE STATS
      ═══════════════════════════════════════════════════════ */}
      <section
        className="relative py-12 overflow-hidden"
        style={{
          background: "#111827",
          borderTop: "1px solid rgba(201,168,76,0.1)",
          borderBottom: "1px solid rgba(201,168,76,0.1)",
        }}
      >
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: totalPlayers || "—", label: "Воинов" },
              { value: totalGames || "—", label: "Партий на этой неделе" },
              { value: capturedRegions || "—", label: "Регионов захвачено" },
            ].map((stat) => (
              <div key={stat.label}>
                <p
                  className="font-cinzel font-bold"
                  style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#C9A84C" }}
                >
                  {stat.value}
                </p>
                <p
                  className="font-cinzel mt-1"
                  style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#686880", textTransform: "uppercase" }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FACTIONS
      ═══════════════════════════════════════════════════════ */}
      <section
        id="factions"
        aria-label="Фракции"
        className="relative px-4 py-28 overflow-hidden"
        style={{ background: "#0B0F1A" }}
      >
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-conic-gradient(rgba(201,168,76,1) 0% 25%, transparent 0% 50%)",
            backgroundSize: "40px 40px",
            opacity: 0.015,
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <span className="section-label">Великие Дома</span>
            <h2
              className="section-title"
              style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)" }}
            >
              Четыре Фракции
            </h2>
            <div className="lunar-rule mx-auto mt-5 w-28" />
            <p
              className="font-crimson mx-auto mt-6 max-w-lg leading-relaxed"
              style={{ fontSize: "1.05rem", color: "#B8B8C8", fontStyle: "italic" }}
            >
              Ваш выбор определяет стиль игры и союзников.
              Сражайтесь под знаменем своего дома.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FACTIONS.map((f) => (
              <div
                key={f.slug}
                className="faction-card"
                style={{
                  "--fc-glow-color": f.color,
                } as unknown as CSSProperties}
              >
                {/* Top color bar */}
                <div
                  style={{
                    height: "2px",
                    background: `linear-gradient(to right, ${f.color}, ${f.color}44, transparent)`,
                  }}
                />

                <div className="p-6">
                  <div
                    className="mb-5 text-5xl"
                    style={{ color: f.color, lineHeight: 1 }}
                  >
                    {f.symbol}
                  </div>

                  <h3
                    className="font-cinzel mb-1 font-bold"
                    style={{ fontSize: "0.95rem", letterSpacing: "0.08em", color: "#EDE8DA" }}
                  >
                    {f.name}
                  </h3>

                  <p
                    className="font-cinzel mb-4"
                    style={{
                      fontSize: "0.58rem",
                      letterSpacing: "0.12em",
                      color: f.color,
                      textTransform: "uppercase",
                      opacity: 0.9,
                    }}
                  >
                    {f.tagline}
                  </p>

                  <p
                    className="font-crimson mb-5 leading-relaxed"
                    style={{ fontSize: "0.92rem", color: "#B8B8C8", fontStyle: "italic" }}
                  >
                    {f.lore}
                  </p>

                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{ background: `linear-gradient(to right, ${f.color}50, transparent)` }}
                    />
                    <span
                      className="font-cinzel"
                      style={{
                        fontSize: "0.58rem",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: f.color,
                      }}
                    >
                      {f.playstyle}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            {isLoggedIn ? (
              <Link href="/profile" className="siege-btn-secondary">
                Мой дом
              </Link>
            ) : (
              <Link href="/register" className="siege-btn-secondary">
                Выбрать свой дом
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section
        aria-label="Как это работает"
        className="relative px-4 py-28"
        style={{ background: "#111827" }}
      >
        <div className="lunar-rule absolute left-0 right-0 top-0" />

        <div className="relative mx-auto max-w-2xl">
          <div className="mb-20 text-center">
            <span className="section-label">Путь воина</span>
            <h2
              className="section-title"
              style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)" }}
            >
              Три Шага
            </h2>
            <div className="lunar-rule mx-auto mt-5 w-28" />
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute"
              style={{
                left: "1.35rem",
                top: "2.75rem",
                bottom: "2.75rem",
                width: "1px",
                background: "linear-gradient(to bottom, transparent, rgba(201,168,76,0.2) 20%, rgba(201,168,76,0.2) 80%, transparent)",
              }}
            />

            <div className="flex flex-col gap-12">
              {STEPS.map((step) => (
                <div key={step.num} className="flex gap-8 items-start">
                  <div className="timeline-dot">{step.num}</div>
                  <div className="pt-1 flex-1">
                    <h3
                      className="font-cinzel mb-2 font-bold"
                      style={{ fontSize: "1rem", letterSpacing: "0.1em", color: "#EDE8DA" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="font-crimson leading-relaxed"
                      style={{ fontSize: "1rem", color: "#B8B8C8", fontStyle: "italic" }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lunar-rule absolute left-0 right-0 bottom-0" />
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════ */}
      <section
        aria-label="Возможности"
        className="relative px-4 py-28"
        style={{ background: "#0B0F1A" }}
      >
        <div className="lunar-rule absolute left-0 right-0 top-0" />

        <div className="relative mx-auto max-w-5xl">
          <div className="mb-20 text-center">
            <span className="section-label">Арсенал</span>
            <h2
              className="section-title"
              style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)" }}
            >
              Орудия Победы
            </h2>
            <div className="lunar-rule mx-auto mt-5 w-28" />
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="feature-card group">
                <div className="mb-5 text-4xl transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3
                  className="font-cinzel mb-3 font-bold"
                  style={{ fontSize: "0.82rem", letterSpacing: "0.1em", color: "#EDE8DA" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="font-crimson leading-relaxed"
                  style={{ fontSize: "0.95rem", color: "#B8B8C8", fontStyle: "italic" }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CALL TO ARMS (guests only)
      ═══════════════════════════════════════════════════════ */}
      {!isLoggedIn && (
        <section
          aria-label="Призыв"
          className="relative px-4 py-32"
          style={{ background: "#111827" }}
        >
          <div className="lunar-rule absolute left-0 right-0 top-0" />

          <div className="relative mx-auto max-w-xl text-center">
            <div
              className="mb-6 select-none font-cinzel"
              style={{
                fontSize: "3.5rem",
                color: "rgba(201,168,76,0.6)",
                animation: "floatPiece 5s ease-in-out infinite",
              }}
            >
              ♛
            </div>

            <h2
              className="font-cinzel mb-5"
              style={{
                fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#EDE8DA",
              }}
            >
              Готов к войне?
            </h2>

            <p
              className="font-crimson mb-12 leading-relaxed"
              style={{ fontSize: "1.1rem", fontStyle: "italic", color: "#B8B8C8" }}
            >
              Тысячи воинов уже сражаются под знаменем своих фракций.
              Выбери сторону. Вступи в битву. Измени карту мира.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                href="/register"
                className="siege-btn-primary"
                style={{ padding: "0.9rem 2.8rem" }}
              >
                Вступить бесплатно
              </Link>
              <Link href="/login" className="siege-btn-ghost">
                Уже есть аккаунт
              </Link>
            </div>
          </div>

          <div className="lunar-rule absolute left-0 right-0 bottom-0" />
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer
        className="px-4 py-12"
        style={{
          background: "#0B0F1A",
          borderTop: "1px solid rgba(201,168,76,0.08)",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span
                className="font-cinzel font-bold"
                style={{ fontSize: "1.3rem", letterSpacing: "0.22em", color: "#C9A84C" }}
              >
                SIEGE
              </span>
              <span
                className="font-crimson"
                style={{ fontSize: "0.85rem", fontStyle: "italic", color: "rgba(201,168,76,0.35)" }}
              >
                Шахматы · Война
              </span>
            </div>

            <nav className="flex flex-wrap justify-center gap-6">
              {[
                { href: "/play",      label: "Играть" },
                { href: "/map",       label: "Карта" },
                { href: "/#factions", label: "Фракции" },
                { href: "/shop",      label: "Магазин" },
                { href: "/register",  label: "Регистрация" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-cinzel transition-colors duration-300 hover:text-[#C9A84C]"
                  style={{
                    fontSize: "0.62rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(201,168,76,0.35)",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <p
              className="font-cinzel"
              style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: "rgba(201,168,76,0.2)" }}
            >
              © MMXXV SIEGE
            </p>
          </div>

          {/* Faction color strip */}
          <div className="mt-8 flex h-[1px] overflow-hidden rounded-full opacity-40">
            {FACTIONS.map((f) => (
              <div key={f.slug} className="flex-1" style={{ background: f.color }} />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
