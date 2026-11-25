// Small UI helpers: DOM builder, icons, toast, overlay stack, formatting.

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v; // only ever called with static strings
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const icons = {
  heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  save: svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
  mute: svg('<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>'),
  sound: svg('<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  block: svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
  close: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  home: svg('<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'),
  reels: svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18M9 3l3 6M15 3l3 6"/><path d="M10 13l5 3-5 3z" fill="currentColor"/>'),
  play: svg('<path d="M6 4l14 8-14 8z" fill="currentColor"/>'),
};

export function fmtDuration(s) {
  const m = Math.floor(s / 60), sec = String(s % 60).padStart(2, '0');
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${sec}`;
  return `${m}:${sec}`;
}

export function fmtViews(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B views';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M views';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K views';
  return `${n} views`;
}

let toastTimer;
export function toast(message, action) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const t = h('div', { class: 'toast', role: 'status' }, h('span', {}, message),
    action && h('button', { class: 'toast-btn', onclick: () => { action.fn(); t.remove(); } }, action.label));
  document.body.append(t);
  toastTimer = setTimeout(() => t.remove(), action ? 5000 : 2600);
}

// Hard invariant: at most ONE YouTube iframe exists on the page. Whenever a new player is
// mounted, every other one is removed, so two videos can never play at the same time.
new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const added = n.tagName === 'IFRAME' ? [n] : [...n.querySelectorAll?.('iframe') || []];
      if (!added.length) continue;
      const keep = added[added.length - 1];
      document.querySelectorAll('iframe').forEach((f) => { if (f !== keep) f.remove(); });
    }
  }
}).observe(document.body, { childList: true, subtree: true });

// Overlay stack tied to the browser Back button.
const stack = [];
let skipPop = 0;
export const overlayHooks = { onFirstOpen: () => {}, onAllClosed: () => {} };

export function openOverlay(el, onClose) {
  if (!stack.length) overlayHooks.onFirstOpen();
  history.pushState({ ov: stack.length + 1 }, '');
  stack.push({ el, onClose });
  document.body.append(el);
  document.body.classList.add('noscroll');
}

export function closeOverlay(el) {
  const i = stack.findIndex((o) => o.el === el);
  if (i < 0) return;
  const closing = stack.splice(i).reverse(); // close it and anything above it
  for (const o of closing) { o.el.remove(); o.onClose?.(); }
  if (!stack.length) { document.body.classList.remove('noscroll'); overlayHooks.onAllClosed(); }
  skipPop = 1; // history.go(-n) fires a single popstate, which we must ignore
  history.go(-closing.length);
}

window.addEventListener('popstate', () => {
  if (skipPop) { skipPop = 0; return; }
  const o = stack.pop();
  if (!o) return;
  o.el.remove();
  o.onClose?.();
  if (!stack.length) { document.body.classList.remove('noscroll'); overlayHooks.onAllClosed(); }
});

export async function share(item) {
  const url = `https://youtu.be/${item.id}`;
  try {
    if (navigator.share) { await navigator.share({ title: item.title, text: `Watch on FunTube: ${item.title}`, url }); return; }
    await navigator.clipboard.writeText(url);
    toast('Link copied');
  } catch { /* user cancelled */ }
}
