export const ONBOARDING_VERSION = 1;
export const ONBOARDING_STORAGE_KEY = 'onboardingState';

export const CONCERN_CHOICES = [
  {
    id: 'stream',
    label: '分割された動画で、1つのMP4に保存できない',
    icon: 'file',
    matchHeading: '分割動画で困っているあなたにぴったりです',
    matchSubtitle: 'HLSやDASHの映像も、自動で1つのMP4にまとめて保存できます。',
    preferredView: 'download',
  },
  {
    id: 'clean-record',
    label: '録画すると、周りの文字や広告まで写ってしまう',
    icon: 'record',
    matchHeading: '動画だけ残したいあなたにぴったりです',
    matchSubtitle: 'ページ内の動画要素だけを切り抜いて、余白なしで録画できます。',
    preferredView: 'record',
  },
  {
    id: 'privacy',
    label: '外部の保存サイトにURLを送るのが不安',
    icon: 'check',
    matchHeading: '安全に残したいあなたにぴったりです',
    matchSubtitle: '外部サーバーへ一切送らず、あなたの端末内だけで処理が完結します。',
    preferredView: 'download',
  },
  {
    id: 'unsure',
    label: 'まだわからない・まずは見てみたい',
    icon: 'help',
    matchHeading: 'まずは1本、試してみたいあなたへ',
    matchSubtitle: 'ページ内の動画を見つけて、保存も録画もその場で試せます。',
    preferredView: 'download',
  },
];

export const TRY_CHOICES = [
  {
    id: 'try-save',
    label: 'MP4で保存を試す',
    icon: 'download',
    resultHeading: 'MP4保存の準備が整いました',
    resultSubtitle: '最初の画面を「動画を保存」にして、すぐ保存できるよう開きます。',
    preferredView: 'download',
  },
  {
    id: 'try-record',
    label: 'この動画を録画を試す',
    icon: 'record',
    resultHeading: '動画だけ録画の準備が整いました',
    resultSubtitle: '最初の画面を「録画する（選んだ動画のみ）」にセットして開きます。',
    preferredView: 'record',
  },
  {
    id: 'try-later',
    label: 'あとで本番で選ぶ',
    icon: 'arrow',
    resultHeading: 'いつでも好きな方から始められます',
    resultSubtitle: 'まずは動画候補の一覧を開きます。上部タブでいつでも切り替えられます。',
    preferredView: null,
  },
];

export const VALUE_CATALOG = {
  'value-mp4': {
    id: 'value-mp4',
    role: '価値',
    heading: '分割された配信も、1つのMP4にまとまる',
    subtitle: 'HLSやDASHの動画も、再圧縮せずきれいなMP4で手元に残せます。',
    visualKind: 'value-mp4',
    visualLabel: '分割された映像の断片が1つのMP4ファイルにまとまる図形',
    heroAnimation: 'hero-converge',
    heroMeaning: 'バラバラの断片が中央のMP4カードへ集まり、1つのファイルにまとまる変化を伝える',
    ambientAnimation: 'ambient-pair-calm',
  },
  'value-record': {
    id: 'value-record',
    role: '価値',
    heading: '選んだ動画だけを、クリアに録画できる',
    subtitle: 'ページの文字やメニューを含めず、動画の映像と音だけを記録します。',
    visualKind: 'value-record',
    visualLabel: 'ページ周囲の余白を除き、動画のフレームだけを抜き出して録画する図形',
    heroAnimation: 'hero-focus-frame',
    heroMeaning: '動画フレームだけがくっきり浮かび上がり、余計な表示が入らない変化を伝える',
    ambientAnimation: 'ambient-pair-soft',
  },
  'value-local': {
    id: 'value-local',
    role: '価値',
    heading: '外部へ送らず、あなたの端末だけで完結',
    subtitle: '怪しい変換サイトは不要。開いたページだけを一時的に調べます。',
    visualKind: 'value-local',
    visualLabel: '外部通信を行わず端末内で安全に処理が完結することを表す図形',
    heroAnimation: 'hero-shield-pulse',
    heroMeaning: 'シールドが静かに脈打ちチェックが灯り、手元だけで完結する安心を伝える',
    ambientAnimation: 'ambient-pair-calm',
  },
};

