// Small pure layout/animation engine shared by the browser overlay and Node tests.
// The popup is guaranteed to fit in its scene once the drag has finished.
(function(scope) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smooth = v => { const p=clamp(v,0,1); return p*p*(3-2*p); };
  const lerp = (a,b,p) => a+(b-a)*p;

  function placePopup(width,height,u=.5,v=.5) {
    const w=Math.max(120,Number(width)||120);
    const h=Math.max(200,Number(height)||200);
    const portrait=h>w*1.25;
    const left=Math.max(12,Math.round(w*(portrait?.075:.05)));
    const right=Math.min(w-12,Math.round(w*(portrait?.84:.95)));
    const top=Math.max(12,Math.round(h*(portrait?.23:.16)));
    const bottom=Math.min(h-12,Math.round(h*(portrait?.66:.79)));
    const padding=12;
    const usableWidth=Math.max(72,right-left-2*padding);
    const popWidth=Math.min(usableWidth, portrait?310:360,Math.max(96,w*(portrait?.53:.27)));
    const barHeight=28;
    const usableHeight=Math.max(85,bottom-top-2*padding);
    const imageHeight=Math.max(50,Math.min(usableHeight-barHeight-8,h*(portrait?.21:.26),230));
    const frameHeight=barHeight+imageHeight+8;
    const minX=left+padding, maxX=Math.max(minX,right-padding-popWidth);
    const minY=top+padding, maxY=Math.max(minY,bottom-padding-frameHeight);
    return {
      x:Math.round(lerp(minX,maxX,clamp(u,0,1))),
      y:Math.round(lerp(minY,maxY,clamp(v,0,1))),
      width:Math.round(popWidth),
      height:Math.round(frameHeight),
      imageHeight:Math.round(imageHeight),
      viewportWidth:w,viewportHeight:h,
      safe:{left,right,top,bottom},
      portrait
    };
  }

  function dragFrame(age, params) {
    const { popup, side, actorStartX, actorDropX, floor }=params;
    const w=popup.viewportWidth;
    const exitX=side==='left'?-115:w+115;
    const popStartX=side==='left'?-popup.width-35:w+35;
    const popStartY=floor+5;
    const buddyRestY=popup.y+Math.min(55,popup.height*.30);
    const home=params.homeX;
    const exitOpposite=side==='left'?w+115:-115;
    let buddyX=actorStartX,buddyY=floor,propX=popup.x,propY=popup.y;
    let attached=false,showProp=false,angle=0,phase='fetch';

    if(age<.7){
      const p=smooth(age/.7);
      buddyX=lerp(actorStartX,exitX,p);
      buddyY=floor-18*Math.sin(p*Math.PI);
    }else if(age<1){
      buddyX=exitX;
    }else if(age<3.5){
      phase='drag';showProp=true;attached=true;
      const p=smooth((age-1)/2.5);
      const jiggle=Math.sin(p*13)*Math.sin(Math.PI*p);
      buddyX=lerp(exitX,actorDropX,p);
      buddyY=lerp(floor,buddyRestY,p)+jiggle*4;
      propX=lerp(popStartX,popup.x,p);
      propY=lerp(popStartY,popup.y,p)+jiggle*5;
      angle=jiggle*2.1;
    }else if(age<4.2){
      phase='drop';showProp=true;
      const p=(age-3.5)/.7;
      const shake=Math.sin(p*17)*(1-p);
      buddyX=actorDropX;buddyY=buddyRestY+shake*4;
      propX=popup.x+shake*3;
      propY=popup.y+Math.sin(Math.PI*p)*6;
      angle=shake*2.2;
      attached=p<.4;
    }else if(age<5.3){
      phase='escape';showProp=true;
      const p=smooth((age-4.2)/1.1);
      buddyX=lerp(actorDropX,exitOpposite,p);
      buddyY=lerp(buddyRestY,floor,p)-20*Math.sin(Math.PI*p);
    }else if(age<6.25){
      phase='return';showProp=true;
      const p=smooth((age-5.3)/.95);
      buddyX=lerp(exitOpposite,home,p);
      buddyY=floor;
    }else{
      phase='finished';showProp=true;
      buddyX=home;buddyY=floor;
    }
    return {phase,buddyX,buddyY,propX,propY,attached,showProp,angle};
  }

  const api={clamp,smooth,placePopup,dragFrame};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  scope.MemeDragGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
