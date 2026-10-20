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
test('TikFinity sends mod chat and filters ordinary viewers before triggering memes',async t=>{
 const host=new WebSocketServer({host:'127.0.0.1',port:0});
 await once(host,'listening');
 const packets=[];
 const engine=new MemeEngine();
 const source=new TikFinitySource({
  url:'ws://127.0.0.1:'+host.address().port+'/',reconnectMs:70,
  onEvent:(kind,data)=>{
   packets.push(kind);
   if(kind==='chat'){
    engine.observe(data);
    packets.push(engine.handleChat(data,['one.png']));
   }else{ engine.observe(data); }
  }
 });
 t.after(()=>{source.stop();for(const client of host.clients)client.terminate();host.close();});
 source.start();
 await until(()=>source.state==='connected');
 const peer=[...host.clients][0];
 peer.send(JSON.stringify({event:'chat',data:{user:{userId:'regular',uniqueId:'regular'},comment:'!meme'}}));
 peer.send(JSON.stringify({event:'chat',data:{user:{userId:'mod',uniqueId:'mod',isModerator:true},comment:'!meme'}}));
 await until(()=>packets.length===4);
 assert.equal(engine.activeMods().length,1);
 assert.equal(engine.activeMods()[0].username,'mod');
 assert.equal(packets[1].reason,'not-moderator');
 assert.equal(packets[3].ok,true);
 assert.equal(engine.remaining()>0,true);
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
