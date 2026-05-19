export default function MapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Карта войны</h1>
      <p className="mb-8 text-muted-foreground">
        Живая карта фракционных территорий. Обновляется после каждой партии.
      </p>

      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <div className="text-center text-muted-foreground">
          <div className="mb-2 text-4xl">🗺️</div>
          <p className="font-medium">Карта в разработке</p>
          <p className="mt-1 text-sm">Будет готова в Этапе 3</p>
        </div>
      </div>
    </div>
  );
}
