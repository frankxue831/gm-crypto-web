// Usage: BASE_URL=... [CHROME_PATH=...] [MOBILE=1] [SHOT=path.png] node run.cjs chromium|firefox|webkit
const pw=require('playwright-core');const name=process.argv[2]||'chromium';
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';const mobile=!!process.env.MOBILE;
(async()=>{const b=await pw[name].launch(name==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,args:['--no-sandbox']}:{});
const ctxOpts={viewport:mobile?{width:390,height:844}:{width:1280,height:1000}};if(mobile&&name!=='firefox'){ctxOpts.isMobile=true;ctxOpts.hasTouch=true}
if(name==='chromium')ctxOpts.permissions=['clipboard-read','clipboard-write'];
const ctx=await b.newContext(ctxOpts);const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
const reqs=[];p.on('request',r=>reqs.push(r.method()+' '+r.url()));
await p.goto(base);await p.waitForFunction('window.__ready');
const R=await p.evaluate(()=>window.selftest().map(r=>({n:r.name,ok:r.pass,i:r.info.slice(0,80)})));
const X=[];const chk=(n,ok,i='')=>X.push({n,ok:!!ok,i:String(i).slice(0,90)});
const v=id=>p.inputValue('#'+id), err=s=>p.textContent('#err-'+s), click=s=>p.click('#'+s);
// examples
await click('ex-sm3');await click('sm3go');chk('example SM3 abc',(await v('sm3out'))==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',await v('sm3out'));
await click('ex-sm4');await click('sm4enc');chk('example SM4 KAT',(await v('sm4out'))==='681edf34d206965e86b3e94f536e4246',await v('sm4out'));
await click('ex-sm2');chk('example SM2 pubkey (GB/T A.2)',(await v('sm2p')).startsWith('0409f9df311e5421a150dd7d161e4bc5c672179fad1833fc076bb08ff356f35020'),await v('sm2p'));
await click('sm2sign');await click('sm2verify');chk('example SM2 sign→verify',(await p.textContent('#sm2vres')).includes('通过'));
await click('sm2enc');await click('sm2dec');chk('example SM2 enc→dec',(await v('sm2pt'))==='message digest');
// copy
await p.click('button[data-copy=sm3out]');await p.waitForFunction(()=>document.querySelector('button[data-copy=sm3out]').textContent!=='复制',null,{timeout:3000}).catch(()=>{});chk('copy feedback 已复制',(await p.textContent('button[data-copy=sm3out]'))==='已复制',await p.textContent('button[data-copy=sm3out]'));
if(name==='chromium'){const c=await p.evaluate(()=>navigator.clipboard.readText());chk('clipboard content',c==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',c)}
// validation
const ve=async(sec,btn,re,setup)=>{await setup();await click(btn);const e=await err(sec);chk('validation: '+re,new RegExp(re).test(e),e)};
await ve('sm4','sm4enc','非法 Hex',async()=>{await click('ex-sm4');await p.fill('#sm4key','zz23456789abcdeffedcba9876543210')});
await ve('sm4','sm4enc','奇数',async()=>{await p.fill('#sm4key','0123456789abcdeffedcba987654321')});
await ve('sm4','sm4enc','密钥必须为 16 字节',async()=>{await p.fill('#sm4key','0123456789abcdef')});
await ve('sm4','sm4enc','16 字节的整数倍',async()=>{await click('ex-sm4');await p.fill('#sm4in','0123')});
await ve('sm4','sm4dec','密文长度必须是 16',async()=>{await p.fill('#sm4in','0123')});
await ve('sm4','sm4enc','IV必须为 16 字节',async()=>{await click('ex-sm4');await p.selectOption('#sm4mode','CBC');await p.fill('#sm4iv','00')});
await ve('sm2','sm2sign','私钥必须为 32 字节',async()=>{await click('ex-sm2');await p.fill('#sm2d','0102')});
await ve('sm2','sm2enc','04 开头',async()=>{await click('ex-sm2');const pk=await v('sm2p');await p.fill('#sm2p','05'+pk.slice(2))});
await ve('sm2','sm2enc','公钥必须为 65 字节',async()=>{await p.fill('#sm2p','04aa')});
await p.check('input[value=b64]');await ve('sm4','sm4enc','不是合法的 Base64',async()=>{await p.fill('#sm4key','###')});await p.check('input[value=hex]');
chk('no inline error after valid op',await (async()=>{await click('ex-sm3');await click('sm3go');return (await err('sm3'))===''})());
// layout
const sw=await p.evaluate(()=>[document.documentElement.scrollWidth,window.innerWidth]);chk('no horizontal scroll',sw[0]<=sw[1],sw.join('/'));
await p.evaluate(()=>window.scrollTo(0,0));
if(process.env.SHOT)await p.screenshot({path:process.env.SHOT,fullPage:true});
const origin=new URL(p.url()).origin;const ext=[...new Set(reqs)].filter(r=>!r.split(' ')[1].startsWith(origin)&&!r.split(' ')[1].startsWith(new URL(base).origin));
[...R,...X].forEach(r=>console.log(r.ok?'PASS':'FAIL',r.n,r.i));
console.log('SELFTEST',R.filter(r=>r.ok).length+'/'+R.length,'EXTRA',X.filter(r=>r.ok).length+'/'+X.length);
console.log('errors',JSON.stringify(errs));console.log('external',JSON.stringify(ext));await b.close();
process.exit(R.every(r=>r.ok)&&X.every(r=>r.ok)&&!errs.length&&!ext.length?0:1)})();
