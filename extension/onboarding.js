// VideoHarbor first-run guide. Self-contained: no imports, no network,
// no analytics. State stays in localStorage on this extension page only.
// Page design and rules: docs/ONBOARDING.md (one claim per page, window
// dots, praise in three levels, choice pages have no "next" button).

const STORAGE_KEY = 'videoharbor.onboarding.v1';
const GUIDE_VERSION = 1;

const root = document.getElementById('onboarding');
const track = document.getElementById('ob-track');
const dotsBox = document.getElementById('ob-dots');
const praiseEl = document.getElementById('ob-praise');
const backBtn = document.getElementById('ob-back');
const nextBtn = document.getElementById('ob-next');
const skipBtn = document.getElementById('ob-skip');

const pages = [...track.querySelectorAll('.ob-page')];
const total = pages.length;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const PRAISE = {
  small: ['いいね、その調子', 'うんうん、進んでいます', 'その一歩が大事です'],
  medium: ['教えてくれてありがとう', 'いい選択です。それがいちばん助かる使い方です', 'ぴったりな選び方です'],
  large: ['できました。最初の一件、達成です', 'やりましたね。これがVideoHarborの使い方です', '完璧な滑り出しです。この調子でいきましょう'],
};
const lastPraise = { small: -1, medium: -1, large: -1 };

const MATCH = {
  how: {
    icon: 'help',
    title: '保存のしかたに困るあなたには、VideoHarborがぴったり',
    sub: '探すところから、自動でお手伝いします。',
    values: ['scan', 'local', 'result'],
  },
  find: {
    icon: 'video',
    title: '見分けに困るあなたには、VideoHarborがぴったり',
    sub: '長さとプレビューで、目的の1件を見分けられます。',
    values: ['scan', 'result', 'local'],
  },
  confirm: {
    icon: 'check',
    title: '保存できたか不安なあなたには、VideoHarborがぴったり',
    sub: '終わったかどうかを、実ファイルで確かめられます。',
    values: ['result', 'scan', 'local'],
  },
  unknown: {
    icon: 'info',
    title: 'まずは様子見で大丈夫。一緒に見ていきましょう',
    sub: '1本試すところから始められます。',
    values: ['scan', 'local', 'result'],
  },
};

const state = {
  index: 0,
  answer: null,
  trialDone: false,
  locked: false,
  open: false,
};

function loadStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function store(patch) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: GUIDE_VERSION, ...patch }));
  } catch {
    // Storage may be unavailable (private contexts); the guide simply
    // behaves as if it were a first run again.
  }
}

function vibrate(level) {
  if (!navigator.vibrate) return;
  try {
    navigator.vibrate(level === 'small' ? 8 : level === 'medium' ? 24 : 40);
  } catch {
    // Haptics are best-effort and follow the device settings.
  }
}

let praiseTimer = 0;
function praise(level, anchor) {
  const list = PRAISE[level];
  let pick = Math.floor(Math.random() * list.length);
  if (list.length > 1 && pick === lastPraise[level]) pick = (pick + 1) % list.length;
  lastPraise[level] = pick;
  praiseEl.textContent = list[pick];
  praiseEl.classList.add('is-show');
  clearTimeout(praiseTimer);
  praiseTimer = setTimeout(() => praiseEl.classList.remove('is-show'), 2100);
  vibrate(level);
  if (anchor && !reducedMotion.matches) {
    anchor.classList.remove('ob-pop');
    void anchor.offsetWidth;
    anchor.classList.add('ob-pop');
  }
}

function renderDots() {
  const win = Math.min(5, total);
  const start = Math.min(Math.max(state.index - 2, 0), total - win);
  dotsBox.replaceChildren();
  for (let i = start; i < start + win; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'ob-dot';
    let size = 'md';
    if (i === state.index) size = 'lg';
    else if ((i === start && start > 0) || (i === start + win - 1 && start + win < total)) size = 'xs';
    else if (Math.abs(i - state.index) > 1) size = 'sm';
    dot.dataset.size = size;
    dotsBox.append(dot);
  }
  dotsBox.classList.toggle('is-done', state.index === total - 1);
}

function roleOf(page) {
  return page?.dataset.role || '';
}

function updateNav() {
  const role = roleOf(pages[state.index]);
  backBtn.hidden = state.index === 0;
  // Choice and trial pages advance by acting, never via a "next" button.
  nextBtn.hidden = role === 'choice' || role === 'trial' || role === 'connect';
}

