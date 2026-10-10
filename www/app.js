import init, * as g from './pkg/gm_web.js';
const $=id=>document.getElementById(id), te=new TextEncoder(), td=new TextDecoder('utf-8',{fatal:true});
const enc=()=>document.querySelector('input[name=enc]:checked').value;
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const unhex=s=>{s=s.replace(/\s+/g,'');if(s.length%2||/[^0-9a-f]/i.test(s))throw Error('invalid hex');return Uint8Array.from(s.match(/../g)||[],h=>parseInt(h,16))};
const b64=b=>btoa(String.fromCharCode(...b)), unb64=s=>Uint8Array.from(atob(s.trim()),c=>c.charCodeAt(0));
const out=b=>enc()==='hex'?hex(b):b64(b), inp=s=>enc()==='hex'?unhex(s):unb64(s);
const ID=()=>document.querySelector('input[name=idmode]:checked').value==='def'?g.sm2_default_id():te.encode($('sm2id').value);
const on=(id,f)=>$(id).onclick=()=>{$('err').textContent='';try{f()}catch(e){$('err').textContent='错误: '+(e.message||e)}};
// re-encode binary fields when toggling
let last='hex';document.querySelectorAll('input[name=enc]').forEach(r=>r.onchange=()=>{const now=enc();
 for(const id of ['sm3out','sm4key','sm4iv','sm4out','sm2d','sm2p','sm2sig','sm2ct'].concat($('sm4inbin').checked?['sm4in']:[])){const v=$(id).value.trim();if(!v)continue;
  try{const b=last==='hex'?unhex(v):unb64(v);$(id).value=now==='hex'?hex(b):b64(b)}catch{}}last=now});
await init();
on('sm3go',()=>$('sm3out').value=out(g.sm3_hash(te.encode($('sm3in').value))));
const sm4=(isEnc)=>{const k=inp($('sm4key').value),m=$('sm4mode').value,data=isEnc?($('sm4inbin').checked?inp($('sm4in').value):te.encode($('sm4in').value)):inp($('sm4in').value);
 let r; if(m==='ECB'){const p=$('sm4pad').value==='pkcs7';r=isEnc?g.sm4_ecb_encrypt(k,data,p):g.sm4_ecb_decrypt(k,data,p)}
 else{const iv=inp($('sm4iv').value);r=isEnc?g.sm4_cbc_encrypt(k,iv,data):g.sm4_cbc_decrypt(k,iv,data)}
 if(isEnc){$('sm4out').value=out(r)}else{let t;try{t=td.decode(r)}catch{t=null}$('sm4out').value=t!==null&&!$('sm4inbin').checked?t:out(r)}};
on('sm4enc',()=>sm4(true));on('sm4dec',()=>sm4(false));
on('sm2gen',()=>{const kp=g.sm2_keygen();$('sm2d').value=out(kp.slice(0,32));$('sm2p').value=out(kp.slice(32))});
on('sm2sign',()=>$('sm2sig').value=out(g.sm2_sign(inp($('sm2d').value),ID(),te.encode($('sm2msg').value))));
on('sm2verify',()=>{const ok=g.sm2_verify(inp($('sm2p').value),ID(),te.encode($('sm2msg').value),inp($('sm2sig').value));$('sm2vres').textContent=ok?'✅ 验签通过':'❌ 验签失败'});
on('sm2enc',()=>$('sm2ct').value=out(g.sm2_encrypt(inp($('sm2p').value),te.encode($('sm2msg').value))));
on('sm2dec',()=>$('sm2pt').value=td.decode(g.sm2_decrypt(inp($('sm2d').value),inp($('sm2ct').value))));

export function selftest(){const R=[];const t=(n,f)=>{let ok,info='';try{const r=f();ok=r===true||r?.[0];info=r?.[1]||''}catch(e){ok=false;info=String(e.message||e)}R.push({name:n,pass:!!ok,info})};
 const K=unhex('0123456789abcdeffedcba9876543210'),IV=unhex('000102030405060708090a0b0c0d0e0f');
 t('SM3 abc',()=>{const h=hex(g.sm3_hash(te.encode('abc')));return[h==='66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',h]});
 t('SM4 ECB KAT (no pad)',()=>{const c=hex(g.sm4_ecb_encrypt(K,K,false));return[c==='681edf34d206965e86b3e94f536e4246',c]});
 t('SM4 ECB KAT decrypt',()=>hex(g.sm4_ecb_decrypt(K,unhex('681edf34d206965e86b3e94f536e4246'),false))===hex(K));
 t('SM4 ECB PKCS7 round trip',()=>td.decode(g.sm4_ecb_decrypt(K,g.sm4_ecb_encrypt(K,te.encode('国密 ecb 测试'),true),true))==='国密 ecb 测试');
 t('SM4 CBC round trip',()=>{const c=g.sm4_cbc_encrypt(K,IV,te.encode('hello 国密 cbc, more than one block!'));return[td.decode(g.sm4_cbc_decrypt(K,IV,c))==='hello 国密 cbc, more than one block!',hex(c)]});
 const kp=g.sm2_keygen(),d=kp.slice(0,32),P=kp.slice(32),M=te.encode('message digest'),cid=te.encode('ALICE123@YAHOO.COM');
 t('SM2 keygen (pub matches priv)',()=>[hex(g.sm2_public_from_private(d))===hex(P)&&P.length===65&&P[0]===4,hex(P).slice(0,20)+'…']);
 t('SM2 sign/verify default ID',()=>g.sm2_verify(P,g.sm2_default_id(),M,g.sm2_sign(d,g.sm2_default_id(),M)));
 t('SM2 sign/verify custom ID',()=>g.sm2_verify(P,cid,M,g.sm2_sign(d,cid,M)));
 t('SM2 verify fails: tampered msg',()=>!g.sm2_verify(P,g.sm2_default_id(),te.encode('message digesT'),g.sm2_sign(d,g.sm2_default_id(),M)));
 t('SM2 verify fails: wrong ID',()=>!g.sm2_verify(P,cid,M,g.sm2_sign(d,g.sm2_default_id(),M)));
 t('SM2 encrypt/decrypt round trip',()=>td.decode(g.sm2_decrypt(d,g.sm2_encrypt(P,te.encode('encryption standard 国密'))))==='encryption standard 国密');
 $('results').textContent=R.map(r=>(r.pass?'PASS ':'FAIL ')+r.name+(r.info?'  '+r.info:'')).join('\n');return R}
window.selftest=selftest;on('selftest',selftest);window.__ready=true;
