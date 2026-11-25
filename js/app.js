import { CATEGORIES, MOODS, SEARCH_SUGGESTIONS } from './config.js';
import { settings, saved, liked, blocked, stats, cache } from './store.js';
import { FeedSource, searchPage, isPositive, ApiError } from './api.js';
import { ReelsViewer } from './reels.js';
import { h, icons, toast, openOverlay, closeOverlay, fmtDuration, fmtViews, share } from './ui.js';

const $ = (s) => document.querySelector(s);

/* ---------- theme ---------- */
function applyTheme() {
  const t = settings.get().theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#themeBtn').innerHTML = dark ? icons.sun : icons.moon;
  document.querySelector('meta[name=theme-color]').content = dark ? '#14110f' : '#fff7e8';
}
$('#themeBtn').onclick = () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  settings.set({ theme: dark ? 'light' : 'dark' });
  applyTheme();
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ---------- header chrome ---------- */
$('#searchBtn').innerHTML = icons.search;
$('#settingsBtn').innerHTML = icons.gear;
$('#nav-home i').innerHTML = icons.home;
$('#nav-reels i').innerHTML = icons.reels;
$('#nav-saved i').innerHTML = icons.save;

function paintStreak() {
  const s = stats.touch();
  $('#streak').textContent = `🔥 ${s.streak}`;
  $('#streak').title = `${s.streak}-day streak · ${stats.todayCount()} smiles today`;
}
$('#streak').onclick = () => {
  const s = stats.get();
  toast(`🔥 ${s.streak}-day streak · best ${s.best} · ${stats.todayCount()} smiles today`);
};

/* ---------- error / setup states ---------- */
function messageCard(err, retry) {
  const needsKey = ['NO_KEY', 'BAD_KEY'].includes(err.code);
  return h('div', { class: 'msg-card' },
    h('div', { class: 'big' }, needsKey ? '🔑' : '🌤️'),
    h('h3', {}, needsKey ? 'One quick setup step' : 'Hmm, a small hiccup'),
    h('p', {}, err.message || 'Something went wrong.'),
    needsKey
      ? h('button', { class: 'btn', onclick: openSettings }, 'Add YouTube API key')
      : h('button', { class: 'btn', onclick: retry }, 'Try again'));
}
window.addEventListener('ft:open-settings', () => openSettings());

/* ---------- cards ---------- */
function videoCard(item, { onHide, onOpen } = {}) {
  const open = () => (onOpen ? onOpen() : openPlayer(item));
  const saveBtn = h('button', { class: 'chip-btn', 'aria-label': 'Save', html: icons.save });
  const paint = () => saveBtn.classList.toggle('on', saved.has(item.id));
  paint();
  saveBtn.onclick = (e) => { e.stopPropagation(); const on = saved.toggle(item); paint(); toast(on ? 'Saved' : 'Removed from Saved'); if (!on && onHide) onHide(); };
  const hideBtn = h('button', { class: 'chip-btn', 'aria-label': 'Not for me', html: icons.block, onclick: (e) => {
    e.stopPropagation();
    blocked.add(item.channelId, item.channel);
    card.remove();
    toast(`Won't show ${item.channel} again`, { label: 'Undo', fn: () => blocked.remove(item.channelId) });
  } });
  const card = h('article', { class: 'vcard', tabindex: '0', onclick: open, onkeydown: (e) => { if (e.key === 'Enter') open(); } },
    h('div', { class: 'thumb' },
      h('img', { src: item.thumb, alt: '', loading: 'lazy' }),
      h('span', { class: 'dur' }, fmtDuration(item.dur))),
    h('div', { class: 'meta' },
      h('div', { class: 'ttl' }, item.title),
      h('div', { class: 'sub' }, `${item.channel} · ${fmtViews(item.views)}`)),
    h('div', { class: 'card-actions' }, saveBtn, hideBtn));
  return card;
}

const skeletons = (n = 6) => Array.from({ length: n }, () => h('div', { class: 'vcard skel' }, h('div', { class: 'thumb' }), h('div', { class: 'meta' }, h('div', { class: 'ttl' }), h('div', { class: 'sub' }))));

