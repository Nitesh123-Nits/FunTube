// FunTube configuration: categories, search queries, and the positivity guard.

// Focused categories. Every query names a real creator, show or topic so results stay relevant.
// fixed: true  -> query text is used as written (no English/Hindi splitting).
// noReels: true -> skipped in the Reels tab (full-length songs).
// reelQueries   -> optional short-form-specific queries for the Reels tab.
export const CATEGORIES = [
  { id: 'motivation', label: 'Motivation', emoji: '🔥', fixed: true, queries: [
    'Sandeep Maheshwari motivation hindi', 'Gaur Gopal Das motivational speech', 'Vivek Bindra motivation hindi',
    'best motivational speech hindi', 'Josh Talks success story hindi', 'APJ Abdul Kalam inspiring speech',
    'Jim Rohn motivation', 'Simon Sinek inspiring talk', 'Les Brown motivational speech', 'best motivational speech english',
    'Ranveer Allahbadia motivation'],
    reelQueries: ['motivational shorts hindi', 'Sandeep Maheshwari shorts', 'motivation shorts english', 'success mindset shorts hindi'] },
  { id: 'bhakti', label: 'Bhakti Songs', emoji: '🙏', fixed: true, queries: [
    'Hanuman Chalisa', 'Shri Krishna bhajan', 'Shiv bhajan hindi', 'Ram bhajan hindi', 'aarti sangrah',
    'Anuradha Paudwal bhajan', 'Jubin Nautiyal bhakti song', 'Hari Om Sharan bhajan', 'Gulshan Kumar bhajan',
    'Durga mata bhajan', 'Sai baba bhajan', 'Ganesh aarti'],
    reelQueries: ['bhajan shorts', 'Krishna bhajan shorts', 'Hanuman ji bhajan shorts', 'Shiv bhajan shorts'] },
  { id: 'satsang', label: 'Satsang', emoji: '🕉️', fixed: true, queries: [
    'Premanand Ji Maharaj satsang', 'Aniruddhacharya Ji Maharaj pravachan', 'Devkinandan Thakur ji katha',
    'Pradeep Mishra shiv katha', 'Bhagavad Gita saar hindi', 'Gaur Gopal Das bhagavad gita', 'Sadhguru hindi'],
    reelQueries: ['Premanand Ji Maharaj shorts', 'satsang shorts hindi', 'Bhagavad Gita shorts hindi'] },
  { id: 'songs', label: 'Hindi & English Songs', emoji: '🎶', fixed: true, noReels: true, queries: [
    'latest Hindi songs', 'Arijit Singh best songs', 'Atif Aslam hindi songs', 'Jubin Nautiyal songs',
    'Kishore Kumar hit songs', 'Lata Mangeshkar best songs', 'Mohammed Rafi old hindi songs', 'Hindi romantic songs',
    '90s Hindi songs', 'Darshan Raval songs', 'Ed Sheeran best songs', 'Coldplay greatest hits', 'acoustic english songs'] },
  { id: 'funny', label: 'Indian Comedy', emoji: '😂', fixed: true, queries: [
    'The Kapil Sharma Show best comedy', 'Kapil Sharma show funny moments', 'Zakir Khan stand up', 'Abhishek Upmanyu stand up',
    'Anubhav Singh Bassi stand up', 'Vipul Goyal stand up', 'BB Ki Vines Bhuvan Bam', 'Amit Bhadana comedy',
    'Harsh Gujral comedy', 'Aashish Chanchlani vines', 'Sunil Grover comedy', 'Raju Srivastav comedy', 'Biswa Kalyan Rath stand up',
    'Kenny Sebastian stand up'],
    reelQueries: ['Kapil Sharma comedy shorts', 'Zakir Khan shorts', 'Indian comedy shorts clean', 'Amit Bhadana shorts', 'Bhuvan Bam shorts'] },
  { id: 'finance', label: 'Money & Finance', emoji: '💰', fixed: true, queries: [
    'personal finance hindi', 'Ankur Warikoo money lessons', 'CA Rachana Ranade stock market', 'Pranjal Kamra investing',
    'mutual fund SIP explained hindi', 'Zerodha Varsity basics', 'how to save money hindi', 'Akshat Shrivastava investing',
    'financial freedom hindi'],
    reelQueries: ['personal finance shorts hindi', 'SIP mutual fund shorts', 'money saving tips shorts hindi', 'stock market basics shorts'] },
  { id: 'health', label: 'Health Tips', emoji: '🧘', fixed: true, queries: [
    'health tips hindi', 'yoga for beginners hindi', 'Dr Tarang Krishna health', 'Dr Pal health tips', 'Fit Tuber fitness',
    'Baba Ramdev yoga', 'Doctor Mike health tips', 'healthy indian diet tips', 'sleep better tips hindi', 'ayurveda health tips'],
    reelQueries: ['health tips shorts hindi', 'yoga shorts hindi', 'healthy habits shorts', 'home remedies shorts hindi'] },
  { id: 'learn', label: 'Science & Maths', emoji: '🔬', fixed: true, queries: [
    'maths tricks', 'Vedic maths tricks hindi', 'science experiments hindi', 'physics explained simply', 'amazing science facts hindi',
    'Veritasium', 'Kurzgesagt', 'Numberphile', 'Mark Rober', 'Khan Sir science', 'Physics Wallah motivation', 'ISRO space facts hindi'],
    reelQueries: ['maths tricks shorts', 'vedic maths trick shorts', 'science experiment shorts', 'science facts shorts hindi',
      'physics facts shorts', 'space facts shorts', 'chemistry experiment shorts', 'brain teaser maths shorts'] },
];

export const MOODS = [
  { id: 'laugh', label: 'Make me laugh', emoji: '😄', cats: ['funny'] },
  { id: 'boost', label: 'Need a boost', emoji: '💪', cats: ['motivation', 'satsang'] },
  { id: 'calm', label: 'Peace & bhakti', emoji: '🙏', cats: ['bhakti', 'satsang', 'songs'] },
  { id: 'learn', label: 'Teach me', emoji: '🧠', cats: ['learn', 'finance', 'health'] },
];

// When every query in a pool is exhausted we re-run them with these suffixes,
// which gives an effectively endless feed.
export const QUERY_MODIFIERS = ['', 'best', 'new', 'latest', 'top', 'full'];

export const SEARCH_SUGGESTIONS = [
  'Kapil Sharma', 'Hanuman Chalisa', 'Sandeep Maheshwari', 'maths tricks', 'SIP investing',
  'yoga', 'Arijit Singh', 'Zakir Khan', 'Premanand Ji Maharaj', 'Warikoo',
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
  MIN_VIEWS: 30000,
  MIN_VIEWS_REEL: 20000,
  REEL_MAX_SECONDS: 180,
  REEL_MIN_SECONDS: 5,
  VIDEO_MIN_SECONDS: 60,
  VIDEO_MAX_SECONDS: 3600,
  PAGE_SIZE: 25,
  CACHE_TTL_MS: 6 * 60 * 60 * 1000,
  MAX_SAVED: 500,
};
