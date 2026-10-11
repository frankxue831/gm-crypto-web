import init, * as g from './pkg/gm_web.js';
import {t, detect, apply} from './i18n.js';
const $=id=>document.getElementById(id), te=new TextEncoder(), td=new TextDecoder('utf-8',{fatal:true});
const genc=()=>document.querySelector('input[name=enc]:checked').value;
// fast codecs: table lookups, no per-byte arrays (large inputs used to spend most time here)
const HX=Array.from({length:256},(_,i)=>i.toString(16).padStart(2,'0')),HV=new Int8Array(128).fill(-1);
for(let i=0;i<16;i++){HV['0123456789abcdef'.charCodeAt(i)]=i;HV['0123456789ABCDEF'.charCodeAt(i)]=i}
const hex=b=>{const P=[];for(let i=0;i<b.length;i+=8192){let s='';const e=Math.min(b.length,i+8192);for(let j=i;j<e;j++)s+=HX[b[j]];P.push(s)}return P.join('')};
const b64=b=>{const P=[];for(let i=0;i<b.length;i+=8190)P.push(btoa(String.fromCharCode.apply(null,b.subarray(i,i+8190))));return P.join('')};
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
// UErr carries an i18n key + params so it can be re-rendered on language switch
class UErr extends Error{constructor(k,p={}){super(k);this.k=k;this.p=p}}
const hexS=(s,w)=>{s=s.replace(/\s+/g,'');if(/[^0-9a-fA-F]/.test(s))throw new UErr('err.hexChar',{w});if(s.length%2)throw new UErr('err.hexOdd',{w});return s};
const b64S=(s,w)=>{s=s.replace(/\s+/g,'');if(/[^A-Za-z0-9+/=]/.test(s)||/=[^=]/.test(s)||s.length%4||/={3}$/.test(s))throw new UErr('err.b64',{w});return s};
const unhex=(s,w='w.input')=>{s=hexS(s,w);const n=s.length>>1,o=new Uint8Array(n);for(let i=0;i<n;i++)o[i]=HV[s.charCodeAt(2*i)]<<4|HV[s.charCodeAt(2*i+1)];return o};
const unb64=(s,w='w.input')=>{s=b64S(s,w);let a;try{a=atob(s)}catch{throw new UErr('err.b64',{w})}const o=new Uint8Array(a.length);for(let i=0;i<a.length;i++)o[i]=a.charCodeAt(i);return o};
// decoded length without decoding (validates the same way)
const byteLen=(e,s,w='w.input')=>{if(e==='hex')return hexS(s,w).length>>1;s=b64S(s,w);return s.length/4*3-(s.match(/=*$/)[0].length)};
const decodeAs=(e,s,w)=>e==='hex'?unhex(s,w):unb64(s,w), encodeAs=(e,b)=>e==='hex'?hex(b):b64(b);
// ---- input size limits (decoded bytes per input). Measured: SM4 in WASM costs ~2.1 s/MB, SM3/SM2 are fast,
// so SM4 is capped at 256 KB and SM3/SM2 at 1 MB to keep every action under ~1 s in Chromium/Firefox/WebKit.
export const LIM={sm3:1<<20,sm2:1<<20,sm4:256<<10};
const fmtSize=n=>n>=1<<20?`${n/1048576} MB`:`${n/1024} KB`;
const cap=(n,lim,slack=0)=>{if(n>lim+slack)throw new UErr('err.tooBig',{lim:fmtSize(lim)});return n};
const textB=(s,lim)=>{cap(s.length,lim);const e=te.encode(s);cap(e.length,lim);return e};

