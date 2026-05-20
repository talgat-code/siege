"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  userEmail?: string | null;
  username?: string | null;
  factionColor?: string | null;
}

export function Navbar({ userEmail, username, factionColor }: NavbarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  const close = () => setMobileOpen(false);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: "rgba(11, 22, 40, 0.82)",
        borderBottom: "1px solid rgba(201, 168, 76, 0.12)",
      }}
    >
      {/* Lunar top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(201,168,76,0.35), transparent)",
        }}
      />

      {/* ── Main bar ─────────────────────────────────────────── */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="font-cinzel font-bold transition-all duration-300"
            style={{
              fontSize: "1.25rem",
              letterSpacing: "0.22em",
              color: "#c9a84c",
              textShadow: "0 0 20px rgba(201,168,76,0.45)",
            }}
          >
            SIEGE
          </span>
          {factionColor && (
            <span
              className="h-1.5 w-1.5 rounded-full transition-all duration-300 group-hover:scale-125"
              style={{
                backgroundColor: factionColor,
                boxShadow: `0 0 6px ${factionColor}90`,
              }}
            />
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/play" className="nav-link">Играть</Link>
          <Link href="/map" className="nav-link">Карта</Link>
          <Link href="/#factions" className="nav-link">Фракции</Link>
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {userEmail ? (
            <>
              <Link
                href="/profile"
                className="font-cinzel transition-colors duration-300 hover:text-[#ede8da]"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#8da8c4",
                }}
              >
                {username ?? userEmail}
              </Link>
              <button
                onClick={handleLogout}
                className="siege-btn-ghost"
                style={{ padding: "0.35rem 1rem", fontSize: "0.65rem" }}
              >
                Выйти
              </button>
            </>
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
            background: mobileOpen ? "rgba(201,168,76,0.08)" : "transparent",
            border: "1px solid rgba(201,168,76,0.22)",
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
                background: "#c9a84c",
                transform: transform ?? undefined,
                opacity: i === 1 ? (mobileOpen ? 0 : 1) : 1,
              }}
            />
          ))}
        </button>
      </div>

      {/* ── Mobile menu ──────────────────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out md:hidden"
        style={{
          maxHeight: mobileOpen ? "420px" : "0",
          borderTop: mobileOpen ? "1px solid rgba(201,168,76,0.1)" : "1px solid transparent",
        }}
      >
        <div
          className="flex flex-col gap-1 px-4 pb-5 pt-3"
          style={{ background: "rgba(11,22,40,0.98)" }}
        >
          <Link href="/play"      className="nav-link block rounded px-3 py-2.5" onClick={close}>♟ Играть</Link>
          <Link href="/map"       className="nav-link block rounded px-3 py-2.5" onClick={close}>🗺 Карта</Link>
          <Link href="/#factions" className="nav-link block rounded px-3 py-2.5" onClick={close}>⚔ Фракции</Link>

          <div
            className="my-2"
            style={{ height: "1px", background: "rgba(201,168,76,0.1)" }}
          />

          {userEmail ? (
            <>
              <Link
                href="/profile"
                className="block px-3 py-2 font-cinzel transition-colors duration-300 hover:text-[#ede8da]"
                style={{ fontSize: "0.68rem", letterSpacing: "0.1em", color: "#8da8c4" }}
                onClick={close}
              >
                ◈ {username ?? userEmail}
              </Link>
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
