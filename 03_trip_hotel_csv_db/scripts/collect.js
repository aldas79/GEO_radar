#!/usr/bin/env node
/**
 * Trip.com 호텔 리스트 수집 → CSV 저장
 * 매너: 요청 간 delay, 동시 연결 1, User-Agent 명시
 * 셀렉터는 Cursor 브라우저로 확인 후 config 아래에서 수정.
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DELAY_MS = 2000;           // 페이지 로드 후 대기 (ms)
const REQUEST_DELAY_MS = 3000;  // 다음 작업 전 대기
const CONCURRENT = 1;           // 동시 요청 수 (1 권장)
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 검색 조건 (필요 시 수정)
const SEARCH = {
  city: 2,              // 2 = Shanghai (트립닷컴 city id)
  checkin: '2025/03/15',
  checkout: '2025/03/16',
};

// Cursor 브라우저로 확인한 셀렉터 (사이트 변경 시 여기만 수정)
const LIST_URL = (city, checkin, checkout) =>
  `https://www.trip.com/hotels/list?city=${city}&checkin=${checkin}&checkout=${checkout}`;
const SELECTORS = {
  hotelCard: '[data-testid="hotel-item"], .list-card, [class*="hotel-card"], [class*="HotelCard"], [class*="card"]',
  hotelLink: 'a[href*="/hotel"], a[href*="hotelId="], a[href*="hotels/detail"]',
  name: '[data-testid="hotel-name"], .hotel-name, [class*="name"]',
  price: '[data-testid="price"], .price, [class*="Price"]',
  rating: '[data-testid="rating"], .rating, [class*="Rating"]',
  location: '[data-testid="location"], .location, [class*="location"]',
};

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val).trim();
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(row) {
  return [
    escapeCsv(row.hotel_id),
    escapeCsv(row.name),
    escapeCsv(row.price),
    escapeCsv(row.rating),
    escapeCsv(row.location),
    escapeCsv(row.url),
    escapeCsv(row.collected_at),
  ].join(',');
}

async function extractHotelList(page) {
  return page.evaluate((sel) => {
    const results = [];
    const base = 'https://www.trip.com';
    const links = document.querySelectorAll(sel.hotelLink);
    const seen = new Set();
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const fullUrl = href.startsWith('http') ? href : new URL(href, base).href;
      let hotelId = fullUrl;
      const pathMatch = fullUrl.match(/\/hotel\/([^/?]+)/);
      const paramMatch = fullUrl.match(/hotelId=(\d+)/i);
      if (paramMatch) hotelId = paramMatch[1];
      else if (pathMatch) hotelId = pathMatch[1];
      // 상세 페이지 링크만 수집 (hotelId 파라미터 있는 경우)
      if (!paramMatch) continue;
      if (seen.has(hotelId)) continue;
      seen.add(hotelId);
      const card = a.closest(sel.hotelCard) || a.closest('div[class*="card"]') || a.closest('li') || a.parentElement?.parentElement;
      const root = card || a;
      const text = (root?.textContent || a.textContent || '').replace(/\s+/g, ' ');
      const nameEl = root?.querySelector(sel.name);
      const name = (nameEl?.textContent || '').trim() || (a.textContent || '').trim().split('\n')[0].trim();
      const priceEl = root?.querySelector(sel.price);
      const priceMatch = (priceEl?.textContent || text).match(/\$[\d,]+|US\$[\d,]+/);
      const price = priceMatch ? priceMatch[0] : '';
      const ratingEl = root?.querySelector(sel.rating);
      const ratingText = (ratingEl?.textContent || text).match(/[\d.]+(?=\s*\/\s*10)|Very Good|Outstanding|Good/);
      const rating = ratingText ? ratingText[0] : '';
      const locEl = root?.querySelector(sel.location);
      const locMatch = (locEl?.textContent || text).match(/Near\s+[^.]+|People's Square|Nanjing Road|[\u4e00-\u9fff\s]+Area/);
      const location = (locEl?.textContent || '').trim() || (locMatch ? locMatch[0] : '');
      results.push({
        hotel_id: hotelId,
        name: name || 'Unknown',
        price,
        rating,
        location,
        url: fullUrl,
      });
    }
    return results;
  }, SELECTORS);
}

async function main() {
  const outDir = join(process.cwd(), 'output');
  mkdirSync(outDir, { recursive: true });
  const csvPath = join(outDir, `hotels_${Date.now()}.csv`);
  const collectedAt = new Date().toISOString();

  console.log('Launching browser (headless)...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 720 },
  });

  try {
    const url = LIST_URL(SEARCH.city, SEARCH.checkin, SEARCH.checkout);
    console.log('Opening list page:', url);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await new Promise((r) => setTimeout(r, DELAY_MS));

    const list = await extractHotelList(page);
    const rows = list.map((h) => ({ ...h, collected_at: collectedAt }));
    const header = 'hotel_id,name,price,rating,location,url,collected_at';
    const body = rows.map(toCsvRow).join('\n');
    writeFileSync(csvPath, header + '\n' + body, 'utf8');
    console.log('Collected', rows.length, 'hotels →', csvPath);

    await page.close();
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
