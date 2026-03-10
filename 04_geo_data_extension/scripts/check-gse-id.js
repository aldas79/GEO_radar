#!/usr/bin/env node
/**
 * 서버에서 GSE ID 검증 및 페이지 접근 확인용.
 * 사용: node check-gse-id.js GSE138669
 *   또는: node check-gse-id.js "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE138669"
 */

function normalizeGseId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.replace(/\s/g, '').trim().toUpperCase();
  const fromUrl = s.match(/acc=(GSE\d+)/i) || s.match(/(GSE\d+)/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  return /^GSE\d+$/.test(s) ? s : '';
}

const input = process.argv[2];
if (!input) {
  console.log('Usage: node check-gse-id.js GSE138669');
  console.log('   or: node check-gse-id.js "https://...?acc=GSE138669"');
  process.exit(1);
}

const gseId = normalizeGseId(input);
if (!gseId) {
  console.error('Error: Invalid GSE ID. Expected e.g. GSE138669');
  process.exit(1);
}

console.log('Normalized GSE ID:', gseId);

const url = `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${gseId}`;
console.log('Fetching:', url);

const https = require('https');
const req = https.get(
  url,
  { headers: { 'User-Agent': 'GEO_radar/1.0' } },
  (res) => {
    let body = '';
    res.on('data', (ch) => (body += ch));
    res.on('end', () => {
      const sampleLinks = body.match(/acc=(GSM\d+)/gi) || [];
      const unique = [...new Set(sampleLinks.map((s) => s.toUpperCase().replace('ACC=', '')))];
      console.log('Samples found:', unique.length, unique.slice(0, 5).join(', ') + (unique.length > 5 ? '...' : ''));
      if (unique.length === 0) console.log('(No GSM links in page - check URL or page structure)');
    });
  }
);
req.on('error', (err) => {
  console.error('Fetch failed:', err.message);
  process.exit(1);
});