// ---- field model: every field is either text or binary; binary fields remember their own encoding
const BIN_FIXED=['sm3out','sm4key','sm4iv','sm2d','sm2p','sm2sig','sm2ct'];
const ALL=['sm3in','sm3out','sm4key','sm4iv','sm4in','sm4out','sm2d','sm2p','sm2msg','sm2sig','sm2ct','sm2pt'];
const kind=id=>BIN_FIXED.includes(id)?'bin':id==='sm4in'?($('sm4inbin').checked?'bin':'text'):(id==='sm4out'||id==='sm2pt')?($(id).dataset.kind||'bin'):'text';
const fenc=id=>$(id).dataset.enc||genc();
const fail={}; // id -> {from,to} when a toggle conversion failed
BIN_FIXED.forEach(id=>$(id).dataset.enc='hex');
function setBin(id,bytes){const e=$(id);e.value=encodeAs(genc(),bytes);e.dataset.enc=genc();if(id==='sm4out'||id==='sm2pt')e.dataset.kind='bin';delete fail[id];meta(id)}
function setText(id,s){const e=$(id);e.value=s;e.dataset.kind='text';delete e.dataset.enc;delete fail[id];meta(id)}
function clearF(id){const e=$(id);e.value='';delete e.dataset.enc;if(id==='sm4out'||id==='sm2pt')delete e.dataset.kind;delete fail[id];meta(id)}
function meta(id){const m=$('m-'+id),e=$(id);if(!m)return;e.classList.toggle('badf',!!fail[id]);m.classList.toggle('bad',!!fail[id]);
 if(kind(id)==='text'){m.textContent=t('kind.text');return}
 const en=fenc(id),name=t(en==='hex'?'kind.hex':'kind.b64');
 if(fail[id]){m.textContent=`${name} · ${t('conv.fail',{from:t(fail[id].from==='hex'?'kind.hex':'kind.b64'),to:t(fail[id].to==='hex'?'kind.hex':'kind.b64')})}`;return}
 let n=null;if(e.value.trim()){try{n=byteLen(en,e.value)}catch{}}
 m.textContent=n===null?name:`${name} · ${t('bytes',{n})}`}
const metaAll=()=>ALL.forEach(meta);
ALL.forEach(id=>$(id).addEventListener('input',()=>{const e=$(id);if(kind(id)==='bin'){e.dataset.enc=genc();delete fail[id]}meta(id)}));
// refuse an oversized paste before the browser lays out megabytes of text (that alone froze WebKit for ~15 s at 10 MB)
const PASTE={sm3in:['sm3',LIM.sm3],sm4key:['sm4',LIM.sm4],sm4iv:['sm4',LIM.sm4],sm4in:['sm4',LIM.sm4,16],sm2d:['sm2',LIM.sm2],sm2p:['sm2',LIM.sm2],sm2msg:['sm2',LIM.sm2],sm2sig:['sm2',LIM.sm2],sm2ct:['sm2',LIM.sm2,256]};
for(const [id,[sec,lim,slack=0]] of Object.entries(PASTE))$(id).addEventListener('paste',ev=>{const s=ev.clipboardData&&ev.clipboardData.getData('text');if(!s)return;
 const k=kind(id),e=fenc(id),n=k==='text'?s.length:e==='hex'?s.length>>1:Math.floor(s.length*3/4);
 if(n>lim+slack+(k==='text'?0:n>>4)){ev.preventDefault();errs[sec]=new UErr('err.tooBig',{lim:fmtSize(lim)});render()}});
$('sm4inbin').addEventListener('change',()=>{const e=$('sm4in');if($('sm4inbin').checked)e.dataset.enc=genc();else delete e.dataset.enc;delete fail.sm4in;meta('sm4in')});
// encoding toggle: convert ONLY binary fields; flag the ones that cannot be converted
document.querySelectorAll('input[name=enc]').forEach(r=>r.addEventListener('change',()=>{const now=genc();
 for(const id of ALL){if(kind(id)!=='bin')continue;const e=$(id),from=fenc(id);
  if(!e.value.trim()){e.dataset.enc=now;delete fail[id];continue}
  if(from===now){delete fail[id];continue}
  try{e.value=encodeAs(now,decodeAs(from,e.value));e.dataset.enc=now;delete fail[id]}catch{e.dataset.enc=from;fail[id]={from,to:now}}}
 metaAll()}));
const W=w=>({what:t(w)});
const inp=(id,w,lim=LIM.sm2,slack=0)=>{const v=$(id).value;if(!v.trim())throw new UErr('err.empty',{w});cap(byteLen(fenc(id),v,w),lim,slack);return decodeAs(fenc(id),v,w)};
const need=(b,n,w)=>{if(b.length!==n)throw new UErr('err.len',{w,n,got:b.length});return b};
const priv=()=>need(inp('sm2d','w.priv'),32,'w.priv');
const pub=()=>{const p=inp('sm2p','w.pub');if(p.length===33&&(p[0]===2||p[0]===3))throw new UErr('err.pubCompressed');need(p,65,'w.pub');if(p[0]!==4)throw new UErr('err.pub04');return p};
const ID=()=>{if(document.querySelector('input[name=idmode]:checked').value==='def')return g.sm2_default_id();
 const v=$('sm2id').value;if(!v)throw new UErr('err.idEmpty');return te.encode(v)};
