import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_VERSION,
  CONCERN_CHOICES,
  TRY_CHOICES,
  PRAISE_CATALOG,
  PraiseRotator,
  buildOnboardingPages,
  computeWindowDots,
  orderedValuePages,
  resolveRecommendedState,
  shouldShowOnboarding,
  triggerHaptic,
  OnboardingStateController,
} from '../extension/onboarding.js';

const ALLOWED_ROLES = new Set([
  'フック',
  '選択',
  'マッチ',
  'アイデンティティ',
  '価値',
  'ステップ',
  'インタラクション',
  '期待',
  '接続',
]);

test('onboarding page map follows 1-page-1-claim, length limits, and 2-layer animation metadata across all answer combinations', () => {
  for (const concern of [...CONCERN_CHOICES.map(c => c.id), null]) {
    for (const tryAction of [...TRY_CHOICES.map(c => c.id), null]) {
      const pages = buildOnboardingPages({concern, tryAction});
      assert.equal(pages.length, 13, 'page count stays within the 10-15 standard range');
      for (const page of pages) {
        assert.ok(ALLOWED_ROLES.has(page.role), `valid role for ${page.id}: ${page.role}`);
        assert.ok(page.heading.length > 0 && page.heading.length <= 20, `${page.id} heading within 20 chars: ${page.heading} (${page.heading.length})`);
        assert.ok(!page.heading.includes('\n'), `${page.id} heading is a single line`);
        assert.ok(!/して、.*もでき/.test(page.heading), `${page.id} heading does not pack two claims`);
        assert.ok(page.subtitle.length > 0 && page.subtitle.length <= 60, `${page.id} subtitle within 60 chars`);
        assert.ok(!/必ず|絶対に|誰でも/.test(page.heading + page.subtitle), `${page.id} avoids guaranteed-outcome words`);
        assert.ok(page.visualKind && page.visualLabel, `${page.id} defines a visual hero and accessible description`);
        assert.ok(page.heroAnimation && page.heroMeaning.length >= 10, `${page.id} documents hero animation target and meaning`);
        assert.ok(page.ambientAnimation, `${page.id} defines ambient animation`);
      }
    }
  }
});

test('three steps are exactly 3 pages, start with verbs, and appear in order', () => {
  const pages = buildOnboardingPages();
  const steps = pages.filter(page => page.role === 'ステップ');
  assert.equal(steps.length, 3);
  assert.deepEqual(steps.map(step => step.stepNumber), [1, 2, 3]);
  assert.match(steps[0].heading, /^開いて、/);
  assert.match(steps[1].heading, /^選んで、/);
  assert.match(steps[2].heading, /^確かめて、/);
});

test('question pages and result pages are strictly separated and reorder value pages and initial state', () => {
  const streamPages = buildOnboardingPages({concern: 'stream', tryAction: 'try-save'});
  assert.equal(streamPages[1].role, '選択');
  assert.equal(streamPages[2].role, 'マッチ');
  assert.equal(streamPages[2].choices, undefined, 'match page never re-renders choices');
  assert.match(streamPages[2].heading, /分割動画で困っているあなたにぴったり/);
  assert.equal(streamPages[4].id, 'value-mp4', 'stream concern places MP4 value first');

  const recordPages = buildOnboardingPages({concern: 'clean-record', tryAction: 'try-record'});
  assert.match(recordPages[2].heading, /動画だけ残したいあなたにぴったり/);
  assert.equal(recordPages[4].id, 'value-record', 'clean-record concern places video-only recording value first');
  assert.equal(recordPages[5].id, 'value-mp4');
  assert.equal(recordPages[9].role, 'インタラクション');
  assert.equal(recordPages[10].role, 'マッチ');
  assert.equal(recordPages[10].choices, undefined, 'try-result page never re-renders choices');
  assert.match(recordPages[10].heading, /動画だけ録画の準備が整いました/);
  assert.equal(recordPages[12].ctaLabel, '録画する画面を開く');

  const privacyValues = orderedValuePages('privacy');
  assert.equal(privacyValues[0].id, 'value-local', 'privacy concern places local-processing value first');

  const unsurePages = buildOnboardingPages({concern: 'unsure', tryAction: 'try-later'});
  assert.equal(unsurePages[2].heading, 'まずは1本、試してみたいあなたへ', 'escape hatch uses non-assertive invitation');
  assert.equal(resolveRecommendedState({concern: 'clean-record', tryAction: 'try-later'}).view, 'record');
  assert.equal(resolveRecommendedState({concern: 'stream', tryAction: 'try-record'}).view, 'record');
  assert.equal(resolveRecommendedState({concern: 'clean-record', tryAction: 'try-save'}).view, 'download');
});

