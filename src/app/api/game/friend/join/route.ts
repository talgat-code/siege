export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { inviteCode } = body as { inviteCode: string };
  if (!inviteCode) return NextResponse.json({ error: "inviteCode required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('id, white_player_id, black_player_id')
    .eq('invite_code', inviteCode.toUpperCase())
    .limit(1)
    .maybeSingle();

  if (!game) return NextResponse.json({ error: "Комната не найдена" }, { status: 404 });

  // If already both different players — maybe rejoining
  if (game.white_player_id !== game.black_player_id) {
    if (game.white_player_id === user.id || game.black_player_id === user.id) {
      return NextResponse.json({ gameId: game.id });
    }
    return NextResponse.json({ error: "Комната уже занята" }, { status: 409 });
  }

  // Host created game with same user in both slots — guest takes the other slot
  if (game.white_player_id === user.id) {
    return NextResponse.json({ error: "Это твоя собственная комната" }, { status: 400 });
  }

  // Guest joins as black (host was white by default, or we flip)
  await supabase
    .from('games')
    .update({ black_player_id: user.id })
    .eq('id', game.id);

  return NextResponse.json({ gameId: game.id });
}
