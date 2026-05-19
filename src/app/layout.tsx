import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { db, users, factions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "SIEGE — Шахматы. Война. Фракции.",
  description:
    "Классические шахматы с метаигрой: фракционные войны за территории на живой мировой карте.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;
  let username: string | null = null;
  let factionColor: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email ?? null;
      const [profile] = await db
        .select({ username: users.username, faction_id: users.faction_id })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (profile) {
        username = profile.username;
        if (profile.faction_id) {
          const [faction] = await db
            .select({ color: factions.color })
            .from(factions)
            .where(eq(factions.id, profile.faction_id))
            .limit(1);
          factionColor = faction?.color ?? null;
        }
      }
    }
  } catch {
    // DB not connected yet — show layout without user info
  }

  return (
    <html lang="ru" className="dark">
      <body className={`${inter.className} antialiased`}>
        <Navbar
          userEmail={userEmail}
          username={username}
          factionColor={factionColor}
        />
        <main>{children}</main>
      </body>
    </html>
  );
}
