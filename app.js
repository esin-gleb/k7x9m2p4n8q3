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

// --- Answered set (per-topic) — was 'mastered' ---
function getAnswered(topicId){
  try { return new Set(JSON.parse(localStorage.getItem('answered_'+topicId) || '[]')); }
  catch(e){ return new Set(); }
}
function saveAnswered(topicId, set){
  localStorage.setItem('answered_'+topicId, JSON.stringify([...set]));
}
function markAnswered(topicId, itemId){
  const s = getAnswered(topicId); s.add(itemId); saveAnswered(topicId, s);
}
function markUnanswered(topicId, itemId){
  const s = getAnswered(topicId); s.delete(itemId); saveAnswered(topicId, s);
}
// Aliases for backward-compat within codebase
const getMastered = getAnswered;
const markMastered = markAnswered;
const markUnmastered = markUnanswered;

// --- One-time migration from mastered_* to answered_* keys ---
(function migrateMasteredToAnswered(){
  if (localStorage.getItem('migrated_answered_v1')) return;
  Object.keys(localStorage).filter(k => k.startsWith('mastered_')).forEach(k => {
    const newKey = 'answered_' + k.slice('mastered_'.length);
    if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, localStorage.getItem(k));
    localStorage.removeItem(k);
  });
  localStorage.setItem('migrated_answered_v1', '1');
})();

// --- Traps (item ids user flagged as having wrong "correct" answer) ---
function getTraps(){
  try { return new Set(JSON.parse(localStorage.getItem('traps') || '[]')); }
  catch(e){ return new Set(); }
}
function saveTraps(set){ localStorage.setItem('traps', JSON.stringify([...set])); }
function isTrap(itemId){ return getTraps().has(itemId); }
function toggleTrap(itemId){
  const s = getTraps();
  if (s.has(itemId)) s.delete(itemId); else s.add(itemId);
  saveTraps(s);
  return s.has(itemId);
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

// --- Topic overrides (user moves task between topics) ---
function getOverrides(){
  try { return JSON.parse(localStorage.getItem('topicOverrides') || '{}'); }
  catch(e){ return {}; }
}
function saveOverrides(o){ localStorage.setItem('topicOverrides', JSON.stringify(o)); }
function setOverride(itemId, newTopic, allTopics){
  // Clean mastered from every topic — item starts as unanswered in new topic
  if (allTopics) allTopics.forEach(t => markUnmastered(t.id, itemId));
  const o = getOverrides(); o[itemId] = newTopic; saveOverrides(o);
}
function clearOverride(itemId, allTopics){
  if (allTopics) allTopics.forEach(t => markUnmastered(t.id, itemId));
  const o = getOverrides(); delete o[itemId]; saveOverrides(o);
}
function effectiveTopic(item){
  const o = getOverrides();
  return o[item.id] || item._origTopic;
}
function itemsForTopic(allItems, topicId){
  return allItems.filter(it => effectiveTopic(it) === topicId);
}
function countPerTopic(allItems){
  const c = {};
  for (const it of allItems){
    const t = effectiveTopic(it);
    c[t] = (c[t] || 0) + 1;
  }
  return c;
}

// --- Load all items across all topic files, tagged with _origTopic ---
async function loadAllItems(topics){
  const bundles = await Promise.all(topics.map(t =>
    fetch('data/'+t.id+'.json').then(r=>r.json()).then(items=>items.map(x=>({...x, _origTopic: t.id})))
  ));
  return [].concat(...bundles);
}

// --- Google AI search URL builder ---
function buildGoogleUrl(item){
  const opts = (item.opts||[]).map((o,i)=>`${i+1}. ${o}`).join('\n');
  const q = `Помоги разобраться в следующей клинической задаче:
${item.scen}
Вопрос: ${item.q}
Варианты ответов:
${opts}
Обоснуй, пожалуйста, правильный ответ клиническими рекомендациями МЗ РФ или ФАР.`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&udm=50`;
}

// --- Google G icon (inline SVG, official colors) ---
const GOOGLE_G_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';

// --- Ordering: unanswered first (shuffled), then answered (shuffled) ---
function orderedPool(items, topicId){
  const answered = getAnswered(topicId);
  const unans = shuffle(items.filter(x => !answered.has(x.id)));
  const ans = shuffle(items.filter(x => answered.has(x.id)));
  return [...unans, ...ans];
}

// --- Register service worker ---
function registerSW(){
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(console.error))}
}
