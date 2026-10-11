// Design's screenshot spec: settled page (badge green, fonts loaded, no hover/focus), first viewport only.
// Writes zh-1280.png zh-390.png en-1280.png en-390.png try-zh-390.png try-en-390.png into SHOTDIR.
module.exports=async({b,name,withQ,dir})=>{
 const settle=async p=>{await p.waitForFunction(()=>document.getElementById('stbadge').className==='ok');await p.evaluate(()=>document.fonts.ready);
  await p.mouse.move(0,0).catch(()=>{});await p.evaluate(()=>{document.activeElement&&document.activeElement.blur();return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})};
 const scrollDone=p=>p.evaluate(()=>new Promise(r=>{let last=-1,same=0;const f=()=>{if(scrollY===last){if(++same>=10)return r()}else{same=0;last=scrollY}requestAnimationFrame(f)};requestAnimationFrame(f)}));
 for(const lg of ['zh','en'])for(const vp of [{width:1280,height:800},{width:390,height:844}]){
  const o={viewport:vp,locale:lg==='zh'?'zh-CN':'en-US'};if(vp.width<500&&name!=='firefox'){o.isMobile=true;o.hasTouch=true}
  const ctx=await b.newContext(o);const p=await ctx.newPage();await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');
  await settle(p);await p.screenshot({path:`${dir}/${lg}-${vp.width}.png`});
  if(vp.width===390){await p.click('#try');await scrollDone(p);await p.waitForFunction(()=>!document.getElementById('sm4out').closest('.out').classList.contains('flash'));
   await settle(p);await p.screenshot({path:`${dir}/try-${lg}-390.png`})}
  await ctx.close()}};
