"use client";

import { useState } from "react";
import { ShowcaseLocation, ShowcaseUser, displayName, entornLabel } from "./showcaseTypes";

export default function LocationDetailModal({
  loc,
  users,
  onClose,
}: {
  loc: ShowcaseLocation;
  users: ShowcaseUser[];
  onClose: () => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const images = loc.images || [];

  function prevImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIndex((i) => (i - 1 + images.length) % images.length);
  }
  function nextImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIndex((i) => (i + 1) % images.length);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
          {images.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[imgIndex].url} alt={displayName(loc)} className="w-full h-full object-cover" />
              {images.length > 1 && (
                <>
                  <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70">
                    ‹
                  </button>
                  <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70">
                    ›
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5V7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5z" />
              </svg>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70">
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold">{displayName(loc)}</h2>
              {loc.municipi && <div className="text-gray-500">{loc.municipi}</div>}
            </div>
            <span className="bg-gray-100 dark:bg-gray-800 text-sm px-3 py-1 rounded-full font-medium">
              {entornLabel(loc.tipus_entorn)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <Stat label="Distància" value={`${loc.distancia_km} km`} />
            <Stat label="Temps en cotxe" value={`${loc.distancia_min} min`} />
            <Stat label="Inici totalitat" value={loc.inici_totalitat} />
            <Stat label="Durada totalitat" value={`${loc.durada_totalitat_s}s`} />
          </div>

          {users.length > 0 && (
            <div className="mt-5">
              <div className="text-sm font-semibold text-gray-500 mb-2">Valoracions</div>
              <div className="space-y-1.5">
                {users.map((u) => {
                  const rating = loc.votes.find((v) => v.user_id === u.id)?.rating || 0;
                  return (
                    <div key={u.id} className="flex items-center gap-2">
                      <span className="text-xs w-24 truncate text-gray-500">{u.name}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`w-4 h-4 rounded-sm ${n <= rating ? "bg-amber-400" : "bg-gray-200 dark:bg-gray-700"}`} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loc.notes && (
            <div className="mt-5">
              <div className="text-sm font-semibold text-gray-500 mb-1">Notes</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{loc.notes}</p>
            </div>
          )}

          <a
            href={loc.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-5 text-sm text-blue-600 hover:underline"
          >
            Obrir a Google Maps &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
      <div className="text-gray-400 text-xs">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
