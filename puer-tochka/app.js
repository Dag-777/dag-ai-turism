/* =====================================================
   ПУЭР ТОЧКА  —  app.js  (v3)
   • Play-кнопка (как liberté)
   • Анимация: прилетел + 3 моргания + стоит чётко
   • Пыль: много частиц, красиво, без блюра
   • Только opacity+transform — никакого filter
   ===================================================== */
(function(){
'use strict';

/* ─── ПЫЛЬ / ЧАСТИЦЫ ─── */
var C=document.getElementById('dust'), X=C.getContext('2d');
var W=0,H=0,HUES=[198,42,330];

function rsz(){
  W=window.innerWidth; H=window.innerHeight;
  C.width=W; C.height=H;
}
rsz(); window.addEventListener('resize',function(){rsz();spawnAmb();});

/* фоновые частицы */
var AMB_N = 90; // больше пыли
var amb=[];
function makeAmb(anyY){
  return{
    x:Math.random()*W,
    y:anyY?Math.random()*H:H+8,
    r:Math.random()*1.6+0.3,
    vx:(Math.random()-.5)*.2,
    vy:-(Math.random()*.25+.06),
    alpha:Math.random()*.35+.08,
    hue:HUES[Math.floor(Math.random()*3)],
    phase:Math.random()*Math.PI*2
  };
}
function spawnAmb(){
  amb=Array.from({length:AMB_N},function(){return makeAmb(true);});
}
spawnAmb();

/* взрыв-искры при смене слайда */
var bursts=[];
function burst(x,y,hue,n){
  for(var i=0;i<n;i++){
    var a=Math.random()*Math.PI*2, s=Math.random()*9+2;
    bursts.push({
      x:x,y:y,
      vx:Math.cos(a)*s, vy:Math.sin(a)*s-3,
      r:Math.random()*3.5+.5,
      alpha:1, hue:hue,
      decay:Math.random()*.012+.01,
      grav:.15
    });
  }
}

var rafDust=null;
function drawDust(){
  X.clearRect(0,0,W,H);
  /* фон-частицы */
  for(var i=0;i<amb.length;i++){
    var p=amb[i];
    p.phase+=.018; p.x+=p.vx+Math.sin(p.phase)*.22; p.y+=p.vy;
    if(p.y<-10){amb[i]=makeAmb(false);}
    if(p.x<-10)p.x=W+10; else if(p.x>W+10)p.x=-10;
    /* мерцание через alpha */
    var tw=0.4+0.6*(0.5+0.5*Math.sin(p.phase*1.3));
    var alpha=p.alpha*tw;
    X.save();
    X.shadowBlur=10;
    X.shadowColor='hsl('+p.hue+',88%,70%)';
    X.beginPath();
    X.arc(p.x,p.y,p.r,0,Math.PI*2);
    X.fillStyle='hsla('+p.hue+',88%,78%,'+alpha.toFixed(3)+')';
    X.fill();
    X.restore();
  }
  /* взрывы */
  bursts=bursts.filter(function(p){return p.alpha>.01;});
  for(var j=0;j<bursts.length;j++){
    var b=bursts[j];
    b.x+=b.vx; b.y+=b.vy; b.vy+=b.grav; b.vx*=.97;
    b.alpha-=b.decay; b.r*=.984;
    X.save();
    X.shadowBlur=22;
    X.shadowColor='hsl('+b.hue+',95%,65%)';
    X.beginPath();
    X.arc(b.x,b.y,Math.max(.1,b.r),0,Math.PI*2);
    X.fillStyle='hsla('+b.hue+',95%,82%,'+b.alpha.toFixed(3)+')';
    X.fill();
    X.restore();
  }
  rafDust=requestAnimationFrame(drawDust);
}

/* ─── FIT: авто-уменьшение заголовков ─── */
function fit(){
  var maxw=window.innerWidth*.9;
  document.querySelectorAll('.fit').forEach(function(el){
    el.style.fontSize='';
    // getBoundingClientRect для точного измерения (работает для скрытых через opacity)
    var saved=el.style.visibility;
    el.style.visibility='hidden'; el.style.opacity='0';
    var sw=el.scrollWidth;
    el.style.visibility=saved; el.style.opacity='';
    if(sw>maxw&&sw>0){
      var cur=parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize=(cur*(maxw/sw))+'px';
    }
  });
}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
else setTimeout(fit,300);
setTimeout(fit,100);
window.addEventListener('resize',fit);

/* ─── СЛАЙДЫ ─── */
var slides=Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
var dotsEl=document.getElementById('dots');
var pbar=document.getElementById('pbar');
var cur=0, tmr=null, rafBar=null, ts=0;
var SLIDE_MS=6000;

slides.forEach(function(_,i){
  var d=document.createElement('button');
  d.className='dot'+(i===0?' is-on':'');
  d.type='button';
  d.setAttribute('aria-label','Слайд '+(i+1));
  d.addEventListener('click',function(){go(i);});
  dotsEl.appendChild(d);
});
var dots=Array.prototype.slice.call(dotsEl.children);

/* Запустить анимации текста на активном слайде */
function animSlide(slide){
  var lines=slide.querySelectorAll('[data-anim]');
  lines.forEach(function(el){
    var type=el.getAttribute('data-anim');   // top | left | up
    var delay=parseInt(el.getAttribute('data-delay')||'0',10);
    // сбросить
    el.classList.remove('anim-top','anim-left','anim-up');
    el.style.opacity='0';
    el.style.animationDelay='';
    // форсируем reflow чтобы анимация перезапустилась
    void el.offsetWidth;
    el.style.animationDelay=delay+'ms';
    var cls = type==='left'?'anim-left':type==='up'?'anim-up':'anim-top';
    el.classList.add(cls);
  });
  fit();
  /* взрыв искр по центру экрана с небольшой задержкой */
  var hue=parseInt(slide.getAttribute('data-hue')||'198',10);
  setTimeout(function(){
    burst(W/2, H*0.5, hue, 110);
  }, 620);
}

function paint(){
  slides.forEach(function(s,i){
    var on=(i===cur);
    s.classList.toggle('is-active',on);
    if(on)animSlide(s);
  });
  dots.forEach(function(d,i){d.classList.toggle('is-on',i===cur);});
}
function restart(){
  if(tmr)clearTimeout(tmr);
  if(rafBar)cancelAnimationFrame(rafBar);
  pbar.style.width='0%'; ts=performance.now();
  tmr=setTimeout(function(){go(cur+1);},SLIDE_MS);
  (function loop(now){
    var p=Math.min(1,(now-ts)/SLIDE_MS);
    pbar.style.width=(p*100).toFixed(2)+'%';
    if(p<1)rafBar=requestAnimationFrame(loop);
  })(performance.now());
}
function go(i){
  cur=(i+slides.length)%slides.length;
  paint();restart();
}
function next(){go(cur+1);}
function prev(){go(cur-1);}

/* тап-зоны */
var tnext=document.querySelector('.tz--next'),tprev=document.querySelector('.tz--prev');
if(tnext)tnext.addEventListener('click',next);
if(tprev)tprev.addEventListener('click',prev);

/* свайп */
var sx=null,sy=null,st=0;
document.getElementById('slider').addEventListener('touchstart',function(e){
  var t=e.changedTouches[0];sx=t.clientX;sy=t.clientY;st=Date.now();
},{passive:true});
document.getElementById('slider').addEventListener('touchend',function(e){
  if(sx===null)return;
  var t=e.changedTouches[0];
  var dx=t.clientX-sx,dy=t.clientY-sy,dt=Date.now()-st;
  sx=null;
  if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.4&&dt<800){
    if(dx<0)next();else prev();
  }
},{passive:true});

window.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight')next();
  else if(e.key==='ArrowLeft')prev();
});

document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    if(tmr)clearTimeout(tmr);
    if(rafBar)cancelAnimationFrame(rafBar);
    if(rafDust)cancelAnimationFrame(rafDust);
  }else{
    restart();
    rafDust=requestAnimationFrame(drawDust);
  }
});

/* ─── PLAY BUTTON ─── */
var playScreen=document.getElementById('playScreen');
var playBtn=document.getElementById('playBtn');
var started=false;

function start(){
  if(started)return;started=true;
  playScreen.style.opacity='0';
  setTimeout(function(){playScreen.style.display='none';},500);
  paint();restart();
}

playBtn.addEventListener('click',start);
playScreen.addEventListener('touchstart',start,{passive:true});

/* ─── PWA service worker ─── */
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}

/* ─── СТАРТ пыли сразу ─── */
drawDust();

})();
