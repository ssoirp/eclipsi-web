import json
from pathlib import Path
from xml.sax.saxutils import escape
from collections import defaultdict

CATEGORY_COLORS = {
    "espai_lleure": "ff2dc937",
    "acampada": "ff2d75c9",
    "patrimoni": "ff9a2dc9",
    "servei_puntual": "ffaaaaaa",
    "desconegut": "ff888888",
}


def _style(cat):
    color = CATEGORY_COLORS.get(cat, "ff888888")
    return f'''<Style id="style_{cat}">
  <IconStyle><color>{color}</color><scale>1.0</scale></IconStyle>
</Style>'''


def export_kml(records, path):
    by_cat = defaultdict(list)
    for r in records:
        by_cat[r.get("category", "desconegut")].append(r)

    styles = "\n".join(_style(c) for c in by_cat.keys())

    folders = []
    for cat, items in by_cat.items():
        placemarks = []
        for r in items:
            desc_lines = [
                f"Subcategoria: {r.get('subcategory')}",
                f"Municipi: {r.get('municipality')}",
                f"Comarca: {r.get('comarca')}",
                f"Confiança: {r.get('confidence_score')}",
                f"Font: {', '.join(r.get('sources', []))}",
                f"Picnic: {r.get('picnic')} | Taules: {r.get('tables')} | Barbacoa: {r.get('barbecue')}",
                f"WC: {r.get('toilets')} | Aparcament: {r.get('parking')} | Accessibilitat: {r.get('accessibility')}",
            ]
            desc = escape("\n".join(desc_lines))
            name = escape(r.get("name") or "(sense nom)")
            placemarks.append(f'''<Placemark>
  <name>{name}</name>
  <styleUrl>#style_{cat}</styleUrl>
  <description>{desc}</description>
  <Point><coordinates>{r["longitude"]},{r["latitude"]},0</coordinates></Point>
</Placemark>''')
        folders.append(f'<Folder><name>{escape(cat)}</name>\n' + "\n".join(placemarks) + '\n</Folder>')

    kml = f'''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>Espais de lleure - 4 comarques</name>
{styles}
{"".join(folders)}
</Document>
</kml>'''
    Path(path).write_text(kml, encoding="utf-8")


if __name__ == "__main__":
    recs = json.loads(Path("data/final/espais_lleure_4_comarques.json").read_text())
    export_kml(recs, "data/final/espais_lleure_4_comarques.kml")
    print(f"KML exportat: {len(recs)} placemarks")
