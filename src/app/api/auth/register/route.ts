import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, users, factions } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email, password, username, faction_slug } = await request.json();

    if (!email || !password || !username || !faction_slug) {
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Никнейм должен быть от 3 до 20 символов" },
        { status: 400 }
      );
    }

    // Find faction
    const [faction] = await db
      .select()
      .from(factions)
      .where(eq(factions.slug, faction_slug))
      .limit(1);

    if (!faction) {
      return NextResponse.json({ error: "Фракция не найдена" }, { status: 400 });
    }

    // Create Supabase auth user
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Ошибка создания аккаунта" }, { status: 500 });
    }

    // Create user profile in our DB
    await db.insert(users).values({
      id: authData.user.id,
      email,
      username,
      faction_id: faction.id,
      rating: 1200,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
