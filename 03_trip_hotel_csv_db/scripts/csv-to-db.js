#!/usr/bin/env node
/**
 * output/*.csv 파일을 읽어 SQLite hotels 테이블에 삽입
 * 사용: node scripts/csv-to-db.js [output/hotels_123.csv]
 * 파일 미지정 시 output/ 내 가장 최신 CSV 사용
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';

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

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.length);
  if (!lines.length) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCsvLine(lines[i]));
  }
  return { header, rows };
}

function toNumber(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function main() {
  const outputDir = join(process.cwd(), 'output');
  mkdirSync(outputDir, { recursive: true });
  let csvPath = process.argv[2];
  if (!csvPath) {
    const files = readdirSync(outputDir)
      .filter((f) => f.endsWith('.csv'))
      .map((f) => ({ f, p: join(outputDir, f), m: 0 }));
    if (!files.length) {
      console.error('No CSV in output/. Run: npm run collect');
      process.exit(1);
    }
    files.forEach((o) => {
      try {
        o.m = statSync(o.p).mtimeMs;
      } catch (_) {
        o.m = 0;
      }
    });
    files.sort((a, b) => b.m - a.m);
    csvPath = files[0].p;
  } else if (!csvPath.startsWith('/')) {
    csvPath = join(process.cwd(), csvPath);
  }
  const csv = readFileSync(csvPath, 'utf8');
  const { header, rows } = parseCsv(csv);
  const dbPath = join(outputDir, 'hotels.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS hotels (
      hotel_id TEXT PRIMARY KEY,
      name TEXT,
      price TEXT,
      rating REAL,
      location TEXT,
      url TEXT,
      collected_at TEXT
    );
  `);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO hotels (hotel_id, name, price, rating, location, url, collected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const idx = (name) => {
    const i = header.indexOf(name);
    return i >= 0 ? i : 0;
  };
  let n = 0;
  for (const row of rows) {
    const hotel_id = row[idx('hotel_id')] || '';
    const name = row[idx('name')] || '';
    const price = row[idx('price')] || '';
    const rating = toNumber(row[idx('rating')]);
    const location = row[idx('location')] || '';
    const url = row[idx('url')] || '';
    const collected_at = row[idx('collected_at')] || '';
    if (hotel_id && /^\d+$/.test(String(hotel_id).trim())) {
      insert.run(hotel_id, name, price, rating, location, url, collected_at);
      n++;
    }
  }
  db.close();
  console.log('Inserted', n, 'rows into', dbPath);
}

main();
