// Full-screen vertical reels viewer. Only the active reel mounts a YouTube iframe.
import { h, icons, toast, share } from './ui.js';
import { saved, liked, blocked, stats, affinity } from './store.js';

const origin = encodeURIComponent(location.origin);
let soundOn = false; // becomes true after the user taps the sound button once

export class ReelsViewer {
  /**
   * @param {HTMLElement} root
   * @param {{items?: object[], loader?: (()=>Promise<object[]>)|null, onClose?: (()=>void)|null, startIndex?: number, onError?: (e:Error)=>void}} opts
   */
  constructor(root, { items = [], loader = null, onClose = null, startIndex = 0, onError = null } = {}) {
    this.root = root;
    this.items = [];
    this.loader = loader;
    this.onClose = onClose;
    this.onError = onError;
    this.active = -1;
    this.loading = false;
    this.done = !loader;
    this.watchTimer = null;
    this.paused = false;
    this.#build();
    this.append(items);
    if (items.length) requestAnimationFrame(() => this.scrollTo(startIndex, false));
    else this.#loadMore();
  }

  #build() {
    this.scroll = h('div', { class: 'reels-scroll', tabindex: '0' });
    this.status = h('div', { class: 'reels-status' });
    this.root.replaceChildren(this.scroll);
    if (this.onClose) this.root.append(h('button', { class: 'reels-close', 'aria-label': 'Close', html: icons.close, onclick: () => this.onClose() }));
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.65) this.activate(+e.target.dataset.i);
    }, { root: this.scroll, threshold: [0.65] });
    this.keyHandler = (e) => {
      if (!this.root.isConnected || this.root.offsetParent === null) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); this.scrollTo(this.active + 1); }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); this.scrollTo(this.active - 1); }
      if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  destroy() {
    this.io.disconnect();
    document.removeEventListener('keydown', this.keyHandler);
    clearTimeout(this.watchTimer);
    this.scroll.querySelector('iframe')?.remove();
  }

  append(items) {
    for (const item of items) {
      const i = this.items.push(item) - 1;
      const sec = this.#card(item, i);
      this.scroll.append(sec);
      this.io.observe(sec);
    }
  }

  #card(item, i) {
    const like = h('button', { class: 'ra', 'aria-label': 'Like', html: icons.heart });
    const save = h('button', { class: 'ra', 'aria-label': 'Save', html: icons.save });
    const sound = h('button', { class: 'ra', 'aria-label': 'Sound', html: soundOn ? icons.sound : icons.mute });
    const paint = () => {
      like.classList.toggle('on', liked.has(item.id));
      save.classList.toggle('on', saved.has(item.id));
    };
    paint();
    like.onclick = () => { const on = liked.toggle(item.id); paint(); if (on) { this.#burst(sec); affinity.signal(item, 'like'); } };
    save.onclick = () => { const on = saved.toggle(item); paint(); if (on) affinity.signal(item, 'save'); toast(on ? 'Saved' : 'Removed from Saved'); };
    sound.onclick = () => this.setSound(!soundOn);
    const skip = h('button', { class: 'ra', 'aria-label': 'Not for me', html: icons.block, onclick: () => {
      blocked.add(item.channelId, item.channel);
      affinity.signal(item, 'block');
      toast(`Won't show ${item.channel} again`, { label: 'Undo', fn: () => blocked.remove(item.channelId) });
      this.scrollTo(i + 1);
    } });
    const tap = h('div', { class: 'reel-tap', ondblclick: () => { if (!liked.has(item.id)) { liked.toggle(item.id); paint(); affinity.signal(item, 'like'); } this.#burst(sec); }, onclick: () => this.togglePlay() });
    const sec = h('section', { class: 'reel', 'data-i': i },
      h('div', { class: 'reel-stage' },
        h('img', { class: 'reel-thumb', src: item.thumb, alt: '', loading: 'lazy' }),
        h('div', { class: 'reel-player' }),
        tap,
        h('div', { class: 'reel-pause', html: icons.play })),
      h('div', { class: 'reel-info' },
        h('div', { class: 'reel-channel' }, item.channel),
        h('div', { class: 'reel-title' }, item.title)),
      h('div', { class: 'reel-actions' }, like, save, h('button', { class: 'ra', 'aria-label': 'Share', html: icons.share, onclick: () => share(item) }), sound, skip));
    sec.soundBtn = sound;
    return sec;
  }

  #burst(sec) {
    const b = h('div', { class: 'burst' }, '💖');
    sec.querySelector('.reel-stage').append(b);
    setTimeout(() => b.remove(), 700);
  }

  scrollTo(i, smooth = true) {
    i = Math.max(0, Math.min(i, this.items.length - 1));
    this.scroll.children[i]?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
  }

  activate(i) {
    if (i === this.active) return;
    const prev = this.items[this.active];
    if (prev && Date.now() - this.startedAt < 2000) affinity.signal(prev, 'skip'); // swiped away fast
    this.active = i;
    this.startedAt = Date.now();
    this.paused = false;
    this.scroll.querySelectorAll('.reel.playing').forEach((s) => { s.classList.remove('playing', 'is-paused'); s.querySelector('.reel-player').replaceChildren(); });
    const sec = this.scroll.children[i];
    const item = this.items[i];
    if (!sec || !item) return;
    sec.classList.add('playing');
    const src = `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&mute=${soundOn ? 0 : 1}&controls=0&loop=1&playlist=${item.id}&playsinline=1&rel=0&modestbranding=1&fs=0&disablekb=1&iv_load_policy=3&enablejsapi=1&origin=${origin}`;
    sec.querySelector('.reel-player').replaceChildren(h('iframe', { src, title: item.title, allow: 'autoplay; encrypted-media; picture-in-picture', referrerpolicy: 'strict-origin-when-cross-origin' }));
    clearTimeout(this.watchTimer);
    this.watchTimer = setTimeout(() => { stats.smile(); affinity.signal(item, 'reel'); }, 4000);
    if (this.loader && i >= this.items.length - 3) this.#loadMore();
  }

  /** Stop playback (e.g. when leaving the Reels tab). */
  stop() {
    clearTimeout(this.watchTimer);
    this.scroll.querySelectorAll('.reel.playing').forEach((sec) => { sec.classList.remove('playing', 'is-paused'); sec.querySelector('.reel-player').replaceChildren(); });
    this.active = -1;
  }

  resume() {
    if (!this.items.length) return;
    requestAnimationFrame(() => this.activate(Math.round(this.scroll.scrollTop / (this.scroll.clientHeight || 1))));
  }

  #cmd(func) {
    const f = this.scroll.querySelector('.reel.playing iframe');
    f?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  }

  setSound(on) {
    soundOn = on;
    this.#cmd(on ? 'unMute' : 'mute');
    this.scroll.querySelectorAll('.reel').forEach((s) => { s.soundBtn.innerHTML = on ? icons.sound : icons.mute; });
    if (on) this.#cmd('playVideo');
  }

  togglePlay() {
    this.paused = !this.paused;
    this.#cmd(this.paused ? 'pauseVideo' : 'playVideo');
    this.scroll.querySelector('.reel.playing')?.classList.toggle('is-paused', this.paused);
  }

  async #loadMore() {
    if (this.loading || this.done || !this.loader) return;
    this.loading = true;
    this.scroll.querySelector('.reels-empty')?.remove();
    this.scroll.append(this.status);
    this.status.textContent = this.items.length ? 'Finding more good vibes…' : 'Finding good vibes…';
    try {
      const more = await this.loader();
      if (!more.length) this.done = true;
      this.status.remove();
      this.append(more);
      if (!this.items.length) this.#empty();
    } catch (e) {
      this.status.remove();
      this.onError?.(e);
      if (!this.items.length) this.#empty(e);
    } finally {
      this.loading = false;
    }
  }

  #empty(err) {
    this.scroll.replaceChildren(h('div', { class: 'reels-empty' },
      h('div', { class: 'big' }, '🌤️'),
      h('p', {}, err ? err.message : 'No reels right now. Try again in a bit.'),
      ['NO_KEY', 'BAD_KEY'].includes(err?.code)
        ? h('button', { class: 'btn', onclick: () => window.dispatchEvent(new Event('ft:open-settings')) }, 'Open Settings')
        : h('button', { class: 'btn', onclick: () => { this.done = false; this.#loadMore(); } }, 'Try again')));
  }
}
