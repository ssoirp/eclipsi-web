import EclipseTable from "@/components/EclipseTable";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Eclipsi Solar Total — 12 agost 2026
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Punts d&apos;observació a la zona de Lleida / Garrigues
        </p>
        <EclipseTable />
      </div>
    </main>
  );
}
