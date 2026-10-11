// Usage: BASE_URL=... [CHROME_PATH=...] [MOBILE=1] [SHOT_LANG=en SHOT=path.png] [SHOTDIR=dir] node run.cjs chromium|firefox|webkit
// Runs the full suite in both languages plus i18n checks. Exit code 0 only if everything passes.
const pw=require('playwright-core');const name=process.argv[2]||'chromium';
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';const mobile=!!process.env.MOBILE;
const withQ=(q)=>{const u=new URL(base);for(const[k,v]of Object.entries(q))u.searchParams.set(k,v);return u.toString()};
const L={
 zh:{prompt:'点击运行，校验本页实现：SM3、SM4 对国标向量，SM2 做往返校验。',tagline:'在浏览器里调试',match:'与国标向量一致',text:'文本',ivEcb:'ECB 不使用 IV',convFail:'无法转换',compressed:'不支持 02/03 开头的压缩公钥',summary:'11/11 通过',copied:'已复制',ok:'通过',htmlLang:'zh-CN',title:/国密在线小工具/,v:['非法 Hex','奇数','SM4 密钥必须为 16 字节','16 字节的整数倍','密文长度必须是 16','IV必须为 16 字节','私钥必须为 32 字节','04 开头','公钥必须为 65 字节','不是合法的 Base64'],prefix:'错误：'},
 en:{prompt:'Click Run to check this page: SM3/SM4 against the GB/T vectors, SM2 by round trip.',tagline:'Debug SM2/SM3/SM4',match:'Matches the official test vector',text:'Text',ivEcb:'ECB does not use an IV',convFail:'Could not convert',compressed:'compressed 02/03 keys are not',summary:'11/11 passed',copied:'Copied',ok:'valid',htmlLang:'en',title:/SM2 \/ SM3 \/ SM4 Online Tool/,v:['invalid hex','odd number','SM4 key must be 16 bytes','multiple of 16 bytes','Ciphertext length must be','IV must be 16 bytes','private key must be 32 bytes','start with 04','public key must be 65 bytes','not valid Base64'],prefix:'Error: '}};
