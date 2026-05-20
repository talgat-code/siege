export const dynamic = "force-dynamic";
import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/* ─── Static data ───────────────────────────────────────────── */

const FACTIONS = [
  {
    slug: "northern-horde",
    name: "Северная Орда",
    color: "#e05540",
    borderColor: "rgba(224,85,64,0.4)",
    glowColor: "rgba(224,85,64,0.3)",
    shadowColor: "rgba(224,85,64,0.2)",
    symbol: "⚔",
    tagline: "Агрессия · Давление · Огонь",
    lore: "Непобедимые воины севера. Их тактика — неустанная агрессия и давление. Они не защищают позиции — они их сжигают.",
    playstyle: "Агрессивный",
  },
  {
    slug: "iron-empire",
    name: "Железная Империя",
    color: "#8ab4d4",
    borderColor: "rgba(139,180,212,0.4)",
    glowColor: "rgba(139,180,212,0.3)",
    shadowColor: "rgba(139,180,212,0.2)",
    symbol: "⚙",
    tagline: "Дисциплина · Стратегия · Порядок",
    lore: "Древняя держава на железной дисциплине. Каждый ход — манёвр армий. Каждая пешка — солдат, павший за империю.",
    playstyle: "Стратегический",
  },
  {
    slug: "sea-republic",
    name: "Морская Республика",
    color: "#3ecf8e",
    borderColor: "rgba(62,207,142,0.35)",
    glowColor: "rgba(62,207,142,0.28)",
    shadowColor: "rgba(62,207,142,0.18)",
    symbol: "⚓",
    tagline: "Скорость · Гибкость · Ветер",
    lore: "Торговцы и стратеги видят доску как карту морских путей. Гибкие, быстрые, непредсказуемые — они везде и нигде.",
    playstyle: "Тактический",
  },
  {
    slug: "shadow-guild",
    name: "Гильдия Теней",
    color: "#a569d4",
    borderColor: "rgba(165,105,212,0.4)",
    glowColor: "rgba(165,105,212,0.3)",
    shadowColor: "rgba(165,105,212,0.2)",
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
    desc: "Stockfish + Gemini анализируют каждую партию. Ошибки, моменты, рекомендации.",
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

const STARS: { top: string; left: string; size: number; delay: string; dur: string; slow?: boolean }[] = [
  { top: "3%",  left: "4%",  size: 1.5, delay: "0s",   dur: "3.2s" },
  { top: "7%",  left: "11%", size: 1,   delay: "1.4s", dur: "2.5s" },
  { top: "1%",  left: "22%", size: 2,   delay: "0.7s", dur: "3.8s" },
  { top: "9%",  left: "31%", size: 1,   delay: "2.1s", dur: "2.9s", slow: true },
  { top: "4%",  left: "42%", size: 1.5, delay: "0.3s", dur: "4.1s" },
  { top: "6%",  left: "53%", size: 1,   delay: "1.8s", dur: "3.1s" },
  { top: "2%",  left: "62%", size: 2,   delay: "0.9s", dur: "2.7s" },
  { top: "11%", left: "70%", size: 1,   delay: "1.1s", dur: "3.5s", slow: true },
  { top: "5%",  left: "78%", size: 1.5, delay: "2.4s", dur: "2.3s" },
  { top: "14%", left: "3%",  size: 1,   delay: "0.5s", dur: "4.2s" },
  { top: "16%", left: "17%", size: 2,   delay: "1.7s", dur: "3.0s" },
  { top: "12%", left: "29%", size: 1,   delay: "0.2s", dur: "2.6s" },
  { top: "19%", left: "38%", size: 1.5, delay: "2.8s", dur: "3.7s", slow: true },
  { top: "15%", left: "47%", size: 1,   delay: "1.3s", dur: "2.8s" },
  { top: "18%", left: "57%", size: 2,   delay: "0.6s", dur: "4.0s" },
  { top: "13%", left: "66%", size: 1,   delay: "2.0s", dur: "3.3s" },
  { top: "20%", left: "74%", size: 1.5, delay: "1.5s", dur: "2.4s" },
  { top: "22%", left: "82%", size: 1,   delay: "0.4s", dur: "3.6s", slow: true },
  { top: "8%",  left: "88%", size: 2,   delay: "1.9s", dur: "2.9s" },
  { top: "25%", left: "6%",  size: 1,   delay: "2.6s", dur: "3.9s" },
  { top: "24%", left: "19%", size: 1.5, delay: "0.8s", dur: "2.2s" },
  { top: "28%", left: "43%", size: 1,   delay: "1.6s", dur: "4.3s", slow: true },
  { top: "26%", left: "59%", size: 2,   delay: "2.3s", dur: "3.1s" },
  { top: "30%", left: "72%", size: 1,   delay: "0.1s", dur: "2.7s" },
  { top: "27%", left: "91%", size: 1.5, delay: "1.2s", dur: "3.4s" },
];

/* ─── Page ──────────────────────────────────────────────────── */

export default async function HomePage() {
  let isLoggedIn = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // DB not connected
  }

  return (
    <div style={{ background: "#0b1628" }}>

      {/* ═══════════════════════════════════════════════════════
          HERO — Epic fantasy world, king tower
      ═══════════════════════════════════════════════════════ */}
      <section
        className="relative flex h-screen flex-col overflow-hidden"
        aria-label="Главная"
      >
        {/* Hero background image — visible at high opacity */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            opacity: 0.55,
          }}
        />

        {/* Dark gradient overlay: dark top (navbar) → clear middle (show image) → dark bottom (text) */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(to bottom,",
              "  rgba(11,22,40,0.82) 0%,",
              "  rgba(11,22,40,0.35) 30%,",
              "  rgba(11,22,40,0.28) 55%,",
              "  rgba(11,22,40,0.82) 78%,",
              "  rgba(11,22,40,0.97) 100%",
              ")",
            ].join(" "),
          }}
        />

        {/* Faction color ambient glows (mirrors the image corners) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "radial-gradient(ellipse 40% 55% at 5% 75%, rgba(165,105,212,0.18) 0%, transparent 60%)",
              "radial-gradient(ellipse 40% 55% at 95% 75%, rgba(62,207,142,0.14) 0%, transparent 60%)",
              "radial-gradient(ellipse 70% 35% at 50% 0%, rgba(139,180,212,0.1) 0%, transparent 55%)",
            ].join(", "),
          }}
        />

        {/* Stars */}
        {STARS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: "#ede8da",
              animation: `${star.slow ? "twinkleSlow" : "twinkle"} ${star.dur} ${star.delay} ease-in-out infinite`,
              boxShadow: star.size >= 2 ? "0 0 4px rgba(237,232,218,0.7)" : "none",
            }}
          />
        ))}

        {/* Bottom fade into page */}
        <div
          className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #0b1628 15%, transparent 100%)",
          }}
        />

        {/* Content — centered vertically */}
        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-20 md:pb-24">
          <div className="mx-auto max-w-3xl px-4 text-center">

            {/* Floating chess king */}
            <div
              className="mb-5 select-none"
              style={{
                fontSize: "3rem",
                color: "rgba(201,168,76,0.75)",
                animation: "floatPiece 4s ease-in-out infinite",
                filter: "drop-shadow(0 0 14px rgba(201,168,76,0.5))",
              }}
            >
              ♚
            </div>

            {/* SIEGE title — gold shimmer */}
            <h1
              className="font-cinzel mb-4 select-none leading-none"
              style={{
                fontSize: "clamp(5rem, 17vw, 10.5rem)",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "#c9a84c",
                textShadow:
                  "0 0 30px rgba(201,168,76,0.7), 0 0 70px rgba(201,168,76,0.35), 0 0 120px rgba(201,168,76,0.15), 0 2px 8px rgba(0,0,0,0.8)",
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
                color: "rgba(237,232,218,0.85)",
                letterSpacing: "0.05em",
                textShadow: "0 1px 6px rgba(0,0,0,0.7)",
              }}
            >
              Шахматы. Война. Фракции.
            </p>

            <p
              className="font-crimson mx-auto mb-10 max-w-md leading-relaxed"
              style={{
                fontSize: "1rem",
                color: "rgba(141,168,196,0.9)",
                letterSpacing: "0.02em",
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              }}
            >
              Каждая партия — битва за регион. Каждая победа укрепляет
              твою фракцию. Карта мира меняется в реальном времени.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              {isLoggedIn ? (
                <>
                  <Link href="/play?mode=friend" className="siege-btn-secondary">
                    ⚔&nbsp; Играть с другом
                  </Link>
                  <Link href="/play?mode=ai" className="siege-btn-primary">
                    🤖&nbsp; Играть одному
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
                className="font-cinzel text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 hover:text-[#c9a84c]"
                style={{ color: "rgba(201,168,76,0.55)" }}
              >
                Карта войны →
              </Link>
              {!isLoggedIn && (
                <Link
                  href="/login"
                  className="font-cinzel text-[11px] uppercase tracking-[0.14em] transition-colors duration-300 hover:text-[#ede8da]"
                  style={{ color: "rgba(141,168,196,0.5)" }}
                >
                  Войти
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FACTIONS — War banners
      ═══════════════════════════════════════════════════════ */}
      <section
        id="factions"
        aria-label="Фракции"
        className="relative px-4 py-28 overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #0b1628, #0f1d32 50%, #0b1628)",
          borderTop: "1px solid rgba(201,168,76,0.12)",
        }}
      >
        {/* Subtle world map texture */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/hero-bg.jpg')", opacity: 0.04 }}
        />

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)",
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
              style={{ fontSize: "1.05rem", color: "#8da8c4", fontStyle: "italic" }}
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
                  "--fc-border": f.borderColor,
                  "--fc-glow-color": f.color,
                  "--fc-shadow": f.shadowColor,
                } as unknown as CSSProperties}
              >
                {/* Top color bar */}
                <div
                  style={{
                    height: "3px",
                    background: `linear-gradient(to right, ${f.color}, ${f.color}55, transparent)`,
                  }}
                />

                <div className="p-6">
                  <div
                    className="mb-5 text-5xl"
                    style={{
                      color: f.color,
                      filter: `drop-shadow(0 0 10px ${f.glowColor})`,
                      lineHeight: 1,
                    }}
                  >
                    {f.symbol}
                  </div>

                  <h3
                    className="font-cinzel mb-1 font-bold"
                    style={{
                      fontSize: "0.95rem",
                      letterSpacing: "0.08em",
                      color: "#ede8da",
                    }}
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
                    style={{
                      fontSize: "0.92rem",
                      color: "#8da8c4",
                      fontStyle: "italic",
                    }}
                  >
                    {f.lore}
                  </p>

                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{
                        background: `linear-gradient(to right, ${f.color}60, transparent)`,
                      }}
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
            <Link href="/register" className="siege-btn-secondary">
              Выбрать свой дом
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS — Vertical timeline
      ═══════════════════════════════════════════════════════ */}
      <section
        aria-label="Как это работает"
        className="relative px-4 py-28 overflow-hidden"
      >
        {/* Full-bleed background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')", opacity: 0.18 }}
        />

        {/* Overlay to keep readability */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(11,22,40,0.88) 0%, rgba(11,22,40,0.78) 50%, rgba(11,22,40,0.88) 100%)",
          }}
        />

        {/* Checkered pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-conic-gradient(rgba(201,168,76,1) 0% 25%, transparent 0% 50%)",
            backgroundSize: "32px 32px",
            opacity: 0.022,
          }}
        />

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
                background:
                  "linear-gradient(to bottom, transparent, rgba(201,168,76,0.4) 20%, rgba(201,168,76,0.4) 80%, transparent)",
              }}
            />

            <div className="flex flex-col gap-12">
              {STEPS.map((step) => (
                <div key={step.num} className="flex gap-8 items-start">
                  <div className="timeline-dot">{step.num}</div>
                  <div className="pt-1 flex-1">
                    <h3
                      className="font-cinzel mb-2 font-bold"
                      style={{
                        fontSize: "1rem",
                        letterSpacing: "0.1em",
                        color: "#ede8da",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="font-crimson leading-relaxed"
                      style={{
                        fontSize: "1rem",
                        color: "#8da8c4",
                        fontStyle: "italic",
                      }}
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
          FEATURES — Arsenal
      ═══════════════════════════════════════════════════════ */}
      <section
        aria-label="Возможности"
        className="relative px-4 py-28 overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #0b1628, #0f1d32 50%, #0b1628)",
        }}
      >
        {/* Subtle texture */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/hero-bg.jpg')", opacity: 0.035 }}
        />

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
                <div
                  className="mb-5 text-4xl transition-all duration-300 group-hover:scale-110"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(201,168,76,0.4))",
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  className="font-cinzel mb-3 font-bold"
                  style={{
                    fontSize: "0.82rem",
                    letterSpacing: "0.1em",
                    color: "#ede8da",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  className="font-crimson leading-relaxed"
                  style={{
                    fontSize: "0.95rem",
                    color: "#8da8c4",
                    fontStyle: "italic",
                  }}
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
          className="relative px-4 py-32 overflow-hidden"
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-bg.jpg')", opacity: 0.22 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(11,22,40,0.88) 0%, rgba(11,22,40,0.75) 50%, rgba(11,22,40,0.88) 100%)",
            }}
          />

          <div className="lunar-rule absolute left-0 right-0 top-0" />

          {/* Ambient gold glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(201,168,76,0.07) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-xl text-center">
            <div
              className="mb-6 select-none font-cinzel"
              style={{
                fontSize: "3.5rem",
                color: "rgba(201,168,76,0.65)",
                filter: "drop-shadow(0 0 20px rgba(201,168,76,0.5))",
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
                color: "#ede8da",
                textShadow: "0 0 35px rgba(201,168,76,0.45)",
              }}
            >
              Готов к войне?
            </h2>

            <p
              className="font-crimson mb-12 leading-relaxed"
              style={{
                fontSize: "1.1rem",
                fontStyle: "italic",
                color: "#8da8c4",
              }}
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
          background: "#070f1e",
          borderTop: "1px solid rgba(201,168,76,0.1)",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span
                className="font-cinzel font-bold"
                style={{
                  fontSize: "1.3rem",
                  letterSpacing: "0.22em",
                  color: "#c9a84c",
                  textShadow: "0 0 20px rgba(201,168,76,0.45)",
                }}
              >
                SIEGE
              </span>
              <span
                className="font-crimson"
                style={{
                  fontSize: "0.85rem",
                  fontStyle: "italic",
                  color: "rgba(141,168,196,0.4)",
                }}
              >
                Шахматы · Война
              </span>
            </div>

            <nav className="flex flex-wrap justify-center gap-6">
              {[
                { href: "/play",      label: "Играть" },
                { href: "/map",       label: "Карта" },
                { href: "/#factions", label: "Фракции" },
                { href: "/register",  label: "Регистрация" },
                { href: "/login",     label: "Войти" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-cinzel transition-colors duration-300 hover:text-[#c9a84c]"
                  style={{
                    fontSize: "0.62rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(141,168,196,0.42)",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <p
              className="font-cinzel"
              style={{
                fontSize: "0.58rem",
                letterSpacing: "0.1em",
                color: "rgba(141,168,196,0.25)",
              }}
            >
              © MMXXV SIEGE
            </p>
          </div>

          {/* Faction color strip */}
          <div className="mt-8 flex h-[2px] overflow-hidden rounded-full opacity-50">
            {FACTIONS.map((f) => (
              <div key={f.slug} className="flex-1" style={{ background: f.color }} />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
