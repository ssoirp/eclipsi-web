import Link from "next/link";
import EclipseTable from "@/components/EclipseTable";

export const metadata = {
  title: "Administració — Eclipsi 2026",
  description: "Gestió interna dels punts d'observació de l'eclipsi",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            Administració — Eclipsi Solar Total 2026
          </h1>
          <div className="flex gap-4 text-sm">
            <Link href="/" className="text-blue-600 hover:underline">
              &larr; Mostra pública
            </Link>
            <Link href="/lleure" className="text-blue-600 hover:underline">
              Espais de lleure &rarr;
            </Link>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Punts d&apos;observació a la zona de Lleida / Garrigues. Marca amb 👁 els punts que vols mostrar a la pàgina pública.
        </p>
        <EclipseTable />
      </div>
    </main>
  );
}