export const PRAISE_CATALOG = {
  small: [
    '確認ありがとうございます。次へ進みます。',
    'その調子です。もう一歩ずつ見ていきましょう。',
    'いいですね。使い方の流れが見えてきました。',
    'ありがとうございます。次のポイントへ移ります。',
  ],
  'medium-concern': [
    '教えてくれてありがとうございます。いちばん合う順番でご案内します。',
    '大切なポイントを選んでくれました。その困りごとに合わせて準備します。',
    '状況がよくわかりました。ぴったりの使い方を先にお見せします。',
  ],
  'medium-try': [
    'その押し方で合っています。本番でも同じボタンからすぐ始められます。',
    'いい手応えですね。選んだ操作を最初の画面にセットしておきます。',
    'バッチリです。実際の動画カードでも同じ手順で残せます。',
  ],
  large: [
    'これで準備はすべて完了です。最初の1本を残してみましょう。',
    '最後までありがとうございます。さっそく現在のページの動画を見てみましょう。',
    '準備が整いました。安心・安全な動画保存をどうぞお楽しみください。',
  ],
};

export class PraiseRotator {
  constructor(initialIndices = {}) {
    this.lastIndexByGroup = {...initialIndices};
  }

  pick(group) {
    if (group === 'neutral') return '';
    const list = PRAISE_CATALOG[group];
    if (!Array.isArray(list) || !list.length) return '';
    const previous = this.lastIndexByGroup[group];
    const nextIndex = Number.isInteger(previous) ? (previous + 1) % list.length : 0;
    this.lastIndexByGroup[group] = nextIndex;
    return list[nextIndex];
  }
}

export function resolveRecommendedState(answers = {}) {
  const concern = CONCERN_CHOICES.find(item => item.id === answers.concern) || CONCERN_CHOICES[3];
  const tryChoice = TRY_CHOICES.find(item => item.id === answers.tryAction);
  const view = tryChoice?.preferredView || concern.preferredView || 'download';
  const recordMode = 'video';
  const welcomeMessage = view === 'record'
    ? 'ガイドで選んだ「選んだ動画のみ」の録画設定を開きました。対象の動画を選んで開始できます。'
    : concern.id === 'stream'
      ? 'ガイドで選んだMP4保存モードで候補を表示しています。「保存」を押すと1つのMP4にまとめます。'
      : concern.id === 'privacy'
        ? '外部通信を行わず、この端末内だけで動画候補を検出しました。'
        : '準備完了です。保存したい動画の「保存」または「この動画を録画」を選んでください。';
  return {
    view,
    recordMode,
    highlightFormat: 'mp4',
    welcomeMessage,
  };
}

export function orderedValuePages(concernId) {
  const order = concernId === 'clean-record'
    ? ['value-record', 'value-mp4']
    : concernId === 'privacy'
      ? ['value-local', 'value-mp4']
      : ['value-mp4', 'value-record'];
  return order.map((key, index) => ({
    ...VALUE_CATALOG[key],
    chapterLabel: `得られる変化の${index + 1}つめ`,
    reactionLevel: 'small',
  }));
}

