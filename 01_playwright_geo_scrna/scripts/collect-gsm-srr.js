#!/usr/bin/env node
/**
 * Playwright로 GEO GSE 시리즈 페이지를 열고, 샘플 테이블에서 GSM↔SRR 매칭 수집.
 * 출력: output/geo_scrna_playwright_srr.csv (GSE, Sample_accesion, SRR_playwright)
 * v3 CSV의 GEO 행만 대상. GSE당 1회 요청 후 테이블/본문에서 GSM·SRR 추출.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DELAY_MS = 2500;
const GEO_URL = 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=';

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
      } else inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
      out.push(cur.trim());
      cur = '';
      if (c !== ',') break;
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

function loadGeoRows(csvPath) {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const dataLines = lines.filter((l) => !l.startsWith('#'));
  if (!dataLines.length) return [];
  const header = parseCsvLine(dataLines[0]);
  const accIdx = header.findIndex((h) => h === 'Accesion');
  const urlIdx = header.findIndex((h) => h === 'Accesion_url');
  const samIdx = header.findIndex((h) => h === 'Sample_accesion');
  if (accIdx < 0 || urlIdx < 0) return [];
  const rows = [];
  for (let i = 1; i < dataLines.length; i++) {
    const parts = parseCsvLine(dataLines[i]);
    const url = (parts[urlIdx] || '').trim();
    if (!url || !url.includes('ncbi.nlm.nih.gov/geo')) continue;
    rows.push({
      GSE: (parts[accIdx] || '').trim(),
      Sample_accesion: samIdx >= 0 ? (parts[samIdx] || '').trim() : '',
    });
  }
  return rows;
}

async function extractSrrFromGsmPage(context, gsm) {
  const gsmUrl = GEO_URL + gsm;
  const page = await context.newPage();
  let srrStr = '';
  try {
    await page.goto(gsmUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Look for SRA link
    const sraLinks = await page.$$eval('a[href*="/sra?term="]', els => els.map(e => e.href));
    if (sraLinks.length > 0) {
      const sraUrl = sraLinks[0];
      await page.goto(sraUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Look for SRR values in the SRA page
      srrStr = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        const srrs = bodyText.match(/SRR\d+/g) || [];
        return [...new Set(srrs)].join(' ');
      });
    } else {
      // Find SRR in body text just in case
      srrStr = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        const srrs = bodyText.match(/SRR\d+/g) || [];
        return [...new Set(srrs)].join(' ');
      });
    }
  } catch (e) {
    console.error(`Error processing ${gsm}: ${e.message}`);
  } finally {
    await page.close();
  }
  return srrStr;
}

async function main() {
  const projectRoot = process.cwd();
  const csvPath = join(projectRoot, 'scRNA_seq_datasets_v3.csv');
  const outDir = join(projectRoot, 'output');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'geo_scrna_playwright_srr.csv');

  const geoRows = loadGeoRows(csvPath);
  const gseToGsms = new Map();
  for (const r of geoRows) {
    if (!r.GSE || !r.Sample_accesion) continue;
    if (!gseToGsms.has(r.GSE)) gseToGsms.set(r.GSE, new Set());
    gseToGsms.get(r.GSE).add(r.Sample_accesion);
  }
  let uniqueGses = [...gseToGsms.keys()];
  const limitGse = process.env.LIMIT_GSE ? parseInt(process.env.LIMIT_GSE, 10) : 0;
  if (limitGse > 0) {
    uniqueGses = uniqueGses.slice(0, limitGse);
    console.log('Limiting to first', limitGse, 'GSEs');
  } else {
    // Only testing with GSE138669 for now if limit not set to check if it works fast
    // Actually, let's keep all GSEs mapped
  }
  console.log('GEO datasets (GSE):', uniqueGses.length);
  console.log('GSE list:', uniqueGses.join(', '));

  const allResults = [];
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });

  try {
    for (const gse of uniqueGses) {
      const expectedGsms = [...gseToGsms.get(gse)];
      let gseExtracted = 0;
      for (const gsm of expectedGsms) {
        const srr = await extractSrrFromGsmPage(context, gsm);
        allResults.push({ GSE: gse, Sample_accesion: gsm, SRR_playwright: srr });
        if (srr) gseExtracted++;
        await new Promise(r => setTimeout(r, 800)); // Small delay
      }
      console.log(`${gse} -> processed ${expectedGsms.length} samples, extracted ${gseExtracted} SRRs`);
    }
  } catch (e) {
    console.error('Fatal error during testing loops:', e);
  } finally {
    await context.close();
    await browser.close();
  }

  const header = 'GSE,Sample_accesion,SRR_playwright';
  const body = allResults.map((r) => [r.GSE, r.Sample_accesion, r.SRR_playwright].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  writeFileSync(outPath, header + '\n' + body, 'utf8');
  console.log('Wrote', allResults.length, 'rows to', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