/* ---------- infinite grid ---------- */
class InfiniteGrid {
  constructor(grid, sentinel, status, makeSource, opts = {}) {
    Object.assign(this, { grid, sentinel, status, makeSource, opts });
    this.io = new IntersectionObserver((e) => { if (e[0].isIntersecting) this.load(); }, { root: opts.root || null, rootMargin: '700px' });
    this.io.observe(sentinel);
    this.reset();
  }
  destroy() { this.io.disconnect(); this.ended = true; }
  reset() {
    this.source = this.makeSource();
    this.loading = false;
    this.ended = false;
    this.count = 0;
    this.grid.replaceChildren(...skeletons());
    this.status.replaceChildren();
    this.first = true;
    this.load();
  }
  async load() {
    if (this.loading || this.ended || !this.grid.isConnected) return;
    this.loading = true;
    try {
      const items = await this.source.more(8);
      if (this.first) { this.grid.replaceChildren(); this.first = false; }
      for (const it of items) this.grid.append(videoCard(it));
      this.count += items.length;
      if (this.source.empty || !items.length) {
        this.ended = true;
        this.status.replaceChildren(h('p', { class: 'end' }, this.count ? "You've seen it all. Check back later for fresh vibes. ✨" : (this.opts.emptyText || 'Nothing found. Try something else.')));
      } else if (this.grid.children.length < 6) {
        this.loading = false; this.load(); return;
      }
    } catch (e) {
      this.grid.replaceChildren();
      this.first = false;
      this.ended = true;
      this.status.replaceChildren(messageCard(e instanceof ApiError ? e : new ApiError(e.message, 'UNKNOWN'), () => this.reset()));
    }
    this.loading = false;
  }
}

/* ---------- HOME ---------- */
let homeSel = 'foryou';
let homeGrid;

function homeCategories() {
  if (homeSel === 'foryou') { const i = settings.get().interests; return i.length ? i : []; }
  if (homeSel.startsWith('mood:')) return MOODS.find((m) => m.id === homeSel.slice(5)).cats;
  return [homeSel];
}

function buildHome() {
  const moods = $('#moods');
  moods.replaceChildren(h('div', { class: 'mood-title' }, 'How are you feeling right now?'),
    h('div', { class: 'mood-row' }, MOODS.map((m) => h('button', { class: 'mood', 'data-id': m.id, onclick: () => selectHome('mood:' + m.id) }, h('span', {}, m.emoji), m.label))));
  const chips = $('#chips');
  const all = [{ id: 'foryou', label: 'For You', emoji: '✨' }, ...CATEGORIES];
  chips.replaceChildren(...all.map((c) => h('button', { class: 'chip', 'data-id': c.id, onclick: () => selectHome(c.id) }, `${c.emoji} ${c.label}`)));
  homeGrid = new InfiniteGrid($('#homeGrid'), $('#homeSentinel'), $('#homeStatus'), () => new FeedSource({ categories: homeCategories(), kind: 'video' }));
  markHome();
}

