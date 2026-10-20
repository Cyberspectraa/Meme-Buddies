import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocketServer } from 'ws';
import { TikFinitySource } from '../src/tikfinity.js';
import { MemeEngine } from '../src/engine.js';

function until(check, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (check()) { clearInterval(timer); resolve(); }
      else if (Date.now() - started > timeoutMs) {
        clearInterval(timer); reject(new Error('Timed out waiting for expected event'));
      }
    }, 15);
  });
}

test('TikFinity Desktop WebSocket feeds gift and chat and retains meme rules', async t => {
  const host = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(host, 'listening');
  const port = host.address().port;
  const events = [];
  const states = [];
  const engine = new MemeEngine({ random: () => 0 });
  const source = new TikFinitySource({
    url: 'ws://127.0.0.1:' + port + '/',
    reconnectMs: 70,
    onStatus: (state) => states.push(state),
    onEvent: (kind, data) => {
      events.push(kind);
      if (kind === 'gift') engine.recordGift(data);
      if (kind === 'chat') events.push(engine.handleChat(data, ['meme.png']));
    }
  });
  t.after(() => { source.stop(); for (const client of host.clients) client.terminate(); host.close(); });
  source.start();
  await until(() => states.includes('connected'));
  const serverSocket = [...host.clients][0];
  serverSocket.send(JSON.stringify({ event: 'config', data: { example: true } }));
  serverSocket.send(JSON.stringify({ event: 'gift', data: {
    user: { userId: '123', uniqueId: 'memeFan', profilePictureUrl: 'https://example.com/pfp.png' },
    diamondCount: 5, repeatCount: 2
  }}));
  serverSocket.send(JSON.stringify({ event: 'chat', data: {
    user: { userId: '123', uniqueId: 'memeFan' }, comment: '!meme'
  }}));
  await until(() => events.length >= 3);
  assert.equal(engine.top3()[0].diamonds, 10);
  assert.equal(events[0], 'gift');
  assert.equal(events[1], 'chat');
  assert.equal(events[2].ok, true);
  assert.equal(events[2].event.filename, 'meme.png');
  assert.ok(engine.remaining() > 0);
  assert.deepEqual(states.slice(0, 2), ['connecting', 'connected']);
});

test('TikFinity socket failure retries and recovers without needing a new click', async t => {
  // Get a free loopback port, then release it before the client connects.
  const { createServer } = await import('node:net');
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const statuses = [];
  const source = new TikFinitySource({
    url: 'ws://127.0.0.1:' + port + '/',
    reconnectMs: 60,
    onStatus: state => statuses.push(state)
  });
  let host;
  t.after(() => {
    source.stop();
    if (host) { for (const client of host.clients) client.terminate(); host.close(); }
  });
  source.start();
  await until(() => statuses.includes('waiting'));
  host = new WebSocketServer({ host: '127.0.0.1', port });
  await once(host, 'listening');
  await until(() => statuses.includes('connected'));
  for (const client of host.clients) client.terminate();
  await until(() => statuses.filter(s => s === 'waiting').length >= 2);
  assert.equal(source.active, true);
  source.stop();
  assert.equal(source.state, 'idle');
});
