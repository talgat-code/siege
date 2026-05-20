export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { time_control = "rapid", color = "white" } = body as {
    time_control?: "blitz" | "rapid" | "classical";
    color?: "white" | "black" | "random";
  };

  const resolvedColor = color === "random"
    ? (Math.random() > 0.5 ? "white" : "black")
    : color;

  const inviteCode = generateInviteCode();

  // Create game with host in both slots (second slot is "self" as placeholder)
  // When guest joins, they overwrite the host's duplicated slot
  const { data: gameList } = await supabase.from('games').insert({
    white_player_id: user.id,
    black_player_id: user.id,  // placeholder — guest overwrites this
    mode: "training",
    time_control,
    invite_code: inviteCode,
  }).select('id');

  const game = gameList?.[0];
  if (!game) return NextResponse.json({ error: "Failed to create game" }, { status: 500 });

  return NextResponse.json({
    gameId: game.id,
    inviteCode,
    hostColor: resolvedColor,
  });
}

// GET: poll for guest joined
export async function GET(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('id, white_player_id, black_player_id')
    .eq('id', gameId)
    .limit(1)
    .maybeSingle();

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const guestJoined = game.white_player_id !== game.black_player_id;
  return NextResponse.json({ joined: guestJoined, gameId: game.id });
}