(async()=>{const b=await pw[name].launch(name==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,args:['--no-sandbox']}:{});
const allErrs=[],allExt=[];let total=0,passed=0,allOk=true;
const report0=[];
{const html=await (await fetch(base)).text();const m=(re)=>re.test(html);
 const ogimg=(html.match(/property="og:image" content="([^"]+)"/)||[])[1];
 report0.push({n:'static meta description',ok:m(/<meta name="description" content="[^"]{20,}"/)},{n:'static og:title/description/url/type',ok:m(/property="og:title" content="[^"]+"/)&&m(/property="og:description" content="[^"]+"/)&&m(/property="og:url" content="https:\/\/www\.frankxue\.dev\/gm-crypto-web\/"/)&&m(/property="og:type" content="website"/)},
  {n:'static og:image absolute URL',ok:ogimg==='https://www.frankxue.dev/gm-crypto-web/og.png',i:ogimg},
  {n:'static twitter card/title/description/image',ok:m(/name="twitter:card" content="summary_large_image"/)&&m(/name="twitter:title" content="[^"]+"/)&&m(/name="twitter:description" content="[^"]+"/)&&m(/name="twitter:image" content="https:\/\/www\.frankxue\.dev\/gm-crypto-web\/og\.png"/)});
 const alt=[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(x=>x[1]+'='+x[2]).join(' ');
 report0.push({n:'static hreflang zh-CN/en/x-default',ok:alt==='zh-CN=https://www.frankxue.dev/gm-crypto-web/?lang=zh en=https://www.frankxue.dev/gm-crypto-web/?lang=en x-default=https://www.frankxue.dev/gm-crypto-web/',i:alt},
  {n:'static HTML has no canonical (JS sets it per language)',ok:!/rel="?canonical/i.test(html)});
 const r=await fetch(new URL('og.png',base));const buf=Buffer.from(await r.arrayBuffer());const png=buf.slice(1,4).toString()==='PNG';
 report0.push({n:'og.png reachable, PNG 1200x630',ok:r.ok&&png&&buf.readUInt32BE(16)===1200&&buf.readUInt32BE(20)===630,i:r.status+' '+(png?buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20):'not png')})}
const newPage=async(locale)=>{const o={viewport:mobile?{width:390,height:844}:{width:1440,height:1000},locale};if(mobile&&name!=='firefox'){o.isMobile=true;o.hasTouch=true}
 if(name==='chromium')o.permissions=['clipboard-read','clipboard-write'];const ctx=await b.newContext(o);const p=await ctx.newPage();
 p.on('pageerror',e=>allErrs.push(e.message));p.on('console',m=>m.type()==='error'&&allErrs.push(m.text()));
 p.on('request',r=>{const u=r.url();if(!u.startsWith(new URL(base).origin)&&!u.startsWith(new URL(p.url()==='about:blank'?base:p.url()).origin)&&!u.startsWith('data:'))allExt.push(u)});return [ctx,p]};
const report=(group,list)=>{for(const r of list){total++;if(r.ok)passed++;else allOk=false;console.log(r.ok?'PASS':'FAIL',`[${group}]`,r.n,r.i||'')}};
// ---- full suite per language
for(const lg of ['zh','en']){const S=L[lg];const [ctx,p]=await newPage(lg==='zh'?'zh-CN':'en-US');
 await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');
 const X=[];const chk=(n,ok,i='')=>X.push({n,ok:!!ok,i:String(i).slice(0,90)});
 const tx=s=>p.textContent(s);
 // self-test prompt before running
 chk('self-test prompt before run',(await tx('#results'))===S.prompt&&(await tx('#testsum'))==='',await tx('#results'));
 chk('tagline present',(await tx('#tagline')).includes(S.tagline));
 chk('section descriptions present',(await p.$$eval('.desc',a=>a.filter(e=>e.textContent.trim().length>5).length))===3);
 chk('footer homepage link',(await p.getAttribute('footer a[href="https://www.frankxue.dev/"]','href'))==='https://www.frankxue.dev/');
 // try-example button
 await p.click('#try');
 chk('try: SM3 filled+computed',(await p.inputValue('#sm3out'))==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0');
 chk('try: SM4 vector computed',(await p.inputValue('#sm4out'))==='681edf34d206965e86b3e94f536e4246');
 chk('try: SM4 match badge',(await tx('#sm4match')).includes(S.match),await tx('#sm4match'));
 chk('try: SM2 signed+verified',(await tx('#sm2vres')).includes(S.ok),await tx('#sm2vres'));
 await p.waitForTimeout(1200);const top=await p.evaluate(()=>document.querySelector('label[for=sm4out]').getBoundingClientRect().top);const nb=await p.evaluate(()=>document.querySelector('nav.nav').getBoundingClientRect().bottom);chk('try: scrolled to SM4 output (below nav, in view)',top>=nb-1&&top<500,top+' nav '+nb);
 chk('try: focus on SM4 output',(await p.evaluate(()=>document.activeElement&&document.activeElement.id))==='sm4out');
 // labels: type + byte length
 chk('label sm4key Hex·16',(await tx('#m-sm4key')).startsWith('Hex')&&(await tx('#m-sm4key')).includes('16'),await tx('#m-sm4key'));
 chk('label sm3out Hex·32',(await tx('#m-sm3out')).includes('32'),await tx('#m-sm3out'));
 chk('label sm2p Hex·65',(await tx('#m-sm2p')).includes('65'),await tx('#m-sm2p'));
 chk('label text fields',(await tx('#m-sm3in'))===S.text&&(await tx('#m-sm2msg'))===S.text);
 // ECB disables IV
 await p.selectOption('#sm4mode','ECB');chk('ECB: IV disabled + note',await p.isDisabled('#sm4iv')&&(await tx('#ivnote'))===S.ivEcb,await tx('#ivnote'));
 await p.selectOption('#sm4mode','CBC');chk('CBC: IV enabled, note cleared',!(await p.isDisabled('#sm4iv'))&&(await tx('#ivnote'))==='');
 // repro 1: text output never converted
 await p.click('#ex-sm4');await p.selectOption('#sm4pad','pkcs7');await p.uncheck('#sm4inbin');await p.fill('#sm4in','abcd');await p.click('#sm4enc');
 const ct=await p.inputValue('#sm4out');await p.fill('#sm4in',ct);await p.click('#sm4dec');
 chk('repro1: decrypt gives text abcd',(await p.inputValue('#sm4out'))==='abcd'&&(await tx('#m-sm4out'))===S.text,await tx('#m-sm4out'));
 await p.check('input[value=b64]');
 chk('repro1: after Base64 toggle plaintext stays abcd',(await p.inputValue('#sm4out'))==='abcd',await p.inputValue('#sm4out'));
 chk('repro1: key converted to Base64',(await p.inputValue('#sm4key'))==='ASNFZ4mrze/+3LqYdlQyEA=='&&(await tx('#m-sm4key')).startsWith('Base64'),await p.inputValue('#sm4key'));
 chk('repro1: ciphertext input converted',(await p.inputValue('#sm4in'))===Buffer.from(ct,'hex').toString('base64'));
 await p.click('#sm4dec');chk('repro1: decrypt still works after toggle',(await p.inputValue('#sm4out'))==='abcd');
 await p.check('input[value=hex]');
 // repro 2: unconvertible binary field flagged
 await p.fill('#sm2sig','abc');await p.check('input[value=b64]');
 chk('repro2: odd hex flagged red, kept as Hex',(await p.inputValue('#sm2sig'))==='abc'&&(await p.getAttribute('#sm2sig','class')||'').includes('badf')&&(await tx('#m-sm2sig')).startsWith('Hex')&&(await tx('#m-sm2sig')).includes(S.convFail),await tx('#m-sm2sig'));
 chk('repro2: other binary fields converted',(await tx('#m-sm2p')).startsWith('Base64'));
 await p.check('input[value=hex]');chk('repro2: flag cleared when toggle matches',!((await p.getAttribute('#sm2sig','class')||'').includes('badf')));
 // compressed SM2 key message
 await p.click('#ex-sm2');await p.fill('#sm2p','02'+'09f9df311e5421a150dd7d161e4bc5c672179fad1833fc076bb08ff356f35020');await p.click('#sm2enc');
 chk('compressed public key message',(await tx('#err-sm2')).includes(S.compressed),await tx('#err-sm2'));
 // nav anchors
 const hrefs=await p.$$eval('nav.nav a',a=>a.map(e=>e.getAttribute('href')));chk('nav anchors',JSON.stringify(hrefs)==='["#s-sm3","#s-sm4","#s-sm2","#s-test"]'&&(await p.$$eval('nav.nav a',a=>a.every(e=>document.querySelector(e.getAttribute('href'))))));
 await p.click('nav.nav a[href="#s-sm2"]');await p.waitForTimeout(900);const t2=await p.evaluate(()=>document.getElementById('s-sm2').getBoundingClientRect().top);chk('nav jumps to SM2',t2>-5&&t2<160,t2);
 // layout: title lines, example buttons position
 const lines=await p.evaluate(()=>{const h=document.querySelector('h1');return h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight)});chk('title ≤ 2 lines',lines<=2.05,lines.toFixed(2));
 const exPos=await p.evaluate(()=>['ex-sm3','ex-sm4','ex-sm2'].map(id=>{const b=document.getElementById(id).getBoundingClientRect(),h=document.getElementById(id).closest('h2').querySelector('.t').getBoundingClientRect(),sec=document.getElementById(id).closest('section').getBoundingClientRect();return {r:Math.round(sec.right-b.right),inRow:b.top<h.bottom&&b.bottom>h.top}}));
 chk('example buttons: same row as heading, right-aligned consistently',exPos.every(x=>x.inRow)&&new Set(exPos.map(x=>x.r)).size===1,JSON.stringify(exPos));
 await p.evaluate(()=>window.scrollTo(0,0));
 const R=await p.evaluate(()=>window.selftest().map(r=>({n:r.name,ok:r.pass,i:r.info.slice(0,60)})));
 chk('self-test summary line',(await tx('#testsum'))===S.summary,await tx('#testsum'));
 const v=id=>p.inputValue('#'+id), err=s=>p.textContent('#err-'+s), click=s=>p.click('#'+s);
 await click('ex-sm3');await click('sm3go');chk('example SM3 abc',(await v('sm3out'))==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0');
 await click('ex-sm4');await click('sm4enc');chk('example SM4 KAT',(await v('sm4out'))==='681edf34d206965e86b3e94f536e4246',await v('sm4out'));
 await click('ex-sm2');chk('example SM2 pubkey (GB/T A.2)',(await v('sm2p')).startsWith('0409f9df311e5421a150dd7d161e4bc5c672179fad1833fc076bb08ff356f35020'));
 await click('sm2sign');await click('sm2verify');chk('example SM2 sign→verify',(await p.textContent('#sm2vres')).includes(S.ok),await p.textContent('#sm2vres'));
 await click('sm2enc');await click('sm2dec');chk('example SM2 enc→dec',(await v('sm2pt'))==='message digest');
 await p.click('button[data-copy=sm3out]');await p.waitForFunction(c=>document.querySelector('button[data-copy=sm3out]').textContent===c,S.copied,{timeout:3000}).catch(()=>{});
 chk('copy feedback',(await p.textContent('button[data-copy=sm3out]'))===S.copied,await p.textContent('button[data-copy=sm3out]'));
 if(name==='chromium'){const c=await p.evaluate(()=>navigator.clipboard.readText());chk('clipboard content',c==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0')}
 const ve=async(i,sec,btn,setup)=>{await setup();await click(btn);const e=await err(sec);chk('validation: '+S.v[i],e.startsWith(S.prefix)&&e.includes(S.v[i]),e)};
 await ve(0,'sm4','sm4enc',async()=>{await click('ex-sm4');await p.fill('#sm4key','zz23456789abcdeffedcba9876543210')});
 await ve(1,'sm4','sm4enc',async()=>{await p.fill('#sm4key','0123456789abcdeffedcba987654321')});
 await ve(2,'sm4','sm4enc',async()=>{await p.fill('#sm4key','0123456789abcdef')});
 await ve(3,'sm4','sm4enc',async()=>{await click('ex-sm4');await p.fill('#sm4in','0123')});
 await ve(4,'sm4','sm4dec',async()=>{await p.fill('#sm4in','0123')});
 await ve(5,'sm4','sm4enc',async()=>{await click('ex-sm4');await p.selectOption('#sm4mode','CBC');await p.fill('#sm4iv','00')});
 await ve(6,'sm2','sm2sign',async()=>{await click('ex-sm2');await p.fill('#sm2d','0102')});
 await ve(7,'sm2','sm2enc',async()=>{await click('ex-sm2');const pk=await v('sm2p');await p.fill('#sm2p','05'+pk.slice(2))});
 await ve(8,'sm2','sm2enc',async()=>{await p.fill('#sm2p','04aa')});
 await p.check('input[value=b64]');await ve(9,'sm4','sm4enc',async()=>{await p.fill('#sm4key','###')});await p.check('input[value=hex]');
 chk('no inline error after valid op',await (async()=>{await click('ex-sm3');await click('sm3go');return (await err('sm3'))===''})());
 const sw=await p.evaluate(()=>[document.documentElement.scrollWidth,window.innerWidth]);chk('no horizontal scroll',sw[0]<=sw[1],sw.join('/'));
 // no untranslated keys anywhere (text, attributes, title)
 const miss=await p.evaluate(()=>{const h=document.documentElement.outerHTML+document.title+document.body.innerText;return (h.match(/⟦[^⟧]*⟧/g)||[]).slice(0,5)});
 chk('no missing i18n keys',miss.length===0,miss.join(','));
 chk('html lang',(await p.evaluate(()=>document.documentElement.lang))===S.htmlLang);
 chk('title',S.title.test(await p.title()),await p.title());
 if(lg==='en'){const cjk=await p.evaluate(()=>{const tx=document.body.innerText.replace(/中/g,'');const inputs=[...document.querySelectorAll('textarea')].map(e=>e.value).join('');return (tx.match(/[\u4e00-\u9fff]+/g)||[]).filter(w=>!inputs.includes(w)).slice(0,5)});
  chk('no Chinese text in English UI',cjk.length===0,cjk.join(','))}
 if(process.env.SHOT&&process.env.SHOT_LANG===lg){await click('ex-sm3');await click('sm3go');await click('ex-sm4');await click('sm4enc');for(const s of ['sm3','sm4','sm2'])await p.evaluate(s=>document.getElementById('err-'+s).textContent='',s);
  await click('ex-sm2');await click('sm2sign');await click('sm2verify');await click('selftest');await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:process.env.SHOT,fullPage:true})}
 report(lg+' selftest',R);report(lg,X);await ctx.close()}
// ---- i18n behaviour
{const X=[];const chk=(n,ok,i='')=>X.push({n,ok:!!ok,i:String(i)});
 for(const [loc,exp] of [['en-US','en'],['zh-CN','zh'],['zh-TW','zh'],['fr-FR','en']]){const [ctx,p]=await newPage(loc);await p.goto(base);await p.waitForFunction('window.__ready');
  const hl=await p.evaluate(()=>document.documentElement.lang);chk(`detect ${loc} → ${exp}`,hl===L[exp].htmlLang,hl);await ctx.close()}
 const [ctx,p]=await newPage('en-US');await p.goto(base);await p.waitForFunction('window.__ready');
 const t0=await p.title();await p.click('#lang-zh');
 chk('toggle → zh: html lang/title/meta',await p.evaluate(()=>document.documentElement.lang)==='zh-CN'&&(await p.title())!==t0&&/国密/.test(await p.evaluate(()=>document.querySelector('meta[name=description]').content)));
 chk('toggle saved in localStorage',(await p.evaluate(()=>localStorage.getItem('gmweb.lang')))==='zh');
 chk('aria-pressed updated',(await p.getAttribute('#lang-zh','aria-pressed'))==='true'&&(await p.getAttribute('#lang-en','aria-pressed'))==='false');
 // error re-renders in new language
 await p.fill('#sm4key','zz');await p.click('#sm4enc');const ez=await p.textContent('#err-sm4');await p.click('#lang-en');const ee=await p.textContent('#err-sm4');
 chk('existing error switches language',ez.startsWith('错误：')&&ee.startsWith('Error: ')&&/invalid hex/.test(ee),ez+' | '+ee);
 await p.click('#lang-zh');await p.reload();await p.waitForFunction('window.__ready');
 chk('persists after reload (en browser, saved zh)',(await p.evaluate(()=>document.documentElement.lang))==='zh-CN');
 await p.goto(withQ({lang:'en'}));await p.waitForFunction('window.__ready');
 chk('?lang=en wins over saved zh',(await p.evaluate(()=>document.documentElement.lang))==='en');
 chk('?lang param is saved',(await p.evaluate(()=>localStorage.getItem('gmweb.lang')))==='en');
 await p.goto(base);await p.waitForFunction('window.__ready');chk('saved en persists without param',(await p.evaluate(()=>document.documentElement.lang))==='en');
 await p.goto(withQ({lang:'xx'}));await p.waitForFunction('window.__ready');chk('invalid ?lang ignored (keeps saved)',(await p.evaluate(()=>document.documentElement.lang))==='en');
 await ctx.close();report('i18n',X)}
// ---- how-to row + live self-test badge
{const X=[];const chk=(n,ok,i='')=>X.push({n,ok:!!ok,i:String(i).slice(0,120)});
 const BADGE={zh:{ok:'✓ 自检 11/11',run:'自检中…'},en:{ok:'✓ Self-test 11/11',run:'Checking…'}};
 const HOW={zh:['选算法','点「试一下示例」','对照国标结果'],en:['Pick an algorithm','Click "Try an example"','Compare with the standard result']};
 const mk=async(vp,locale)=>{const o={viewport:vp,locale};if(vp.width<500&&name!=='firefox'){o.isMobile=true;o.hasTouch=true}const ctx=await b.newContext(o);const p=await ctx.newPage();
  p.on('pageerror',e=>allErrs.push(e.message));p.on('console',m=>m.type()==='error'&&allErrs.push(m.text()));return [ctx,p]};
 for(const vp of [{width:1280,height:800},{width:390,height:844}])for(const lg of ['zh','en']){const tag=`${lg} ${vp.width}`;
  const [ctx,p]=await mk(vp,lg==='zh'?'zh-CN':'en-US');await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');
  const h=await p.evaluate(()=>{const o=document.getElementById('howto'),r=o.getBoundingClientRect(),lis=[...o.children].map(l=>{const rs=[...l.getClientRects()];const b=l.getBoundingClientRect();return {top:Math.round(b.top),h:b.height,rects:rs.length,txt:l.innerText.replace(/\s+/g,' ').trim()}});
   const tg=document.getElementById('tagline').getBoundingClientRect(),tr=document.getElementById('try').getBoundingClientRect();
   return {bottom:r.bottom,vh:innerHeight,lines:new Set(lis.map(l=>l.top)).size,lis,between:r.top>=tg.bottom-1&&r.bottom<=tr.top+1,sw:document.documentElement.scrollWidth,iw:innerWidth}});
  chk(`howto ${tag}: text`,JSON.stringify(h.lis.map(l=>l.txt.replace(/^\d\s*/,'')))===JSON.stringify(HOW[lg]),h.lis.map(l=>l.txt).join('|'));
  chk(`howto ${tag}: in first viewport`,h.bottom>0&&h.bottom<=h.vh,h.bottom+'/'+h.vh);
  chk(`howto ${tag}: between tagline and Try button`,h.between);
  chk(`howto ${tag}: ≤2 lines, steps unbroken`,h.lines<=(vp.width<500?2:1)&&h.lis.every(l=>l.h<30),h.lines+' lines '+h.lis.map(l=>l.h).join(','));
  chk(`howto ${tag}: no horizontal overflow`,h.sw<=h.iw,h.sw+'/'+h.iw);
  await p.waitForFunction(()=>document.getElementById('stbadge').className!=='',null,{timeout:10000}).catch(()=>{});
  const bd=await p.evaluate(()=>{const e=document.getElementById('stbadge');return {t:e.textContent,c:e.className,col:getComputedStyle(e).color,href:e.getAttribute('href')}});
  chk(`badge ${tag}: green with real count`,bd.c==='ok'&&bd.t===BADGE[lg].ok&&bd.col==='rgb(26, 127, 55)'&&bd.href==='#s-test',JSON.stringify(bd));
  const geo=await p.evaluate(()=>{const R=id=>document.getElementById(id).getBoundingClientRect(),b=document.getElementById('stbadge').getBoundingClientRect(),h=document.querySelector('h1').getBoundingClientRect(),l=document.querySelector('.langs').getBoundingClientRect();
   const ov=(a,c)=>a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top;return {ovLang:ov(b,l),below:b.top>=h.bottom-1,right:b.left>=h.right-1&&b.top<h.bottom,inView:b.bottom<=innerHeight}});
  chk(`badge ${tag}: no overlap with language buttons`,!geo.ovLang&&geo.inView,JSON.stringify(geo));
  chk(`badge ${tag}: ${vp.width<500?'under title':'right of title'}`,vp.width<500?geo.below:geo.right,JSON.stringify(geo));
  if(vp.width===1280){const other=lg==='zh'?'en':'zh';await p.click('#lang-'+other);
   chk(`badge ${tag}: switches language`,(await p.textContent('#stbadge'))===BADGE[other].ok,await p.textContent('#stbadge'));await p.click('#lang-'+lg);
   chk(`self-test section untouched by silent run ${tag}`,(await p.textContent('#testsum'))==='');
   await p.click('#stbadge');await p.waitForTimeout(900);
   const st=await p.evaluate(()=>({top:document.getElementById('s-test').getBoundingClientRect().top,atEnd:scrollY+innerHeight>=document.documentElement.scrollHeight-2,vis:document.getElementById('s-test').getBoundingClientRect().top<innerHeight-100,hash:location.hash,rows:document.getElementById('results').textContent.split('\n').length}));
   chk(`badge ${tag}: click scrolls to #s-test and shows per-case results`,(st.top>-5&&st.top<160||st.atEnd&&st.vis)&&st.hash==='#s-test'&&st.rows===11&&(await p.textContent('#testsum')).startsWith('11/11'),JSON.stringify(st))}
  await ctx.close()}
 // WASM blocked: badge must never turn green (errors expected here, so no error listeners)
 for(const lg of ['zh','en']){const ctx=await b.newContext({viewport:{width:1280,height:800}});const p=await ctx.newPage();
  await p.route(/\.wasm(\?|$)/,r=>r.abort());await p.goto(withQ({lang:lg}));
  await p.waitForFunction(()=>document.getElementById('stbadge').textContent!=='',null,{timeout:5000}).catch(()=>{});await p.waitForTimeout(1500);
  const bd=await p.evaluate(()=>{const e=document.getElementById('stbadge');return {t:e.textContent,c:e.className,col:getComputedStyle(e).color}});
  chk(`wasm blocked ${lg}: badge not green`,bd.c!=='ok'&&!bd.t.startsWith('✓')&&bd.col!=='rgb(26, 127, 55)'&&bd.t!=='',JSON.stringify(bd));await ctx.close()}
 report('howto+badge',X)}
// ---- round 3: size limit, scroll-to-result, SM4 hint + friendly decrypt errors, canonical
{const X=[];const chk=(n,ok,i='')=>X.push({n,ok:!!ok,i:String(i).slice(0,160)});
 const R3={zh:{big1:'输入超过 1 MB，本工具不支持这么大的输入',big256:'输入超过 256 KB，本工具不支持这么大的输入',match:'与国标向量一致',hint:['要核对密文','明文也按二进制编码解析','模式','填充','IV','解密','ECB 无填充时无法发现密文错误'],pad:'填充校验不通过',noPad:'无填充解密不做任何校验'},
  en:{big1:'Input exceeds 1 MB; this tool does not support inputs that large',big256:'Input exceeds 256 KB; this tool does not support inputs that large',match:'Matches the official test vector',hint:['To check a ciphertext','Parse plaintext with the binary encoding too','Mode','Padding','IV','Decrypt','ECB with no padding cannot detect a wrong ciphertext'],pad:'padding check did not pass',noPad:'decryption without padding performs no check'}};
 const mk=async(vp,locale,extra={})=>{const o={viewport:vp,locale,...extra};if(vp.width<500&&name!=='firefox'){o.isMobile=true;o.hasTouch=true}const ctx=await b.newContext(o);const p=await ctx.newPage();
  p.on('pageerror',e=>allErrs.push(e.message));p.on('console',m=>m.type()==='error'&&allErrs.push(m.text()));return [ctx,p]};
 const vis=p=>p.evaluate(()=>{const nav=document.querySelector('nav.nav').getBoundingClientRect().bottom,o=document.getElementById('sm4out').getBoundingClientRect(),m=document.getElementById('sm4match').getBoundingClientRect();
  const full=r=>r.height>0&&r.top>=nav-0.5&&r.bottom<=innerHeight+0.5;return {nav:Math.round(nav),out:[Math.round(o.top),Math.round(o.bottom)],m:[Math.round(m.top),Math.round(m.bottom)],vh:innerHeight,ok:full(o)&&full(m),under:m.top-o.bottom}});
 for(const vp of [{width:1280,height:800},{width:390,height:844}])for(const lg of ['zh','en']){const tag=`${lg} ${vp.width}`,S=R3[lg];
  const [ctx,p]=await mk(vp,lg==='zh'?'zh-CN':'en-US');await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');
  await p.click('#try');const fl=await p.evaluate(()=>document.getElementById('sm4out').closest('.out').classList.contains('flash'));await p.waitForTimeout(1300);const v=await vis(p);
  chk(`try ${tag}: SM4 output + ✓ line fully visible below sticky nav`,v.ok&&(await p.textContent('#sm4match')).includes(S.match),JSON.stringify(v));
  chk(`try ${tag}: ✓ line directly under output`,v.under>=0&&v.under<40,v.under);
  const hl=await p.evaluate(()=>{const e=document.getElementById('sm4out'),c=getComputedStyle(e);return {an:c.animationName,dur:c.animationDuration}});
  chk(`try ${tag}: output flashes green (~1.5s)`,fl&&hl.an==='okflash'&&hl.dur==='1.5s',JSON.stringify(hl));
  await p.waitForTimeout(700);chk(`try ${tag}: flash removed afterwards`,!(await p.evaluate(()=>document.getElementById('sm4out').closest('.out').classList.contains('flash'))));
  if(process.env.SHOTDIR){await p.click('#try');await p.waitForTimeout(400);await p.screenshot({path:`${process.env.SHOTDIR}/try-${lg}-${vp.width}.png`})}
  await ctx.close()}
 // reduced motion: instant jump, no animation
 for(const lg of ['zh','en']){const [ctx,p]=await mk({width:1280,height:800},lg==='zh'?'zh-CN':'en-US',{reducedMotion:'reduce'});await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');
  const r=await p.evaluate(()=>{document.getElementById('try').click();const t=document.querySelector('label[for=sm4out]').getBoundingClientRect().top;return {t,y:scrollY,an:getComputedStyle(document.getElementById('sm4out')).animationName}});
  await p.waitForTimeout(800);const y2=await p.evaluate(()=>scrollY);const v=await vis(p);
  chk(`reduced motion ${lg}: instant jump (final position on the same frame), no animation, result visible`,r.y>0&&r.y===y2&&r.an==='none'&&v.ok,JSON.stringify({...r,y2,v:v.ok}));await ctx.close()}
 // size limit + hint + friendly errors + canonical, desktop and mobile per language
 for(const lg of ['zh','en']){const S=R3[lg];const [ctx,p]=await mk(mobile?{width:390,height:844}:{width:1280,height:800},lg==='zh'?'zh-CN':'en-US');await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');
  const hint=await p.textContent('#sm4check');chk(`hint ${lg}: present with real labels`,S.hint.every(s=>hint.includes(s)),hint);
  const can=await p.getAttribute('link[rel=canonical]','href');chk(`canonical ${lg}: follows language`,can==='https://www.frankxue.dev/gm-crypto-web/?lang='+lg,can);
  const other=lg==='zh'?'en':'zh';await p.click('#lang-'+other);const can2=await p.getAttribute('link[rel=canonical]','href');await p.click('#lang-'+lg);
  chk(`canonical ${lg}: switches to ?lang=${other}`,can2==='https://www.frankxue.dev/gm-crypto-web/?lang='+other,can2);
  if(name==='chromium')await p.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push({s:e.startTime,d:e.duration}))).observe({type:'longtask',buffered:false})});
  // 10 MB paste: every action shows the message within 1 s and the page stays responsive
  const frame=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))));
  const big=async(setup,btn,sec,exp,label)=>{
   // (a) a real Ctrl/Cmd+V of 10 MB (clipboard filled via a trusted copy event): refused up front, field untouched, message shown
   const fid=setup.find(([,k])=>k==='txt'||k==='hex');
   await p.evaluate(([setup,fid])=>{const $=id=>document.getElementById(id);for(const [id,k] of setup){if(k==='ex')$(id).click();else if(k==='chk')$(id).checked=true}
    for(const s of ['sm3','sm4','sm2'])$('err-'+s).textContent='';window.__before=$(fid[0]).value;const big=fid[1]==='hex'?'00'.repeat(10485760):'a'.repeat(10485760);
    document.addEventListener('copy',e=>{e.clipboardData.setData('text/plain',big);e.preventDefault()},{once:true})},[setup,fid]);
   await p.focus('#'+fid[0]);await p.keyboard.press('ControlOrMeta+C');await p.evaluate(id=>{const e=document.getElementById(id);e.select();window.__tp=performance.now()},fid[0]);
   const tp=Date.now();await p.keyboard.press('ControlOrMeta+V');await frame();const pms=Date.now()-tp;
   const pz=await p.evaluate(([id,sec])=>({same:document.getElementById(id).value===window.__before,e:document.getElementById('err-'+sec).textContent}),[fid[0],sec]);
   chk(`10MB paste ${lg} ${label}: refused within 1s, field unchanged`,pms<1000&&pz.same&&pz.e.includes(exp),pms+'ms '+pz.e);
   if(process.env.SHOTDIR&&!mobile&&label==='SM4 encrypt hex')await (await p.$('#s-sm4')).screenshot({path:`${process.env.SHOTDIR}/limit-${lg}-sm4.png`});
   // (b) 10 MB already in the field (e.g. typed/dropped): clicking the action shows the message within 1s and the next frame comes quickly
   await p.evaluate(([setup])=>{const $=id=>document.getElementById(id);for(const [id,k] of setup){if(k==='ex'||k==='chk')continue;$(id).value=k==='hex'?'00'.repeat(10485760):'a'.repeat(10485760);$(id).dispatchEvent(new Event('input',{bubbles:true}))}},[setup]);
   for(let i=0;i<40;i++){const t=Date.now();await frame();if(Date.now()-t<50)break;await p.waitForTimeout(250)} // let the browser finish laying out the 10 MB textarea first
   const t0=Date.now();const r=await p.evaluate(([btn,sec])=>{const $=id=>document.getElementById(id);window.__t0=performance.now();const t=performance.now();$(btn).click();return {ms:performance.now()-t,e:$('err-'+sec).textContent}},[btn,sec]);
   await frame();const resp=Date.now()-t0;
   chk(`10MB ${lg} ${label}: click shows message within 1s, page responsive`,r.ms<1000&&resp<1000&&r.e.includes(exp),Math.round(r.ms)+'ms, next frame '+resp+'ms '+r.e);
   if(name==='chromium'){const lt=await p.evaluate(()=>window.__lt.filter(e=>e.s>=window.__t0).map(e=>e.d));chk(`10MB ${lg} ${label}: no long task after click`,lt.every(d=>d<200),'max '+Math.round(Math.max(0,...lt))+'ms')}
   await p.evaluate(()=>{for(const id of ['sm3in','sm4in','sm2msg','sm2ct'])document.getElementById(id).value=''});await frame()};
  await big([['sm3in','txt']],'sm3go','sm3',S.big1,'SM3 hash');
  await big([['ex-sm4','ex'],['sm4in','txt']],'sm4enc','sm4',S.big256,'SM4 encrypt text');
  await big([['ex-sm4','ex'],['sm4inbin','chk'],['sm4in','hex']],'sm4enc','sm4',S.big256,'SM4 encrypt hex');
  await big([['ex-sm4','ex'],['sm4in','hex']],'sm4dec','sm4',S.big256,'SM4 decrypt');
  await big([['ex-sm2','ex'],['sm2msg','txt']],'sm2sign','sm2',S.big1,'SM2 sign');
  await big([['ex-sm2','ex'],['sm2msg','txt']],'sm2verify','sm2',S.big1,'SM2 verify');
  await big([['ex-sm2','ex'],['sm2msg','txt']],'sm2enc','sm2',S.big1,'SM2 encrypt');
  await big([['ex-sm2','ex'],['sm2ct','hex']],'sm2dec','sm2',S.big1,'SM2 decrypt');
  // just under / just over the limit
  const edge=async(js,sec,label,expOk,exp)=>{const r=await p.evaluate(([js,sec])=>{const $=id=>document.getElementById(id);(new Function('$',js))($);return $('err-'+sec).textContent},[js,sec]);
   chk(`limit edge ${lg}: ${label}`,expOk?r==='':r.includes(exp),r||'(no error)')};
  const M=1048576,K=262144;
  await edge(`$('sm3in').value='a'.repeat(${M});$('sm3go').click()`,'sm3','SM3 1 MB exactly runs',true);
  await edge(`$('sm3in').value='a'.repeat(${M+1});$('sm3go').click()`,'sm3','SM3 1 MB + 1 byte refused',false,S.big1);
  await edge(`$('sm3in').value='é'.repeat(${M/2+1});$('sm3go').click()`,'sm3','SM3 counts UTF-8 bytes',false,S.big1);
  await edge(`$('ex-sm4').click();$('sm4pad').value='pkcs7';$('sm4in').value='00'.repeat(${K});$('sm4enc').click()`,'sm4','SM4 256 KB exactly runs',true);
  await edge(`$('sm4in').value=$('sm4out').value;$('sm4dec').click()`,'sm4','SM4 decrypt of 256 KB + padding block runs',true);
  await edge(`$('ex-sm4').click();$('sm4pad').value='pkcs7';$('sm4in').value='00'.repeat(${K+1});$('sm4enc').click()`,'sm4','SM4 256 KB + 1 byte refused',false,S.big256);
  await edge(`$('ex-sm2').click();$('sm2msg').value='a'.repeat(${M});$('sm2sign').click();$('sm2verify').click();$('sm2enc').click();$('sm2dec').click()`,'sm2','SM2 1 MB sign/verify/enc/dec runs',true);
  await edge(`$('sm2msg').value='a'.repeat(${M+1});$('sm2sign').click()`,'sm2','SM2 1 MB + 1 byte refused',false,S.big1);
  await p.evaluate(()=>{for(const id of ['sm3in','sm4in','sm4out','sm2msg','sm2ct'])document.getElementById(id).value=''});
  // one-byte-off ciphertext
  const flip=(h,i)=>{const j=i<0?h.length/2+i:i;return h.slice(0,2*j)+((parseInt(h.substr(2*j,2),16)^1).toString(16).padStart(2,'0'))+h.slice(2*j+2)};
  for(const [mode,pad,pos] of [['ECB','pkcs7',-1],['CBC','pkcs7',-1],['CBC','pkcs7',15]]){await p.click('#ex-sm4');await p.selectOption('#sm4mode',mode);await p.selectOption('#sm4pad',pad);await p.uncheck('#sm4inbin');
   await p.fill('#sm4in','hello world, this is 2 blocks!!');await p.click('#sm4enc');const ct=await p.inputValue('#sm4out');await p.fill('#sm4in',flip(ct,pos));await p.click('#sm4dec');const e=await p.textContent('#err-sm4');
   chk(`one-byte-off ${lg} ${mode}/${pad} byte ${pos}: friendly padding error`,e.includes(S.pad)&&(await p.inputValue('#sm4out'))===''&&!/Unexpected|未知错误|bad padding|decrypt failed/.test(e),e)}
  await p.click('#ex-sm4');await p.click('#sm4enc');await p.fill('#sm4in',flip(await p.inputValue('#sm4out'),3));await p.click('#sm4dec');
  chk(`one-byte-off ${lg} ECB/none: no error, but no-check note shown`,(await p.textContent('#err-sm4'))===''&&(await p.textContent('#sm4note')).includes(S.noPad),await p.textContent('#sm4note'));
  await p.click('#sm4enc');chk(`note cleared on next encrypt ${lg}`,(await p.textContent('#sm4note'))==='');
  if(process.env.SHOTDIR&&!mobile){await p.click('#ex-sm4');await p.selectOption('#sm4pad','pkcs7');await p.uncheck('#sm4inbin');await p.fill('#sm4in','hello world, this is 2 blocks!!');await p.click('#sm4enc');await p.fill('#sm4in',flip(await p.inputValue('#sm4out'),-1));await p.click('#sm4dec');
   await p.evaluate(()=>{document.getElementById('s-sm4').scrollIntoView();scrollBy(0,-60)});await p.screenshot({path:`${process.env.SHOTDIR}/hint-${lg}-1280.png`});
   await (await p.$('#s-sm4')).screenshot({path:`${process.env.SHOTDIR}/sm4-section-${lg}.png`})}
  const miss=await p.evaluate(()=>{const h=document.documentElement.outerHTML+document.body.innerText;return (h.match(/⟦[^⟧]*⟧/g)||[]).slice(0,5)});chk(`no missing i18n keys after round-3 flows ${lg}`,miss.length===0,miss.join(','));
  await ctx.close()}
 // error placement: oversized / bad input clears the output, red-borders the input, error right under it
 const NR={zh:'无结果',en:'No result'};
 for(const vp of [{width:1280,height:800},{width:390,height:844}])for(const lg of ['zh','en']){const tag=`${lg} ${vp.width}`,S=R3[lg];
  const [ctx,p]=await mk(vp,lg==='zh'?'zh-CN':'en-US');await p.goto(withQ({lang:lg}));await p.waitForFunction('window.__ready');
  await p.click('#ex-sm4');await p.click('#sm4enc');const ok1=(await p.inputValue('#sm4out'))==='681edf34d206965e86b3e94f536e4246';
  await p.evaluate(()=>{const e=document.getElementById('sm4in');e.value='00'.repeat(300*1024);e.dispatchEvent(new Event('input',{bubbles:true}))});await p.click('#sm4enc');
  await p.evaluate(()=>document.getElementById('sm4in').scrollIntoView({block:'center'}));await p.waitForTimeout(300);
  const g=await p.evaluate(()=>{const i=document.getElementById('sm4in'),e=document.getElementById('err-sm4'),o=document.getElementById('sm4out');const ri=i.getBoundingClientRect(),re=e.getBoundingClientRect();
   const nav=document.querySelector('nav.nav').getBoundingClientRect().bottom,inV=r=>r.top>=nav-1&&r.bottom<=innerHeight+1&&r.height>0;
   return {out:o.value,ph:o.placeholder,bad:i.classList.contains('badf'),err:e.textContent,gap:Math.round(re.top-ri.bottom),next:i.nextElementSibling===e,inView:inV(ri)&&inV(re)}});
  chk(`err ${tag}: oversized SM4 input clears old ciphertext, shows "${NR[lg]}"`,ok1&&g.out===''&&g.ph===NR[lg],JSON.stringify(g).slice(0,160));
  chk(`err ${tag}: input red-bordered, error directly under it, both on screen`,g.bad&&g.next&&g.gap>=0&&g.gap<30&&g.inView&&g.err.includes(S.big256),JSON.stringify({...g,err:g.err.slice(0,30)}));
  if(process.env.SHOTDIR)await p.screenshot({path:`${process.env.SHOTDIR}/err-${lg}-${vp.width}.png`});
  await p.type('#sm4in','0');const c=await p.evaluate(()=>({err:document.getElementById('err-sm4').textContent,bad:document.getElementById('sm4in').classList.contains('badf')}));
  chk(`err ${tag}: editing the input clears error + border`,c.err===''&&!c.bad,JSON.stringify(c));
  await p.click('#ex-sm4');await p.click('#sm4enc');chk(`err ${tag}: next success clears placeholder`,(await p.inputValue('#sm4out'))!==''&&(await p.getAttribute('#sm4out','placeholder'))===null);
  // conversion error lands under the key; decrypt failure under the ciphertext
  await p.fill('#sm4key','zz');await p.click('#sm4enc');const k=await p.evaluate(()=>{const i=document.getElementById('sm4key'),e=document.getElementById('err-sm4');return {next:i.nextElementSibling===e,bad:i.classList.contains('badf'),out:document.getElementById('sm4out').value}});
  chk(`err ${tag}: bad hex key → error under key, output cleared`,k.next&&k.bad&&k.out==='',JSON.stringify(k));
  await p.click('#ex-sm4');await p.selectOption('#sm4pad','pkcs7');await p.click('#sm4enc');const ct=await p.inputValue('#sm4out');await p.fill('#sm4in',ct.slice(0,-2)+(ct.endsWith('00')?'01':'00'));await p.click('#sm4dec');
  const d=await p.evaluate(()=>{const i=document.getElementById('sm4in'),e=document.getElementById('err-sm4');return {next:i.nextElementSibling===e,bad:i.classList.contains('badf'),out:document.getElementById('sm4out').value,e:e.textContent}});
  chk(`err ${tag}: padding failure → error under ciphertext, output cleared`,d.next&&d.bad&&d.out===''&&d.e.includes(S.pad),JSON.stringify(d).slice(0,160));
  await p.click('#sm3go');await p.click('#ex-sm3');await p.click('#sm3go');
  chk(`err ${tag}: section-level error slot returns to section end`,await p.evaluate(()=>{const e=document.getElementById('err-sm4');return e.parentElement.id==='s-sm4'}));
  await ctx.close()}
 report('round3',X)}
await require('./qa.cjs')({b,name,withQ,report,allErrs});
if(process.env.SHOTDIR&&!mobile&&process.env.SHOTS!=='0')await require('./shots.cjs')({b,name,withQ,dir:process.env.SHOTDIR});
report('static',report0);console.log('TOTAL',passed+'/'+total);console.log('errors',JSON.stringify(allErrs));console.log('external',JSON.stringify([...new Set(allExt)]));
await b.close();process.exit(allOk&&!allErrs.length&&!allExt.length?0:1)})();
