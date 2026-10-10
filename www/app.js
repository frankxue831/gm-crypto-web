import init, * as g from './pkg/gm_web.js';
import {t, detect, apply} from './i18n.js';
const $=id=>document.getElementById(id), te=new TextEncoder(), td=new TextDecoder('utf-8',{fatal:true});
const genc=()=>document.querySelector('input[name=enc]:checked').value;
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=b=>{let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s)};
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
// UErr carries an i18n key + params so it can be re-rendered on language switch
class UErr extends Error{constructor(k,p={}){super(k);this.k=k;this.p=p}}
const unhex=(s,w='w.input')=>{s=s.replace(/\s+/g,'');
 if(/[^0-9a-fA-F]/.test(s))throw new UErr('err.hexChar',{w});
 if(s.length%2)throw new UErr('err.hexOdd',{w});
 return Uint8Array.from(s.match(/../g)||[],h=>parseInt(h,16))};
const unb64=(s,w='w.input')=>{s=s.replace(/\s+/g,'');
 if(/[^A-Za-z0-9+/=]/.test(s)||/=[^=]/.test(s)||s.length%4)throw new UErr('err.b64',{w});
 try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}catch{throw new UErr('err.b64',{w})}};
const decodeAs=(e,s,w)=>e==='hex'?unhex(s,w):unb64(s,w), encodeAs=(e,b)=>e==='hex'?hex(b):b64(b);

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
 let n=null;if(e.value.trim()){try{n=decodeAs(en,e.value).length}catch{}}
 m.textContent=n===null?name:`${name} · ${t('bytes',{n})}`}
const metaAll=()=>ALL.forEach(meta);
ALL.forEach(id=>$(id).addEventListener('input',()=>{const e=$(id);if(kind(id)==='bin'){e.dataset.enc=genc();delete fail[id]}meta(id)}));
$('sm4inbin').addEventListener('change',()=>{const e=$('sm4in');if($('sm4inbin').checked)e.dataset.enc=genc();else delete e.dataset.enc;delete fail.sm4in;meta('sm4in')});
// encoding toggle: convert ONLY binary fields; flag the ones that cannot be converted
document.querySelectorAll('input[name=enc]').forEach(r=>r.addEventListener('change',()=>{const now=genc();
 for(const id of ALL){if(kind(id)!=='bin')continue;const e=$(id),from=fenc(id);
  if(!e.value.trim()){e.dataset.enc=now;delete fail[id];continue}
  if(from===now){delete fail[id];continue}
  try{e.value=encodeAs(now,decodeAs(from,e.value));e.dataset.enc=now;delete fail[id]}catch{e.dataset.enc=from;fail[id]={from,to:now}}}
 metaAll()}));
const W=w=>({what:t(w)});
const inp=(id,w)=>{const v=$(id).value;if(!v.trim())throw new UErr('err.empty',{w});return decodeAs(fenc(id),v,w)};
const need=(b,n,w)=>{if(b.length!==n)throw new UErr('err.len',{w,n,got:b.length});return b};
const priv=()=>need(inp('sm2d','w.priv'),32,'w.priv');
const pub=()=>{const p=inp('sm2p','w.pub');if(p.length===33&&(p[0]===2||p[0]===3))throw new UErr('err.pubCompressed');need(p,65,'w.pub');if(p[0]!==4)throw new UErr('err.pub04');return p};
const ID=()=>{if(document.querySelector('input[name=idmode]:checked').value==='def')return g.sm2_default_id();
 const v=$('sm2id').value;if(!v)throw new UErr('err.idEmpty');return te.encode(v)};
const WASM={'invalid private key':'err.invalidPriv','invalid public key':'err.invalidPub','decrypt failed':'err.sm2dec',
 'decrypt failed (bad length/padding)':'err.sm4dec','bad padding':'err.badPad','sign failed':'err.sign','encrypt failed':'err.encrypt'};