function go(index, { focus = true } = {}) {
  state.index = Math.min(Math.max(index, 0), total - 1);
  track.style.transform = `translateX(${-state.index * 100}%)`;
  pages.forEach((page, i) => page.classList.toggle('is-active', i === state.index));
  renderDots();
  updateNav();
  if (focus) pages[state.index].querySelector('h3')?.focus({ preventScroll: true });
}

function open() {
  state.open = true;
  root.hidden = false;
  go(0);
}

function close({ completed = false } = {}) {
  state.open = false;
  root.hidden = true;
  if (completed) {
    store({ done: true, skipped: false, answer: state.answer, trial: state.trialDone });
  }
}

function applyAnswer(answer, anchor) {
  if (state.locked) return;
  state.locked = true;
  state.answer = answer;
  const match = MATCH[answer] || MATCH.unknown;
  document.getElementById('ob-match-title').textContent = match.title;
  document.getElementById('ob-match-sub').textContent = match.sub;
  document.getElementById('ob-match-chip')
    .querySelector('use')?.setAttribute('href', `icons.svg#${match.icon}`);
  // Value pages follow the answer: the most relevant value comes first.
  const valuePages = match.values
    .map(name => pages.find(page => page.dataset.value === name))
    .filter(Boolean);
  const stepAnchor = pages.find(page => page.dataset.role === 'step');
  for (const page of valuePages) track.insertBefore(page, stepAnchor);
  // Rebuild the page list in the new DOM order.
  pages.splice(0, pages.length, ...track.querySelectorAll('.ob-page'));
  praise('medium', anchor);
  const matchIndex = pages.findIndex(page => page.dataset.role === 'match');
  setTimeout(() => {
    go(matchIndex);
    state.locked = false;
  }, reducedMotion.matches ? 60 : 340);
}

for (const btn of track.querySelectorAll('.ob-choice')) {
  btn.addEventListener('click', () => applyAnswer(btn.dataset.answer, btn));
}

document.getElementById('ob-trial-btn')?.addEventListener('click', event => {
  if (state.locked) return;
  state.locked = true;
  state.trialDone = true;
  const btn = event.currentTarget;
  btn.disabled = true;
  praise('medium', btn);
  setTimeout(() => {
    const resultIndex = pages.findIndex(page => page.dataset.role === 'result');
    go(resultIndex);
    praise('large');
    state.locked = false;
  }, reducedMotion.matches ? 80 : 520);
});

document.getElementById('ob-finish')?.addEventListener('click', event => {
  praise('large', event.currentTarget);
  root.querySelector('.ob-card')?.classList.add('ob-celebrate');
  setTimeout(() => {
    close({ completed: true });
    // The first small success: run the scan on the real tab right away.
    document.getElementById('scan')?.click();
  }, reducedMotion.matches ? 80 : 550);
});

nextBtn.addEventListener('click', () => {
  praise('small', nextBtn);
  go(state.index + 1);
});
backBtn.addEventListener('click', () => go(state.index - 1));
skipBtn.addEventListener('click', () => {
  store({ done: false, skipped: true, answer: state.answer, trial: state.trialDone });
  close();
});
document.getElementById('open-guide')?.addEventListener('click', () => open());

// Advance by tapping anywhere on the hook page only.
pages[0]?.addEventListener('click', event => {
  if (event.target.closest('button')) return;
  praise('small');
  go(1);
});

// Swipe between pages, except on pages where acting is the only way on.
let touchX = null;
root.addEventListener('pointerdown', event => { touchX = event.clientX; });
root.addEventListener('pointerup', event => {
  if (touchX === null) return;
  const dx = event.clientX - touchX;
  touchX = null;
  const role = roleOf(pages[state.index]);
  if (Math.abs(dx) < 48 || role === 'choice' || role === 'trial') return;
  if (dx < 0 && role !== 'connect') { praise('small'); go(state.index + 1); }
  if (dx > 0) go(state.index - 1);
});

root.addEventListener('keydown', event => {
  if (!state.open) return;
  if (event.key === 'Escape') { skipBtn.click(); }
  if (event.key === 'ArrowRight' && roleOf(pages[state.index]) !== 'choice') go(state.index + 1);
  if (event.key === 'ArrowLeft') go(state.index - 1);
});

// First run: show the guide once. Automated test environments
// (navigator.webdriver) are not first-run users and never see it;
// ?guide=1 forces it open for manual QA, ?guide=off suppresses it.
const stored = loadStored();
const forced = /[?&]guide=1\b/.test(location.search);
const suppressed = navigator.webdriver === true || /[?&]guide=off\b/.test(location.search);
if (forced || (!suppressed && !(stored && (stored.done || stored.skipped) && stored.version === GUIDE_VERSION))) {
  open();
}
