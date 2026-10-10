import init, * as g from './pkg/gm_web.js';
import {t, detect, apply} from './i18n.js';
const $=id=>document.getElementById(id), te=new TextEncoder(), td=new TextDecoder('utf-8',{fatal:true});
const enc=()=>document.querySelector('input[name=enc]:checked').value;
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=b=>{let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s)};
// UErr carries an i18n key + params so it can be re-rendered on language switch
class UErr extends Error{constructor(k,p={}){super(k);this.k=k;this.p=p}}
const W=w=>({what:t(w)});
const unhex=(s,w='w.input')=>{s=s.replace(/\s+/g,'');
 if(/[^0-9a-fA-F]/.test(s))throw new UErr('err.hexChar',{w});
 if(s.length%2)throw new UErr('err.hexOdd',{w});
 return Uint8Array.from(s.match(/../g)||[],h=>parseInt(h,16))};
const unb64=(s,w='w.input')=>{s=s.replace(/\s+/g,'');
 if(/[^A-Za-z0-9+/=]/.test(s)||/=[^=]/.test(s)||s.length%4)throw new UErr('err.b64',{w});
 try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}catch{throw new UErr('err.b64',{w})}};
const out=b=>enc()==='hex'?hex(b):b64(b);
const dec=(s,w)=>enc()==='hex'?unhex(s,w):unb64(s,w);
const inp=(id,w)=>{const v=$(id).value;if(!v.trim())throw new UErr('err.empty',{w});return dec(v,w)};
const need=(b,n,w)=>{if(b.length!==n)throw new UErr('err.len',{w,n,got:b.length});return b};
const priv=()=>need(inp('sm2d','w.priv'),32,'w.priv');
const pub=()=>{const p=need(inp('sm2p','w.pub'),65,'w.pub');if(p[0]!==4)throw new UErr('err.pub04');return p};
const ID=()=>{if(document.querySelector('input[name=idmode]:checked').value==='def')return g.sm2_default_id();
 const v=$('sm2id').value;if(!v)throw new UErr('err.idEmpty');return te.encode(v)};
const WASM={'invalid private key':'err.invalidPriv','invalid public key':'err.invalidPub','decrypt failed':'err.sm2dec',
 'decrypt failed (bad length/padding)':'err.sm4dec','bad padding':'err.badPad','sign failed':'err.sign','encrypt failed':'err.encrypt'};
const toErr=x=>x instanceof UErr?x:(m=>WASM[m]?new UErr(WASM[m]):new UErr('err.unknown',{msg:m}))(String(x?.message||x));
// render state (re-rendered on language switch)
const errs={sm3:null,sm4:null,sm2:null};let verdict=null,lastResults=null;
const fmtErr=e=>t('err.prefix')+t(e.k,{...e.p,...(e.p.w?W(e.p.w):{})});
function render(){for(const s in errs)$('err-'+s).textContent=errs[s]?fmtErr(errs[s]):'';
 const r=$('sm2vres');r.textContent=verdict===null?'':t(verdict?'sm2.ok':'sm2.bad');r.className=verdict===null?'':verdict?'ok':'bad';
 if(lastResults)$('results').textContent=lastResults.map(x=>`${t(x.pass?'pass':'fail')}  ${t(x.k)}${x.info?'  '+x.info:''}`).join('\n')}
function setLang(l,save){apply(l,save);render()}
setLang(detect(),false);
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{setLang(b.dataset.lang,true);
 const u=new URL(location.href);if(u.searchParams.has('lang')){u.searchParams.set('lang',b.dataset.lang);history.replaceState(null,'',u)}}));
const on=(id,sec,f)=>$(id).addEventListener('click',()=>{errs[sec]=null;try{f()}catch(x){errs[sec]=toErr(x)}render()});
// re-encode binary fields when toggling encoding
let last='hex';document.querySelectorAll('input[name=enc]').forEach(r=>r.onchange=()=>{const now=enc();
 for(const id of ['sm3out','sm4key','sm4iv','sm4out','sm2d','sm2p','sm2sig','sm2ct'].concat($('sm4inbin').checked?['sm4in']:[])){const v=$(id).value.trim();if(!v)continue;
  try{const b=last==='hex'?unhex(v):unb64(v);$(id).value=now==='hex'?hex(b):b64(b)}catch{}}last=now});
// copy buttons
async function copyText(s){try{await navigator.clipboard.writeText(s);return true}catch{}
 const a=document.createElement('textarea');a.value=s;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();
 let ok=false;try{ok=document.execCommand('copy')}catch{}a.remove();return ok}
