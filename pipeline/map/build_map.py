"""
Genera un mapa interactiu Leaflet autonom (HTML) a partir del dataset final.
Es un fitxer per obrir directament al navegador (no pensat per servir com a
Artifact -- necessita carregar tiles/JS de xarxes externes).
"""
import json
from pathlib import Path

MAP_FIELDS = [
    "id", "name", "category", "subcategory", "comarca", "municipality",
    "latitude", "longitude", "picnic", "tables", "barbecue", "drinking_water",
    "toilets", "parking", "camping", "caravan", "accessibility", "bathing",
    "playground", "sports_area",
    "confidence_score", "possible_duplicate", "sources", "source_urls",
    "osm_id", "notes",
]

CATEGORY_META = {
    "espai_lleure": {"color": "#2e7d32", "label": "Espai de lleure"},
    "acampada": {"color": "#1565c0", "label": "Acampada / turisme"},
    "patrimoni": {"color": "#8e24aa", "label": "Patrimoni"},
    "servei_puntual": {"color": "#757575", "label": "Servei puntual"},
    "desconegut": {"color": "#424242", "label": "Desconegut"},
}


def build(records, out_path):
    trimmed = []
    for r in records:
        d = {k: r.get(k) for k in MAP_FIELDS}
        trimmed.append(d)

    comarques = sorted(set(r["comarca"] for r in trimmed))
    municipis = sorted(set(r["municipality"] for r in trimmed))
    categories = sorted(set(r["category"] for r in trimmed))

    data_json = json.dumps(trimmed, ensure_ascii=False)
    meta_json = json.dumps(CATEGORY_META, ensure_ascii=False)
    comarques_json = json.dumps(comarques, ensure_ascii=False)
    municipis_json = json.dumps(municipis, ensure_ascii=False)
    categories_json = json.dumps(categories, ensure_ascii=False)

    html = f"""<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8"/>
<title>Inventari d'espais de lleure - Segrià, Garrigues, Conca de Barberà, Priorat</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body {{ margin:0; padding:0; height:100%; font-family: system-ui, sans-serif; }}
  #app {{ display:flex; height:100vh; }}
  #sidebar {{ width:300px; padding:12px; overflow-y:auto; background:#fafafa; border-right:1px solid #ddd; box-sizing:border-box; }}
  #map {{ flex:1; }}
  h1 {{ font-size:15px; margin:0 0 10px; }}
  fieldset {{ border:1px solid #ddd; border-radius:6px; margin-bottom:10px; padding:8px; }}
  legend {{ font-size:12px; font-weight:600; color:#333; padding:0 4px; }}
  label {{ display:block; font-size:12px; margin:3px 0; cursor:pointer; }}
  select {{ width:100%; padding:4px; font-size:12px; }}
  #count {{ font-size:12px; color:#555; margin-top:8px; }}
  .legend-dot {{ display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }}
  .popup-table td {{ font-size:11px; padding:1px 4px; vertical-align:top; }}
  .badge {{ display:inline-block; padding:1px 6px; border-radius:8px; font-size:10px; color:#fff; }}
</style>
</head>
<body>
<div id="app">
  <div id="sidebar">
    <h1>Inventari d'espais de lleure<br/><small>Segrià · Garrigues · Conca de Barberà · Priorat</small></h1>

    <fieldset>
      <legend>Comarca</legend>
      <select id="filterComarca"><option value="">Totes</option></select>
    </fieldset>

    <fieldset>
      <legend>Municipi</legend>
      <select id="filterMunicipi"><option value="">Tots</option></select>
    </fieldset>

    <fieldset id="catFieldset">
      <legend>Categoria</legend>
    </fieldset>

    <fieldset>
      <legend>Serveis (nomes confirmats)</legend>
      <label><input type="checkbox" data-eq="tables"/> Taules</label>
      <label><input type="checkbox" data-eq="barbecue"/> Barbacoa</label>
      <label><input type="checkbox" data-eq="drinking_water"/> Font / aigua potable</label>
      <label><input type="checkbox" data-eq="toilets"/> WC</label>
      <label><input type="checkbox" data-eq="parking"/> Aparcament</label>
      <label><input type="checkbox" data-eq="camping"/> Acampada</label>
      <label><input type="checkbox" data-eq="accessibility"/> Accessibilitat</label>
    </fieldset>

    <div id="count"></div>
    <div style="font-size:10px;color:#888;margin-top:14px;">
      Font principal: OpenStreetMap (font_cartografica). Serveis no confirmats
      per cap font es mostren com "unknown" i no compten com a filtrats.
    </div>
  </div>
  <div id="map"></div>
</div>

<script>
const DATA = {data_json};
const CATEGORY_META = {meta_json};
const COMARQUES = {comarques_json};
const MUNICIPIS = {municipis_json};
const CATEGORIES = {categories_json};

const map = L.map('map').setView([41.4, 0.9], 9);
L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
}}).addTo(map);

const comarcaSel = document.getElementById('filterComarca');
COMARQUES.forEach(c => {{ const o=document.createElement('option'); o.value=c; o.textContent=c; comarcaSel.appendChild(o); }});

const municipiSel = document.getElementById('filterMunicipi');
function refreshMunicipiOptions(comarca) {{
  municipiSel.innerHTML = '<option value="">Tots</option>';
  const list = comarca ? DATA.filter(r => r.comarca === comarca).map(r => r.municipality) : MUNICIPIS;
  [...new Set(list)].sort().forEach(m => {{ const o=document.createElement('option'); o.value=m; o.textContent=m; municipiSel.appendChild(o); }});
}}
refreshMunicipiOptions('');

const catFieldset = document.getElementById('catFieldset');
CATEGORIES.forEach(cat => {{
  const meta = CATEGORY_META[cat] || {{color:'#888', label:cat}};
  const label = document.createElement('label');
  label.innerHTML = `<input type="checkbox" data-cat="${{cat}}" checked/> <span class="legend-dot" style="background:${{meta.color}}"></span>${{meta.label}}`;
  catFieldset.appendChild(label);
}});

let markers = L.layerGroup().addTo(map);

function popupHtml(r) {{
  const eqRow = (label, val) => val === 'yes' ? `<tr><td>${{label}}</td><td><span class="badge" style="background:#2e7d32">si</span></td></tr>` :
                val === 'no' ? `<tr><td>${{label}}</td><td><span class="badge" style="background:#c62828">no</span></td></tr>` :
                `<tr><td>${{label}}</td><td><span class="badge" style="background:#999">desconegut</span></td></tr>`;
  const sources = (r.sources || []).join(', ') || 'desconegut';
  const links = (r.source_urls || []).map(u => `<a href="${{u}}" target="_blank">font</a>`).join(' ');
  const dupBadge = r.possible_duplicate ? '<span class="badge" style="background:#ef6c00">possible duplicat</span>' : '';
  return `
    <div style="min-width:220px">
      <b>${{r.name || '(sense nom)'}}</b> ${{dupBadge}}<br/>
      <small>${{CATEGORY_META[r.category]?.label || r.category}} / ${{r.subcategory}}</small><br/>
      <small>${{r.municipality}}, ${{r.comarca}}</small><br/>
      <small>${{r.latitude.toFixed(5)}}, ${{r.longitude.toFixed(5)}}</small>
      <table class="popup-table">
        ${{eqRow('Taules', r.tables)}}
        ${{eqRow('Barbacoa', r.barbecue)}}
        ${{eqRow('Font/aigua', r.drinking_water)}}
        ${{eqRow('WC', r.toilets)}}
        ${{eqRow('Aparcament', r.parking)}}
        ${{eqRow('Acampada', r.camping)}}
        ${{eqRow('Accessibilitat', r.accessibility)}}
      </table>
      <small>Confiança: <b>${{r.confidence_score}}</b> | Font: ${{sources}} ${{links}}</small><br/>
      <small>ID: ${{r.id}} ${{r.osm_id ? '| OSM: '+r.osm_id : ''}}</small>
    </div>`;
}}

function applyFilters() {{
  const comarca = comarcaSel.value;
  const municipi = municipiSel.value;
  const activeCats = [...catFieldset.querySelectorAll('input[data-cat]')].filter(i=>i.checked).map(i=>i.dataset.cat);
  const eqChecks = [...document.querySelectorAll('input[data-eq]')].filter(i=>i.checked).map(i=>i.dataset.eq);

  markers.clearLayers();
  let count = 0;
  DATA.forEach(r => {{
    if (comarca && r.comarca !== comarca) return;
    if (municipi && r.municipality !== municipi) return;
    if (!activeCats.includes(r.category)) return;
    if (!eqChecks.every(eq => r[eq] === 'yes')) return;

    const meta = CATEGORY_META[r.category] || {{color:'#888'}};
    const marker = L.circleMarker([r.latitude, r.longitude], {{
      radius: 5, color: meta.color, fillColor: meta.color, fillOpacity: 0.8, weight: 1,
    }});
    marker.bindPopup(popupHtml(r));
    markers.addLayer(marker);
    count++;
  }});
  document.getElementById('count').textContent = count + ' llocs mostrats de ' + DATA.length + ' totals';
}}

comarcaSel.addEventListener('change', () => {{ refreshMunicipiOptions(comarcaSel.value); applyFilters(); }});
municipiSel.addEventListener('change', applyFilters);
catFieldset.addEventListener('change', applyFilters);
document.querySelectorAll('input[data-eq]').forEach(i => i.addEventListener('change', applyFilters));

applyFilters();
</script>
</body>
</html>
"""
    Path(out_path).write_text(html, encoding="utf-8")


if __name__ == "__main__":
    recs = json.loads(Path("data/final/espais_lleure_4_comarques.json").read_text())
    build(recs, "data/final/mapa_espais_lleure.html")
    print("Mapa generat: data/final/mapa_espais_lleure.html")
