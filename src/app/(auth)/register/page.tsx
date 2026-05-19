"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FactionCard } from "@/components/factions/FactionCard";
import { FACTIONS } from "@/lib/factions";
import type { FactionSlug } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [selectedFaction, setSelectedFaction] = useState<FactionSlug | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.username) {
      setError("Заполни все поля");
      return;
    }
    if (form.password.length < 6) {
      setError("Пароль минимум 6 символов");
      return;
    }
    setStep(2);
  }

  async function handleSubmit() {
    if (!selectedFaction) {
      setError("Выбери фракцию");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          username: form.username,
          faction_slug: selectedFaction,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-wider text-primary">SIEGE</h1>
          <p className="mt-1 text-sm text-muted-foreground">Шахматы. Война. Фракции.</p>
        </div>

        {step === 1 ? (
          <div className="rounded-xl border bg-card p-8 shadow-lg">
            <h2 className="mb-6 text-xl font-bold">Создать аккаунт</h2>

            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Никнейм</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="commander_ivan"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ivan@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full">
                Далее — выбрать фракцию
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Войти
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">Выбери фракцию</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Это навсегда. Каждая победа укрепляет твою фракцию.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {FACTIONS.map((f) => (
                <FactionCard
                  key={f.slug}
                  slug={f.slug as FactionSlug}
                  name={f.name}
                  color={f.color}
                  lore={f.lore_description}
                  selected={selectedFaction === f.slug}
                  onSelect={setSelectedFaction}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Назад
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={!selectedFaction || loading}
              >
                {loading ? "Создаём аккаунт..." : "Вступить в SIEGE"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
