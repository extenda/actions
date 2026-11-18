import { describe, expect, test } from 'vitest';

import {
  checkTasks,
  hasUnticked,
  headingKey,
  isTask,
  keyFromTitle,
  ticksOnly,
} from '../src/tasks-md.js';

describe('task pattern (OpenSpec 2.0.0 task-progress)', () => {
  test.each([
    '- [ ] a',
    '- [x] a',
    '- [X] a',
    '* [ ] a',
    '+ [ ] a',
    '1. [ ] a',
    '12) [ ] a',
    '  - [ ] a',
    '- [] a',
    '- [  ] a',
    '- [ ](x) a',
    '- [ ][x] a',
    '-[ ] a',
    '- [x]',
  ])('counts %j', (line) => expect(isTask(line)).toBe(true));

  test.each([
    '- [docs](x) a',
    '- [x](y)',
    '- [x][y]',
    '- text',
    '[ ] no bullet',
    '## 1. a: b (K-1)',
    '- [xx] a',
  ])('does not count %j', (line) => expect(isTask(line)).toBe(false));

  test('unticked boxes', () => {
    expect(hasUnticked('- [ ] a\n')).toBe(true);
    expect(hasUnticked('- [] a\n')).toBe(true);
    expect(hasUnticked('- [  ] a\n')).toBe(true);
    expect(hasUnticked('- [ ](x)\n')).toBe(true);
    expect(hasUnticked('- [x] a\n- [X] b\n')).toBe(false);
    expect(hasUnticked('text\n')).toBe(false);
  });
});

describe('ticksOnly', () => {
  test.each([
    ['- [ ] a\n', '- [x] a\n', true],
    ['- [] a\n', '- [x] a\n', true],
    ['- [  ] a\n', '- [X] a\n', true],
    ['* [ ] a\n', '* [x] a\n', true],
    ['- [ ] a\n- [ ] b\n', '- [x] a\n- [ ] b\n', true],
    ['a\n', 'a\n', true],
    ['- [x] a\n', '- [ ] a\n', false],
    ['- [ ] a\n', '- [x] changed\n', false],
    ['- [ ] a\n', '- [x] a\n- [ ] b\n', false],
    ['- [ ] a\n- [ ] b\n', '- [x] a\n', false],
    ['text\n', 'other\n', false],
    ['- [ ] a\n', '- [y] a\n', false],
    ['- [ ] a\n', '- [X] a\n', true],
    ['- [ ] a [X]\n', '- [x] a [X]\n', true],
    ['- [ ] a [x]\n', '- [x] a [X]\n', false],
    ['1. [ ] a [ ]\n', '1. [x] a [ ]\n', true],
    ['- [ ] a [ ]\n', '- [ ] a [x]\n', false],
  ])('%j -> %j is %s', (o, n, want) => expect(ticksOnly(o, n)).toBe(want));
});

describe('headingKey', () => {
  test('takes the last parenthesis', () => {
    expect(headingKey('## 1. repo: Fix (a) thing (HICC-3)  ')).toBe('HICC-3');
    expect(headingKey('## 1. repo: Title (TBD)')).toBe('TBD');
  });
});

describe('linear time on adversarial lines', () => {
  const long = 'a('.repeat(50000);
  test.each([
    ['headingKey', () => headingKey(`## 1. r: t ${long}   `)],
    [
      'checkTasks',
      () => checkTasks(`## 1. r: ${long}\n- [ ${' '.repeat(50000)}x\n`),
    ],
    [
      'ticksOnly',
      () =>
        ticksOnly(`- [${' '.repeat(50000)}]\n`, `- [${' '.repeat(50000)}]x\n`),
    ],
    ['keyFromTitle', () => keyFromTitle(`feat(${long}`)],
  ])('%s finishes fast', (_, fn) => {
    const start = Date.now();
    fn();
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe('checkTasks', () => {
  test('reports every problem with its line', () => {
    const problems = checkTasks(
      '## 1. a: b (HICC-1)\n## 3. c: d (nope)\n- [ ] x\n',
      { draft: false },
    );
    expect(problems.map((p) => p.line)).toEqual([2, 2]);
  });

  test('uses numeric group numbers like awk', () => {
    expect(checkTasks('## 01. a: b (HICC-1)\n', { draft: false })).toEqual([]);
  });

  test('a malformed heading still starts a group', () => {
    const p = checkTasks('## nope\n- [ ] 1.1 a\n', { draft: false });
    expect(p).toHaveLength(1);
    expect(p[0].message).toContain('heading must be');
  });

  test('a ### heading is not a group', () => {
    expect(
      checkTasks('## 1. a: b (HICC-1)\n### Sub\n- [ ] x\n', { draft: false }),
    ).toEqual([]);
  });

  test('max tasks is configurable', () => {
    const body = '## 1. a: b (HICC-1)\n- [ ] 1\n- [ ] 2\n- [ ] 3\n';
    expect(checkTasks(body, { draft: false, maxTasks: 2 })).toHaveLength(1);
    expect(checkTasks(body, { draft: false })).toEqual([]);
  });
});

describe('keyFromTitle', () => {
  test.each([
    ['feat(HICC-12): Add x', 'HICC-12'],
    ['FEAT(hicc-12)!: Break z', 'HICC-12'],
    ['feat(AB2-7): x', 'AB2-7'],
  ])('%j has key %s', (title, key) =>
    expect(keyFromTitle(title)).toEqual({ status: 'key', key }),
  );

  test.each([
    'feat: no scope',
    'feat(parser): not a key',
    'feat(HICC-12, other): two scopes',
    'feat!: breaking without scope',
    'feat(): empty',
    'feat(1A-2): starts with a digit',
  ])('%j is a feat without a key', (title) =>
    expect(keyFromTitle(title).status).toBe('missing'),
  );

  test.each([
    'fix: no scope',
    'fix(HICC-12): fix keys are not checked',
    'chore(deps): Bump x',
    'docs: Update readme',
    'test(HICC-12): More tests',
    'Add something',
    'feature(HICC-1): x',
    ' feat(HICC-1): leading space',
  ])('%j does not apply', (title) =>
    expect(keyFromTitle(title).status).toBe('skip'),
  );
});

describe('group keys', () => {
  const two = (a, b) =>
    `## 1. my-repo: One (${a})\n\n- [ ] 1.1 a\n\n## 2. my-repo: Two (${b})\n\n- [ ] 2.1 b\n`;

  test('a key in two groups of one tasks.md is rejected', () => {
    const problems = checkTasks(two('HICC-1', 'HICC-1'));
    expect(problems).toEqual([
      {
        line: 5,
        message: '"HICC-1" is the key of more than one group of this tasks.md.',
      },
    ]);
  });

  test('different keys, and (TBD) twice in a draft, are fine', () => {
    expect(checkTasks(two('HICC-1', 'HICC-2'))).toEqual([]);
    expect(checkTasks(two('TBD', 'TBD'), { draft: true })).toEqual([]);
  });

  test('a key used in another change of the store is rejected', () => {
    const usedKeys = new Map([['HICC-2', 'openspec/changes/other/tasks.md']]);
    expect(checkTasks(two('HICC-1', 'HICC-2'), { usedKeys })).toEqual([
      {
        line: 5,
        message:
          '"HICC-2" is already the key of a group in openspec/changes/other/tasks.md.',
      },
    ]);
  });
});
