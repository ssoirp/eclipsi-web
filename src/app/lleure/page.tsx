import Link from "next/link";
import LleureViewer from "@/components/LleureViewer";

export const metadata = {
  title: "Espais de lleure — Segrià, Garrigues, Conca de Barberà, Priorat",
  description: "Inventari geolocalitzat d'espais de lleure, natura, acampada i patrimoni",
};

export default function LleurePage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            Espais de lleure — Segrià, Garrigues, Conca de Barberà, Priorat
          </h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            &larr; Eclipsi 2026
          </Link>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Inventari geolocalitzat d&apos;espais de lleure, natura, acampada i patrimoni. Font: OpenStreetMap.
        </p>
        <LleureViewer />
      </div>
    </main>
  );
}
