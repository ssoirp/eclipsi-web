"use client";

import { ShowcaseLocation, displayName, entornLabel } from "./showcaseTypes";

const ENTORN_COLORS: Record<string, string> = {
  natura: "bg-green-600",
  picnic: "bg-amber-600",
  urba: "bg-slate-600",
};

export default function LocationCard({
  loc,
  onOpen,
}: {
  loc: ShowcaseLocation;
  onOpen: () => void;
}) {
  const cover = loc.images?.[0]?.url;
  const badgeColor = ENTORN_COLORS[loc.tipus_entorn] || "bg-gray-500";

  return (
    <div
      onClick={onOpen}
      className="cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={displayName(loc)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5V7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5z" />
              <circle cx="8" cy="10" r="1.5" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15l-4.5-4.5a1 1 0 00-1.4 0L9 17" />
            </svg>
          </div>
        )}
        {loc.images?.length > 1 && (
          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">
            +{loc.images.length - 1}
          </span>
        )}
        <span className={`absolute top-2 left-2 ${badgeColor} text-white text-xs font-medium px-2 py-0.5 rounded-full`}>
          {entornLabel(loc.tipus_entorn)}
        </span>
      </div>
      <div className="p-3">
        <div className="font-semibold text-base truncate">{displayName(loc)}</div>
        {loc.municipi && <div className="text-sm text-gray-500 truncate">{loc.municipi}</div>}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{loc.distancia_min} min en cotxe</span>
          <span>·</span>
          <span>{loc.durada_totalitat_s}s de totalitat</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span title="Inici - final eclipsi">🌘 {loc.inici_eclipsi}–{loc.final_eclipsi}</span>
          {loc.posta_sol && <span title="Posta de sol">🌅 {loc.posta_sol}</span>}
        </div>
      </div>
    </div>
  );
}
