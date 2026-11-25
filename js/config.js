// FunTube configuration: categories, search queries, and the positivity guard.

export const CATEGORIES = [
  { id: 'funny', label: 'Funny', emoji: '😂', queries: [
    'clean comedy sketch', 'funny moments family friendly', 'stand up comedy clean',
    'hilarious kids moments', 'comedy short film wholesome', 'funny dog and cat videos',
    'funny office comedy clean', 'try not to laugh clean'] },
  { id: 'life', label: 'Life Lessons', emoji: '🌱', queries: [
    'life lessons', 'life lessons short story', 'wisdom from grandparents',
    'real life lessons for young adults', 'life advice that changed my life',
    'things I wish I knew earlier', 'lessons from failure and growth'] },
  { id: 'love', label: 'Love & Bonds', emoji: '💖', queries: [
    'wholesome love story', 'sweet couple moments', 'heartwarming family moments',
    'parents love for children', 'friendship wholesome moments',
    'soldier homecoming surprise', 'respect and love in relationships'] },
  { id: 'motivation', label: 'Motivation', emoji: '🔥', queries: [
    'motivational speech', 'morning motivation', 'never give up story',
    'discipline and habits motivation', 'growth mindset', 'success story inspiring'] },
  { id: 'wholesome', label: 'Wholesome', emoji: '🥹', queries: [
    'wholesome moments', 'faith in humanity restored', 'random acts of kindness',
    'heartwarming surprises', 'kind strangers helping'] },
  { id: 'stories', label: 'True Stories', emoji: '📖', queries: [
    'inspiring true story', 'overcoming struggles inspiring', 'short moral story',
    'motivational short film', 'from zero to success story'] },
  { id: 'animals', label: 'Cute Animals', emoji: '🐶', queries: [
    'cute animals wholesome', 'baby animals', 'animal rescue heartwarming',
    'dogs reunite with owners', 'funny cute pets'] },
  { id: 'talent', label: 'Amazing Talent', emoji: '🌟', queries: [
    'amazing talent', 'incredible skills', 'satisfying craftsmanship',
    'got talent best performances', 'street performers amazing'] },
  { id: 'calm', label: 'Calm & Nature', emoji: '🌿', queries: [
    'relaxing nature', 'peaceful sunrise nature', 'calm piano music',
    'mindfulness meditation short', 'beautiful scenery 4k'] },
  { id: 'music', label: 'Feel-good Music', emoji: '🎶', queries: [
    'feel good songs', 'happy upbeat music', 'acoustic cover happy',
    'instrumental feel good', 'joyful dance'] },
  { id: 'learn', label: 'Learn Something', emoji: '💡', queries: [
    'amazing facts', 'science experiments for fun', 'how things work',
    'life hacks that work', 'mind blowing facts'] },
  { id: 'health', label: 'Healthy Life', emoji: '🧘', queries: [
    'healthy habits', 'morning routine healthy', 'yoga for beginners',
    'happy healthy lifestyle', 'gratitude practice'] },
  { id: 'money', label: 'Money Wisdom', emoji: '💰', queries: [
    'money habits for young people', 'financial wisdom simple',
    'saving and investing basics'] },
];

export const MOODS = [
  { id: 'laugh', label: 'Make me laugh', emoji: '😄', cats: ['funny', 'animals'] },
  { id: 'boost', label: 'Need a boost', emoji: '💪', cats: ['motivation', 'stories', 'wholesome', 'love'] },
  { id: 'calm', label: 'Calm me down', emoji: '😌', cats: ['calm', 'music', 'health'] },
  { id: 'learn', label: 'Teach me', emoji: '🧠', cats: ['learn', 'life', 'money', 'talent'] },
];

// When every query in a pool is exhausted we re-run them with these suffixes,
// which gives an effectively endless feed.
export const QUERY_MODIFIERS = ['', 'best', 'new', 'latest', 'top', 'most loved', 'compilation'];

export const SEARCH_SUGGESTIONS = [
  'wholesome', 'clean comedy', 'life lessons', 'motivation', 'kindness',
  'cute puppies', 'success story', 'gratitude', 'happy songs', 'mother love',
];

// The positivity guard. Titles/channels matching this are dropped.
export const BANNED = new RegExp(
  '\\b(' + [
    'prank', 'pranks', 'roast', 'roasted', 'exposed', 'expose', 'scandal', 'drama', 'controversy',
    'beef', 'fight', 'fights', 'fighting', 'brutal', 'gone wrong', 'horror', 'scary', 'creepy',
    'murder', 'murdered', 'crime', 'accident', 'crash', 'war', 'attack', 'terror', 'hate', 'toxic',
    'breakup', 'break up', 'cheat', 'cheating', 'cheated', 'revenge', 'savage', 'insult', 'insulted',
    'rant', 'cringe', 'gossip', 'leak', 'leaked', 'mms', 'nsfw', '18\\+', 'sexy', 'bikini', 'hot girl',
    'shocking', 'disgusting', 'gross', 'ghost', 'haunted', 'suicide', 'kill', 'killed', 'dead', 'death',
    'blast', 'slam', 'slams', 'destroys', 'destroyed', 'trolled', 'troll', 'fails', 'fail', 'karen',
    'politics', 'political', 'election', 'riot', 'protest', 'betrayal', 'betrayed', 'divorce',
    'bigg boss', 'gambling', 'betting', 'casino', 'scam', 'fraud', 'conspiracy', 'rip',
  ].join('|') + ')\\b', 'i');

export const LIMITS = {
  MIN_VIEWS: 3000,
  REEL_MAX_SECONDS: 180,
  REEL_MIN_SECONDS: 5,
  VIDEO_MIN_SECONDS: 60,
  VIDEO_MAX_SECONDS: 3600,
  PAGE_SIZE: 25,
  CACHE_TTL_MS: 6 * 60 * 60 * 1000,
  MAX_SAVED: 500,
};
