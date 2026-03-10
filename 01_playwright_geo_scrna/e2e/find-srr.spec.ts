import { test, expect } from '@playwright/test';

test.describe('Extract SRR from GEO Sample (GSM)', () => {
    test('should find SRR number for a specific GSM sample (e.g., GSM4339769)', async ({ page }) => {
        const gsmId = 'GSM4339769';
        console.log(`Starting test to extract SRR for ${gsmId}...`);

        // 1. Go to GSM page
        await page.goto(`https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${gsmId}`, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/GEO|NCBI|GSE/i);

        // 2. Find the SRA link from the relations table
        const sraLink = page.locator('a[href*="/sra?term="]').first();
        await expect(sraLink).toBeVisible({ timeout: 10000 });

        // 3. Navigate to SRA page
        const sraUrl = await sraLink.getAttribute('href');
        expect(sraUrl).toBeTruthy();

        if (sraUrl) {
            // The href might be relative, e.g., /sra?term=...
            const fullUrl = sraUrl.startsWith('http') ? sraUrl : `https://www.ncbi.nlm.nih.gov${sraUrl}`;
            await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

            // 4. Extract SRR numbers from the page body
            // We wait for body to load
            await page.waitForSelector('body');

            const bodyText = await page.locator('body').textContent();
            const srrMatches = bodyText?.match(/SRR\d+/g) || [];

            const uniqueSrrs = [...new Set(srrMatches)];
            console.log(`Successfully found SRR numbers for ${gsmId}:`, uniqueSrrs);

            // 5. Verify the results (Should be at least 1 SRR number found to be green)
            expect(uniqueSrrs.length).toBeGreaterThan(0);

            // We expect the array to contain strings starting with "SRR"
            expect(uniqueSrrs[0]).toMatch(/^SRR\d+$/);
        }
    });
});
