"use client";

import { create } from "zustand";
import type { User, Faction } from "@/types";

interface AuthState {
  user: User | null;
  faction: Faction | null;
  setUser: (user: User | null) => void;
  setFaction: (faction: Faction | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  faction: null,
  setUser: (user) => set({ user }),
  setFaction: (faction) => set({ faction }),
  reset: () => set({ user: null, faction: null }),
}));
