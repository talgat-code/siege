import type { Metadata } from "next";
import { Inter, Cinzel, Crimson_Text } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin", "cyrillic"] });
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cinzel",
});
const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
});

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
  let goldCoins: number | null = null;

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      userEmail = user.email ?? null;
      const supabase = createAdminClient();

      const { data: profile } = await supabase
        .from('users')
        .select('username, faction_id, gold_coins')
        .eq('id', user.id)
        .limit(1)
        .maybeSingle();

      if (profile) {
        username = profile.username;
        goldCoins = profile.gold_coins ?? null;
        if (profile.faction_id) {
          const { data: faction } = await supabase
            .from('factions')
            .select('color')
            .eq('id', profile.faction_id)
            .limit(1)
            .maybeSingle();
          factionColor = faction?.color ?? null;
        }
      }
    }
  } catch {
    // DB not connected yet — show layout without user info
  }

  return (
    <html lang="ru">
      <body className={`${inter.className} ${cinzel.variable} ${crimsonText.variable} antialiased`}>
        <Navbar
          userEmail={userEmail}
          username={username}
          factionColor={factionColor}
          goldCoins={goldCoins}
        />
        <main>{children}</main>
      </body>
    </html>
  );
}