export function buildOnboardingPages(answers = {}) {
  const concern = CONCERN_CHOICES.find(item => item.id === answers.concern) || CONCERN_CHOICES[3];
  const tryChoice = TRY_CHOICES.find(item => item.id === answers.tryAction) || TRY_CHOICES[2];
  const recommended = resolveRecommendedState(answers);
  const values = orderedValuePages(answers.concern);

  return [
    {
      id: 'hook',
      role: 'フック',
      chapterLabel: 'はじめに',
      heading: '見つけた動画を、そのまま手元へ',
      subtitle: 'ページを開いて選ぶだけ。外部サイトへ送らず残せます。',
      visualKind: 'hook-harbor',
      visualLabel: '港のフレームへ動画カードが静かに収まり、手元に届く様子を表す図形',
      heroAnimation: 'hero-dock',
      heroMeaning: '動画カードが港の枠へ一度だけすっと収まり、安全に手元へ届くことを伝える',
      ambientAnimation: 'ambient-pair-calm',
      reactionLevel: 'small',
    },
    {
      id: 'concern-select',
      role: '選択',
      chapterLabel: '困りごとの選択',
      heading: '動画保存で、困っていることは？',
      subtitle: 'いちばん近いものを押すと、自動で次へ進みます。',
      visualKind: 'concern-select',
      visualLabel: '動画保存の4つの場面を表す選択アイコン図形',
      heroAnimation: 'hero-choices',
      heroMeaning: '選択肢カードが軽く浮き上がり、ここを選んでほしいことを伝える',
      ambientAnimation: 'ambient-single-orb',
      questionKey: 'concern',
      choices: CONCERN_CHOICES,
      reactionLevel: 'medium',
    },
    {
      id: 'concern-match',
      role: 'マッチ',
      chapterLabel: 'ぴったりの理由',
      heading: concern.matchHeading,
      subtitle: concern.matchSubtitle,
      visualKind: 'concern-match',
      visualLabel: '選んだ目的とVideoHarborのアイコンが中央で重なり一致を示す図形',
      heroAnimation: 'hero-merge',
      heroMeaning: '2つの図形が中央へ寄って重なり、選んだ悩みにぴったり合うことを伝える',
      ambientAnimation: 'ambient-pair-calm',
      reactionLevel: 'small',
    },
    {
      id: 'identity',
      role: 'アイデンティティ',
      chapterLabel: 'アプリの目的',
      heading: '保存も録画も、これ1つで完結します',
      subtitle: '直接のファイル保存と、動画だけの録画を自由に切り替えられます。',
      visualKind: 'identity-tabs',
      visualLabel: '動画を保存タブと録画するタブが並んだアプリ画面のモック',
      heroAnimation: 'hero-tabs',
      heroMeaning: '2つのモードタブが順番にハイライトし、保存と録画の2本柱があることを伝える',
      ambientAnimation: 'ambient-pair-soft',
      reactionLevel: 'small',
    },
    values[0],
    values[1],
    {
      id: 'step-1',
      role: 'ステップ',
      stepNumber: 1,
      chapterLabel: '使い方の1つめ',
      heading: '開いて、動画候補を見つける',
      subtitle: '動画があるページで開くと、保存できる候補が自動で並びます。',
      visualKind: 'step-1',
      visualLabel: 'ステップ1、ページを開いて動画候補が一覧に並ぶ画面モック',
      heroAnimation: 'hero-step-draw',
      heroMeaning: '番号1が光り、動画候補カードがすっと現れて最初の手順を伝える',
      ambientAnimation: 'ambient-single-orb',
      reactionLevel: 'small',
    },
    {
      id: 'step-2',
      role: 'ステップ',
      stepNumber: 2,
      chapterLabel: '使い方の2つめ',
      heading: '選んで、保存か録画を押す',
      subtitle: '「保存」でMP4保存、「この動画を録画」で動画だけを残せます。',
      visualKind: 'step-2',
      visualLabel: 'ステップ2、動画カードの保存ボタンまたは録画ボタンを押す画面モック',
      heroAnimation: 'hero-step-press',
      heroMeaning: '番号2へ切り替わり、保存と録画のボタンが光って2つ目の手順を伝える',
      ambientAnimation: 'ambient-single-orb',
      reactionLevel: 'small',
    },
    {
      id: 'step-3',
      role: 'ステップ',
      stepNumber: 3,
      chapterLabel: '使い方の3つめ',
      heading: '確かめて、手元に残す',
      subtitle: '「保存完了」の表示や録画の再生プレビューで、その場で確認できます。',
      visualKind: 'step-3',
      visualLabel: 'ステップ3、保存完了の表示とフォルダ確認ボタンが現れた達成画面モック',
      heroAnimation: 'hero-step-complete',
      heroMeaning: '番号3へ切り替わり、完了チェックと再生確認エリアが開いて3つ目の手順を伝える',
      ambientAnimation: 'ambient-single-wave',
      reactionLevel: 'small',
    },
    {
      id: 'try-interaction',
      role: 'インタラクション',
      chapterLabel: '最初の試し操作',
      heading: '試しに、1本だけ操作してみる',
      subtitle: '本物のカードのミニ版です。押すと自動で結果へ進みます。',
      visualKind: 'try-mini-card',
      visualLabel: 'サンプルの動画カードで保存または録画を実際に試せるミニ操作画面',
      heroAnimation: 'hero-try-invite',
      heroMeaning: 'ミニカード内の操作ボタンが優しく脈打ち、実際に押して試せることを伝える',
      ambientAnimation: 'ambient-single-orb',
      questionKey: 'tryAction',
      choices: TRY_CHOICES,
      reactionLevel: 'medium',
    },
    {
      id: 'try-result',
      role: 'マッチ',
      chapterLabel: '試し操作の結果',
      heading: tryChoice.resultHeading,
      subtitle: tryChoice.resultSubtitle,
      visualKind: 'try-result',
      visualLabel: '試した操作が完了し、本体の初期設定へ引き継がれたことを示す図形',
      heroAnimation: 'hero-result-bloom',
      heroMeaning: '完了バッジが一度だけ広がって収まり、試し操作の達成と引き継ぎを伝える',
      ambientAnimation: 'ambient-pair-calm',
      reactionLevel: 'small',
    },
    {
      id: 'expectation',
      role: '期待',
      chapterLabel: 'これからの体験',
      heading: '大切な場面が、いつでも手元に並ぶ',
      subtitle: '通信環境に左右されず、残したい動画を自分のコレクションにできます。',
      visualKind: 'expectation-collection',
      visualLabel: '保存した動画カードがコレクションとして綺麗に並んでいく図形',
      heroAnimation: 'hero-collection-grow',
      heroMeaning: '動画カードが1枚ずつ整然と重なり、少しずつコレクションが育つワクワクを伝える',
      ambientAnimation: 'ambient-pair-soft',
      reactionLevel: 'small',
    },
    {
      id: 'connection',
      role: '接続',
      chapterLabel: '最初の1本へ',
      heading: '最初の1本を、見つけにいく',
      subtitle: recommended.view === 'record'
        ? '「録画する」画面を開いて、ページ内の動画をすぐ1つ選べます。'
        : '「動画を保存」画面を開いて、見つかった候補をすぐ1つ保存できます。',
      visualKind: 'connection-launch',
      visualLabel: 'オンボーディングを終えて本体の動画一覧または録画画面へ直行する案内図形',
      heroAnimation: 'hero-cta-pulse',
      heroMeaning: '主ボタンと開始アイコンが静かに脈打ち、ここを押せばすぐ使えることを伝える',
      ambientAnimation: 'ambient-single-wave',
      ctaLabel: recommended.view === 'record' ? '録画する画面を開く' : '動画候補の一覧を開く',
      reactionLevel: 'large',
    },
  ];
}

