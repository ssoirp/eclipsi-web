export interface ShowcaseVote { id: number; user_id: number; rating: number }
export interface ShowcaseImage { id: number; url: string }
export interface ShowcaseUser { id: number; name: string }

export interface ShowcaseLocation {
  id: number;
  nom: string;
  custom_name: string | null;
  municipi: string;
  tipus_eclipsi: string;
  inici_totalitat: string;
  final_totalitat: string;
  durada_totalitat_s: number;
  magnitud: number;
  distancia_km: number;
  distancia_min: number;
  latitud: number;
  longitud: number;
  google_maps_url: string;
  proposat: boolean;
  descartat: boolean;
  visible: boolean;
  notes: string;
  tipus_entorn: string;
  votes: ShowcaseVote[];
  images: ShowcaseImage[];
}

export function displayName(loc: { custom_name: string | null; nom: string }) {
  return loc.custom_name || loc.nom;
}

export const ENTORN_LABELS: Record<string, string> = {
  natura: "Natura",
  picnic: "Picnic",
  urba: "Urbà",
};

export function entornLabel(tipus: string) {
  if (!tipus) return "Sense classificar";
  return ENTORN_LABELS[tipus] || tipus;
}
