(function () {
  if (document.getElementById('trip-hotel-ai-float')) return;
  const root = document.createElement('div');
  root.id = 'trip-hotel-ai-float';
  const toggle = document.createElement('button');
  toggle.id = 'trip-hotel-ai-toggle';
  toggle.setAttribute('aria-label', '호텔 리뷰 AI 도우미 열기');
  toggle.textContent = '💬';
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('panel.html');
  root.appendChild(toggle);
  root.appendChild(iframe);
  toggle.addEventListener('click', function () {
    root.classList.add('open');
  });
  iframe.addEventListener('load', function () {
    iframe.contentWindow.postMessage(
      { type: 'PAGE_URL', url: window.location.href },
      '*'
    );
  });
  document.body.appendChild(root);
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'CLOSE_FLOAT') root.classList.remove('open');
  });

  // 리뷰 수집 로직 (페이지 DOM 기반)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'COLLECT_REVIEWS') {
      collectReviews(msg.maxReviews || 100)
        .then((reviews) => sendResponse({ reviews }))
        .catch((err) => sendResponse({ error: err.message, reviews: [] }));
      return true; // async response
    }
  });

  async function collectReviews(maxReviews) {
    const reviews = [];
    const dateRe = /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/;

    function extractCurrentReviews() {
      const items = [];
      const candidates = document.querySelectorAll(
        'article, [class*="review"], [class*="Review"], [class*="comment"], [class*="ReviewItem"], [data-testid*="review"], div[class*="review-"]'
      );
      for (const el of candidates) {
        const text = (el.textContent || '').trim();
        if (text.length < 20) continue;
        const dateMatch = text.match(dateRe);
        if (!dateMatch) continue;
        const date = dateMatch[0];
        const authorEl = el.querySelector('[class*="author"], [class*="name"], [class*="user"]') || el;
        let author = (authorEl.textContent || '').split('\n')[0].trim().slice(0, 80);
        if (author.length > 60) author = author.slice(0, 60) + '…';
        let content = text
          .replace(/원문번역제공[^]*$/i, '')
          .replace(/원문\s*번역[^]*$/i, '')
          .trim();
        if (content.length > 1500) content = content.slice(0, 1500) + '…';
        const roomKw = text.match(/시티\s*뷰|오션\s*뷰|트윈|더블|디럭스|스위트|객실|room|룸|트윈룸|오션뷰/gi);
        const roomHint = roomKw ? [...new Set(roomKw)].join(', ') : '';
        items.push({
          date,
          author: author || '익명',
          text: content,
          roomHint: roomHint || undefined
        });
      }
      return items;
    }

    function findAndClickSortLatest() {
      const labels = ['최신순', '최신', '최근', 'Latest', 'Newest'];
      for (const label of labels) {
        const btn = [...document.querySelectorAll('button, a, [role="button"]')].find(
          (e) => (e.textContent || '').includes(label)
        );
        if (btn) {
          btn.click();
          return new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    function findAndClickNextPage() {
      const nextLabels = ['다음', 'Next', '>', '›'];
      for (const label of nextLabels) {
        const link = [...document.querySelectorAll('a, button')].find(
          (e) => (e.textContent || '').trim() === label || (e.getAttribute('aria-label') || '').includes(label)
        );
        if (link && !link.disabled) {
          link.click();
          return new Promise((r) => setTimeout(r, 2000));
        }
      }
      return null;
    }

    function scrollToReviews() {
      const headings = [...document.querySelectorAll('h2, h3, [class*="review"]')].filter(
        (e) => /투숙객|리뷰|Review/i.test(e.textContent || '')
      );
      if (headings[0]) headings[0].scrollIntoView({ behavior: 'smooth' });
      return new Promise((r) => setTimeout(r, 1000));
    }

    await scrollToReviews();
    await findAndClickSortLatest();

    const seen = new Set();
    for (let page = 0; page < 20 && reviews.length < maxReviews; page++) {
      const batch = extractCurrentReviews();
      for (const r of batch) {
        const key = r.date + '|' + (r.text || '').slice(0, 100);
        if (seen.has(key)) continue;
        seen.add(key);
        reviews.push(r);
        if (reviews.length >= maxReviews) break;
      }
      if (reviews.length >= maxReviews) break;
      const next = await findAndClickNextPage();
      if (!next) break;
    }

    return reviews;
  }
})();
