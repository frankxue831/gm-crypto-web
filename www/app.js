import init, * as g from './pkg/gm_web.js';
const $=id=>document.getElementById(id), te=new TextEncoder(), td=new TextDecoder('utf-8',{fatal:true});
const enc=()=>document.querySelector('input[name=enc]:checked').value;
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=b=>{let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s)};
class UErr extends Error{}
// strict decoders with Chinese errors
const unhex=(s,what='输入')=>{s=s.replace(/\s+/g,'');
 if(/[^0-9a-fA-F]/.test(s))throw new UErr(`${what}含有非法 Hex 字符（只允许 0-9、a-f）`);
 if(s.length%2)throw new UErr(`${what}的 Hex 长度为奇数（每字节需 2 个字符）`);
 return Uint8Array.from(s.match(/../g)||[],h=>parseInt(h,16))};
const unb64=(s,what='输入')=>{s=s.replace(/\s+/g,'');
 if(/[^A-Za-z0-9+/=]/.test(s)||/=[^=]/.test(s)||s.length%4)throw new UErr(`${what}不是合法的 Base64`);
 try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}catch{throw new UErr(`${what}不是合法的 Base64`)}};
const out=b=>enc()==='hex'?hex(b):b64(b);
const inp=(id,what)=>{const v=$(id).value;if(!v.trim())throw new UErr(`请填写${what}`);return enc()==='hex'?unhex(v,what):unb64(v,what)};
const need=(b,n,what)=>{if(b.length!==n)throw new UErr(`${what}必须为 ${n} 字节（当前 ${b.length} 字节）`);return b};
const priv=()=>need(inp('sm2d','SM2 私钥'),32,'SM2 私钥');
const pub=()=>{const p=need(inp('sm2p','SM2 公钥'),65,'SM2 公钥');if(p[0]!==4)throw new UErr('SM2 公钥必须以 04 开头（未压缩格式）');return p};
const ID=()=>{if(document.querySelector('input[name=idmode]:checked').value==='def')return g.sm2_default_id();
 const v=$('sm2id').value;if(!v)throw new UErr('请填写自定义 ID');return te.encode(v)};
const wasmMsg=m=>({'invalid private key':'私钥无效（须在 1 到 n-2 范围内）','invalid public key':'公钥无效（不在 SM2 曲线上）',
 'decrypt failed':'解密失败（密文或私钥不匹配）','decrypt failed (bad length/padding)':'解密失败（密文长度或填充错误，或密钥/IV 不对）',
 'bad padding':'解密失败（PKCS#7 填充错误，密钥可能不对）','sign failed':'签名失败','encrypt failed':'加密失败'})[m]||m;
const on=(id,sec,f)=>$(id).addEventListener('click',()=>{const e=$('err-'+sec);e.textContent='';
 try{f()}catch(x){e.textContent='错误：'+(x instanceof UErr?x.message:wasmMsg(String(x.message||x)))}});
// re-encode binary fields when toggling
let last='hex';document.querySelectorAll('input[name=enc]').forEach(r=>r.onchange=()=>{const now=enc();
 for(const id of ['sm3out','sm4key','sm4iv','sm4out','sm2d','sm2p','sm2sig','sm2ct'].concat($('sm4inbin').checked?['sm4in']:[])){const v=$(id).value.trim();if(!v)continue;
  try{const b=last==='hex'?unhex(v):unb64(v);$(id).value=now==='hex'?hex(b):b64(b)}catch{}}last=now});
// copy buttons
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch{}
 const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();
 let ok=false;try{ok=document.execCommand('copy')}catch{}a.remove();return ok}
document.querySelectorAll('button.copy').forEach(b=>b.addEventListener('click',async()=>{const v=$(b.dataset.copy).value;
 if(!v){b.textContent='无内容';}else b.textContent=(await copyText(v))?'已复制':'复制失败';
 clearTimeout(b._t);b._t=setTimeout(()=>b.textContent='复制',1500)}));
