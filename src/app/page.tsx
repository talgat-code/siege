export const dynamic = "force-dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let isLoggedIn = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // DB not connected
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-20 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-black tracking-widest text-primary drop-shadow-lg md:text-8xl">
            SIEGE
          </h1>
          <p className="text-xl font-medium text-muted-foreground">
            Шахматы. Война. Фракции.
          </p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Каждая партия — это битва за регион. Каждая победа укрепляет твою фракцию.
            Карта мира меняется в реальном времени.
          </p>
        </div>

        <div className="flex gap-4">
          {isLoggedIn ? (
            <Button size="lg" asChild>
              <Link href="/play">Играть сейчас</Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link href="/register">Вступить в SIEGE</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Войти</Link>
              </Button>
            </>
          )}
          <Button size="lg" variant="outline" asChild>
            <Link href="/map">Карта войны</Link>
          </Button>
        </div>

        {/* Faction preview */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { name: "Северная Орда", color: "#E63946" },
            { name: "Железная Империя", color: "#457B9D" },
            { name: "Морская Республика", color: "#2AB7CA" },
            { name: "Гильдия Теней", color: "#7B2D8B" },
          ].map((f) => (
            <div
              key={f.name}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium"
              style={{ borderColor: `${f.color}44` }}
            >
              <div
                className="mb-1 h-1 w-full rounded-full"
                style={{ backgroundColor: f.color }}
              />
              {f.name}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/30 px-4 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {[
            {
              icon: "♟️",
              title: "Классические шахматы",
              desc: "Без модификаций. Чистая игра, честный рейтинг.",
            },
            {
              icon: "🗺️",
              title: "Живая карта войны",
              desc: "Фракции захватывают регионы. Карта меняется после каждой партии.",
            },
            {
              icon: "🤖",
              title: "AI-ассистент",
              desc: "Stockfish + LLM. Подсказки во время тренировочных партий.",
            },
          ].map((f) => (
            <div key={f.title} className="space-y-2 text-center">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
