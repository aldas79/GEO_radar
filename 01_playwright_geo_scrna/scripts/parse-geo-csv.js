#!/usr/bin/env node
/**
 * scRNA_seq_datasets_v3.csv에서 GEO 행만 파싱하여 (GSE, GSM, rawdata_name) 목록 반환
 * 주석(#) 라인 스킵, Accesion_url에 ncbi.nlm.nih.gov/geo 포함된 행만
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const GEO_URL_PATTERN = 'ncbi.nlm.nih.gov/geo';

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
      out.push(cur.trim());
      cur = '';
      if (c !== ',') break;
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseGeoRows(csvPath) {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const dataLines = lines.filter((l) => !l.startsWith('#'));
  if (dataLines.length === 0) return [];
  const header = parseCsvLine(dataLines[0]);
  const accIdx = header.findIndex((h) => h === 'Accesion');
  const urlIdx = header.findIndex((h) => h === 'Accesion_url');
  const samIdx = header.findIndex((h) => h === 'Sample_accesion');
  const rawIdx = header.findIndex((h) => h === 'rawdata_name');
  if (accIdx < 0 || urlIdx < 0) return [];

  const rows = [];
  for (let i = 1; i < dataLines.length; i++) {
    const parts = parseCsvLine(dataLines[i]);
    const url = (parts[urlIdx] || '').trim();
    if (!url || !url.includes(GEO_URL_PATTERN)) continue;
    rows.push({
      GSE: (parts[accIdx] || '').trim(),
      Sample_accesion: samIdx >= 0 ? (parts[samIdx] || '').trim() : '',
      rawdata_name: rawIdx >= 0 ? (parts[rawIdx] || '').trim() : '',
    });
  }
  return rows;
}

// CLI: from project root: node scripts/parse-geo-csv.js [csvPath]
const csvPath = process.argv[2] || join(process.cwd(), 'scRNA_seq_datasets_v3.csv');
const rows = parseGeoRows(csvPath);
console.log(JSON.stringify(rows.slice(0, 3), null, 2));
console.log('Total GEO rows:', rows.length);