const WASM={'invalid private key':'err.invalidPriv','invalid public key':'err.invalidPub','decrypt failed':'err.sm2dec',
 'decrypt failed (bad length/padding)':'err.sm4dec','bad padding':'err.badPad','sign failed':'err.sign','encrypt failed':'err.encrypt'};
const toErr=x=>x instanceof UErr?x:(m=>WASM[m]?new UErr(WASM[m]):new UErr('err.unknown',{msg:m}))(String(x?.message||x));
// ---- render state (re-rendered on language switch)
const errs={sm3:null,sm4:null,sm2:null};let sm4note=null,verdict=null,lastResults=null,sm4badge=null,autoResults=null,stState='run';
// self-test case list: the badge total comes from here, never from HTML
const CASES=['t.sm3','t.sm4kat','t.sm4katdec','t.sm4pkcs7','t.sm4cbc','t.sm2key','t.sm2def','t.sm2cid','t.sm2tamper','t.sm2wrongid','t.sm2enc'];
const fmtErr=e=>t('err.prefix')+t(e.k,{...e.p,...(e.p.w?W(e.p.w):{})});
function render(){for(const s in errs)$('err-'+s).textContent=errs[s]?fmtErr(errs[s]):'';
 const r=$('sm2vres');r.textContent=verdict===null?'':t(verdict?'sm2.ok':'sm2.bad');r.className=verdict===null?'':verdict?'ok':'bad';
 const m=$('sm4match');m.textContent=sm4badge===null?'':t(sm4badge?'sm4.match':'sm4.mismatch');m.className='badge '+(sm4badge===null?'':sm4badge?'ok':'bad');
 $('sm4note').textContent=sm4note?t(sm4note):'';
 $('ivnote').textContent=$('sm4mode').value==='ECB'?t('sm4.ivEcb'):'';
 if(lastResults){const ok=lastResults.filter(x=>x.pass).length;$('testsum').textContent=t('test.summary',{ok,n:lastResults.length});$('testsum').className=ok===lastResults.length?'ok':'bad';
  $('results').textContent=lastResults.map(x=>`${t(x.pass?'pass':'fail')}  ${t(x.k)}${x.info?'  '+x.info:''}`).join('\n')}
 else{$('testsum').textContent='';$('results').textContent=t('test.prompt')}
 const sb=$('stbadge'),okN=autoResults?autoResults.filter(x=>x.pass).length:0;
 sb.className=stState==='run'?'':stState;sb.setAttribute('aria-label',t('badge.aria'));
 sb.textContent=stState==='run'?t('badge.run'):t(stState==='ok'?'badge.ok':'badge.bad',{ok:okN,n:CASES.length});
 metaAll()}
function setLang(l,save){apply(l,save);render()}
setLang(detect(),false);
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{setLang(b.dataset.lang,true);
 const u=new URL(location.href);if(u.searchParams.has('lang')){u.searchParams.set('lang',b.dataset.lang);history.replaceState(null,'',u)}}));
const on=(id,sec,f)=>$(id).addEventListener('click',()=>{errs[sec]=null;try{f()}catch(x){errs[sec]=toErr(x)}render()});
// ECB has no IV
const ivState=()=>{$('sm4iv').disabled=$('sm4mode').value==='ECB';render()};$('sm4mode').addEventListener('change',ivState);ivState();
// copy buttons
async function copyText(s){try{await navigator.clipboard.writeText(s);return true}catch{}
 const a=document.createElement('textarea');a.value=s;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();
 let ok=false;try{ok=document.execCommand('copy')}catch{}a.remove();return ok}
document.querySelectorAll('button.copy').forEach(b=>b.addEventListener('click',async()=>{const v=$(b.dataset.copy).value;
 b.textContent=t(!v?'copyEmpty':(await copyText(v))?'copied':'copyFail');
 clearTimeout(b._t);b._t=setTimeout(()=>b.textContent=t('copy'),1500)}));
