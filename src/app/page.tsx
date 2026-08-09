import Link from "next/link";
import EclipseShowcase from "@/components/EclipseShowcase";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            Eclipsi Solar Total — 12 agost 2026
          </h1>
          <div className="flex gap-4 text-sm">
            <Link href="/admin" className="text-blue-600 hover:underline">
              Administració
            </Link>
            <Link href="/lleure" className="text-blue-600 hover:underline">
              Espais de lleure &rarr;
            </Link>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Els millors punts d&apos;observació a la zona de Lleida / Garrigues
        </p>
        <EclipseShowcase />
      </div>
    </main>
  );
}
