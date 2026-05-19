import type { Faction } from "@/types";

export const FACTIONS: Omit<Faction, "id" | "created_at" | "current_territory_count">[] = [
  {
    slug: "northern-horde",
    name: "Северная Орда",
    color: "#E63946",
    lore_description:
      "Непобедимые воины севера. Их тактика — агрессия, их стратегия — давление. Они не защищают позиции — они их уничтожают.",
    banner_url: null,
  },
  {
    slug: "iron-empire",
    name: "Железная Империя",
    color: "#457B9D",
    lore_description:
      "Древняя держава, построенная на дисциплине и стратегии. Каждый ход — это манёвр армий. Каждая пешка — солдат, готовый умереть за империю.",
    banner_url: null,
  },
  {
    slug: "sea-republic",
    name: "Морская Республика",
    color: "#2AB7CA",
    lore_description:
      "Торговцы и стратеги, они видят шахматную доску как карту морских торговых путей. Гибкие, быстрые, непредсказуемые.",
    banner_url: null,
  },
  {
    slug: "shadow-guild",
    name: "Гильдия Теней",
    color: "#7B2D8B",
    lore_description:
      "Мастера позиционной игры и засад. Они ждут ошибки врага. Терпение — их оружие, тьма — их союзник.",
    banner_url: null,
  },
];

export function getFactionColor(slug: string): string {
  return FACTIONS.find((f) => f.slug === slug)?.color ?? "#888888";
}