$('stbadge').addEventListener('click',()=>{if(autoResults){lastResults=autoResults;render()}});
try{await init()}catch(e){stState='bad';autoResults=[];render();throw e}
// ---- examples (official vectors)
const A2D='3945208f7b2144b13f36e38ac6d39f95889393692860b51a42fb81ef4df7c5b8',K16='0123456789abcdeffedcba9876543210',SM4CT='681edf34d206965e86b3e94f536e4246';
const exSM3=()=>{setText('sm3in','abc');clearF('sm3out')};
const exSM4=()=>{$('sm4mode').value='ECB';$('sm4pad').value='none';$('sm4inbin').checked=true;$('sm4iv').disabled=true;
 setBin('sm4key',unhex(K16));setBin('sm4in',unhex(K16));setBin('sm4iv',unhex('000102030405060708090a0b0c0d0e0f'));clearF('sm4out');sm4badge=null};
const exSM2=()=>{setBin('sm2d',unhex(A2D));setBin('sm2p',g.sm2_public_from_private(unhex(A2D)));
 document.querySelector('input[name=idmode][value=custom]').checked=true;$('sm2id').value='ALICE123@YAHOO.COM';setText('sm2msg','message digest');
 clearF('sm2sig');verdict=null;clearF('sm2ct');clearF('sm2pt')};
on('ex-sm3','sm3',exSM3);on('ex-sm4','sm4',exSM4);on('ex-sm2','sm2',exSM2);
const doSM3=()=>setBin('sm3out',g.sm3_hash(textB($('sm3in').value,LIM.sm3)));
on('sm3go','sm3',doSM3);
const sm4=(isEnc)=>{sm4badge=null;sm4note=null;const k=need(inp('sm4key','w.sm4key'),16,'w.sm4key'),m=$('sm4mode').value,pad=m==='CBC'||$('sm4pad').value==='pkcs7';
 if(!isEnc&&!$('sm4inbin').checked){$('sm4inbin').checked=true;$('sm4in').dataset.enc=genc();meta('sm4in')} // ciphertext is always binary
 const bin=$('sm4inbin').checked,v4=$('sm4in').value,w4=isEnc?'w.pt':'w.ct';
 const data=bin?(cap(byteLen(fenc('sm4in'),v4,w4),LIM.sm4,isEnc?0:16),decodeAs(fenc('sm4in'),v4,w4)):textB(v4,LIM.sm4);
 if(isEnc&&!pad&&data.length%16)throw new UErr('err.noPadLen',{got:data.length});
 if(!isEnc&&(data.length===0||data.length%16))throw new UErr('err.ctLen',{got:data.length});
 let r; if(m==='ECB'){r=isEnc?g.sm4_ecb_encrypt(k,data,pad):g.sm4_ecb_decrypt(k,data,pad)}
 else{const iv=need(inp('sm4iv','w.iv'),16,'w.iv');r=isEnc?g.sm4_cbc_encrypt(k,iv,data):g.sm4_cbc_decrypt(k,iv,data)}
 if(isEnc){setBin('sm4out',r);if(m==='ECB'&&!pad&&eq(k,unhex(K16))&&eq(data,unhex(K16)))sm4badge=hex(r)===SM4CT}
 else{let s;try{s=td.decode(r)}catch{s=null}if(s!==null)setText('sm4out',s);else setBin('sm4out',r);if(!pad)sm4note='sm4.noPadDec'}};
on('sm4enc','sm4',()=>sm4(true));on('sm4dec','sm4',()=>{try{sm4(false)}catch(x){clearF('sm4out');throw x}}); // no stale output next to a decrypt error
on('sm2gen','sm2',()=>{const kp=g.sm2_keygen();setBin('sm2d',kp.slice(0,32));setBin('sm2p',kp.slice(32))});
const msg=()=>textB($('sm2msg').value,LIM.sm2);
const doSign=()=>{verdict=null;setBin('sm2sig',g.sm2_sign(priv(),ID(),msg()))};
const doVerify=()=>{verdict=null;verdict=g.sm2_verify(pub(),ID(),msg(),inp('sm2sig','w.sig'))};
on('sm2sign','sm2',doSign);on('sm2verify','sm2',doVerify);
on('sm2enc','sm2',()=>setBin('sm2ct',g.sm2_encrypt(pub(),msg())));
on('sm2dec','sm2',()=>{const r=g.sm2_decrypt(priv(),inp('sm2ct','w.sm2ct',LIM.sm2,256));let s;try{s=td.decode(r)}catch{s=null}if(s!==null)setText('sm2pt',s);else setBin('sm2pt',r)});
// ---- "Try an example": fill and run all three sections
$('try').addEventListener('click',()=>{for(const s in errs)errs[s]=null;
 try{exSM3();doSM3()}catch(x){errs.sm3=toErr(x)}
 try{exSM4();sm4(true)}catch(x){errs.sm4=toErr(x)}
 try{exSM2();doSign();doVerify()}catch(x){errs.sm2=toErr(x)}
 render();showSM4()});
