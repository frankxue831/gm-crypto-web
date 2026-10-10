// Usage: BASE_URL=... [CHROME_PATH=...] [MOBILE=1] [SHOT_LANG=en SHOT=path.png] node run.cjs chromium|firefox|webkit
// Runs the full suite in both languages plus i18n checks. Exit code 0 only if everything passes.
const pw=require('playwright-core');const name=process.argv[2]||'chromium';
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';const mobile=!!process.env.MOBILE;
const withQ=(q)=>{const u=new URL(base);for(const[k,v]of Object.entries(q))u.searchParams.set(k,v);return u.toString()};
const L={
 zh:{prompt:'点击运行，用国标向量校验本页实现。',tagline:'在浏览器里调试',match:'与国标向量一致',text:'文本',ivEcb:'ECB 不使用 IV',convFail:'无法转换',compressed:'不支持 02/03 开头的压缩公钥',summary:'11/11 通过',copied:'已复制',ok:'通过',htmlLang:'zh-CN',title:/国密在线小工具/,v:['非法 Hex','奇数','SM4 密钥必须为 16 字节','16 字节的整数倍','密文长度必须是 16','IV必须为 16 字节','私钥必须为 32 字节','04 开头','公钥必须为 65 字节','不是合法的 Base64'],prefix:'错误：'},
 en:{prompt:'Click Run to check this page against the official GB/T test vectors.',tagline:'Debug SM2/SM3/SM4',match:'Matches the official test vector',text:'Text',ivEcb:'ECB does not use an IV',convFail:'Could not convert',compressed:'compressed 02/03 keys are not',summary:'11/11 passed',copied:'Copied',ok:'valid',htmlLang:'en',title:/SM2 \/ SM3 \/ SM4 Online Tool/,v:['invalid hex','odd number','SM4 key must be 16 bytes','multiple of 16 bytes','Ciphertext length must be','IV must be 16 bytes','private key must be 32 bytes','start with 04','public key must be 65 bytes','not valid Base64'],prefix:'Error: '}};
(async()=>{const b=await pw[name].launch(name==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,args:['--no-sandbox']}:{});
const allErrs=[],allExt=[];let total=0,passed=0,allOk=true;
const report0=[];
{const html=await (await fetch(base)).text();const m=(re)=>re.test(html);
 const ogimg=(html.match(/property="og:image" content="([^"]+)"/)||[])[1];
 report0.push({n:'static meta description',ok:m(/<meta name="description" content="[^"]{20,}"/)},{n:'static og:title/description/url/type',ok:m(/property="og:title" content="[^"]+"/)&&m(/property="og:description" content="[^"]+"/)&&m(/property="og:url" content="https:\/\/www\.frankxue\.dev\/gm-crypto-web\/"/)&&m(/property="og:type" content="website"/)},
  {n:'static og:image absolute URL',ok:ogimg==='https://www.frankxue.dev/gm-crypto-web/og.png',i:ogimg},
  {n:'static twitter card/title/description/image',ok:m(/name="twitter:card" content="summary_large_image"/)&&m(/name="twitter:title" content="[^"]+"/)&&m(/name="twitter:description" content="[^"]+"/)&&m(/name="twitter:image" content="https:\/\/www\.frankxue\.dev\/gm-crypto-web\/og\.png"/)});
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
 await p.waitForTimeout(600);const top=await p.evaluate(()=>document.getElementById('s-sm3').getBoundingClientRect().top);chk('try: scrolled to SM3',top>-5&&top<140,top);
 chk('try: focus on SM3 heading',(await p.evaluate(()=>document.activeElement&&document.activeElement.id))==='h-sm3');
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
report('static',report0);console.log('TOTAL',passed+'/'+total);console.log('errors',JSON.stringify(allErrs));console.log('external',JSON.stringify([...new Set(allExt)]));
await b.close();process.exit(allOk&&!allErrs.length&&!allExt.length?0:1)})();
