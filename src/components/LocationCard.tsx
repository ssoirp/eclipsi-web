"use client";

import { ShowcaseLocation, displayName, entornLabel, avgRating } from "./showcaseTypes";

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
  const avg = avgRating(loc);

  return (
    <div
      onClick={onOpen}
      className={`relative cursor-pointer rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl transition-shadow ${
        loc.descartat ? "grayscale opacity-60 hover:opacity-90" : ""
      }`}
    >
      {loc.descartat && (
        <span className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full tracking-wide shadow">
          DESCARTAT
        </span>
      )}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={displayName(loc)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5V7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5z" />
              <circle cx="8" cy="10" r="1.5" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15l-4.5-4.5a1 1 0 00-1.4 0L9 17" />
            </svg>
          </div>
        )}
        {loc.images?.length > 1 && (
          <span className="absolute top-3 right-3 bg-black/60 text-white text-sm px-2 py-1 rounded-full">
            +{loc.images.length - 1}
          </span>
        )}
        <span className={`absolute top-3 left-3 ${badgeColor} text-white text-sm font-medium px-3 py-1 rounded-full`}>
          {entornLabel(loc.tipus_entorn)}
        </span>
        {avg > 0 && (
          <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-black/80 text-white text-base font-bold px-2.5 py-1 rounded-full shadow">
            <span className="text-amber-400">★</span>
            {avg.toFixed(1)}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-3">
          <div className="text-white font-bold text-xl truncate drop-shadow">{displayName(loc)}</div>
          {loc.municipi && <div className="text-white/80 text-sm truncate">{loc.municipi}</div>}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {loc.distancia_min} min
          </div>
          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {loc.durada_totalitat_s}s totalitat
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
          <span title="Inici - final eclipsi">🌘 {loc.inici_eclipsi}–{loc.final_eclipsi}</span>
          {loc.posta_sol && <span title="Posta de sol">🌅 {loc.posta_sol}</span>}
        </div>
      </div>
    </div>
  );
}
