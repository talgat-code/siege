"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  userEmail?: string | null;
  username?: string | null;
  factionColor?: string | null;
  goldCoins?: number | null;
}

export function Navbar({ userEmail, username, factionColor, goldCoins }: NavbarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [playOpen, setPlayOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    setUserOpen(false);
    router.push("/login");
    router.refresh();
  }

  const close = () => setMobileOpen(false);
  const fc = factionColor ?? "#C9A84C";

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: "rgba(11,15,26,0.92)",
        borderBottom: "1px solid rgba(201,168,76,0.1)",
      }}
    >
      {/* ── Main bar ─────────────────────────────────────────── */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="font-cinzel font-bold transition-all duration-300"
            style={{ fontSize: "1.25rem", letterSpacing: "0.22em", color: "#C9A84C" }}
          >
            SIEGE
          </span>
          {factionColor && (
            <span
              className="h-1.5 w-1.5 rounded-full transition-all duration-300 group-hover:scale-125"
              style={{ backgroundColor: factionColor }}
            />
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">

          {/* Играть — hover dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setPlayOpen(true)}
            onMouseLeave={() => setPlayOpen(false)}
          >
            <button
              className="nav-link flex items-center gap-1.5"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              Играть
              <svg
                width="9" height="5" viewBox="0 0 9 5" fill="none"
                style={{ marginTop: 1, opacity: 0.55, transition: "transform 0.2s", transform: playOpen ? "rotate(180deg)" : "none" }}
              >
                <path d="M1 1L4.5 4.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>

            <div
              className="absolute left-0 top-full overflow-hidden rounded-lg"
              style={{
                marginTop: "6px",
                background: "rgba(11,15,26,0.98)",
                border: "1px solid rgba(201,168,76,0.18)",
                minWidth: "168px",
                boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
                opacity: playOpen ? 1 : 0,
                pointerEvents: playOpen ? "auto" : "none",
                transform: playOpen ? "translateY(0)" : "translateY(-6px)",
                transition: "opacity 0.18s ease, transform 0.18s ease",
              }}
            >
              <Link
                href="/play/bot"
                className="flex items-center gap-2.5 px-4 py-3 transition-colors"
                style={{
                  fontSize: "0.7rem", letterSpacing: "0.08em",
                  color: "#B8B8C8", fontFamily: "var(--font-cinzel)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
                onClick={() => setPlayOpen(false)}
              >
                <span>🤖</span> С ИИ
              </Link>
              <div style={{ height: "1px", background: "rgba(201,168,76,0.08)" }} />
              <Link
                href="/play/friend"
                className="flex items-center gap-2.5 px-4 py-3 transition-colors"
                style={{
                  fontSize: "0.7rem", letterSpacing: "0.08em",
                  color: "#B8B8C8", fontFamily: "var(--font-cinzel)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
                onClick={() => setPlayOpen(false)}
              >
                <span>👥</span> С другом
              </Link>
            </div>
          </div>

          <Link href="/war"  className="nav-link">Война</Link>
          <Link href="/shop" className="nav-link">Магазин</Link>
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {userEmail ? (
            /* Avatar + dropdown */
            <div
              className="relative"
              onMouseEnter={() => setUserOpen(true)}
              onMouseLeave={() => setUserOpen(false)}
            >
              <button
                className="flex items-center gap-2"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                {/* Avatar circle */}
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full font-cinzel font-bold"
                  style={{
                    fontSize: "0.85rem",
                    backgroundColor: `${fc}1a`,
                    color: fc,
                    border: `1px solid ${fc}40`,
                  }}
                >
                  {(username ?? userEmail ?? "?")[0].toUpperCase()}
                </div>

                {/* Gold badge */}
                {goldCoins != null && goldCoins > 0 && (
                  <span
                    className="font-cinzel rounded px-1.5 py-0.5"
                    style={{
                      fontSize: "0.58rem", letterSpacing: "0.1em",
                      color: "#C9A84C",
                      backgroundColor: "rgba(201,168,76,0.1)",
                      border: "1px solid rgba(201,168,76,0.25)",
                    }}
                  >
                    {goldCoins} ◈
                  </span>
                )}
              </button>

              {/* User dropdown */}
              <div
                className="absolute right-0 top-full overflow-hidden rounded-lg"
                style={{
                  marginTop: "6px",
                  background: "rgba(11,15,26,0.98)",
                  border: "1px solid rgba(201,168,76,0.18)",
                  minWidth: "188px",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
                  opacity: userOpen ? 1 : 0,
                  pointerEvents: userOpen ? "auto" : "none",
                  transform: userOpen ? "translateY(0)" : "translateY(-6px)",
                  transition: "opacity 0.18s ease, transform 0.18s ease",
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="font-cinzel" style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: "#EDE8DA" }}>
                    {username ?? userEmail}
                  </p>
                  {factionColor && (
                    <div className="mt-1.5 h-0.5 w-7 rounded-full" style={{ backgroundColor: factionColor }} />
                  )}
                </div>

                {/* Links */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{
                    fontSize: "0.7rem", letterSpacing: "0.08em",
                    color: "#B8B8C8", fontFamily: "var(--font-cinzel)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                  onClick={() => setUserOpen(false)}
                >
                  ◈ Профиль
                </Link>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5"
                  style={{
                    fontSize: "0.7rem", letterSpacing: "0.08em",
                    color: "#686880", fontFamily: "var(--font-cinzel)",
                    background: "none", border: "none", cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="siege-btn-ghost"
                style={{ padding: "0.35rem 1.1rem", fontSize: "0.65rem" }}
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="siege-btn-primary"
                style={{ padding: "0.4rem 1.2rem", fontSize: "0.65rem" }}
              >
                Регистрация
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
          style={{
            background: "transparent",
            border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: "2px",
          }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Закрыть" : "Меню"}
          aria-expanded={mobileOpen}
        >
          {[
            mobileOpen ? "rotate(45deg) translate(2.5px, 5px)" : "none",
            undefined,
            mobileOpen ? "rotate(-45deg) translate(2.5px, -5px)" : "none",
          ].map((transform, i) => (
            <span
              key={i}
              className="block h-px w-5 rounded-full transition-all duration-300"
              style={{
                background: "#C9A84C",
                transform: transform ?? undefined,
                opacity: i === 1 ? (mobileOpen ? 0 : 1) : 1,
              }}
            />
          ))}
        </button>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out md:hidden"
        style={{
          maxHeight: mobileOpen ? "520px" : "0",
          borderTop: mobileOpen ? "1px solid rgba(201,168,76,0.08)" : "1px solid transparent",
        }}
      >
        <div
          className="flex flex-col gap-1 px-4 pb-5 pt-3"
          style={{ background: "rgba(11,15,26,0.98)" }}
        >
          <Link href="/play/bot"    className="nav-link block rounded px-3 py-2.5" onClick={close}>🤖 С ИИ</Link>
          <Link href="/play/friend" className="nav-link block rounded px-3 py-2.5" onClick={close}>👥 С другом</Link>
          <Link href="/war"         className="nav-link block rounded px-3 py-2.5" onClick={close}>⚔ Война</Link>
          <Link href="/shop"        className="nav-link block rounded px-3 py-2.5" onClick={close}>🏪 Магазин</Link>

          <div className="my-2" style={{ height: "1px", background: "rgba(201,168,76,0.08)" }} />

          {userEmail ? (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <Link
                  href="/profile"
                  className="font-cinzel transition-colors duration-300 hover:text-[#EDE8DA]"
                  style={{ fontSize: "0.68rem", letterSpacing: "0.1em", color: "#B8B8C8" }}
                  onClick={close}
                >
                  ◈ {username ?? userEmail}
                </Link>
                {goldCoins != null && goldCoins > 0 && (
                  <span
                    className="font-cinzel rounded px-1.5 py-0.5"
                    style={{
                      fontSize: "0.58rem", letterSpacing: "0.1em",
                      color: "#C9A84C",
                      backgroundColor: "rgba(201,168,76,0.1)",
                      border: "1px solid rgba(201,168,76,0.25)",
                    }}
                  >
                    {goldCoins} ◈
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="siege-btn-ghost mt-1 w-full justify-start"
                style={{ padding: "0.55rem 0.75rem" }}
              >
                Выйти
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3 pb-1 pt-1">
              <Link href="/login"    className="siege-btn-ghost w-full justify-center"   onClick={close}>Войти</Link>
              <Link href="/register" className="siege-btn-primary w-full justify-center" onClick={close}>Регистрация</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
