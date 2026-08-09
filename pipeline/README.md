# Inventari d'espais de lleure — Segrià, Garrigues, Conca de Barberà, Priorat

Sistema modular per descobrir, normalitzar, deduplicar i exportar un
inventari georeferenciat d'espais de lleure, natura, acampada i patrimoni.

Aquest és el **pipeline de dades** (Python), viu dins del repositori web
`eclipsi-web` a `pipeline/`. El visor en producció és la pestanya "Espais de
lleure" de l'app Next.js (arrel del repo), que llegeix de Postgres (Neon), no
d'aquest pipeline directament. Aquest pipeline es fa servir per (re)generar
el dataset i, opcionalment, per la versió local amb Flask+SQLite (`app/`).

## Estat actual (v1)

Font única integrada: **OpenStreetMap / Overpass API**. Encara no s'hi han
incorporat fonts oficials (ajuntaments, consells comarcals, Turisme Priorat...)
ni Google Places (cal una API key — vegeu més avall). Per això **tots els
camps d'equipament (taules, barbacoa, WC, etc.) apareixen com `unknown` tret
que el propi tag d'OSM ho confirmi explícitament** — no s'ha inventat res.

## Com re-executar / actualitzar

```bash
cd pipeline
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 1. Descarregar dades OSM per cada comarca (repetible, sobreescriu data/raw/)
python3 collectors/osm.py "Priorat"
python3 collectors/osm.py "Segrià"
python3 collectors/osm.py "Garrigues"
python3 collectors/osm.py "Conca de Barberà"

# 2. Normalitzar (assigna municipi/comarca via polígons administratius OSM)
python3 processing/normalize.py

# 3. Deduplicar (marca possible_duplicate, no fusiona res automàticament)
python3 processing/deduplicate.py

# 4. Construir l'esquema final + confidence scoring
python3 processing/confidence.py

# 5. Exportar
python3 exporters/csv_export.py
PYTHONPATH=exporters python3 exporters/excel_export.py
python3 exporters/geojson_export.py
python3 exporters/kml_export.py
PYTHONPATH=exporters python3 exporters/sqlite_export.py

# 6. Mapa interactiu
python3 map/build_map.py

# 7. Control de qualitat + cobertura
python3 processing/quality_check.py
```

## Visor local (mapa + llista + curació)

**Obsolet des que la curació viu a la web (Postgres/Vercel)** — es manté
documentat per si cal treballar 100% offline. Aplicació local (Flask) que
llegeix i escriu directament sobre `data/final/espais_lleure.sqlite`; els
exports CSV/XLSX/GeoJSON/KML **no** es regeneren automàticament quan cures
punts (torna a executar els exporters si els vols actualitzats).

```bash
cd pipeline
source venv/bin/activate
python3 app/server.py
```

Obre http://127.0.0.1:5050 al navegador. Té dues pestanyes:

- **Mapa general**: el mapa complet amb els filtres de comarca/municipi/categoria.
- **Curació**: vista dividida mapa+llista sincronitzats (clicar un ítem
  ressalta l'altre costat). Filtres per comarca, municipi, categoria i estat.
  Per cada lloc pots marcar "M'interessa" / "No m'interessa" / "Pendent", i
  independentment marcar-lo com **Seleccionat** (★, la teva llista final de
  "aquests són bons"). Tot es desa a l'instant a la base de dades i persisteix
  entre reinicis del servidor i del navegador.

## Per afegir Google Places API

1. Crear projecte a Google Cloud Console, activar "Places API (New)".
2. Generar una API key restringida a Places API.
3. Guardar-la a `.env` com `GOOGLE_PLACES_API_KEY=...` (no versionar mai aquest fitxer).
4. Implementar `collectors/google_places.py` (esquelet pendent) fent Text
   Search sistemàtic per municipi + categoria, respectant els termes d'ús
   (no emmagatzemar camps restringits més enllà del que permet la política
   de cache de Google).

## Per afegir fonts oficials / web

`collectors/official_sources.py` i `collectors/web_scrapers.py` són els
punts d'extensió previstos. Cada font nova ha d'etiquetar els seus registres
amb el tipus de font corresponent (`font_oficial`, `font_comercial`,
`font_blog`, etc.) i, quan confirmi un equipament concret, actualitzar
`processing/confidence.py` perquè passi de `unknown` a `yes`/`no` amb
`{camp}_source` explícit — mai assumir.

## Limitacions conegudes d'aquesta versió

- **Cobertura d'equipaments molt baixa**: OSM rarament tagueja taules,
  bancs o barbacoes als propis nodes de "zona de pícnic". Cal fonts
  oficials/web per omplir això.
- **196+ ruïnes sense nom al Priorat** (i similar a altres comarques):
  inclosos igualment amb `confidence_score=low`, cal revisió manual per
  destriar patrimoni rellevant de soroll de mapeig molt granular.
- **15 registres sense municipi assignat** (cauen fora de tots els polígons
  administratius per precisió topològica de les fronteres OSM) — marcats
  `desconegut`, no descartats.
- La deduplicació és conservadora: només fusiona candidats via
  `possible_duplicate`, mai elimina automàticament.
