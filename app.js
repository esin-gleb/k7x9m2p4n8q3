// Shared logic for AiR app

const ADMIN_TOKEN = "b275e48a41c9df356b7e404927eb70b8";
const PASS_THRESHOLD = 80;

// --- Admin gate ---
function checkAdminGate(){
  const params = new URLSearchParams(location.search);
  if (params.get('admin') === ADMIN_TOKEN) {
    localStorage.setItem('admin_flag','1');
    history.replaceState({}, '', location.pathname);
  } else if (params.get('admin') === '0') {
    localStorage.removeItem('admin_flag');
    history.replaceState({}, '', location.pathname);
  }
  return localStorage.getItem('admin_flag') === '1';
}

// --- Mastered set (per-topic) ---
function getMastered(topicId){
  try { return new Set(JSON.parse(localStorage.getItem('mastered_'+topicId) || '[]')); }
  catch(e){ return new Set(); }
}
function saveMastered(topicId, set){
  localStorage.setItem('mastered_'+topicId, JSON.stringify([...set]));
}
function markMastered(topicId, itemId){
  const s = getMastered(topicId); s.add(itemId); saveMastered(topicId, s);
}
function markUnmastered(topicId, itemId){
  const s = getMastered(topicId); s.delete(itemId); saveMastered(topicId, s);
}

// --- Last result per topic (for tile color) ---
function setLastResult(topicId, pct){
  localStorage.setItem('lastResult_'+topicId, JSON.stringify({pct, ts: Date.now()}));
}
function getLastResult(topicId){
  try { return JSON.parse(localStorage.getItem('lastResult_'+topicId)); }
  catch(e){ return null; }
}

// --- Utils ---
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function norm(s){return String(s).replace(/\s+/g,' ').trim().toLowerCase()}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function passClass(pct){ return pct >= PASS_THRESHOLD ? 'pass' : 'fail' }

// --- Register service worker ---
function registerSW(){
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(console.error))}
}
