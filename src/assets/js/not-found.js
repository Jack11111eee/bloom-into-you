// Select a locale from the original missing URL without redirecting its 404.
(function () {
  const html = document.documentElement;
  if (!html.hasAttribute('data-not-found-fallback')) return;
  const base = html.dataset.siteBase || '';
  const relative = location.pathname.startsWith(base + '/') ? location.pathname.slice(base.length) : location.pathname;
  let code = relative.match(/^\/(zh-cn|zh-tw|ja)(?:\/|$)/)?.[1];
  if (!code) {
    try { code = localStorage.getItem('bloom-language'); } catch (_) { /* Explicit routes work without storage. */ }
  }
  if (!['zh-cn', 'zh-tw', 'ja'].includes(code)) return;
  const template = document.querySelector(`template[data-not-found-locale="${code}"]`);
  if (!template) return;
  html.lang = template.dataset.lang;
  html.dataset.locale = code;
  document.title = template.dataset.title;
  for (const node of document.querySelectorAll('meta[property="og:title"],meta[property="twitter:title"]')) node.content = template.dataset.title;
  for (const node of document.querySelectorAll('meta[name=description],meta[property="og:description"],meta[property="twitter:description"]')) node.content = template.dataset.description;
  for (const node of document.querySelectorAll('meta[property="og:locale"]')) node.content = template.dataset.ogLocale;
  for (const node of document.querySelectorAll('link[rel=canonical]')) node.href = new URL(base + '/' + code + '/404/', location.origin).href;
  const font = document.querySelector('link[rel=preload][href*="wenkai-en.woff2"]');
  if (font) font.href = font.href.replace('wenkai-en.woff2', `wenkai-${code}.woff2`);
  document.body.replaceChildren(template.content.cloneNode(true));
}());


