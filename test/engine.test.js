import test from 'node:test';
import assert from 'node:assert/strict';
import { MemeEngine } from '../src/engine.js';

const gift = (userId, diamondCount, extra = {}) => ({
  user: { userId, uniqueId: userId, profilePictureUrl: 'https://example.com/pfp.png' },
  diamondCount, repeatCount: 1, ...extra
});
const chat = (userId, comment = '!meme') => ({ user: { userId, uniqueId: userId }, comment });

test('ranks by observed diamonds with three display slots', () => {
  const engine = new MemeEngine();
  for (const [id, diamonds] of [['a', 5], ['b', 20], ['c', 10], ['d', 40]]) {
    engine.recordGift(gift(id, diamonds));
  }
  assert.deepEqual(engine.top3().map(x => x.userId), ['d', 'b', 'c']);
  assert.deepEqual(engine.top3().map(x => x.rank), [1, 2, 3]);
});

test('gift streak progress ignored and completed streak counted exactly once', () => {
  const engine = new MemeEngine();
  assert.equal(engine.recordGift(gift('a', 2, { giftType: 1, repeatEnd: false, repeatCount: 3 })), false);
  assert.equal(engine.recordGift(gift('a', 2, { giftType: 1, repeatEnd: true, repeatCount: 3 })), true);
  assert.equal(engine.top3()[0].diamonds, 6);
});

test('only !meme from current top three works; no random trigger', () => {
  const engine = new MemeEngine({ now: () => 1_000, random: () => .999 });
  engine.recordGift(gift('a', 5));
  engine.recordGift(gift('b', 4));
  engine.recordGift(gift('c', 3));
  engine.recordGift(gift('d', 2));
  assert.equal(engine.handleChat(chat('d'), ['one.png']).reason, 'not-top-three');
  assert.equal(engine.handleChat(chat('a', '!dance'), ['one.png']).reason, 'not-command');
  assert.equal(engine.remaining(), 0);
  const result = engine.handleChat(chat('a', ' !MEME '), ['a.png', 'b.png']);
  assert.equal(result.ok, true);
  assert.equal(result.event.filename, 'b.png');
});

test('one global two minute cooldown, failed commands do not consume it', () => {
  let clock = 10_000;
  const engine = new MemeEngine({ now: () => clock, random: () => 0 });
  engine.recordGift(gift('a', 5));
  engine.recordGift(gift('b', 2));
  assert.equal(engine.handleChat(chat('a'), []).reason, 'no-memes');
  assert.equal(engine.remaining(), 0);
  assert.equal(engine.handleChat(chat('a'), ['test.png']).ok, true);
  clock += 119_999;
  assert.equal(engine.handleChat(chat('b'), ['test.png']).reason, 'cooldown');
  assert.equal(engine.remaining(), 1);
  clock += 1;
  assert.equal(engine.handleChat(chat('b'), ['test.png']).ok, true);
  assert.equal(engine.remaining(), 120_000);
  engine.reset();
  assert.equal(engine.remaining(), 0);
  assert.deepEqual(engine.top3(), []);
});

test('invalid gift data does not corrupt ranking', () => {
  const engine = new MemeEngine();
  assert.equal(engine.recordGift(gift('a', NaN)), false);
  assert.equal(engine.recordGift(gift('a', -10)), false);
  assert.deepEqual(engine.top3(), []);
});
