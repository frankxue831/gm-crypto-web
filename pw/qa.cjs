// QA acceptance checks folded in from QA's round-1..3 ad-hoc scripts (t.js, t2.js, t4.js), rewritten:
// no fixed waits, no hard-coded ports (BASE_URL only), ids only. Checks already in run.cjs were dropped.
// Groups: official vectors, encoding switching, size limits and errors, scroll and badge, language and canonical.
module.exports=async({b,name,withQ,report,allErrs})=>{
 const PFX={zh:'错误：',en:'Error: '};
 const mk=async(vp,lg)=>{const o={viewport:vp,locale:lg==='zh'?'zh-CN':'en-US'};if(vp.width<500&&name!=='firefox'){o.isMobile=true;o.hasTouch=true}
  const ctx=await b.newContext(o);const p=await ctx.newPage();p.on('pageerror',e=>allErrs.push(e.message));p.on('console',m=>m.type()==='error'&&allErrs.push(m.text()));
  await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');return [ctx,p]};
 for(const lg of ['zh','en']){const X=[];const chk=(g,n,ok,i='')=>X.push({n:`${g} ${lg}: ${n}`,ok:!!ok,i:String(i).slice(0,120)});
  const [ctx,p]=await mk({width:1280,height:800},lg);const v=s=>p.inputValue(s),tx=s=>p.textContent(s);
  // official vectors (GB/T 32905 A.1/A.2; empty-message and UTF-8 values cross-checked with OpenSSL SM3)
  await p.fill('#sm3in','');await p.click('#sm3go');
  chk('vectors','SM3 empty input = official empty hash, no error',(await v('#sm3out'))==='1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b'&&(await tx('#err-sm3'))==='',await v('#sm3out'));
  await p.fill('#sm3in','abcd'.repeat(16));await p.click('#sm3go');
  chk('vectors','SM3 64-byte vector (GB/T 32905 A.2)',(await v('#sm3out'))==='debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732',await v('#sm3out'));
  await p.fill('#sm3in','中文，全角ＡＢＣ😀');await p.click('#sm3go');
  chk('vectors','SM3 hashes UTF-8 bytes (CJK, full-width, emoji)',(await v('#sm3out'))==='30cb6db058dfd77b56217fe764d7c008a5dce16fe02e75915c8c3620ed15a565',await v('#sm3out'));
  await p.click('#ex-sm4');await p.click('#sm4enc');await p.check('#sm4inbin');await p.fill('#sm4in',await v('#sm4out'));await p.click('#sm4dec');
  chk('vectors','SM4 vector decrypts back to plaintext',(await v('#sm4out'))==='0123456789abcdeffedcba9876543210',await v('#sm4out'));
  // encoding switching
  await p.click('#ex-sm2');await p.fill('#sm2msg','hello 中文');await p.click('#sm2enc');await p.click('#sm2dec');
  chk('encoding','SM2 decrypt returns text, labelled Text',(await v('#sm2pt'))==='hello 中文'&&!(await tx('#m-sm2pt')).startsWith('Hex'),await tx('#m-sm2pt'));
  await p.check('input[value=b64]');chk('encoding','SM2 plaintext stays text after Base64 toggle',(await v('#sm2pt'))==='hello 中文',await v('#sm2pt'));
  await p.check('input[value=hex]');
  await p.click('#ex-sm4');await p.fill('#sm4key','01 23 45 67\n89ab cdef fedc ba98 7654 3210');await p.click('#sm4enc');
  chk('encoding','hex key with spaces/newlines accepted',(await v('#sm4out'))==='681edf34d206965e86b3e94f536e4246'&&(await tx('#err-sm4'))==='',await tx('#err-sm4'));
  // size limits and errors
  await p.fill('#sm4key','０１２３');await p.click('#sm4enc');const fw=await tx('#err-sm4');
  chk('errors','full-width digits in key rejected with a friendly message',fw.startsWith(PFX[lg])&&!/Unexpected|undefined/.test(fw),fw);
  await p.click('#ex-sm2');await p.fill('#sm2ct','00');await p.click('#sm2dec');const ce=await tx('#err-sm2');
  chk('errors','garbage SM2 ciphertext gives a friendly error',ce.startsWith(PFX[lg])&&!/Unexpected|undefined|panic/.test(ce),ce);
  // commit stamp: 'dev' locally, the short SHA (linked to the commit) when EXPECT_COMMIT is set by CI
  {const exp=process.env.EXPECT_COMMIT;const c=await p.evaluate(()=>{const a=document.getElementById('commit');return {t:a.textContent,h:a.href,cm:document.documentElement.outerHTML.includes('commit: ')}});
   chk('stamp',`footer commit ${exp||'dev'}`,exp?c.t===exp&&c.h.endsWith('/commit/'+exp):c.t==='dev',JSON.stringify(c));
   if(exp){const html=await (await fetch(withQ({}))).text();chk('stamp','HTML comment carries the commit',html.includes('<!-- commit: '+exp+' -->'))}}
  await ctx.close();
  // scroll and badge: badge must not overlap the language toggle around the 520/521 and 759/760 breakpoints
  for(const w of [520,521,759,760]){const [c2,q]=await mk({width:w,height:844},lg);
   await q.waitForFunction(()=>document.getElementById('stbadge').className==='ok');
   const g=await q.evaluate(()=>{const a=document.getElementById('stbadge').getBoundingClientRect(),l=document.getElementById('langsw').getBoundingClientRect();
    return {ov:a.left<l.right&&a.right>l.left&&a.top<l.bottom&&a.bottom>l.top,sw:document.documentElement.scrollWidth,iw:innerWidth}});
   chk('badge',`no overlap with the language toggle, no overflow at ${w}px`,!g.ov&&g.sw<=g.iw,JSON.stringify(g));await c2.close()}
  // language and canonical: button switch updates the URL-independent state and title
  {const [c3,q]=await mk({width:1280,height:800},lg);const other=lg==='zh'?'en':'zh';await q.click('#langsw');
   const s=await q.evaluate(()=>({lang:document.documentElement.lang,can:document.querySelector('link[rel=canonical]')?.href}));
   chk('language',`⇄ toggle → html lang ${other} and canonical ?lang=${other}`,s.lang.startsWith(other)&&s.can.endsWith('?lang='+other),JSON.stringify(s));await c3.close()}
  report('qa',X)}};
