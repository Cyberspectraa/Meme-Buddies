import test from 'node:test';
import assert from 'node:assert/strict';
import { MemeEngine, isVerifiedModerator, normalizeUsername, COOLDOWN_MS } from '../src/engine.js';
const event = (name, mod = true) => ({ user: {
  userId: 'id:' + name.toLowerCase(), uniqueId: name,
  profilePictureUrl: 'https://example.com/' + name + '.png', isModerator: mod
}, comment: '!meme' });

test('only verified mods appear; gifts, likes and non-mod chat do not create pets', () => {
  const e=new MemeEngine();
  assert.equal(e.observe(event('modOne')),true);
  assert.equal(e.observe(event('nonmod',false)),false);
  assert.equal(e.activeMods().length,1);
  assert.equal(e.activeMods()[0].username,'modone');
  assert.equal(e.activeMods()[0].avatarUrl,'https://example.com/modOne.png');
});
test('badges detect moderators in root and nested schemas, never nickname-only', () => {
  assert.equal(isVerifiedModerator({userBadges:[{type:'pm_mt_moderator_im'}]}),true);
  assert.equal(isVerifiedModerator({user:{badges:[{type:'moderator'}]}}),true);
  assert.equal(isVerifiedModerator({user:{isModerator:false},comment:'hello'}),false);
  assert.equal(isVerifiedModerator({nickname:'Moderator'}),false);
});
test('manual moderator usernames normalize, persist in engine, and require observed events', () => {
  const e=new MemeEngine({manualMods:['@Alice','bob']});
  assert.deepEqual(e.activeMods(),[]);
  assert.equal(e.observe(event('Alice',false)),true);
  assert.equal(e.activeMods().length,1);
  assert.equal(e.activeMods()[0].manual,true);
  assert.equal(e.observe({user:{userId:'id:nick',nickname:'alice'}}),false);
  assert.deepEqual(e.setManualMods(['@BoB']),['bob']);
  assert.deepEqual(e.activeMods(),[]);
  assert.equal(e.observe(event('bob',false)),true);
  assert.equal(e.activeMods().length,1);
});
test('malformed usernames and excessive lists are rejected', () => {
  assert.equal(normalizeUsername('@Valid_Name.2'),'valid_name.2');
  assert.equal(normalizeUsername('../bad/name'),'');
  const e=new MemeEngine();
  assert.throws(()=>e.setManualMods(['hello','@bad username']),/username/);
  assert.throws(()=>e.setManualMods(Array(501).fill('mod')),/Too many/);
});
test('10 second global cooldown only consumed by a successful moderator command', () => {
  let now=11000;
  const e=new MemeEngine({now:()=>now,random:()=>.999});
  assert.equal(COOLDOWN_MS,10000);
  assert.equal(e.handleChat(event('outsider',false),['m.png']).reason,'not-moderator');
  assert.equal(e.handleChat(event('modA'),[]).reason,'no-memes');
  assert.equal(e.remaining(),0);
  assert.equal(e.handleChat(event('modA','true'),['one.png','two.png']).ok,true);
  assert.equal(e.remaining(),10000);
  now+=9999;
  assert.equal(e.handleChat(event('modB'),['one.png']).reason,'cooldown');
  assert.equal(e.remaining(),1);
  now++;
  const next=e.handleChat(event('modB'),['one.png','two.png']);
  assert.equal(next.ok,true);
  assert.equal(next.event.filename,'two.png');
  e.reset();
  assert.equal(e.remaining(),0);
  assert.equal(e.activeMods().length,0);
});
test('manual mods can command without role info; removal immediately revokes access', () => {
  const e=new MemeEngine({manualMods:['trusted']});
  const p=event('trusted',false);
  assert.equal(e.handleChat(p,['a.png']).ok,true);
  e.setManualMods([]);
  assert.equal(e.handleChat(p,['a.png']).reason,'not-moderator');
});
test('non-meme messages do not trigger automatic memes', () => {
  const e=new MemeEngine();
  assert.equal(e.handleChat({...event('mod'),comment:'hello'},['a.png']).reason,'not-command');
  assert.equal(e.remaining(),0);
});
