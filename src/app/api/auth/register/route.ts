export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const supabase = createAdminClient();

    // Find faction
    const { data: faction } = await supabase
      .from('factions')
      .select('*')
      .eq('slug', faction_slug)
      .limit(1)
      .maybeSingle();

    if (!faction) {
      return NextResponse.json({ error: "Фракция не найдена" }, { status: 400 });
    }

    // Create Supabase auth user via admin API (auto-confirms email, no rate-limit on resend)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already registered") || authError.message.includes("already been registered")) {
        return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 400 });
      }
      return NextResponse.json({ error: "Ошибка создания аккаунта" }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Ошибка создания аккаунта" }, { status: 500 });
    }

    // Create user profile in our DB
    const { error: insertError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      username,
      faction_id: faction.id,
      rating: 1200,
    });

    if (insertError) {
      // Roll back: delete the auth user so the email can be re-used
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error("Profile insert error:", insertError);
      return NextResponse.json({ error: "Ошибка создания профиля" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
