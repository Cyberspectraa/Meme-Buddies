import test from 'node:test';
import assert from 'node:assert/strict';
import { MemeEngine } from '../src/engine.js';
test('many mods can appear with no artificial top-three limit',()=>{
 const e=new MemeEngine();
 for(let i=0;i<9;i++)e.observe({user:{userId:'m'+i,uniqueId:'mod'+i,isModerator:true}});
 assert.equal(e.activeMods().length,9);
 assert.deepEqual(e.activeMods().slice(0,3).map(x=>x.username),['mod0','mod1','mod2']);
});
test('mod metadata persists when later messages omit moderator flag',()=>{
 const e=new MemeEngine();
 e.observe({user:{userId:'111',uniqueId:'alpha',isModerator:true,profilePictureUrl:'https://site.test/a.png'}});
 e.observe({user:{userId:'111',uniqueId:'alpha'},comment:'!meme'});
 assert.equal(e.activeMods().length,1);
 assert.equal(e.activeMods()[0].avatarUrl,'https://site.test/a.png');
});