export function computeWindowDots(currentIndex, totalPages) {
  const total = Math.max(1, Number(totalPages) || 1);
  const current = Math.max(0, Math.min(Number(currentIndex) || 0, total - 1));
  const windowSize = Math.min(5, total);
  const windowStart = Math.max(0, Math.min(current - 2, total - windowSize));
  const hasMoreLeft = windowStart > 0;
  const hasMoreRight = windowStart + windowSize < total;
  const dots = [];
  for (let offset = 0; offset < windowSize; offset++) {
    const pageIndex = windowStart + offset;
    const distance = Math.abs(pageIndex - current);
    let size = 'normal';
    if (pageIndex === current) {
      size = 'active';
    } else if ((offset === 0 && hasMoreLeft) || (offset === windowSize - 1 && hasMoreRight)) {
      size = 'small';
    } else if (distance === 1) {
      size = 'medium';
    }
    dots.push({
      pageIndex,
      active: pageIndex === current,
      size,
    });
  }
  return {
    windowSize,
    windowStart,
    hasMoreLeft,
    hasMoreRight,
    isFinalPage: current === total - 1,
    dots,
  };
}

export function triggerHaptic(level, env = globalThis) {
  if (!level || level === 'neutral') return false;
  try {
    if (env.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;
    const pattern = level === 'small' ? 8 : level === 'medium' ? 16 : 22;
    if (typeof env.navigator?.vibrate === 'function') {
      return Boolean(env.navigator.vibrate(pattern));
    }
  } catch {
    return false;
  }
  return false;
}

function defaultStorage(env = globalThis) {
  const chromeStore = env.chrome?.storage?.local;
  if (chromeStore && typeof chromeStore.get === 'function' && typeof chromeStore.set === 'function') {
    return {
      async load() {
        const data = await chromeStore.get(ONBOARDING_STORAGE_KEY);
        return data?.[ONBOARDING_STORAGE_KEY] || null;
      },
      async save(value) {
        await chromeStore.set({[ONBOARDING_STORAGE_KEY]: value});
      },
    };
  }
  return {
    async load() {
      try {
        const raw = env.localStorage?.getItem(ONBOARDING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async save(value) {
      try {
        env.localStorage?.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(value));
      } catch {}
    },
  };
}

export function shouldShowOnboarding(storedState, currentVersion = ONBOARDING_VERSION) {
  if (!storedState || typeof storedState !== 'object') return true;
  return storedState.completedVersion !== currentVersion;
}

export class OnboardingStateController {
  constructor({version = ONBOARDING_VERSION, storage, delayMs = 300, env = globalThis, onUpdate, onComplete} = {}) {
    this.version = version;
    this.storage = storage || defaultStorage(env);
    this.delayMs = delayMs;
    this.env = env;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.praiseRotator = new PraiseRotator();
    this.currentIndex = 0;
    this.answers = {concern: null, tryAction: null};
    this.completedVersion = null;
    this.active = false;
    this.transitioning = false;
    this.lastReaction = null;
    this.events = [];
    this._timer = null;
  }

  pages() {
    return buildOnboardingPages(this.answers);
  }

  currentPage() {
    const pages = this.pages();
    return pages[Math.min(this.currentIndex, pages.length - 1)];
  }

  windowDots() {
    return computeWindowDots(this.currentIndex, this.pages().length);
  }

  recordEvent(type, detail = {}) {
    // Privacy-first local event log: never includes personal identifiers or sensitive text.
    const page = this.currentPage();
    this.events.push({
      type,
      pageId: page?.id || '',
      role: page?.role || '',
      ...(detail.action ? {action: String(detail.action)} : {}),
    });
    if (this.events.length > 100) this.events.shift();
  }

  async initialize({autoOpen = false, forceOpen = false} = {}) {
    const saved = await this.storage.load();
    if (saved && typeof saved === 'object') {
      this.completedVersion = saved.completedVersion ?? null;
      if (saved.answers && typeof saved.answers === 'object') {
        this.answers = {
          concern: typeof saved.answers.concern === 'string' ? saved.answers.concern : null,
          tryAction: typeof saved.answers.tryAction === 'string' ? saved.answers.tryAction : null,
        };
      }
      if (saved.lastPraiseIndices && typeof saved.lastPraiseIndices === 'object') {
        this.praiseRotator = new PraiseRotator(saved.lastPraiseIndices);
      }
    }
    const needsOnboarding = forceOpen || (autoOpen && shouldShowOnboarding(saved, this.version));
    if (needsOnboarding) {
      this.open();
    } else {
      this._notify();
    }
    return this.snapshot();
  }

  open(startIndex = 0) {
    this._clearTimer();
    this.transitioning = false;
    this.active = true;
    this.currentIndex = Math.max(0, Math.min(startIndex, this.pages().length - 1));
    this.lastReaction = null;
    this.recordEvent('page_view');
    this._notify();
    return this.snapshot();
  }

  next() {
    if (!this.active) return this.snapshot();
    const page = this.currentPage();
    // Choice pages do not allow skipping the choice via generic Next button.
    if (page.questionKey) return this.snapshot();
    this._clearTimer();
    this.transitioning = false;
    const pages = this.pages();
    if (this.currentIndex >= pages.length - 1) {
      return this.complete();
    }
    const praise = this.praiseRotator.pick('small');
    const haptic = triggerHaptic('small', this.env);
    this.currentIndex += 1;
    const nextPage = this.currentPage();
    // Question pages show only the question and choices on entry; praise is shown when a choice is pressed.
    this.lastReaction = {
      level: 'small',
      praise: nextPage?.questionKey ? '' : praise,
      haptic,
      targetId: page.id,
    };
    this.recordEvent('page_view', {action: 'next'});
    this._notify();
    return this.snapshot();
  }

  back() {
    if (!this.active) return this.snapshot();
    this._clearTimer();
    this.transitioning = false;
    if (this.currentIndex <= 0) return this.snapshot();
    // Neutral reaction on Back: no praise, no success haptic.
    this.lastReaction = {level: 'neutral', praise: '', haptic: false, targetId: 'back'};
    this.currentIndex -= 1;
    this.recordEvent('page_view', {action: 'back'});
    this._notify();
    return this.snapshot();
  }

  async skip() {
    if (!this.active) return this.snapshot();
    this._clearTimer();
    this.transitioning = false;
    // Neutral reaction on Skip: no praise, no success haptic, no scolding.
    this.lastReaction = {level: 'neutral', praise: '', haptic: false, targetId: 'skip'};
    this.recordEvent('skip');
    this.completedVersion = this.version;
    this.active = false;
    await this._persist();
    this._notify();
    const recommended = resolveRecommendedState(this.answers);
    await this.onComplete?.({skipped: true, recommended, answers: {...this.answers}});
    return this.snapshot();
  }

  selectOption(choiceId) {
    if (!this.active || this.transitioning) return Promise.resolve(this.snapshot());
    const page = this.currentPage();
    if (!page?.questionKey || !Array.isArray(page.choices)) return Promise.resolve(this.snapshot());
    const valid = page.choices.find(choice => choice.id === choiceId);
    if (!valid) return Promise.resolve(this.snapshot());

    this.transitioning = true;
    this.answers[page.questionKey] = valid.id;
    const praiseGroup = page.questionKey === 'concern' ? 'medium-concern' : 'medium-try';
    const praise = this.praiseRotator.pick(praiseGroup);
    const haptic = triggerHaptic('medium', this.env);
    this.lastReaction = {
      level: 'medium',
      praise,
      haptic,
      choiceId: valid.id,
      questionKey: page.questionKey,
    };
    this.recordEvent('answer', {action: page.questionKey});
    this._notify();

    return new Promise(resolve => {
      this._timer = setTimeout(() => {
        this._timer = null;
        if (!this.active) {
          this.transitioning = false;
          resolve(this.snapshot());
          return;
        }
        this.transitioning = false;
        this.currentIndex = Math.min(this.currentIndex + 1, this.pages().length - 1);
        this.recordEvent('page_view', {action: 'auto_advance'});
        this._notify();
        resolve(this.snapshot());
      }, this.delayMs);
    });
  }

  async complete() {
    if (!this.active) return this.snapshot();
    this._clearTimer();
    this.transitioning = false;
    const praise = this.praiseRotator.pick('large');
    const haptic = triggerHaptic('large', this.env);
    this.lastReaction = {level: 'large', praise, haptic, targetId: 'complete'};
    this.recordEvent('complete');
    this.completedVersion = this.version;
    this.active = false;
    await this._persist();
    this._notify();
    const recommended = resolveRecommendedState(this.answers);
    await this.onComplete?.({skipped: false, praise, recommended, answers: {...this.answers}});
    return this.snapshot();
  }

  async _persist() {
    await this.storage.save({
      completedVersion: this.completedVersion,
      answers: {...this.answers},
      lastPraiseIndices: {...this.praiseRotator.lastIndexByGroup},
    });
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _notify() {
    this.onUpdate?.(this.snapshot());
  }

  snapshot() {
    const pages = this.pages();
    const index = Math.min(this.currentIndex, pages.length - 1);
    const page = pages[index];
    return {
      active: this.active,
      transitioning: this.transitioning,
      version: this.version,
      completedVersion: this.completedVersion,
      currentIndex: index,
      page,
      windowDots: computeWindowDots(index, pages.length),
      answers: {...this.answers},
      recommended: resolveRecommendedState(this.answers),
      lastReaction: this.lastReaction ? {...this.lastReaction} : null,
      eventsCount: this.events.length,
    };
  }
}

export function createVisualElement(page, iconFactory) {
  const stage = document.createElement('div');
  stage.className = `onboarding-visual-scene scene-${page.visualKind} ${page.heroAnimation} ${page.ambientAnimation}`;

  const ambientA = document.createElement('span');
  ambientA.className = 'ambient-shape ambient-a';
  ambientA.setAttribute('aria-hidden', 'true');
  stage.append(ambientA);

  if (page.ambientAnimation.startsWith('ambient-pair')) {
    const ambientB = document.createElement('span');
    ambientB.className = 'ambient-shape ambient-b';
    ambientB.setAttribute('aria-hidden', 'true');
    stage.append(ambientB);
  }

  const hero = document.createElement('div');
  hero.className = 'onboarding-hero-graphic';
  hero.setAttribute('aria-hidden', 'true');

  if (page.stepNumber) {
    const stepBadge = document.createElement('span');
    stepBadge.className = 'onboarding-step-badge';
    stepBadge.textContent = `STEP ${page.stepNumber}`;
    hero.append(stepBadge);
  }

  const cardMock = document.createElement('div');
  cardMock.className = 'onboarding-mock-card';

  switch (page.visualKind) {
    case 'hook-harbor': {
      const dock = document.createElement('div');
      dock.className = 'mock-harbor-dock';
      dock.append(iconFactory('video'), iconFactory('arrow'), iconFactory('download'));
      const tag = document.createElement('span');
      tag.className = 'mock-pill';
      tag.textContent = 'MP4 · WebM ローカル保存';
      cardMock.append(dock, tag);
      break;
    }
    case 'concern-select': {
      const row = document.createElement('div');
      row.className = 'mock-icon-trio';
      row.append(iconFactory('file'), iconFactory('record'), iconFactory('check'));
      const label = document.createElement('span');
      label.className = 'mock-pill';
      label.textContent = 'あなたの場面を1つ選択';
      cardMock.append(row, label);
      break;
    }
    case 'concern-match': {
      const merge = document.createElement('div');
      merge.className = 'mock-merge-pair';
      const left = document.createElement('span');
      left.className = 'merge-node merge-left';
      left.append(iconFactory('video'));
      const right = document.createElement('span');
      right.className = 'merge-node merge-right';
      right.append(iconFactory('check'));
      merge.append(left, right);
      const badge = document.createElement('span');
      badge.className = 'mock-pill success-pill';
      badge.textContent = 'VideoHarbor がぴったり';
      cardMock.append(merge, badge);
      break;
    }
    case 'identity-tabs': {
      const tabs = document.createElement('div');
      tabs.className = 'mock-segmented-tabs';
      const t1 = document.createElement('span');
      t1.className = 'mock-tab active-first';
      t1.append(iconFactory('download'), document.createTextNode('動画を保存'));
      const t2 = document.createElement('span');
      t2.className = 'mock-tab active-second';
      t2.append(iconFactory('record'), document.createTextNode('録画する'));
      tabs.append(t1, t2);
      cardMock.append(tabs);
      break;
    }
    case 'value-mp4': {
      const flow = document.createElement('div');
      flow.className = 'mock-segment-flow';
      for (const label of ['区間1', '区間2', '区間3']) {
        const chip = document.createElement('span');
        chip.className = 'mock-segment-chip';
        chip.textContent = label;
        flow.append(chip);
      }
      const out = document.createElement('span');
      out.className = 'mock-pill success-pill';
      out.append(iconFactory('file'), document.createTextNode('1つの .mp4 に結合'));
      cardMock.append(flow, out);
      break;
    }
    case 'value-record': {
      const frame = document.createElement('div');
      frame.className = 'mock-clean-frame';
      frame.append(iconFactory('play'));
      const caption = document.createElement('span');
      caption.className = 'mock-pill success-pill';
      caption.textContent = '選んだ動画の映像と音だけ';
      cardMock.append(frame, caption);
      break;
    }
    case 'value-local': {
      const shield = document.createElement('div');
      shield.className = 'mock-shield-box';
      shield.append(iconFactory('check'));
      const caption = document.createElement('span');
      caption.className = 'mock-pill success-pill';
      caption.textContent = '外部送信ゼロ · 端末内処理';
      cardMock.append(shield, caption);
      break;
    }
    case 'step-1':
    case 'step-2':
    case 'step-3': {
      const row = document.createElement('div');
      row.className = 'mock-step-video-row';
      const thumb = document.createElement('span');
      thumb.className = 'mock-step-thumb';
      thumb.append(iconFactory('play'));
      const info = document.createElement('div');
      info.className = 'mock-step-info';
      const title = document.createElement('strong');
      title.textContent = 'ページ内の動画 · 01:24';
      const sub = document.createElement('span');
      sub.className = 'mock-step-sub';
      sub.textContent = page.stepNumber === 1
        ? '候補を自動で検出しました'
        : page.stepNumber === 2
          ? 'MP4（.mp4） · 保存 または 録画'
          : '保存完了 · MP4';
      info.append(title, sub);
      const actionBadge = document.createElement('span');
      actionBadge.className = `mock-step-cta step-cta-${page.stepNumber}`;
      actionBadge.append(
        iconFactory(page.stepNumber === 1 ? 'video' : page.stepNumber === 2 ? 'download' : 'check'),
        document.createTextNode(page.stepNumber === 1 ? '検出済み' : page.stepNumber === 2 ? '保存 / 録画' : '確認OK'),
      );
      row.append(thumb, info, actionBadge);
      cardMock.append(row);
      break;
    }
    case 'try-mini-card': {
      const row = document.createElement('div');
      row.className = 'mock-step-video-row';
      const thumb = document.createElement('span');
      thumb.className = 'mock-step-thumb';
      thumb.append(iconFactory('play'));
      const info = document.createElement('div');
      info.className = 'mock-step-info';
      const title = document.createElement('strong');
      title.textContent = 'サンプル動画 · 港の風景';
      const sub = document.createElement('span');
      sub.className = 'mock-step-sub';
      sub.textContent = '01:24 · 再生中 · MP4 / WebM対応';
      info.append(title, sub);
      row.append(thumb, info);
      cardMock.append(row);
      break;
    }
    case 'try-result': {
      const done = document.createElement('div');
      done.className = 'mock-shield-box';
      done.append(iconFactory('check'));
      const badge = document.createElement('span');
      badge.className = 'mock-pill success-pill';
      badge.textContent = '初期画面へ反映済み';
      cardMock.append(done, badge);
      break;
    }
    case 'expectation-collection': {
      const stack = document.createElement('div');
      stack.className = 'mock-collection-stack';
      for (const name of ['お気に入り映像 01.mp4', '講義クリップ 02.webm', 'ハイライト 03.mp4']) {
        const item = document.createElement('div');
        item.className = 'mock-collection-item';
        item.append(iconFactory('file'), document.createTextNode(name));
        stack.append(item);
      }
      cardMock.append(stack);
      break;
    }
    case 'connection-launch':
    default: {
      const launch = document.createElement('div');
      launch.className = 'mock-harbor-dock';
      launch.append(iconFactory('play'), iconFactory('arrow'), iconFactory('check'));
      const badge = document.createElement('span');
      badge.className = 'mock-pill success-pill';
      badge.textContent = '準備完了 · すぐ使えます';
      cardMock.append(launch, badge);
      break;
    }
  }

  hero.append(cardMock);
  stage.append(hero);
  return stage;
}
