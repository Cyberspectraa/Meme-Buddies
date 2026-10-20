import test from 'node:test';
import assert from 'node:assert/strict';
import { MemeEngine } from '../src/engine.js';

const user = userId => ({ user: { userId, uniqueId: userId, profilePictureUrl: 'https://example.com/avatar.png' } });

test('non-gifters can enter top three with likes, chat, and shares', () => {
  let now=100000;
  const engine=new MemeEngine({now:()=>now});
  engine.recordGift({...user('gifter'), diamondCount:5});
  engine.recordActivity('chat', {...user('chatter'),comment:'hey'});
  engine.recordActivity('like', {...user('liker'),likeCount:50});
  engine.recordActivity('share',user('sharer'));
  assert.deepEqual(engine.top3().map(v=>v.userId),['liker','sharer','gifter']);
  assert.ok(engine.top3().every(v=>Number.isInteger(v.points)));
});

test('activity scores use anti-spam limits and single-event bonuses',()=>{
  let now=100000;
  const engine=new MemeEngine({now:()=>now});
  assert.equal(engine.recordActivity('chat',{...user('a'),comment:'hello'}),true);
  assert.equal(engine.recordActivity('chat',{...user('a'),comment:'hello again'}),false);
  assert.equal(engine.recordActivity('chat',{...user('a'),comment:'!meme'}),false);
  assert.equal(engine.top3()[0].points,2);
  now+=15000;
  assert.equal(engine.recordActivity('chat',{...user('a'),comment:'hello again'}),true);
  assert.equal(engine.recordActivity('follow',user('a')),true);
  assert.equal(engine.recordActivity('follow',user('a')),false);
  assert.equal(engine.recordActivity('like',{...user('a'),likeCount:10000}),true);
  assert.equal(engine.recordActivity('like',{...user('a'),likeCount:10000}),false);
  assert.equal(engine.top3()[0].points,17);
  now+=3000;
  assert.equal(engine.recordActivity('like',{...user('a'),likeCount:10}),true);
  assert.equal(engine.recordActivity('share',user('a')),true);
  assert.equal(engine.recordActivity('share',user('a')),false);
  now+=120000;
  assert.equal(engine.recordActivity('share',user('a')),true);
});

test('aggregate roomUser without an individual account never makes a buddy',()=>{
  const engine=new MemeEngine();
  assert.equal(engine.recordActivity('roomUser',{viewerCount:1234}),false);
  assert.equal(engine.recordActivity('member',user('joiner')),true);
  assert.equal(engine.recordActivity('roomUser',user('joiner')),false);
  assert.equal(engine.top3()[0].points,1);
});

test('meme command remains top-three-only on shared two minute cooldown',()=>{
  let now=100000;
  const engine=new MemeEngine({now:()=>now,random:()=>0});
  for(const username of ['a','b','c','d']) engine.recordActivity('follow',user(username));
  assert.deepEqual(engine.top3().map(p=>p.userId),['a','b','c']);
  assert.equal(engine.handleChat({...user('d'),comment:'!meme'},['x.png']).reason,'not-top-three');
  assert.equal(engine.handleChat({...user('a'),comment:'!meme'},['x.png']).ok,true);
  now+=119999;
  assert.equal(engine.handleChat({...user('b'),comment:'!meme'},['x.png']).reason,'cooldown');
  now++;
  assert.equal(engine.handleChat({...user('b'),comment:'!meme'},['x.png']).ok,true);
});