function markHome() {
  document.querySelectorAll('#chips .chip').forEach((c) => c.classList.toggle('on', c.dataset.id === homeSel));
  document.querySelectorAll('#moods .mood').forEach((c) => c.classList.toggle('on', 'mood:' + c.dataset.id === homeSel));
  document.querySelector('#chips .chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

function selectHome(sel) {
  homeSel = homeSel === sel && sel !== 'foryou' ? 'foryou' : sel;
  markHome();
  scrollTo({ top: 0, behavior: 'smooth' });
  homeGrid.reset();
}

/* ---------- PLAYER ---------- */
// One player at a time: tapping a related video swaps the video inside the open sheet
// instead of stacking another sheet (stacked sheets kept every earlier iframe playing).
let player = null; // { sheet, body, grid }

function fillPlayer(item) {
  const { sheet, body } = player;
  player.grid?.destroy();
  body.querySelector('iframe')?.remove(); // stop the previous video before loading the next
  sheet.setAttribute('aria-label', item.title);

  const like = h('button', { class: 'pill' }, h('span', { html: icons.heart }), 'Like');
  const save = h('button', { class: 'pill' }, h('span', { html: icons.save }), 'Save');
  const paint = () => { like.classList.toggle('on', liked.has(item.id)); save.classList.toggle('on', saved.has(item.id)); };
  paint();
  like.onclick = () => { liked.toggle(item.id); paint(); };
  save.onclick = () => { const on = saved.toggle(item); paint(); toast(on ? 'Saved' : 'Removed from Saved'); };

  const grid = h('div', { class: 'grid' });
  const sentinel = h('div', { class: 'sentinel' });
  const status = h('div', { class: 'status' });
  body.replaceChildren(
    h('div', { class: 'player' }, h('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1&origin=${encodeURIComponent(location.origin)}`,
      title: item.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin' })),
    h('h2', { class: 'p-title' }, item.title),
    h('div', { class: 'p-sub' }, `${item.channel} · ${fmtViews(item.views)}`),
    h('div', { class: 'p-actions' }, like, save, h('button', { class: 'pill', onclick: () => share(item) }, h('span', { html: icons.share }), 'Share')),
    h('h3', { class: 'more-h' }, 'More good vibes'),
    grid, sentinel, status);
  body.scrollTop = 0;
  const cats = item.cat ? [item.cat] : [];
  player.grid = new InfiniteGrid(grid, sentinel, status, () => { const s = new FeedSource({ categories: cats, kind: 'video' }); s.seen.add(item.id); return s; }, { root: body });
}

function openPlayer(item) {
  stats.smile();
  if (player?.sheet.isConnected) { fillPlayer(item); return; }
  const body = h('div', { class: 'sheet-body' });
  const sheet = h('div', { class: 'sheet', role: 'dialog' },
    h('div', { class: 'sheet-bar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Close', html: icons.close, onclick: () => closeOverlay(sheet) }),
      h('span', { class: 'sheet-ttl' }, 'Now playing')),
    body);
  player = { sheet, body, grid: null };
  openOverlay(sheet, () => { sheet.querySelector('iframe')?.remove(); player?.grid?.destroy(); player = null; });
  fillPlayer(item);
}

/* ---------- REELS ---------- */
let reelsViewer = null;
let reelsKey = '';

function buildReels(force = false) {
  const interests = settings.get().interests;
  const key = interests.join(',') + '|' + settings.get().lang;
  if (reelsViewer && !force && key === reelsKey) return;
  reelsKey = key;
  reelsViewer?.destroy();
  const source = new FeedSource({ categories: interests, kind: 'reel' });
  reelsViewer = new ReelsViewer($('#reelsRoot'), { loader: () => source.more(6) });
}

/* ---------- SAVED ---------- */
let savedFilter = 'all';
function renderSaved() {
  const list = saved.list();
  const root = $('#savedRoot');
  const shown = list.filter((v) => savedFilter === 'all' || v.kind === savedFilter);
  const tabs = h('div', { class: 'seg' }, ['all', 'video', 'reel'].map((f) =>
    h('button', { class: savedFilter === f ? 'on' : '', onclick: () => { savedFilter = f; renderSaved(); } }, { all: 'All', video: 'Videos', reel: 'Reels' }[f])));
  if (!list.length) {
    root.replaceChildren(h('div', { class: 'msg-card' }, h('div', { class: 'big' }, '🔖'), h('h3', {}, 'Nothing saved yet'), h('p', {}, 'Tap the bookmark on any video or reel to keep it here.')));
    return;
  }
  const grid = h('div', { class: 'grid' }, shown.map((it) => {
    const isReel = it.kind === 'reel';
    const card = videoCard(it, { onHide: () => card.remove(), onOpen: isReel ? () => openSavedReels(shown.filter((v) => v.kind === 'reel'), it.id) : null });
    if (isReel) card.querySelector('.thumb').classList.add('portrait');
    return card;
  }));
  root.replaceChildren(tabs, shown.length ? grid : h('p', { class: 'end' }, 'Nothing here yet.'));
}

function openSavedReels(items, startId) {
  const holder = h('div', { class: 'reels-overlay' });
  let viewer;
  const close = () => closeOverlay(holder);
  openOverlay(holder, () => viewer?.destroy());
  viewer = new ReelsViewer(holder, { items, startIndex: Math.max(0, items.findIndex((v) => v.id === startId)), onClose: close });
}

/* ---------- SEARCH ---------- */
function openSearch() {
  let kind = 'video';
  let grid;
  const input = h('input', { type: 'search', placeholder: 'Search Kapil Sharma, bhajan, maths…', enterkeyhint: 'search', autocomplete: 'off', 'aria-label': 'Search' });
  const results = h('div', { class: 'search-results' });
  const kindBtns = ['video', 'reel'].map((k) => h('button', { class: k === kind ? 'on' : '', onclick: () => { kind = k; kindBtns.forEach((b, i) => b.classList.toggle('on', ['video', 'reel'][i] === k)); if (input.value.trim()) run(); } }, k === 'video' ? 'Videos' : 'Reels'));
  const overlay = h('div', { class: 'sheet search-sheet', role: 'dialog', 'aria-label': 'Search' },
    h('form', { class: 'search-bar', onsubmit: (e) => { e.preventDefault(); run(); } },
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', html: icons.close, onclick: () => closeOverlay(overlay) }), input,
      h('button', { type: 'submit', class: 'icon-btn', 'aria-label': 'Search', html: icons.search })),
    h('div', { class: 'seg' }, kindBtns),
    h('div', { class: 'sheet-body' }, results));

  const suggestions = () => results.replaceChildren(
    h('p', { class: 'hint' }, 'Try one of these:'),
    h('div', { class: 'chips wrap' }, SEARCH_SUGGESTIONS.map((s) => h('button', { class: 'chip', onclick: () => { input.value = s; run(); } }, s))));

  async function run() {
    const q = input.value.trim();
    if (!q) return suggestions();
    if (!isPositive(q)) {
      results.replaceChildren(h('div', { class: 'msg-card' }, h('div', { class: 'big' }, '🌈'), h('h3', {}, 'FunTube keeps it positive'), h('p', {}, 'That search isn’t something we show here. Try something uplifting instead.')));
      return;
    }
    input.blur();
    const status = h('div', { class: 'status' });
    const sentinel = h('div', { class: 'sentinel' });
    grid = h('div', { class: 'grid' });
    results.replaceChildren(grid, sentinel, status);
    const lang = undefined;
    const collected = [];
    const newSource = () => ({
      token: undefined, started: false, empty: false, seen: new Set(),
      async more() {
        for (let tries = 0; tries < 3; tries++) {
          if (this.started && !this.token) { this.empty = true; return []; }
          const page = await searchPage({ q, kind, pageToken: this.token, lang, cat: undefined });
          this.started = true;
          this.token = page.next || undefined;
          if (!page.next) this.empty = true;
          const fresh = page.items.filter((i) => !this.seen.has(i.id) && this.seen.add(i.id));
          if (fresh.length || this.empty) { collected.push(...fresh); return fresh; }
        }
        return [];
      },
    });
    const root = overlay.querySelector('.sheet-body');
    if (kind === 'reel') {
      grid.className = 'grid reels-search';
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.vcard');
        if (!card) return;
        e.stopImmediatePropagation();
        const idx = [...grid.children].indexOf(card);
        openSavedReels(collected, collected[idx]?.id);
      }, true);
    }
    return new InfiniteGrid(grid, sentinel, status, newSource, { root, emptyText: `No uplifting ${kind === 'reel' ? 'reels' : 'videos'} found for that.` });
  }
  openOverlay(overlay, null);
  suggestions();
  setTimeout(() => input.focus(), 50);
}
$('#searchBtn').onclick = openSearch;

/* ---------- SETTINGS ---------- */
function openSettings(firstRun = false) {
  const s = settings.get();
  const keyInput = h('input', { type: 'password', value: s.apiKey, placeholder: 'Paste YouTube Data API v3 key', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'YouTube API key' });
  const showBtn = h('button', { type: 'button', class: 'link-btn', onclick: () => { keyInput.type = keyInput.type === 'password' ? 'text' : 'password'; showBtn.textContent = keyInput.type === 'password' ? 'Show' : 'Hide'; } }, 'Show');
  const picked = new Set(s.interests.filter((id) => CATEGORIES.some((c) => c.id === id)));
  const interestChips = CATEGORIES.map((c) => {
    const b = h('button', { type: 'button', class: 'chip' + (picked.has(c.id) ? ' on' : ''), onclick: () => { picked.has(c.id) ? picked.delete(c.id) : picked.add(c.id); b.classList.toggle('on'); } }, `${c.emoji} ${c.label}`);
    return b;
  });
  const blockedList = Object.entries(blocked.map());
  const blockedBox = h('div', { class: 'blocked' }, blockedList.length
    ? blockedList.map(([id, name]) => h('div', { class: 'blk' }, h('span', {}, name), h('button', { class: 'link-btn', onclick: (e) => { blocked.remove(id); e.target.closest('.blk').remove(); } }, 'Unblock')))
    : h('p', { class: 'hint' }, 'No hidden channels.'));

  const panel = h('div', { class: 'sheet settings', role: 'dialog', 'aria-label': 'Settings' },
    h('div', { class: 'sheet-bar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Close', html: icons.close, onclick: () => closeOverlay(panel) }),
      h('span', { class: 'sheet-ttl' }, firstRun ? 'Welcome to FunTube 🎉' : 'Settings')),
    h('div', { class: 'sheet-body form' },
      firstRun && h('p', { class: 'lead' }, 'Motivation, bhakti, songs, Indian comedy, money, health and science. Pick what you enjoy, then add a free YouTube key.'),
      h('h3', {}, 'What do you want to watch?'),
      h('div', { class: 'chips wrap' }, interestChips),
      h('p', { class: 'hint' }, 'Leave empty to see everything.'),
      h('h3', {}, 'YouTube API key'),
      h('div', { class: 'key-row' }, keyInput, showBtn),
      h('details', {},
        h('summary', {}, 'How do I get a free key?'),
        h('ol', {},
          h('li', {}, 'Open console.cloud.google.com and create a project.'),
          h('li', {}, 'Enable “YouTube Data API v3”.'),
          h('li', {}, 'Credentials → Create credentials → API key.'),
          h('li', {}, 'Optional: restrict the key to this site’s URL.'),
          h('li', {}, 'Paste it above. It is stored only in this browser.'))),
      h('h3', {}, 'Hidden channels'), blockedBox,
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn ghost', onclick: () => { cache.clear(); toast('Cache cleared'); } }, 'Clear cache')),
      h('button', { class: 'btn big-btn', onclick: () => {
        settings.set({ apiKey: keyInput.value.trim(), interests: [...picked], onboarded: true });
        closeOverlay(panel);
        toast('Saved. Loading good vibes…');
        buildReels(true);
        homeGrid.reset();
      } }, 'Save & start')));
  openOverlay(panel, null);
}
$('#settingsBtn').onclick = () => openSettings();

/* ---------- tabs ---------- */
let tab = 'home';
function showTab(name) {
  tab = name;
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== 'view-' + name; });
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.id === 'nav-' + name));
  document.body.dataset.tab = name;
  if (name === 'reels') { buildReels(); reelsViewer?.resume(); }
  if (name === 'saved') renderSaved();
  if (name !== 'reels') reelsViewer?.stop();
  history.replaceState(null, '', '#' + name);
}
$('#nav-home').onclick = () => (tab === 'home' ? scrollTo({ top: 0, behavior: 'smooth' }) : showTab('home'));
$('#nav-reels').onclick = () => showTab('reels');
$('#nav-saved').onclick = () => showTab('saved');

/* ---------- boot ---------- */
applyTheme();
paintStreak();
buildHome();
const start = location.hash.slice(1);
showTab(['home', 'reels', 'saved'].includes(start) ? start : 'home');
if (!settings.get().onboarded) setTimeout(() => openSettings(true), 300);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
