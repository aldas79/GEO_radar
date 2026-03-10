document.addEventListener('DOMContentLoaded', () => {
    const gseInput = document.getElementById('gseInput');
    const collectBtn = document.getElementById('collectBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const saveDbBtn = document.getElementById('saveDbBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const logArea = document.getElementById('log');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');

    let collectedRows = [];

    function log(msg) {
        const time = new Date().toLocaleTimeString();
        logArea.value += `[${time}] ${msg}\n`;
        logArea.scrollTop = logArea.scrollHeight;
    }

    function setProgress(percent) {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${percent}%`;
    }

    function parseHtml(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    function absoluteUrl(baseUrl, path) {
        if (path.startsWith('http')) return path;
        const u = new URL(baseUrl);
        if (path.startsWith('/')) return u.origin + path;
        return u.origin + u.pathname.replace(/\/[^/]*$/, '/') + path;
    }

    /** GSE page: samples (GSM id + name) and series-level supplementary HTTP link */
    function parseGsePage(html, gseId, baseUrl) {
        const doc = parseHtml(html);
        const samples = [];
        const gseAccPrefix = 'acc=' + gseId.toUpperCase();
        for (const a of doc.querySelectorAll('a[href*="acc.cgi"], a[href*="acc=GSM"]')) {
            const href = a.getAttribute('href') || '';
            const accMatch = href.match(/acc=(GSM\d+)/i);
            if (!accMatch) continue;
            const gsmId = accMatch[1].toUpperCase();
            let name = (a.textContent || '').trim();
            if (!name || name === gsmId) {
                const next = a.nextSibling;
                if (next && next.nodeType === Node.TEXT_NODE) name = next.textContent.trim();
                if (!name && a.nextElementSibling) name = (a.nextElementSibling.textContent || '').trim();
                if (!name && a.parentNode) name = (a.parentNode.textContent || '').replace(a.textContent || '', '').trim();
            }
            if (name.length > 200) name = name.slice(0, 200);
            samples.push({ gsmId, sampleName: name || gsmId });
        }
        const seen = new Set();
        const uniqueSamples = samples.filter(s => {
            if (seen.has(s.gsmId)) return false;
            seen.add(s.gsmId);
            return true;
        });

        let supplementaryHttpSeries = '';
        for (const a of doc.querySelectorAll('a[href*="/geo/download/"]')) {
            const href = a.getAttribute('href');
            if (!href || !href.includes('acc=' + gseId.toUpperCase())) continue;
            const text = (a.textContent || '').toLowerCase();
            if (text.includes('http') || text === '(http)') {
                supplementaryHttpSeries = absoluteUrl(baseUrl, href);
                break;
            }
        }
        if (!supplementaryHttpSeries) {
            const anyGeoDownload = doc.querySelector('a[href*="/geo/download/"][href*="acc=' + gseId.toUpperCase() + '"]');
            if (anyGeoDownload) supplementaryHttpSeries = absoluteUrl(baseUrl, anyGeoDownload.getAttribute('href'));
        }

        return { samples: uniqueSamples, supplementaryHttpSeries };
    }

    /** GSM page: sample-level supplementary HTTP and SRA (SRX) link */
    function parseGsmPage(html, baseUrl) {
        const doc = parseHtml(html);
        let supplementaryHttpSample = '';
        for (const a of doc.querySelectorAll('a[href*="/geo/download/"]')) {
            const href = a.getAttribute('href');
            if (!href) continue;
            const text = (a.textContent || '').toLowerCase();
            if (text.includes('http') || text === '(http)') {
                supplementaryHttpSample = absoluteUrl(baseUrl, href);
                break;
            }
        }
        if (!supplementaryHttpSample) {
            const first = doc.querySelector('a[href*="/geo/download/"]');
            if (first) supplementaryHttpSample = absoluteUrl(baseUrl, first.getAttribute('href'));
        }

        let srxId = '';
        for (const a of doc.querySelectorAll('a[href*="sra"], a[href*="SRX"]')) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/(?:term=)?(SRX\d+)/i) || (a.textContent || '').match(/(SRX\d+)/i);
            if (m) {
                srxId = m[1].toUpperCase();
                break;
            }
        }
        return { supplementaryHttpSample, srxId };
    }

    /** SRA page (SRX): list of SRR run accessions */
    function parseSraPage(html) {
        const doc = parseHtml(html);
        const srrs = [];
        for (const a of doc.querySelectorAll('a[href*="run="], a[href*="Traces"], a[href*="SRR"]')) {
            const href = a.getAttribute('href') || '';
            const text = (a.textContent || '').trim();
            const m = href.match(/run=(SRR\d+)/i) || text.match(/\b(SRR\d+)\b/i) || href.match(/\b(SRR\d+)\b/i);
            if (m && !srrs.includes(m[1].toUpperCase())) srrs.push(m[1].toUpperCase());
        }
        return srrs;
    }

    /** Trace run page (SRR): "This run has N read(s) per spot" */
    function parseTracePage(html) {
        const match = html.match(/(\d+)\s*read s?\s*per\s*spot/i);
        return match ? match[1] : '';
    }

    collectBtn.addEventListener('click', async () => {
        const gseId = (gseInput.value || '').trim().toUpperCase();
        if (!gseId || !/^GSE\d+$/.test(gseId)) {
            log('Error: Enter a valid GSE ID (e.g. GSE138669).');
            return;
        }

        collectedRows = [];
        log(`Fetching GSE ${gseId}...`);
        setProgress(5);

        const gseUrl = `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${gseId}`;
        let res;
        try {
            res = await fetch(gseUrl);
        } catch (e) {
            log('Network error: ' + e.message);
            setProgress(0);
            return;
        }
        const gseHtml = await res.text();
        const baseGse = res.url || gseUrl;
        const { samples, supplementaryHttpSeries } = parseGsePage(gseHtml, gseId, baseGse);

        if (samples.length === 0) {
            log('No samples (GSM) found on GSE page.');
            setProgress(100);
            return;
        }
        log(`Found ${samples.length} samples. Fetching GSM/SRA/Trace...`);
        setProgress(15);

        const total = samples.length;
        for (let i = 0; i < samples.length; i++) {
            const { gsmId, sampleName } = samples[i];
            setProgress(15 + (65 * (i + 1)) / total);

            const gsmUrl = `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${gsmId}`;
            let gsmHtml;
            try {
                gsmHtml = await (await fetch(gsmUrl)).text();
            } catch (e) {
                log(`GSM ${gsmId} fetch failed: ${e.message}`);
                collectedRows.push({
                    gseId, gsmId, sampleName,
                    supplementaryHttpSeries,
                    supplementaryHttpSample: '',
                    rawSrr: '',
                    readsPerSpot: ''
                });
                continue;
            }

            const gsmBase = gseUrl.replace(/acc=[^&]+/, 'acc=' + gsmId);
            const { supplementaryHttpSample, srxId } = parseGsmPage(gsmHtml, gsmBase);

            let srrs = [];
            if (srxId) {
                const sraUrl = `https://www.ncbi.nlm.nih.gov/sra/?term=${srxId}`;
                try {
                    const sraHtml = await (await fetch(sraUrl)).text();
                    srrs = parseSraPage(sraHtml);
                } catch (e) {
                    log(`SRA ${srxId} fetch failed: ${e.message}`);
                }
            }

            const readsPerSpotList = [];
            for (const srr of srrs) {
                const traceUrl = `https://trace.ncbi.nlm.nih.gov/Traces/?run=${srr}`;
                try {
                    const traceHtml = await (await fetch(traceUrl)).text();
                    const rps = parseTracePage(traceHtml);
                    readsPerSpotList.push(rps || '?');
                } catch (e) {
                    readsPerSpotList.push('?');
                }
            }

            const rawSrr = srrs.join(';');
            const readsPerSpot = readsPerSpotList.join(';');

            collectedRows.push({
                gseId,
                gsmId,
                sampleName,
                supplementaryHttpSeries,
                supplementaryHttpSample,
                rawSrr,
                readsPerSpot
            });
        }

        setProgress(100);
        log(`Done. ${collectedRows.length} rows. You can download CSV.`);
        downloadBtn.disabled = false;
        saveDbBtn.disabled = false;
        setTimeout(() => { progressContainer.style.display = 'none'; }, 1500);
    });

    function escapeCsv(s) {
        if (s == null) return '""';
        const t = String(s).replace(/"/g, '""');
        return `"${t}"`;
    }

    downloadBtn.addEventListener('click', () => {
        if (collectedRows.length === 0) return;
        const headers = ['GSE_ID', 'GSM_ID', 'Sample_Name', 'Supplementary_HTTP_Series', 'Supplementary_HTTP_Sample', 'Raw_SRR', 'Reads_Per_Spot'];
        let csv = headers.map(escapeCsv).join(',') + '\n';
        for (const r of collectedRows) {
            csv += [
                r.gseId,
                r.gsmId,
                r.sampleName,
                r.supplementaryHttpSeries || '',
                r.supplementaryHttpSample || '',
                r.rawSrr || '',
                r.readsPerSpot || ''
            ].map(escapeCsv).join(',') + '\n';
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const gse = (collectedRows[0] && collectedRows[0].gseId) || 'GSE';
        chrome.downloads.download({ url, filename: `geo_download_info_${gse}.csv`, saveAs: true });
        log('CSV download started.');
    });

    saveDbBtn.addEventListener('click', async () => {
        if (collectedRows.length === 0) return;
        log('Saving to local SQLite...');
        saveDbBtn.disabled = true;
        try {
            const response = await fetch('http://127.0.0.1:5000/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collectedRows)
            });
            const result = await response.json();
            if (response.ok) log(`Saved. Inserted: ${result.inserted}`);
            else log('Server: ' + (result.error || response.status));
        } catch (e) {
            log('Network: Is Python server running on 5000? ' + e.message);
        }
        saveDbBtn.disabled = false;
    });

    searchBtn.addEventListener('click', async () => {
        const q = searchInput.value.trim();
        log('Searching DB: "' + q + '"...');
        searchBtn.disabled = true;
        try {
            const response = await fetch('http://127.0.0.1:5000/api/search?q=' + encodeURIComponent(q));
            const result = await response.json();
            if (response.ok && result.data) {
                log('Found ' + result.data.length + ' records.');
                if (result.data.length > 0) log('Sample: ' + result.data[0].gsm_id + ' - ' + result.data[0].raw_srr);
            } else log('Error: ' + (result.error || response.status));
        } catch (e) {
            log('Network: ' + e.message);
        }
        searchBtn.disabled = false;
    });
});
