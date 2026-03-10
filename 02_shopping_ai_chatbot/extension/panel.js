var MAX_REVIEWS = 100;
var collectedReviews = [];
var currentPageUrl = '';

document.querySelectorAll('.tabs button').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});
document.getElementById('panel-collect').classList.add('active');
document.querySelector('.tabs button[data-tab="collect"]').classList.add('active');

document.getElementById('btn-close').addEventListener('click', function () {
  window.parent.postMessage({ type: 'CLOSE_FLOAT' }, '*');
});

window.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'PAGE_URL') currentPageUrl = e.data.url || '';
});

document.getElementById('btn-collect').addEventListener('click', async function () {
  var listEl = document.getElementById('reviews-list');
  listEl.textContent = 'Collecting... (implement selectors for this site, max ' + MAX_REVIEWS + ' reviews)';
  try {
    var reply = await chrome.runtime.sendMessage({
      type: 'COLLECT_REVIEWS',
      url: currentPageUrl,
      maxReviews: MAX_REVIEWS
    });
    collectedReviews = reply && reply.reviews ? reply.reviews : [];
    listEl.textContent = 'Collected: ' + collectedReviews.length + ' reviews';
  } catch (err) {
    listEl.textContent = 'Collect failed or no backend. Implement review collection in content/background.';
  }
});

document.getElementById('btn-send').addEventListener('click', sendChat);
document.getElementById('chat-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') sendChat();
});

function sendChat() {
  var input = document.getElementById('chat-input');
  var log = document.getElementById('chat-log');
  var text = (input.value || '').trim();
  if (!text) return;
  log.innerHTML += '<div><b>You:</b> ' + escapeHtml(text) + '</div>';
  input.value = '';
  log.innerHTML += '<div><b>AI:</b> (Reply from Gemini when API is connected)</div>';
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(s) {
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
