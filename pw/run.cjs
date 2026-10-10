const pw=require('playwright-core');const name=process.argv[2]||'chromium';
(async()=>{const b=await pw[name].launch(name==='chromium'?(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,args:['--no-sandbox']}:{}):{});
const p=await b.newPage({viewport:{width:1000,height:1600}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
const reqs=[];p.on('request',r=>reqs.push(r.method()+' '+r.url()));
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';await p.goto(base);await p.waitForFunction('window.__ready');
const R=await p.evaluate(()=>window.selftest().map(r=>({n:r.name,ok:r.pass,i:r.info.slice(0,80)})));
R.forEach(r=>console.log(r.ok?'PASS':'FAIL',r.n,r.i));
// UI flow
await p.click('#sm3go');console.log('UI sm3',await p.inputValue('#sm3out'));
await p.click('#sm2gen');await p.click('#sm2sign');await p.click('#sm2verify');console.log('UI verify',await p.textContent('#sm2vres'));
await p.fill('#sm2msg','tampered');await p.click('#sm2verify');console.log('UI tampered',await p.textContent('#sm2vres'));
await p.click('#sm2enc');await p.click('#sm2dec');console.log('UI sm2 dec',await p.inputValue('#sm2pt'));
await p.fill('#sm4in','hi cbc');await p.selectOption('#sm4mode','CBC');await p.click('#sm4enc');const ct=await p.inputValue('#sm4out');await p.fill('#sm4in',ct);await p.click('#sm4dec');console.log('UI cbc',ct,'->',await p.inputValue('#sm4out'));
await p.check('input[value=b64]');console.log('UI b64 sm3',await p.inputValue('#sm3out'));
await p.screenshot({path:'screenshot-'+name+'.png',fullPage:true});
const origin=new URL(base).origin;const ext=[...new Set(reqs)].filter(r=>!r.split(' ')[1].startsWith(origin));
console.log('PASSED',R.filter(r=>r.ok).length+'/'+R.length);console.log('errors',errs);console.log('requests',[...new Set(reqs)]);console.log('external requests',ext);await b.close()})();
