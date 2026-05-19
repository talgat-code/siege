export const dynamic = "force-dynamic";
import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/* ─── Static data ───────────────────────────────────────────── */

const FACTIONS = [
  {
    slug: "northern-horde",
    name: "Северная Орда",
    color: "#c0392b",
    borderColor: "rgba(192,57,43,0.35)",
    glowColor: "rgba(192,57,43,0.25)",
    shadowColor: "rgba(192,57,43,0.18)",
    symbol: "⚔",
    tagline: "Агрессия · Давление · Огонь",
    lore: "Непобедимые воины севера. Их тактика — неустанная агрессия и давление. Они не защищают позиции — они их сжигают.",
    playstyle: "Агрессивный",
  },
  {
    slug: "iron-empire",
    name: "Железная Империя",
    color: "#8ab4d4",
    borderColor: "rgba(139,180,212,0.35)",
    glowColor: "rgba(139,180,212,0.25)",
    shadowColor: "rgba(139,180,212,0.18)",
    symbol: "⚙",
    tagline: "Дисциплина · Стратегия · Порядок",
    lore: "Древняя держава на железной дисциплине. Каждый ход — манёвр армий. Каждая пешка — солдат, павший за империю.",
    playstyle: "Стратегический",
  },
  {
    slug: "sea-republic",
    name: "Морская Республика",
    color: "#2ecc71",
    borderColor: "rgba(46,204,113,0.3)",
    glowColor: "rgba(46,204,113,0.22)",
    shadowColor: "rgba(46,204,113,0.15)",
    symbol: "⚓",
    tagline: "Скорость · Гибкость · Ветер",
    lore: "Торговцы и стратеги видят доску как карту морских путей. Гибкие, быстрые, непредсказуемые — они везде и нигде.",
    playstyle: "Тактический",
  },
  {
    slug: "shadow-guild",
    name: "Гильдия Теней",
    color: "#9b59b6",
    borderColor: "rgba(155,89,182,0.35)",
    glowColor: "rgba(155,89,182,0.25)",
    shadowColor: "rgba(155,89,182,0.18)",
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

/* Hardcoded star positions for server-side rendering */
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
    <div style={{ background: "#080c14" }}>

      {/* ═══════════════════════════════════════════════════════
          HERO — Night sky, moon, ruins
      ═══════════════════════════════════════════════════════ */}
      <section
        className="relative flex h-screen flex-col overflow-hidden"
        aria-label="Главная"
        style={{ background: "linear-gradient(180deg, #080c14 0%, #0d1829 50%, #080c14 100%)" }}
      >
        {/* ── Subtle hero background image (dark overlay) ──── */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            opacity: 0.08,
          }}
        />

        {/* ── Night sky gradient ─────────────────────────────── */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 80% 60% at 75% 15%, rgba(139,180,212,0.08) 0%, transparent 55%)",
              "radial-gradient(ellipse 60% 40% at 20% 80%, rgba(45,90,61,0.12) 0%, transparent 50%)",
              "radial-gradient(ellipse 50% 35% at 50% 50%, rgba(13,24,41,0.6) 0%, transparent 80%)",
            ].join(", "),
          }}
        />

        {/* ── Stars ─────────────────────────────────────────── */}
        {STARS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: "#e8f0f8",
              animation: `${star.slow ? "twinkleSlow" : "twinkle"} ${star.dur} ${star.delay} ease-in-out infinite`,
              boxShadow: star.size >= 2 ? "0 0 3px rgba(232,240,248,0.6)" : "none",
            }}
          />
        ))}

        {/* ── Moon ──────────────────────────────────────────── */}
        <div
          className="absolute"
          style={{
            top: "48px",
            right: "13%",
            width: "110px",
            height: "110px",
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 35%, #ffffff 0%, #e8f0f8 28%, #b8d4e8 55%, rgba(139,180,212,0.4) 72%, transparent 85%)",
            animation: "moonGlow 6s ease-in-out infinite",
          }}
        />

        {/* Moonlight halo (larger, blurry) */}
        <div
          className="absolute"
          style={{
            top: "20px",
            right: "calc(13% - 40px)",
            width: "190px",
            height: "190px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,180,212,0.08) 0%, transparent 70%)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        {/* ── Fog layer at bottom ────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "200px",
            background: "linear-gradient(to top, #080c14 0%, rgba(8,12,20,0.85) 40%, transparent 100%)",
            animation: "fogDrift 12s ease-in-out infinite",
          }}
        />

        {/* ── Bottom fade ──────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #080c14 30%, transparent 100%)",
          }}
        />

        {/* ── Content ───────────────────────────────────────── */}
        <div className="relative z-10 mt-auto pb-16 md:pb-20">
          <div className="mx-auto max-w-3xl px-4 text-center">

            {/* Chess piece floating */}
            <div
              className="mb-5 select-none"
              style={{
                fontSize: "3rem",
                color: "rgba(139,180,212,0.6)",
                animation: "floatPiece 4s ease-in-out infinite",
                filter: "drop-shadow(0 0 10px rgba(139,180,212,0.4))",
              }}
            >
              ♚
            </div>

            {/* SIEGE — Cinzel, cold white, lunar glow */}
            <h1
              className="font-cinzel mb-4 select-none leading-none"
              style={{
                fontSize: "clamp(5rem, 17vw, 10.5rem)",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#e8f0f8",
                textShadow:
                  "0 0 40px rgba(139,174,212,0.6), 0 0 80px rgba(139,174,212,0.25), 0 0 120px rgba(139,174,212,0.1)",
                animation: "titleReveal 1.4s ease-out forwards",
              }}
            >
              SIEGE
            </h1>

            {/* Subtitle — Crimson Text italic */}
            <p
              className="font-crimson mb-3"
              style={{
                fontSize: "1.35rem",
                fontStyle: "italic",
                color: "rgba(184,212,232,0.8)",
                letterSpacing: "0.05em",
              }}
            >
              Шахматы. Война. Фракции.
            </p>

            {/* Description */}
            <p
              className="font-crimson mx-auto mb-10 max-w-md leading-relaxed"
              style={{
                fontSize: "1rem",
                color: "rgba(122,154,184,0.85)",
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
                  <Link href="/play?mode=friend" className="siege-btn-secondary">
                    ⚔&nbsp; Играть с другом
                  </Link>
                  <Link href="/play?mode=ai" className="siege-btn-primary">
                    🤖&nbsp; Играть одному
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="siege-btn-secondary">
                    Вступить в SIEGE
                  </Link>
                  <Link href="/play" className="siege-btn-primary">
                    Играть как гость
                  </Link>
                </>
              )}
            </div>

            {/* Secondary links */}
            <div className="flex items-center justify-center gap-8">
              <Link
                href="/map"
                className="font-cinzel text-[11px] uppercase tracking-[0.2em] transition-colors duration-300"
                style={{ color: "rgba(139,180,212,0.5)" }}
              >
                Карта войны →
              </Link>
              {!isLoggedIn && (
                <Link
                  href="/login"
                  className="font-cinzel text-[11px] uppercase tracking-[0.14em] transition-colors duration-300"
                  style={{ color: "rgba(122,154,184,0.4)" }}
                >
                  Войти
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FACTIONS — War banners in the dark
      ═══════════════════════════════════════════════════════ */}
      <section
        id="factions"
        aria-label="Фракции"
        className="px-4 py-28"
        style={{
          background: "linear-gradient(to bottom, #080c14, #0a0e1a 50%, #080c14)",
          borderTop: "1px solid rgba(139,174,212,0.08)",
        }}
      >
        <div className="mx-auto max-w-6xl">
          {/* Header */}
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
              style={{ fontSize: "1.05rem", color: "#7a9ab8", fontStyle: "italic" }}
            >
              Ваш выбор определяет стиль игры и союзников.
              Сражайтесь под знаменем своего дома.
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    height: "2px",
                    background: `linear-gradient(to right, ${f.color}, ${f.color}50, transparent)`,
                  }}
                />

                <div className="p-6">
                  {/* Symbol */}
                  <div
                    className="mb-5 text-5xl"
                    style={{
                      color: f.color,
                      filter: `drop-shadow(0 0 8px ${f.glowColor})`,
                      lineHeight: 1,
                    }}
                  >
                    {f.symbol}
                  </div>

                  {/* Name */}
                  <h3
                    className="font-cinzel mb-1 font-bold"
                    style={{
                      fontSize: "0.95rem",
                      letterSpacing: "0.08em",
                      color: "#e8f0f8",
                    }}
                  >
                    {f.name}
                  </h3>

                  {/* Tagline */}
                  <p
                    className="font-cinzel mb-4"
                    style={{
                      fontSize: "0.58rem",
                      letterSpacing: "0.12em",
                      color: f.color,
                      textTransform: "uppercase",
                      opacity: 0.85,
                    }}
                  >
                    {f.tagline}
                  </p>

                  {/* Lore */}
                  <p
                    className="font-crimson mb-5 leading-relaxed"
                    style={{
                      fontSize: "0.92rem",
                      color: "rgba(122,154,184,0.8)",
                      fontStyle: "italic",
                    }}
                  >
                    {f.lore}
                  </p>

                  {/* Playstyle badge */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{
                        background: `linear-gradient(to right, ${f.color}50, transparent)`,
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
        style={{ background: "#0a0e1a" }}
      >
        <div className="lunar-rule absolute left-0 right-0 top-0" />

        {/* Subtle checkered background pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-conic-gradient(rgba(139,180,212,1) 0% 25%, transparent 0% 50%)",
            backgroundSize: "32px 32px",
            opacity: 0.018,
          }}
        />

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

          {/* Timeline */}
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
                  "linear-gradient(to bottom, transparent, rgba(139,180,212,0.35) 20%, rgba(139,180,212,0.35) 80%, transparent)",
              }}
            />

            {/* Steps */}
            <div className="flex flex-col gap-12">
              {STEPS.map((step) => (
                <div key={step.num} className="flex gap-8 items-start">
                  {/* Dot */}
                  <div className="timeline-dot">{step.num}</div>

                  {/* Content */}
                  <div className="pt-1 flex-1">
                    <h3
                      className="font-cinzel mb-2 font-bold"
                      style={{
                        fontSize: "1rem",
                        letterSpacing: "0.1em",
                        color: "#e8f0f8",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="font-crimson leading-relaxed"
                      style={{
                        fontSize: "1rem",
                        color: "#7a9ab8",
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
          FEATURES — Arsenal of the night
      ═══════════════════════════════════════════════════════ */}
      <section
        aria-label="Возможности"
        className="px-4 py-28"
        style={{
          background: "linear-gradient(to bottom, #080c14, #0a0e1a 50%, #080c14)",
        }}
      >
        <div className="mx-auto max-w-5xl">
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
                    filter: "drop-shadow(0 0 8px rgba(139,180,212,0.3))",
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  className="font-cinzel mb-3 font-bold"
                  style={{
                    fontSize: "0.82rem",
                    letterSpacing: "0.1em",
                    color: "#e8f0f8",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  className="font-crimson leading-relaxed"
                  style={{
                    fontSize: "0.95rem",
                    color: "#7a9ab8",
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
          style={{ background: "#0a0e1a" }}
        >
          <div className="lunar-rule absolute left-0 right-0 top-0" />

          {/* Moon glow background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(139,180,212,0.06) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-xl text-center">
            <div
              className="mb-6 select-none font-cinzel"
              style={{
                fontSize: "3.5rem",
                color: "rgba(139,180,212,0.5)",
                filter: "drop-shadow(0 0 16px rgba(139,180,212,0.4))",
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
                color: "#e8f0f8",
                textShadow: "0 0 30px rgba(139,174,212,0.4)",
              }}
            >
              Готов к войне?
            </h2>

            <p
              className="font-crimson mb-12 leading-relaxed"
              style={{
                fontSize: "1.1rem",
                fontStyle: "italic",
                color: "#7a9ab8",
              }}
            >
              Тысячи воинов уже сражаются под знаменем своих фракций.
              Выбери сторону. Вступи в битву. Измени карту мира.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                href="/register"
                className="siege-btn-secondary"
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
          background: "#060910",
          borderTop: "1px solid rgba(139,174,212,0.07)",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span
                className="font-cinzel font-bold"
                style={{
                  fontSize: "1.3rem",
                  letterSpacing: "0.22em",
                  color: "#e8f0f8",
                  textShadow: "0 0 20px rgba(139,174,212,0.4)",
                }}
              >
                SIEGE
              </span>
              <span
                className="font-crimson"
                style={{
                  fontSize: "0.85rem",
                  fontStyle: "italic",
                  color: "rgba(122,154,184,0.35)",
                }}
              >
                Шахматы · Война
              </span>
            </div>

            {/* Nav */}
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
                  className="font-cinzel transition-colors duration-300 hover:text-[#e8f0f8]"
                  style={{
                    fontSize: "0.62rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(122,154,184,0.38)",
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
                color: "rgba(122,154,184,0.22)",
              }}
            >
              © MMXXV SIEGE
            </p>
          </div>

          {/* Faction color strip */}
          <div className="mt-8 flex h-px overflow-hidden rounded-full opacity-40">
            {FACTIONS.map((f) => (
              <div key={f.slug} className="flex-1" style={{ background: f.color }} />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
