"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  userEmail?: string | null;
  username?: string | null;
  factionColor?: string | null;
}

export function Navbar({ userEmail, username, factionColor }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-wider text-primary">SIEGE</span>
          {factionColor && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: factionColor }}
            />
          )}
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/play"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Играть
          </Link>
          <Link
            href="/map"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Карта
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{username ?? userEmail}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Выйти
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Войти</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Регистрация</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