const setBin=(id,hexStr)=>$(id).value=out(unhex(hexStr));
await init();
// examples (official vectors)
on('ex-sm3','sm3',()=>{$('sm3in').value='abc';$('sm3out').value=''});
on('ex-sm4','sm4',()=>{$('sm4mode').value='ECB';$('sm4pad').value='none';$('sm4inbin').checked=true;
 setBin('sm4key','0123456789abcdeffedcba9876543210');setBin('sm4in','0123456789abcdeffedcba9876543210');$('sm4out').value=''});
on('ex-sm2','sm2',()=>{setBin('sm2d','3945208f7b2144b13f36e38ac6d39f95889393692860b51a42fb81ef4df7c5b8');
 $('sm2p').value=out(g.sm2_public_from_private(unhex('3945208f7b2144b13f36e38ac6d39f95889393692860b51a42fb81ef4df7c5b8')));
 document.querySelector('input[name=idmode][value=custom]').checked=true;$('sm2id').value='ALICE123@YAHOO.COM';$('sm2msg').value='message digest';
 $('sm2sig').value='';$('sm2vres').textContent='';$('sm2ct').value='';$('sm2pt').value=''});
on('sm3go','sm3',()=>$('sm3out').value=out(g.sm3_hash(te.encode($('sm3in').value))));
const sm4=(isEnc)=>{const k=need(inp('sm4key','SM4 密钥'),16,'SM4 密钥'),m=$('sm4mode').value,pad=m==='CBC'||$('sm4pad').value==='pkcs7';
 const bin=!isEnc||$('sm4inbin').checked;const data=bin?(enc()==='hex'?unhex($('sm4in').value,isEnc?'明文':'密文'):unb64($('sm4in').value,isEnc?'明文':'密文')):te.encode($('sm4in').value);
 if(isEnc&&!pad&&data.length%16)throw new UErr(`无填充模式下明文长度必须是 16 字节的整数倍（当前 ${data.length} 字节）`);
 if(!isEnc&&(data.length===0||data.length%16))throw new UErr(`密文长度必须是 16 字节的整数倍且非空（当前 ${data.length} 字节）`);
 let r; if(m==='ECB'){r=isEnc?g.sm4_ecb_encrypt(k,data,pad):g.sm4_ecb_decrypt(k,data,pad)}
 else{const iv=need(inp('sm4iv','IV'),16,'IV');r=isEnc?g.sm4_cbc_encrypt(k,iv,data):g.sm4_cbc_decrypt(k,iv,data)}
 if(isEnc){$('sm4out').value=out(r)}else{let t;try{t=td.decode(r)}catch{t=null}$('sm4out').value=t!==null&&!$('sm4inbin').checked?t:out(r)}};
on('sm4enc','sm4',()=>sm4(true));on('sm4dec','sm4',()=>sm4(false));
on('sm2gen','sm2',()=>{const kp=g.sm2_keygen();$('sm2d').value=out(kp.slice(0,32));$('sm2p').value=out(kp.slice(32))});
on('sm2sign','sm2',()=>{$('sm2sig').value=out(g.sm2_sign(priv(),ID(),te.encode($('sm2msg').value)));$('sm2vres').textContent=''});
on('sm2verify','sm2',()=>{const r=$('sm2vres');r.textContent='';const ok=g.sm2_verify(pub(),ID(),te.encode($('sm2msg').value),inp('sm2sig','签名'));
 r.textContent=ok?'✅ 验签通过':'❌ 验签失败';r.className=ok?'ok':'bad'});
on('sm2enc','sm2',()=>$('sm2ct').value=out(g.sm2_encrypt(pub(),te.encode($('sm2msg').value))));
on('sm2dec','sm2',()=>{const r=g.sm2_decrypt(priv(),inp('sm2ct','SM2 密文'));let t;try{t=td.decode(r)}catch{t=null}$('sm2pt').value=t??out(r)});

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
window.selftest=selftest;$('selftest').addEventListener('click',selftest);window.__ready=true;
