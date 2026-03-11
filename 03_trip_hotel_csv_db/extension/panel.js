const MAX_REVIEWS = 100;
const API_URL = 'http://127.0.0.1:8791';
let collectedReviews = [];
let currentPageUrl = '';

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});
document.getElementById('panel-collect').classList.add('active');
document.querySelector('.tabs button[data-tab="collect"]').classList.add('active');

document.getElementById('btn-close').addEventListener('click', () => {
  window.parent.postMessage({ type: 'CLOSE_FLOAT' }, '*');
});

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'PAGE_URL') currentPageUrl = e.data.url || '';
});

document.getElementById('btn-collect').addEventListener('click', async () => {
  const listEl = document.getElementById('reviews-list');
  listEl.textContent = '리뷰 수집 중... (최대 ' + MAX_REVIEWS + '개)';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      listEl.textContent = '탭을 찾을 수 없습니다. 호텔 상세 페이지에서 시도하세요.';
      return;
    }
    const reply = await chrome.tabs.sendMessage(tab.id, {
      type: 'COLLECT_REVIEWS',
      maxReviews: MAX_REVIEWS
    });
    if (reply?.error) {
      listEl.textContent = '오류: ' + reply.error;
      return;
    }
    collectedReviews = reply?.reviews || [];
    listEl.textContent =
      '수집 완료: ' +
      collectedReviews.length +
      '개\n\n' +
      collectedReviews.slice(0, 3).map((r) => `[${r.date}] ${(r.text || '').slice(0, 80)}...`).join('\n\n') +
      (collectedReviews.length > 3 ? '\n...' : '');
  } catch (err) {
    listEl.textContent = '수집 실패. 페이지를 새로고침한 뒤 다시 시도하세요.\n' + (err.message || '');
  }
});

document.getElementById('btn-send').addEventListener('click', sendChat);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatReviewsForContext(reviews) {
  const CHAR_LIMIT = 80000;
  let out = '';
  for (const r of reviews) {
    const line = `[${r.date}] ${r.author}: ${(r.text || '').slice(0, 800)}${r.roomHint ? ' (객실/방 관련: ' + r.roomHint + ')' : ''}\n`;
    if (out.length + line.length > CHAR_LIMIT) {
      out += '\n...(리뷰 일부 생략)\n';
      break;
    }
    out += line;
  }
  return out || '(수집된 리뷰가 없습니다. 먼저 1단계에서 리뷰를 수집하세요.)';
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const log = document.getElementById('chat-log');
  const text = (input.value || '').trim();
  if (!text) return;
  log.innerHTML += '<div><b>You:</b> ' + escapeHtml(text) + '</div>';
  input.value = '';
  log.innerHTML += '<div><b>AI:</b> 답변 생성 중...</div>';
  log.scrollTop = log.scrollHeight;

  try {
    const reviewsText = formatReviewsForContext(collectedReviews);
    const res = await fetch(API_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviews: reviewsText,
        question: text
      })
    });
    const data = await res.json();
    const last = log.querySelector('div:last-child');
    if (res.ok && data.reply) {
      last.innerHTML = '<b>AI:</b> ' + escapeHtml(data.reply);
    } else {
      last.innerHTML = '<b>AI:</b> 오류 - ' + (data.error || res.status);
    }
  } catch (err) {
    const last = log.querySelector('div:last-child');
    last.innerHTML = '<b>AI:</b> 연결 실패. 서버(10.130.81.124:8791)가 실행 중인지 확인하세요.';
  }
  log.scrollTop = log.scrollHeight;
}