const toErr=x=>x instanceof UErr?x:(m=>WASM[m]?new UErr(WASM[m]):new UErr('err.unknown',{msg:m}))(String(x?.message||x));
// ---- render state (re-rendered on language switch)
const errs={sm3:null,sm4:null,sm2:null};let verdict=null,lastResults=null,sm4badge=null,autoResults=null,stState='run';
// self-test case list: the badge total comes from here, never from HTML
const CASES=['t.sm3','t.sm4kat','t.sm4katdec','t.sm4pkcs7','t.sm4cbc','t.sm2key','t.sm2def','t.sm2cid','t.sm2tamper','t.sm2wrongid','t.sm2enc'];
const fmtErr=e=>t('err.prefix')+t(e.k,{...e.p,...(e.p.w?W(e.p.w):{})});
function render(){for(const s in errs)$('err-'+s).textContent=errs[s]?fmtErr(errs[s]):'';
 const r=$('sm2vres');r.textContent=verdict===null?'':t(verdict?'sm2.ok':'sm2.bad');r.className=verdict===null?'':verdict?'ok':'bad';
 const m=$('sm4match');m.textContent=sm4badge===null?'':t(sm4badge?'sm4.match':'sm4.mismatch');m.className='badge '+(sm4badge===null?'':sm4badge?'ok':'bad');
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
const doSM3=()=>setBin('sm3out',g.sm3_hash(te.encode($('sm3in').value)));
on('sm3go','sm3',doSM3);
const sm4=(isEnc)=>{sm4badge=null;const k=need(inp('sm4key','w.sm4key'),16,'w.sm4key'),m=$('sm4mode').value,pad=m==='CBC'||$('sm4pad').value==='pkcs7';
 if(!isEnc&&!$('sm4inbin').checked){$('sm4inbin').checked=true;$('sm4in').dataset.enc=genc();meta('sm4in')} // ciphertext is always binary
 const bin=$('sm4inbin').checked;const data=bin?decodeAs(fenc('sm4in'),$('sm4in').value,isEnc?'w.pt':'w.ct'):te.encode($('sm4in').value);
 if(isEnc&&!pad&&data.length%16)throw new UErr('err.noPadLen',{got:data.length});
 if(!isEnc&&(data.length===0||data.length%16))throw new UErr('err.ctLen',{got:data.length});
 let r; if(m==='ECB'){r=isEnc?g.sm4_ecb_encrypt(k,data,pad):g.sm4_ecb_decrypt(k,data,pad)}
 else{const iv=need(inp('sm4iv','w.iv'),16,'w.iv');r=isEnc?g.sm4_cbc_encrypt(k,iv,data):g.sm4_cbc_decrypt(k,iv,data)}
 if(isEnc){setBin('sm4out',r);if(m==='ECB'&&!pad&&eq(k,unhex(K16))&&eq(data,unhex(K16)))sm4badge=hex(r)===SM4CT}
 else{let s;try{s=td.decode(r)}catch{s=null}if(s!==null)setText('sm4out',s);else setBin('sm4out',r)}};
on('sm4enc','sm4',()=>sm4(true));on('sm4dec','sm4',()=>sm4(false));
on('sm2gen','sm2',()=>{const kp=g.sm2_keygen();setBin('sm2d',kp.slice(0,32));setBin('sm2p',kp.slice(32))});
const doSign=()=>{verdict=null;setBin('sm2sig',g.sm2_sign(priv(),ID(),te.encode($('sm2msg').value)))};
const doVerify=()=>{verdict=null;verdict=g.sm2_verify(pub(),ID(),te.encode($('sm2msg').value),inp('sm2sig','w.sig'))};
on('sm2sign','sm2',doSign);on('sm2verify','sm2',doVerify);
on('sm2enc','sm2',()=>setBin('sm2ct',g.sm2_encrypt(pub(),te.encode($('sm2msg').value))));
on('sm2dec','sm2',()=>{const r=g.sm2_decrypt(priv(),inp('sm2ct','w.sm2ct'));let s;try{s=td.decode(r)}catch{s=null}if(s!==null)setText('sm2pt',s);else setBin('sm2pt',r)});
// ---- "Try an example": fill and run all three sections
$('try').addEventListener('click',()=>{for(const s in errs)errs[s]=null;
 try{exSM3();doSM3()}catch(x){errs.sm3=toErr(x)}
 try{exSM4();sm4(true)}catch(x){errs.sm4=toErr(x)}
 try{exSM2();doSign();doVerify()}catch(x){errs.sm2=toErr(x)}
 render();$('s-sm3').scrollIntoView({block:'start'});$('h-sm3').focus({preventScroll:true})});

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