(()=>{
 const root=document.getElementById('not-found');
 if(!root)return;
 const TAU=Math.PI*2;
 const add=(a,b)=>a.map((v,i)=>v+b[i]);
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const mul=(a,n)=>a.map(v=>v*n);
 function rotate(p,x,y,z){
  let [a,b,c]=p;
  [b,c]=[b*Math.cos(x)-c*Math.sin(x),b*Math.sin(x)+c*Math.cos(x)];
  [a,c]=[a*Math.cos(y)+c*Math.sin(y),-a*Math.sin(y)+c*Math.cos(y)];
  return [a*Math.cos(z)-b*Math.sin(z),a*Math.sin(z)+b*Math.cos(z),c];
 }
 function arcPath(fn,end=TAU){
  const points=Array.from({length:1001},(_,i)=>fn(i*end/1000));
  const lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(...sub(points[i],points[i-1])));
  const length=lengths[lengths.length-1];
  return phase=>{
   const target=((phase%1)+1)%1*length;
   let low=0,high=lengths.length-1;
   while(high-low>1){const mid=(high+low)>>1;if(lengths[mid]<target)low=mid;else high=mid;}
   const weight=(target-lengths[low])/(lengths[high]-lengths[low]||1);
   return add(mul(points[low],1-weight),mul(points[high],weight));
  };
 }
 function mobius(r,w,angles){return (u,v)=>{
  const s=(2*v-1)*w;
  return rotate([(r+s*Math.cos(u/2))*Math.cos(u),(r+s*Math.cos(u/2))*Math.sin(u),s*Math.sin(u/2)],...angles);
 };}
 function makeGeometry(){
  const outer=mobius(1.85,.23,[.25,0,.05]);
  const inner=mobius(1.38,.17,[1.15,.45,.65]);
  const paths=[arcPath(t=>outer(t,1),TAU*2),arcPath(t=>inner(t,1),TAU*2)];
  const tracks=paths.map(path=>Array.from({length:641},(_,i)=>path(i/640)));
  return {tracks,paths};
 }
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const instances=[];
 root.querySelectorAll('[data-form]').forEach(section=>{
  const canvas=section.querySelector('canvas'),context=canvas.getContext('2d');
  if(!context)return;
  const geometry=makeGeometry(section.dataset.form);
  const state={speed:.25,rotate:true,thickness:1.15};
  const instance={section,canvas,context,geometry,state,time:0,paused:reduced.matches,dirty:true,width:0,height:0};
  const button=section.querySelector('.forms-motion');
  function syncButton(){button.querySelector('[data-motion-pause]').hidden=instance.paused;button.querySelector('[data-motion-resume]').hidden=!instance.paused;button.setAttribute('aria-pressed',String(instance.paused));}
  syncButton();button.hidden=false;
  button.addEventListener('click',()=>{instance.paused=!instance.paused;instance.dirty=true;syncButton();});
  const resize=new ResizeObserver(()=>{instance.dirty=true;});resize.observe(canvas);
  instances.push(instance);
 });
 root.querySelector('[data-not-found-back]').addEventListener('click',event=>{
  const base=document.documentElement.dataset.siteBase||'';
  let previous=null;try{previous=new URL(document.referrer);}catch(_){}
  if(previous&&previous.origin===location.origin&&previous.pathname.startsWith(base+'/')&&previous.href!==location.href&&history.length>1){event.preventDefault();history.back();}
 });
 function draw(instance){
  const {canvas,context:ctx,geometry,state,time}=instance;
  const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
  if(w<1||h<1)return;
  const dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const scale=Math.min(w/4.9,(h-38)/3.7),cx=w/2,cy=(h-22)/2;
  const yaw=-.3+(state.rotate?time*.008:0);
  const transform=p=>rotate(p,.78,yaw,-.22);
  const project=p=>{const perspective=7/(7-p[2]);return [cx+p[0]*scale*perspective,cy+p[1]*scale*perspective];};
  const items=[];
  geometry.tracks.forEach(track=>{
   const points=track.map(transform);
   for(let i=0;i<points.length-1;i++)items.push({kind:'track',points:[points[i],points[i+1]],z:(points[i][2]+points[i+1][2])/2});
  });
  items.push({kind:'text',z:-.14});
  geometry.paths.forEach((path,i)=>{
   const point=transform(path(time*state.speed/(i===0?14:18)+i*.39));
   items.push({kind:'ball',point,z:point[2]+(i===0?.08:.05),blue:i===0});
  });
  items.sort((a,b)=>a.z-b.z);
  for(const item of items){
   if(item.kind==='text'){
    ctx.fillStyle='#1c1d20';ctx.font=`400 ${Math.min(100,(w-24)*.29)}px ${getComputedStyle(canvas).fontFamily}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('404',cx,cy+4);continue;
   }
   if(item.kind==='ball'){
    const p=project(item.point),r=(item.blue?5.5:3.5)*7/(7-item.z);
    const gradient=ctx.createRadialGradient(p[0]-r*.35,p[1]-r*.4,r*.05,p[0],p[1],r);
    gradient.addColorStop(0,item.blue?'#adb8ff':'#c4c9cc');gradient.addColorStop(.45,item.blue?'#6276ef':'#828e95');gradient.addColorStop(1,item.blue?'#3449c8':'#4e606a');
    ctx.beginPath();ctx.arc(p[0],p[1],r,0,TAU);ctx.fillStyle=gradient;ctx.fill();continue;
   }
   const points=item.points.map(project);
   const depth=(item.z+2)/4;
   ctx.beginPath();ctx.moveTo(...points[0]);ctx.lineTo(...points[1]);
   ctx.strokeStyle=`rgba(136,153,164,${.36+depth*.26})`;
   ctx.lineWidth=state.thickness*(.86+depth*.25);ctx.lineCap='round';ctx.stroke();

  }
  canvas.closest('[data-orbit]').classList.add('is-rendered');
  canvas.dataset.phase=time.toFixed(3);
  instance.dirty=false;
 }
 let lastRender=0;
 function frame(now){
  if(!root.isConnected)return;
  if(now-lastRender>=31){
   for(const instance of instances){
    if(instance.section.hidden||document.hidden)continue;
    if(!instance.paused)instance.time+=Math.min((now-lastRender)/1000,.1);
    if(!instance.paused||instance.dirty)draw(instance);
   }
   lastRender=now;
  }
  requestAnimationFrame(frame);
 }
 for(const instance of instances)if(!instance.section.hidden)draw(instance);
 requestAnimationFrame(frame);
 document.fonts.ready.then(()=>instances.forEach(instance=>{instance.dirty=true;}));
 reduced.addEventListener('change',event=>{if(event.matches)instances.forEach(instance=>{instance.paused=true;instance.dirty=true;const button=instance.section.querySelector('.forms-motion');button.querySelector('[data-motion-pause]').hidden=true;button.querySelector('[data-motion-resume]').hidden=false;button.setAttribute('aria-pressed','true');});});
})();
