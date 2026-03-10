import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_URL_PATTERN = 'ncbi.nlm.nih.gov/geo';

interface ScrnaRow {
  Accesion: string;
  Accesion_url: string;
  Sample_accesion: string;
  rawdata_name: string;
}

function parseScrnaCsv(csvPath: string): ScrnaRow[] {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const dataLines = lines.filter((line) => !line.startsWith('#'));
  if (dataLines.length === 0) return [];
  const header = dataLines[0].split(',');
  const accesionUrlIdx = header.findIndex((h) => h.trim() === 'Accesion_url');
  const accesionIdx = header.findIndex((h) => h.trim() === 'Accesion');
  const sampleIdx = header.findIndex((h) => h.trim() === 'Sample_accesion');
  const rawdataIdx = header.findIndex((h) => h.trim() === 'rawdata_name');
  if (accesionUrlIdx < 0 || accesionIdx < 0) return [];

  const rows: ScrnaRow[] = [];
  for (let i = 1; i < dataLines.length; i++) {
    const line = dataLines[i];
    const parts: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
        parts.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    parts.push(cur.trim());
    const url = (parts[accesionUrlIdx] || '').trim();
    if (url && url.includes(GEO_URL_PATTERN)) {
      rows.push({
        Accesion: (parts[accesionIdx] || '').trim(),
        Accesion_url: url,
        Sample_accesion: sampleIdx >= 0 ? (parts[sampleIdx] || '').trim() : '',
        rawdata_name: rawdataIdx >= 0 ? (parts[rawdataIdx] || '').trim() : '',
      });
    }
  }
  return rows;
}

function getUniqueGseEntries(rows: ScrnaRow[]): ScrnaRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = r.Accesion_url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const csvPath = join(__dirname, '..', 'scRNA_seq_datasets_v3.csv');

test.describe('GEO scRNA metadata validation', () => {
  let geoEntries: ScrnaRow[];

  test.beforeAll(() => {
    geoEntries = getUniqueGseEntries(parseScrnaCsv(csvPath));
  });

  test('CSV contains GEO entries', () => {
    expect(geoEntries.length).toBeGreaterThan(0);
  });

  test('GSE series page loads (first GEO entry)', async ({ page }) => {
    expect(geoEntries.length).toBeGreaterThan(0);
    const first = geoEntries[0];
    const response = await page.goto(first.Accesion_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/GEO|NCBI|GSE/i);
  });

  test('GSE page has sample or series info', async ({ page }) => {
    expect(geoEntries.length).toBeGreaterThan(0);
    await page.goto(geoEntries[0].Accesion_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const body = await page.locator('body').textContent();
    const hasSample = /Sample|GSM|series|Supplementary/i.test(body || '');
    expect(hasSample).toBeTruthy();
  });

  test('GSE page contains accession ID in content', async ({ page }) => {
    expect(geoEntries.length).toBeGreaterThan(0);
    const first = geoEntries[0];
    await page.goto(first.Accesion_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const body = await page.locator('body').textContent();
    expect(body).toContain(first.Accesion);
  });

  // 과제1: GEO 각 샘플(GSM) 페이지에서 SRR 넘버 찾기 시나리오 (녹색 통과)
  test('GEO sample page: open GSM then find SRR via SRA link', async ({ page }) => {
    const gsmId = 'GSM4339769';

    await page.goto(`https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${gsmId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await expect(page).toHaveTitle(/GEO|NCBI|GSM/i);

    const sraLink = page.locator('a[href*="/sra?term="]').first();
    await expect(sraLink).toBeVisible({ timeout: 10000 });
    const sraHref = await sraLink.getAttribute('href');
    expect(sraHref).toBeTruthy();
    const href = sraHref as string;
    const sraUrl = href.startsWith('http') ? href : `https://www.ncbi.nlm.nih.gov${href}`;
    await page.goto(sraUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect(page.getByText(/SRR\d+/).first()).toBeVisible({ timeout: 15000 });
  });
});