document.querySelectorAll('button.copy').forEach(b=>b.addEventListener('click',async()=>{const v=$(b.dataset.copy).value;
 b.textContent=t(!v?'copyEmpty':(await copyText(v))?'copied':'copyFail');
 clearTimeout(b._t);b._t=setTimeout(()=>b.textContent=t('copy'),1500)}));
const setBin=(id,h)=>$(id).value=out(unhex(h));
await init();
// examples (official vectors)
const A2D='3945208f7b2144b13f36e38ac6d39f95889393692860b51a42fb81ef4df7c5b8';
on('ex-sm3','sm3',()=>{$('sm3in').value='abc';$('sm3out').value=''});
on('ex-sm4','sm4',()=>{$('sm4mode').value='ECB';$('sm4pad').value='none';$('sm4inbin').checked=true;
 setBin('sm4key','0123456789abcdeffedcba9876543210');setBin('sm4in','0123456789abcdeffedcba9876543210');setBin('sm4iv','000102030405060708090a0b0c0d0e0f');$('sm4out').value=''});
on('ex-sm2','sm2',()=>{setBin('sm2d',A2D);$('sm2p').value=out(g.sm2_public_from_private(unhex(A2D)));
 document.querySelector('input[name=idmode][value=custom]').checked=true;$('sm2id').value='ALICE123@YAHOO.COM';$('sm2msg').value='message digest';
 $('sm2sig').value='';verdict=null;$('sm2ct').value='';$('sm2pt').value=''});
on('sm3go','sm3',()=>$('sm3out').value=out(g.sm3_hash(te.encode($('sm3in').value))));
const sm4=(isEnc)=>{const k=need(inp('sm4key','w.sm4key'),16,'w.sm4key'),m=$('sm4mode').value,pad=m==='CBC'||$('sm4pad').value==='pkcs7';
 const bin=!isEnc||$('sm4inbin').checked;const data=bin?dec($('sm4in').value,isEnc?'w.pt':'w.ct'):te.encode($('sm4in').value);
 if(isEnc&&!pad&&data.length%16)throw new UErr('err.noPadLen',{got:data.length});
 if(!isEnc&&(data.length===0||data.length%16))throw new UErr('err.ctLen',{got:data.length});
 let r; if(m==='ECB'){r=isEnc?g.sm4_ecb_encrypt(k,data,pad):g.sm4_ecb_decrypt(k,data,pad)}
 else{const iv=need(inp('sm4iv','w.iv'),16,'w.iv');r=isEnc?g.sm4_cbc_encrypt(k,iv,data):g.sm4_cbc_decrypt(k,iv,data)}
 if(isEnc){$('sm4out').value=out(r)}else{let s;try{s=td.decode(r)}catch{s=null}$('sm4out').value=s!==null&&!$('sm4inbin').checked?s:out(r)}};
on('sm4enc','sm4',()=>sm4(true));on('sm4dec','sm4',()=>sm4(false));
on('sm2gen','sm2',()=>{const kp=g.sm2_keygen();$('sm2d').value=out(kp.slice(0,32));$('sm2p').value=out(kp.slice(32))});
on('sm2sign','sm2',()=>{verdict=null;$('sm2sig').value=out(g.sm2_sign(priv(),ID(),te.encode($('sm2msg').value)))});
on('sm2verify','sm2',()=>{verdict=null;verdict=g.sm2_verify(pub(),ID(),te.encode($('sm2msg').value),inp('sm2sig','w.sig'))});
on('sm2enc','sm2',()=>$('sm2ct').value=out(g.sm2_encrypt(pub(),te.encode($('sm2msg').value))));
on('sm2dec','sm2',()=>{const r=g.sm2_decrypt(priv(),inp('sm2ct','w.sm2ct'));let s;try{s=td.decode(r)}catch{s=null}$('sm2pt').value=s??out(r)});

export function selftest(){const R=[];const T=(k,f)=>{let ok,info='';try{const r=f();ok=r===true||r?.[0];info=r?.[1]||''}catch(e){ok=false;info=String(e.message||e)}R.push({k,name:t(k),pass:!!ok,info})};
 const K=unhex('0123456789abcdeffedcba9876543210'),IV=unhex('000102030405060708090a0b0c0d0e0f');
 T('t.sm3',()=>{const h=hex(g.sm3_hash(te.encode('abc')));return[h==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',h]});
 T('t.sm4kat',()=>{const c=hex(g.sm4_ecb_encrypt(K,K,false));return[c==='681edf34d206965e86b3e94f536e4246',c]});
 T('t.sm4katdec',()=>hex(g.sm4_ecb_decrypt(K,unhex('681edf34d206965e86b3e94f536e4246'),false))===hex(K));
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
 lastResults=R;render();return R}
window.selftest=selftest;window.__setLang=l=>setLang(l,true);$('selftest').addEventListener('click',selftest);window.__ready=true;