test('window dots show at most 5 dots, slide the window smoothly, and move active dot on every page step', () => {
  const total = 13;
  let previousActivePage = -1;
  for (let index = 0; index < total; index++) {
    const state = computeWindowDots(index, total);
    assert.equal(state.windowSize, 5, 'never displays more than 5 dots');
    assert.equal(state.dots.length, 5);
    const activeDots = state.dots.filter(dot => dot.active);
    assert.equal(activeDots.length, 1, 'exactly one dot is active on each page');
    assert.equal(activeDots[0].pageIndex, index, 'active dot advances 1-for-1 with the page');
    assert.notEqual(activeDots[0].pageIndex, previousActivePage);
    previousActivePage = activeDots[0].pageIndex;
  }
  const startWindow = computeWindowDots(0, total);
  assert.equal(startWindow.windowStart, 0);
  assert.equal(startWindow.hasMoreLeft, false);
  assert.equal(startWindow.hasMoreRight, true);
  assert.equal(startWindow.dots[4].size, 'small', 'right edge is small when more pages follow');

  const midWindow = computeWindowDots(6, total);
  assert.equal(midWindow.windowStart, 4);
  assert.equal(midWindow.hasMoreLeft, true);
  assert.equal(midWindow.hasMoreRight, true);
  assert.equal(midWindow.dots[0].size, 'small');
  assert.equal(midWindow.dots[2].size, 'active');
  assert.equal(midWindow.dots[4].size, 'small');

  const endWindow = computeWindowDots(12, total);
  assert.equal(endWindow.windowStart, 8);
  assert.equal(endWindow.hasMoreLeft, true);
  assert.equal(endWindow.hasMoreRight, false);
  assert.equal(endWindow.isFinalPage, true);
  assert.equal(endWindow.dots[4].active, true);
});

test('praise rotator provides at least 3 variations per level and never repeats consecutively', () => {
  const rotator = new PraiseRotator();
  for (const group of ['small', 'medium-concern', 'medium-try', 'large']) {
    assert.ok(PRAISE_CATALOG[group].length >= 3, `${group} has at least 3 praise variations`);
    let prev = '';
    for (let i = 0; i < 10; i++) {
      const next = rotator.pick(group);
      assert.ok(next.length > 0);
      assert.notEqual(next, prev, `${group} never repeats the same praise back-to-back`);
      prev = next;
    }
  }
  assert.equal(rotator.pick('neutral'), '');
});

test('haptic feedback respects reduced motion and neutral actions', () => {
  const calls = [];
  const activeEnv = {
    matchMedia: () => ({matches: false}),
    navigator: {vibrate: pattern => { calls.push(pattern); return true; }},
  };
  assert.equal(triggerHaptic('neutral', activeEnv), false);
  assert.equal(triggerHaptic('small', activeEnv), true);
  assert.equal(triggerHaptic('medium', activeEnv), true);
  assert.equal(triggerHaptic('large', activeEnv), true);
  assert.deepEqual(calls, [8, 16, 22]);

  const reducedEnv = {
    matchMedia: () => ({matches: true}),
    navigator: {vibrate: () => { throw new Error('must not vibrate when reduced motion is enabled'); }},
  };
  assert.equal(triggerHaptic('large', reducedEnv), false);
});

test('controller auto-advances on option selection, guards against double-taps, allows back re-selection, and persists version', async () => {
  let savedData = null;
  let completedPayload = null;
  const storage = {
    async load() { return savedData; },
    async save(value) { savedData = value; },
  };
  const controller = new OnboardingStateController({
    storage,
    delayMs: 20,
    onComplete: payload => { completedPayload = payload; },
  });

  await controller.initialize({autoOpen: true});
  assert.equal(controller.active, true);
  assert.equal(controller.currentIndex, 0);

  // Advance from Hook (0) to Concern Select (1)
  controller.next();
  assert.equal(controller.currentIndex, 1);
  assert.equal(controller.lastReaction.level, 'small');

  // Generic next() on a question page is a no-op
  controller.next();
  assert.equal(controller.currentIndex, 1);

  // Select concern option and verify double-tap guard + auto-advance to Match (2)
  const firstPromise = controller.selectOption('clean-record');
  assert.equal(controller.transitioning, true);
  assert.equal(controller.lastReaction.level, 'medium');
  assert.ok(controller.lastReaction.praise.length > 0);
  // Second tap during transition is ignored
  await controller.selectOption('stream');
  await firstPromise;
  assert.equal(controller.currentIndex, 2);
  assert.equal(controller.answers.concern, 'clean-record');
  assert.equal(controller.currentPage().role, 'マッチ');

  // Going back from Match (2) returns to Concern Select (1) with neutral reaction
  controller.back();
  assert.equal(controller.currentIndex, 1);
  assert.equal(controller.lastReaction.level, 'neutral');
  assert.equal(controller.lastReaction.praise, '');

  // Re-select a different option
  await controller.selectOption('stream');
  assert.equal(controller.currentIndex, 2);
  assert.equal(controller.answers.concern, 'stream');

  // Advance through pages 2 -> 9 (Try Interaction)
  for (let page = 2; page < 9; page++) {
    controller.next();
  }
  assert.equal(controller.currentIndex, 9);
  assert.equal(controller.currentPage().id, 'try-interaction');

  await controller.selectOption('try-record');
  assert.equal(controller.currentIndex, 10);
  assert.equal(controller.currentPage().id, 'try-result');

  controller.next(); // -> 11 (expectation)
  assert.equal(controller.currentIndex, 11);
  controller.next(); // -> 12 (connection)
  assert.equal(controller.currentIndex, 12);
  await controller.next(); // completes onboarding on connection page
  assert.equal(controller.active, false);
  assert.equal(controller.completedVersion, ONBOARDING_VERSION);
  assert.equal(completedPayload.skipped, false);
  assert.equal(completedPayload.recommended.view, 'record');
  assert.equal(shouldShowOnboarding(savedData, ONBOARDING_VERSION), false);
  assert.equal(shouldShowOnboarding(savedData, ONBOARDING_VERSION + 1), true, 'version bump re-enables onboarding');
});
