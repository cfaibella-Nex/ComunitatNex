/* xlsx-mini.js — Excel (.xlsx) de veritat sense cap llibreria
   ────────────────────────────────────────────────────────────
   Un .xlsx és un ZIP amb uns quants XML. Aquí es genera amb el
   mètode "store" (sense compressió): els fulls de seguiment fan pocs
   KB i així no cal carregar cap llibreria externa al panell.

   NXXLSX.descarregar(nomFitxer, [{ nom, files, amplades, capcaleres }])
     files      → array de files; cada cel·la és text, número o null
     capcaleres → quantes files de dalt van en negreta (per defecte 1)
     amplades   → amplada de cada columna en caràcters (opcional) */

(function() {

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function zip(fitxers) {            // [{ nom, dades: Uint8Array }]
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  for (const f of fitxers) {
    const nom = enc.encode(f.nom);
    const crc = crc32(f.dades), mida = f.dades.length;
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(mida), ...u32(mida), ...u16(nom.length), ...u16(0), ...nom
    ]);
    parts.push(local, f.dades);
    central.push(new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(mida), ...u32(mida), ...u16(nom.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nom
    ]));
    offset += local.length + mida;
  }
  const midaCentral = central.reduce((s, c) => s + c.length, 0);
  const fi = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fitxers.length), ...u16(fitxers.length),
    ...u32(midaCentral), ...u32(offset), ...u16(0)
  ]);
  return new Blob([...parts, ...central, fi], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const xml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function lletraCol(i) {
  let s = '';
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
  return s;
}

function fullXML({ files, amplades, capcaleres = 1 }) {
  const cols = (amplades || []).length
    ? `<cols>${amplades.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const rows = files.map((fila, r) => {
    const s = r < capcaleres ? ' s="1"' : '';
    const cel = fila.map((v, c) => {
      if (v === null || v === undefined || v === '') return '';
      const ref = `${lletraCol(c)}${r + 1}`;
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cel}</row>`;
  }).join('');
  /* Fixa les files de capçalera en desplaçar-se */
  const panell = capcaleres
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${capcaleres}" topLeftCell="A${capcaleres + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${panell}${cols}<sheetData>${rows}</sheetData>
<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

function descarregar(nomFitxer, fulls) {
  const enc = new TextEncoder();
  const nomsFull = fulls.map((f, i) => xml(String(f.nom || `Full ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
  const fitxers = [
    { nom: '[Content_Types].xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${fulls.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>` },
    { nom: '_rels/.rels', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { nom: 'xl/workbook.xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${nomsFull.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>` },
    { nom: 'xl/_rels/workbook.xml.rels', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${fulls.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${fulls.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { nom: 'xl/styles.xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>` },
    ...fulls.map((f, i) => ({ nom: `xl/worksheets/sheet${i + 1}.xml`, text: fullXML(f) }))
  ].map(f => ({ nom: f.nom, dades: enc.encode(f.text) }));

  const blob = zip(fitxers);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFitxer;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return blob;
}

window.NXXLSX = { descarregar, _zip: zip, _full: fullXML };

})();
