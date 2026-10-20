const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../public/drag-geometry.js'),'utf8');
const ctx={module:{exports:{}}};
vm.runInNewContext(source,ctx,{filename:'drag-geometry.js'});
const {placePopup,dragFrame}=ctx.module.exports;

const formats=[
 [270,480],[360,640],[607,1080],[720,1280],[1080,1920],
 [1920,1080],[1280,720],[1600,900],[2560,1440],[320,568],[430,932]
];
test('meme window safely fits in portrait and widescreen scenes',()=>{
 for(const [w,h] of formats){
  for(const u of [0,.1,.5,.95,1]){
   for(const v of [0,.3,.72,1]){
    const p=placePopup(w,h,u,v);
    assert.ok(p.x>=0&&p.y>=0,`negative position ${w}x${h}`);
    assert.ok(p.x+p.width<=w,`clipped right edge ${w}x${h}: ${JSON.stringify(p)}`);
    assert.ok(p.y+p.height<=h,`clipped bottom edge ${w}x${h}: ${JSON.stringify(p)}`);
    assert.ok(p.x>=p.safe.left&&p.x+p.width<=p.safe.right,`outside safe horizontal area ${w}x${h}`);
    assert.ok(p.y>=p.safe.top&&p.y+p.height<=p.safe.bottom,`outside safe vertical area ${w}x${h}`);
   }
  }
 }
});
test('the dropped meme stays visible while the mod escapes and returns',()=>{
 for(const [w,h] of formats){
  const popup=placePopup(w,h,.93,.91);
  const floor=h*.62;
  for(const side of ['left','right']){
   const params={popup,side,actorStartX:w*.5,actorDropX:w*.4,homeX:w*.45,floor};
   for(let age=3.5;age<=9.5;age+=.025){
    const p=dragFrame(age,params);
    assert.ok(p.showProp,'missing meme after drop');
    assert.ok(p.propX>=0&&p.propX+popup.width<=w,
      `clipped horizontally on ${w}x${h} age=${age} side=${side}`);
    assert.ok(p.propY>=0&&p.propY+popup.height<=h,
      `clipped vertically on ${w}x${h} age=${age} side=${side}`);
   }
   const final=dragFrame(6.25,params);
   assert.equal(final.phase,'finished');
   assert.equal(final.propX,popup.x);
   assert.equal(final.propY,popup.y);
   assert.equal(final.attached,false);
  }
 }
});
test('entry is intentionally from offscreen but finishes exactly in scene',()=>{
 const popup=placePopup(607,1080,.5,.5);
 for(const side of ['left','right']){
  const data={popup,side,actorStartX:300,actorDropX:230,homeX:240,floor:680};
  const justStarted=dragFrame(1,data);
  assert.equal(justStarted.phase,'drag');
  assert.equal(justStarted.showProp,true);
  const delivered=dragFrame(3.5,data);
  assert.equal(delivered.phase,'drop');
  assert.equal(delivered.propX,popup.x);
  assert.equal(delivered.propY,popup.y);
  const released=dragFrame(4.2,data);
  assert.equal(released.phase,'escape');
  assert.equal(released.attached,false);
 }
});
test('drop and wobble are continuous; no sudden positioning jumps',()=>{
 const popup=placePopup(360,640,.7,.4);
 const params={popup,side:'left',actorStartX:160,actorDropX:175,homeX:160,floor:400};
 const before=dragFrame(3.499999,params);
 const after=dragFrame(3.5,params);
 assert.ok(Math.abs(after.propX-before.propX)<2);
 assert.ok(Math.abs(after.propY-before.propY)<2);
});
