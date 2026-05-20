"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FriendRoomPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [timeControl, setTimeControl] = useState<"blitz" | "rapid" | "classical">("rapid");
  const [playerColor, setPlayerColor] = useState<"white" | "black" | "random">("white");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/game/friend/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_control: timeControl, color: playerColor }),
      });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Ошибка"); return; }
      setCreatedCode(data.inviteCode);
      // Poll for guest joining
      const gameId = data.gameId;
      const poll = setInterval(async () => {
        const r = await fetch(`/api/game/friend/create?gameId=${gameId}`);
        const d = await r.json();
        if (d.joined) {
          clearInterval(poll);
          router.push(`/play/${gameId}`);
        }
      }, 2000);
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { setError("Введи код"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/game/friend/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Неверный код"); return; }
      router.push(`/play/${data.gameId}`);
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!createdCode) return;
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="mb-8 text-center">
          <span className="section-label">Дуэль</span>
          <h1 className="section-title" style={{ fontSize: "1.8rem" }}>
            Игра с другом
          </h1>
          <div className="lunar-rule mx-auto mt-4 w-24" />
        </div>

        {/* Mode selection */}
        {!mode && !createdCode && (
          <div className="space-y-4">
            <button
              onClick={() => setMode("create")}
              className="w-full rounded-xl p-6 text-left transition-all"
              style={{ background: "#111827", border: "1px solid rgba(201,168,76,0.2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)")}
            >
              <div className="text-2xl mb-2">🏠</div>
              <h3 className="font-cinzel font-bold" style={{ color: "#EDE8DA", fontSize: "0.95rem", letterSpacing: "0.06em" }}>
                Создать комнату
              </h3>
              <p className="font-crimson mt-1" style={{ color: "#686880", fontSize: "0.88rem", fontStyle: "italic" }}>
                Получи код и поделись с другом
              </p>
            </button>

            <button
              onClick={() => setMode("join")}
              className="w-full rounded-xl p-6 text-left transition-all"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            >
              <div className="text-2xl mb-2">🚪</div>
              <h3 className="font-cinzel font-bold" style={{ color: "#EDE8DA", fontSize: "0.95rem", letterSpacing: "0.06em" }}>
                Войти в комнату
              </h3>
              <p className="font-crimson mt-1" style={{ color: "#686880", fontSize: "0.88rem", fontStyle: "italic" }}>
                У тебя есть код от друга
              </p>
            </button>

            <div className="text-center mt-2">
              <Link href="/play" className="font-cinzel" style={{ fontSize: "0.68rem", color: "#686880", letterSpacing: "0.1em" }}>
                ← Назад
              </Link>
            </div>
          </div>
        )}

        {/* Create room */}
        {mode === "create" && !createdCode && (
          <div className="rounded-xl p-8" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-cinzel font-bold mb-6" style={{ color: "#EDE8DA", fontSize: "0.9rem", letterSpacing: "0.1em" }}>
              Настройки комнаты
            </h2>

            <div className="mb-6">
              <p className="font-cinzel mb-2" style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "#686880", textTransform: "uppercase" }}>
                Время
              </p>
              <div className="flex gap-2">
                {(["blitz", "rapid", "classical"] as const).map((tc) => (
                  <button
                    key={tc}
                    onClick={() => setTimeControl(tc)}
                    className="flex-1 rounded py-2 font-cinzel transition-all"
                    style={{
                      fontSize: "0.65rem",
                      letterSpacing: "0.08em",
                      background: timeControl === tc ? "rgba(201,168,76,0.15)" : "#1C2333",
                      border: timeControl === tc ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      color: timeControl === tc ? "#C9A84C" : "#B8B8C8",
                    }}
                  >
                    {tc === "blitz" ? "⚡ Блиц" : tc === "rapid" ? "🏃 Рапид" : "🏛 Класс."}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="font-cinzel mb-2" style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "#686880", textTransform: "uppercase" }}>
                Ваш цвет
              </p>
              <div className="flex gap-2">
                {(["white", "black", "random"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setPlayerColor(c)}
                    className="flex-1 rounded py-2 font-cinzel transition-all"
                    style={{
                      fontSize: "0.62rem",
                      letterSpacing: "0.06em",
                      background: playerColor === c ? "rgba(201,168,76,0.15)" : "#1C2333",
                      border: playerColor === c ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      color: playerColor === c ? "#C9A84C" : "#B8B8C8",
                    }}
                  >
                    {c === "white" ? "♔ Белые" : c === "black" ? "♚ Чёрные" : "🎲 Случ."}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="mb-4" style={{ color: "#E05540", fontSize: "0.82rem" }}>{error}</p>}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="siege-btn-primary w-full"
            >
              {loading ? "Создаём..." : "Создать комнату"}
            </button>
            <button onClick={() => setMode(null)} className="siege-btn-ghost w-full mt-3">
              Назад
            </button>
          </div>
        )}

        {/* Room created — show invite code */}
        {createdCode && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "#111827", border: "1px solid rgba(201,168,76,0.2)" }}
          >
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="font-cinzel font-bold mb-2" style={{ color: "#EDE8DA", fontSize: "1rem", letterSpacing: "0.06em" }}>
              Комната создана
            </h2>
            <p className="font-crimson mb-6" style={{ color: "#686880", fontStyle: "italic", fontSize: "0.9rem" }}>
              Поделись кодом с другом
            </p>

            <div
              className="rounded-lg px-6 py-4 mb-4 cursor-pointer transition-all"
              style={{ background: "#1C2333", border: "1px solid rgba(201,168,76,0.3)" }}
              onClick={copyCode}
            >
              <p
                className="font-cinzel font-black tracking-[0.3em]"
                style={{ fontSize: "2rem", color: "#C9A84C" }}
              >
                {createdCode}
              </p>
            </div>

            <button
              onClick={copyCode}
              className="siege-btn-secondary mb-4 w-full"
            >
              {copied ? "✓ Скопировано!" : "Скопировать код"}
            </button>

            <p className="font-crimson" style={{ fontSize: "0.85rem", color: "#686880", fontStyle: "italic" }}>
              Ожидаем подключения соперника...
            </p>

            <div className="mt-4 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full animate-bounce"
                  style={{ background: "#C9A84C", animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Join room */}
        {mode === "join" && (
          <div className="rounded-xl p-8" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-cinzel font-bold mb-6" style={{ color: "#EDE8DA", fontSize: "0.9rem", letterSpacing: "0.1em" }}>
              Введи код комнаты
            </h2>

            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="w-full rounded-lg px-4 py-3 text-center mb-6 font-cinzel font-bold tracking-widest"
              style={{
                background: "#1C2333",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "#C9A84C",
                fontSize: "1.5rem",
                letterSpacing: "0.3em",
                outline: "none",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />

            {error && <p className="mb-4 text-center" style={{ color: "#E05540", fontSize: "0.82rem" }}>{error}</p>}

            <button
              onClick={handleJoin}
              disabled={loading || !inviteCode.trim()}
              className="siege-btn-primary w-full"
            >
              {loading ? "Подключаемся..." : "Войти в комнату"}
            </button>
            <button onClick={() => setMode(null)} className="siege-btn-ghost w-full mt-3">
              Назад
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
