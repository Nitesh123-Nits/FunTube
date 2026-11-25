// Tiny localStorage-backed store: settings, saved, liked, blocked channels, streak stats.
import { LIMITS } from './config.js';

const read = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

const DEFAULTS = { apiKey: '', theme: 'auto', lang: 'both', interests: [], onboarded: false };

export const settings = {
  get: () => ({ ...DEFAULTS, ...read('ft_settings', {}) }),
  set(patch) { write('ft_settings', { ...this.get(), ...patch }); },
};

export const saved = {
  list: () => read('ft_saved', []),
  has: (id) => saved.list().some((v) => v.id === id),
  toggle(item) {
    const list = saved.list();
    const i = list.findIndex((v) => v.id === item.id);
    if (i >= 0) { list.splice(i, 1); write('ft_saved', list); return false; }
    list.unshift(item);
    write('ft_saved', list.slice(0, LIMITS.MAX_SAVED));
    return true;
  },
};

export const liked = {
  ids: () => new Set(read('ft_liked', [])),
  has: (id) => liked.ids().has(id),
  toggle(id) {
    const s = liked.ids();
    const on = !s.has(id);
    on ? s.add(id) : s.delete(id);
    write('ft_liked', [...s]);
    return on;
  },
};

export const blocked = {
  map: () => read('ft_blocked', {}),
  has: (channelId) => !!channelId && channelId in blocked.map(),
  add(channelId, name) { const m = blocked.map(); m[channelId] = name; write('ft_blocked', m); },
  remove(channelId) { const m = blocked.map(); delete m[channelId]; write('ft_blocked', m); },
};

// Streak: counts consecutive days the app was opened. "Smiles" = videos/reels actually watched today.
export const stats = {
  get: () => read('ft_stats', { streak: 0, best: 0, lastDay: null, smiles: {} }),
  touch() {
    const s = stats.get();
    const t = today();
    if (s.lastDay !== t) {
      s.streak = s.lastDay && daysBetween(s.lastDay, t) === 1 ? s.streak + 1 : 1;
      s.best = Math.max(s.best || 0, s.streak);
      s.lastDay = t;
      const keep = Object.keys(s.smiles).sort().slice(-30);
      s.smiles = Object.fromEntries(keep.map((k) => [k, s.smiles[k]]));
      write('ft_stats', s);
    }
    return s;
  },
  smile() {
    const s = stats.get();
    const t = today();
    s.smiles[t] = (s.smiles[t] || 0) + 1;
    write('ft_stats', s);
    return s.smiles[t];
  },
  todayCount: () => stats.get().smiles[today()] || 0,
};

// Search-result cache so refreshes and revisits don't burn API quota.
export const cache = {
  get(key) {
    const all = read('ft_cache', {});
    const e = all[key];
    if (!e || Date.now() - e.t > LIMITS.CACHE_TTL_MS) return null;
    return e.v;
  },
  set(key, v) {
    let all = read('ft_cache', {});
    all[key] = { t: Date.now(), v };
    if (!write('ft_cache', all)) {
      // quota exceeded: keep only the newest 15 entries
      const keep = Object.entries(all).sort((a, b) => b[1].t - a[1].t).slice(0, 15);
      all = Object.fromEntries(keep);
      write('ft_cache', all);
    }
  },
  clear() { try { localStorage.removeItem('ft_cache'); } catch { /* ignore */ } },
};
