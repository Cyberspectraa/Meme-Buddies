const test=require('node:test');
const assert=require('node:assert/strict');
const { boundsForLayout }=require('../desktop/layout.cjs');

test('centres 9:16 on a regular widescreen monitor',()=>{
  const b=boundsForLayout({x:0,y:0,width:1920,height:1080});
  assert.deepEqual(b,{x:656,y:0,width:607,height:1080});
});
test('uses full portrait monitor when screen is already 9:16',()=>{
  assert.deepEqual(boundsForLayout({x:1920,y:0,width:1080,height:1920}),{x:1920,y:0,width:1080,height:1920});
});
test('full mode preserves old widescreen capture',()=>{
  assert.deepEqual(boundsForLayout({x:-1600,y:0,width:1600,height:900},'full'),{x:-1600,y:0,width:1600,height:900});
});
test('portrait corridor never exceeds the selected monitor',()=>{
  const b=boundsForLayout({x:0,y:0,width:700,height:1600});
  assert.equal(b.width,700);assert.equal(b.height,1600);
});
