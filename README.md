# FunTube 😊

A positive-only video and reels PWA: comedy, life lessons, love and bonds, motivation, wholesome moments, cute animals, calm, feel-good music, and more. No drama, pranks, roasts, gossip or doom.

## Features
- **Home feed** with infinite scroll, a mood picker and 8 focused categories: Motivation, Bhakti Songs, Satsang, Hindi & English Songs, Indian Comedy (Kapil Sharma, Zakir Khan, etc.), Money & Finance, Health Tips, Science & Maths
- **Reels**: full-screen vertical swipe feed (arrow keys on desktop), double-tap to like, sound toggle, only the active reel loads a player
- **Saved** videos and reels, **search**, **hide a channel** ("Not for me"), daily streak, light/dark toggle
- **Positivity guard**: strict SafeSearch, a banned-word filter on titles and channels, shouty-clickbait filter, minimum views, embeddable-only. Searches for negative terms are refused.
- Installable PWA, works from GitHub Pages (all paths are relative)

## How content works
FunTube fetches live videos from the YouTube Data API v3 and embeds them with the official player (nothing is downloaded or re-hosted).

1. Create a free API key in Google Cloud Console and enable **YouTube Data API v3**.
2. Open FunTube → Settings → paste the key. It is stored only in your browser (`localStorage`).
3. Optional: restrict the key to your site URL (HTTP referrer).

Quota: each new page of results costs about 101 units, and the free daily quota is 10,000 (about 99 pages). Results are cached for 6 hours to save quota.

## Run locally
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to GitHub Pages
Repo → Settings → Pages → Deploy from branch → `main` / root. The `.nojekyll` file is already included.

## Tuning the positivity filter
Edit `js/config.js`: `CATEGORIES` (queries per category), `BANNED` (blocked words), `LIMITS` (views, durations).

## Structure
```
index.html          app shell
css/styles.css      theme + layout
js/config.js        categories, moods, banned words, limits
js/api.js           YouTube API, filters, endless FeedSource
js/store.js         settings, saved, liked, blocked, streak, cache
js/reels.js         vertical reels viewer
js/ui.js            DOM helpers, toast, overlay stack
js/app.js           views and wiring
sw.js               offline app shell
```
