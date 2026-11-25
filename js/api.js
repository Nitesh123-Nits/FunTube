// YouTube Data API v3 wrapper + the positivity filter + infinite feed source.
import { BANNED, LIMITS, CATEGORIES, QUERY_MODIFIERS } from './config.js';
import { settings, blocked, cache } from './store.js';

const API = 'https://www.googleapis.com/youtube/v3';

export class ApiError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

const decodeEntities = (s = '') => new DOMParser().parseFromString(s, 'text/html').documentElement.textContent;

function parseDuration(iso = '') {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d = 0, h = 0, mi = 0, s = 0] = m;
  return (+d) * 86400 + (+h) * 3600 + (+mi) * 60 + (+s);
}

async function yt(path, params) {
  const key = settings.get().apiKey.trim();
  if (!key) throw new ApiError('Add your YouTube API key in Settings to load videos.', 'NO_KEY');
  const url = new URL(API + path);
  for (const [k, v] of Object.entries({ ...params, key })) if (v != null && v !== '') url.searchParams.set(k, v);
  let res;
  try { res = await fetch(url); } catch { throw new ApiError('You look offline. Check your connection and try again.', 'NETWORK'); }
  if (!res.ok) {
    let reason = '';
    try { const j = await res.json(); reason = j.error?.errors?.[0]?.reason || j.error?.message || ''; } catch { /* ignore */ }
    if (/quota/i.test(reason)) throw new ApiError('Daily YouTube quota used up. It resets at midnight Pacific time. Saved and cached videos still work.', 'QUOTA');
    if (res.status === 400 || res.status === 403) throw new ApiError('YouTube rejected the API key. Check it in Settings.', 'BAD_KEY');
    throw new ApiError(reason || `YouTube error ${res.status}`, 'HTTP');
  }
  return res.json();
}

export const isPositive = (text) => !BANNED.test(text);

function acceptable(item, kind) {
  if (blocked.has(item.channelId)) return false;
  if (!isPositive(`${item.title} ${item.channel}`)) return false;
  const letters = item.title.replace(/[^A-Za-z]/g, '');
  if (letters.length > 12 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.7) return false; // SHOUTY clickbait
  if ((item.title.match(/!/g) || []).length >= 3) return false;
  if (item.views < LIMITS.MIN_VIEWS) return false;
  if (kind === 'reel') return item.dur >= LIMITS.REEL_MIN_SECONDS && item.dur <= LIMITS.REEL_MAX_SECONDS;
  return item.dur >= LIMITS.VIDEO_MIN_SECONDS && item.dur <= LIMITS.VIDEO_MAX_SECONDS;
}

/** One page of search results for a query. kind: 'video' | 'reel'. */
export async function searchPage({ q, kind, pageToken, lang, cat }) {
  const ck = `${kind}|${lang}|${q}|${pageToken || ''}`;
  let page = cache.get(ck);
  if (!page) {
    const search = await yt('/search', {
      part: 'snippet', type: 'video', maxResults: LIMITS.PAGE_SIZE, q: kind === 'reel' ? `${q} #shorts` : q,
      safeSearch: 'strict', videoEmbeddable: 'true', videoSyndicated: 'true',
      videoDuration: kind === 'reel' ? 'short' : 'medium', relevanceLanguage: lang, pageToken,
    });
    const ids = (search.items || []).map((i) => i.id.videoId).filter(Boolean);
    let details = {};
    if (ids.length) {
      const d = await yt('/videos', { part: 'contentDetails,statistics,status', id: ids.join(',') });
      details = Object.fromEntries((d.items || []).map((v) => [v.id, v]));
    }
    const items = (search.items || []).flatMap((i) => {
      const id = i.id.videoId;
      const det = details[id];
      if (!det || det.status?.embeddable === false || det.status?.privacyStatus !== 'public') return [];
      const sn = i.snippet;
      return [{
        id, kind,
        title: decodeEntities(sn.title),
        channel: decodeEntities(sn.channelTitle),
        channelId: sn.channelId,
        thumb: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        dur: parseDuration(det.contentDetails?.duration),
        views: +(det.statistics?.viewCount || 0),
      }];
    });
    page = { items, next: search.nextPageToken || null };
    cache.set(ck, page);
  }
  return {
    items: page.items.filter((it) => acceptable(it, kind)).map((it) => ({ ...it, cat })),
    next: page.next,
  };
}

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** Endless feed across several categories. Call more() repeatedly. */
export class FeedSource {
  constructor({ categories, kind }) {
    this.kind = kind;
    this.categories = categories.length ? categories : CATEGORIES.map((c) => c.id);
    this.seen = new Set();
    this.round = 0;
    this.pool = [];
    this.idx = 0;
    this.empty = false;
    this.#buildPool();
  }

  #buildPool() {
    const { lang } = settings.get();
    const langs = lang === 'both' ? ['en', 'hi'] : [lang];
    const mod = QUERY_MODIFIERS[this.round];
    const pool = [];
    for (const cid of this.categories) {
      const cat = CATEGORIES.find((c) => c.id === cid);
      if (!cat) continue;
      for (const text of cat.queries) {
        for (const l of langs) {
          const q = [text, mod, l === 'hi' ? 'hindi' : ''].filter(Boolean).join(' ');
          pool.push({ q, lang: l, cat: cid, token: undefined, done: false });
        }
      }
    }
    this.pool = shuffle(pool);
    this.idx = 0;
  }

  #pick() {
    for (let n = 0; n < this.pool.length; n++) {
      const e = this.pool[this.idx++ % this.pool.length];
      if (!e.done) return e;
    }
    return null;
  }

  async more(min = 8) {
    const out = [];
    let guard = 0;
    while (out.length < min && guard++ < 8) {
      let entry = this.#pick();
      if (!entry) {
        if (++this.round >= QUERY_MODIFIERS.length) { this.empty = true; break; }
        this.#buildPool();
        entry = this.#pick();
        if (!entry) break;
      }
      try {
        const { items, next } = await searchPage({ q: entry.q, kind: this.kind, pageToken: entry.token, lang: entry.lang, cat: entry.cat });
        entry.token = next || undefined;
        if (!next) entry.done = true;
        for (const it of items) if (!this.seen.has(it.id)) { this.seen.add(it.id); out.push(it); }
      } catch (e) {
        if (['NO_KEY', 'BAD_KEY', 'QUOTA', 'NETWORK'].includes(e.code)) { if (out.length) break; throw e; }
        entry.done = true;
      }
    }
    return shuffle(out);
  }
}