// bring the SM4 output + its ✓ line into view below the sticky nav, then flash the output once
const NAV_GAP=80,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function showSM4(){const lab=document.querySelector('label[for=sm4out]'),box=$('sm4out').closest('.out');
 const y=Math.max(0,lab.getBoundingClientRect().top+scrollY-NAV_GAP);
 document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:y,behavior:reduced()?'instant':'smooth'});document.documentElement.style.scrollBehavior='';
 $('sm4out').focus({preventScroll:true});box.classList.remove('flash');void box.offsetWidth;box.classList.add('flash');
 clearTimeout(box._f);box._f=setTimeout(()=>box.classList.remove('flash'),1600)}

function runCases(){const R=[];const T=(k,f)=>{let ok,info='';try{const r=f();ok=r===true||r?.[0];info=r?.[1]||''}catch(e){ok=false;info=String(e.message||e)}R.push({k,name:t(k),pass:!!ok,info})};
 const K=unhex(K16),IV=unhex('000102030405060708090a0b0c0d0e0f');
 T('t.sm3',()=>{const h=hex(g.sm3_hash(te.encode('abc')));return[h==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',h]});
 T('t.sm4kat',()=>{const c=hex(g.sm4_ecb_encrypt(K,K,false));return[c===SM4CT,c]});
 T('t.sm4katdec',()=>hex(g.sm4_ecb_decrypt(K,unhex(SM4CT),false))===hex(K));
 const u1='国密 ecb 测试 / ShangMi ECB test',u2='hello 国密 cbc, more than one block!';
 T('t.sm4pkcs7',()=>td.decode(g.sm4_ecb_decrypt(K,g.sm4_ecb_encrypt(K,te.encode(u1),true),true))===u1);
 T('t.sm4cbc',()=>{const c=g.sm4_cbc_encrypt(K,IV,te.encode(u2));return[td.decode(g.sm4_cbc_decrypt(K,IV,c))===u2,hex(c)]});
 const kp=g.sm2_keygen(),d=kp.slice(0,32),P=kp.slice(32),M=te.encode('message digest'),cid=te.encode('ALICE123@YAHOO.COM');
 T('t.sm2key',()=>[hex(g.sm2_public_from_private(d))===hex(P)&&P.length===65&&P[0]===4,hex(P).slice(0,20)+'…']);
 T('t.sm2def',()=>g.sm2_verify(P,g.sm2_default_id(),M,g.sm2_sign(d,g.sm2_default_id(),M)));
 T('t.sm2cid',()=>g.sm2_verify(P,cid,M,g.sm2_sign(d,cid,M)));
 T('t.sm2tamper',()=>!g.sm2_verify(P,g.sm2_default_id(),te.encode('message digesT'),g.sm2_sign(d,g.sm2_default_id(),M)));
 T('t.sm2wrongid',()=>!g.sm2_verify(P,cid,M,g.sm2_sign(d,g.sm2_default_id(),M)));
 const u3='encryption standard 国密';
 T('t.sm2enc',()=>td.decode(g.sm2_decrypt(d,g.sm2_encrypt(P,te.encode(u3))))===u3);
 if(R.length!==CASES.length||R.some((r,i)=>r.k!==CASES[i]))throw new Error('self-test case list out of sync');return R}
const setAuto=R=>{autoResults=R;stState=R.length===CASES.length&&R.every(x=>x.pass)?'ok':'bad'};
export function selftest(){const R=runCases();setAuto(R);lastResults=R;render();return R}
// silent self-test on load: drives the badge only; the self-test section stays untouched until asked
setTimeout(()=>{try{setAuto(runCases())}catch{autoResults=[];stState='bad'}render()},0);
window.selftest=selftest;window.__setLang=l=>setLang(l,true);$('selftest').addEventListener('click',selftest);window.__ready=true;
