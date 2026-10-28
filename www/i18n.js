// All user-visible strings. Keys missing from a language render as ⟦key⟧ (tests detect this).
const COMMON={'enc.hex':'Hex','enc.b64':'Base64','mode.ecb':'ECB','mode.cbc':'CBC','pad.pkcs7':'PKCS#7',
 'foot.repo':'github.com/frankxue831/gm-crypto-web','foot.libname':'gm-crypto-rs (gmcrypto-core v1.17.0)','foot.license':'MIT / Apache-2.0','w.iv':'IV','nav.sm3':'SM3','nav.sm4':'SM4','nav.sm2':'SM2','kind.hex':'Hex','kind.b64':'Base64','foot.homeLink':'www.frankxue.dev'};
export const DICT = {
zh: {...COMMON,
 'howto.aria':'使用步骤','howto.1':'三种算法同在一页','howto.2':'点「试一下示例」','howto.3':'对照国标结果',
 'badge.run':'自检中…','badge.ok':p=>`自检 ${p.ok}/${p.n}`,'badge.bad':p=>`✗ ${p.ok}/${p.n}`,'badge.aria':'自检结果（SM3、SM4 对国标向量，SM2 做往返校验），点击查看详情','badge.title':'自检：SM3、SM4 对国标向量，SM2 做往返校验',
 'tagline':'在浏览器里调试 SM2/SM3/SM4；本地计算，不上传。','tryEx':'试一下示例','nav.test':'自检','nav.aria':'页面导航',
 'sm3.desc':'计算 UTF-8 文本的 SM3 摘要（256 位）。','sm4.desc':'用 16 字节密钥对数据做 SM4 加解密（ECB 或 CBC）。','sm2.desc':'生成 SM2 密钥对，进行签名验签与公钥加解密。',
 'test.prompt':'点击运行，校验本页实现：SM3、SM4 对国标向量，SM2 做往返校验。','test.summary':p=>`${p.ok}/${p.n} 通过（SM3、SM4 对国标向量，SM2 做往返校验）`,
 'kind.text':'文本','bytes':p=>`${p.n} 字节`,
 'conv.fail':p=>`⚠ 无法转换为 ${p.to}：内容不是有效的 ${p.from}，仍按 ${p.from} 保留`,
 'sm4.ivEcb':'ECB 不使用 IV','sm4.match':'✓ 与国标向量一致（GB/T 32907）','sm4.mismatch':'✗ 与国标向量不一致',
 'err.pubCompressed':'仅支持未压缩公钥（65 字节，04 开头）；不支持 02/03 开头的压缩公钥','foot.home':'作者主页：',
 'meta.title':'国密在线小工具 · SM2 / SM3 / SM4（本地计算）',
 'meta.desc':'纯浏览器国密算法工具：SM3 哈希、SM4 ECB/CBC 加解密、SM2 密钥生成/签名验签/加解密。全部在本地 WebAssembly 中计算，不上传数据。未经审计，请勿使用生产密钥。',
 'h1':'国密在线小工具 SM2 / SM3 / SM4',
 'lang.aria':'切换语言',
 'lang.other':'EN','site.aria':'主导航','site.home':'首页','site.about':'关于','site.work':'作品','site.notes':'笔记',
 'notice.localH':'本地计算','notice.auditH':'未经审计','notice.keys':'请勿使用生产密钥。',
 'notice.local':'所有计算均在你的浏览器内（WebAssembly）完成，不上传任何数据。','notice.audit':'底层库 gmcrypto-core 未经第三方安全审计，仅供学习、调试与互操作测试。',
 'enc.label':'二进制编码：','enc.hint':'（密钥/IV/密文/签名按此编码；明文为 UTF-8 文本）',
 'ex':'填入示例','copy':'复制','copied':'已复制','copyFail':'复制失败','copyEmpty':'无内容','copy.aria':'复制到剪贴板',
 'sm3.h':'SM3 哈希','sm3.in':'输入文本（UTF-8）','sm3.go':'计算 SM3','sm3.out':'摘要（32 字节）',
 'sm4.h':'SM4 分组密码（ECB / CBC）','sm4.mode':'模式','sm4.pad':'填充','pad.none':'无填充（仅 ECB）',
 'sm4.cbcNote':'CBC 固定使用 PKCS#7 填充。','sm4.notes':'说明','sm4.key':'密钥 Key（16 字节）','sm4.iv':'IV（16 字节，仅 CBC）',
 'sm4.in':'输入（加密：明文；解密：密文）','sm4.bin':'明文也按二进制编码解析（否则为 UTF-8 文本）',
 'sm4.enc':'加密','sm4.dec':'解密','sm4.out':'输出','sm4.exNote':'示例：GB/T 32907 标准测试向量（ECB、无填充），加密结果应为 681edf34d206965e86b3e94f536e4246。',
 'sm2.h':'SM2 公钥密码','sm2.keys':'密钥对','sm2.gen':'生成随机密钥对','sm2.d':'私钥（32 字节）','sm2.p':'公钥（65 字节，未压缩 04‖x‖y）',
 'sm2.sigH':'签名 / 验签','sm2.idLabel':'用户 ID：','sm2.idDef':'默认 1234567812345678','sm2.idCustom':'自定义','sm2.idAria':'自定义用户 ID',
 'sm2.msg':'消息（UTF-8）','sm2.sign':'签名','sm2.verify':'验签','sm2.sig':'签名（DER）',
 'sm2.sigNote':'签名每次使用随机数 k，结果每次不同属正常；示例的私钥、ID（ALICE123@YAHOO.COM）和消息在 SM2 推荐曲线上；仓库的 Rust 测试用同一组参数和一个固定 k 做已知答案签名校验。',
 'sm2.encH':'加密 / 解密','sm2.enc':'用公钥加密消息','sm2.dec':'用私钥解密密文','sm2.ct':'密文 C1C3C2（DER）','sm2.pt':'解密结果',
 'sm2.ok':'✅ 验签通过','sm2.bad':'❌ 验签失败',
 'test.h':'自检','test.run':'运行自检','pass':'通过','fail':'失败',
 'foot.notice':'本地计算 · 未经审计 · 请勿使用生产密钥。','foot.src':'源码：','foot.lib':'底层库：',
 'err.prefix':'错误：',
 'err.hexChar':p=>`${p.what}含有非法 Hex 字符（只允许 0-9、a-f）`,'err.hexOdd':p=>`${p.what}的 Hex 长度为奇数（每字节需 2 个字符）`,
 'err.b64':p=>`${p.what}不是合法的 Base64`,'err.empty':p=>`请填写${p.what}`,'err.len':p=>`${p.what}必须为 ${p.n} 字节（当前 ${p.got} 字节）`,
 'err.pub04':'SM2 公钥必须以 04 开头（未压缩格式）','err.idEmpty':'请填写自定义用户 ID',
 'err.noPadLen':p=>`无填充模式下明文长度必须是 16 字节的整数倍（当前 ${p.got} 字节）`,'err.ctLen':p=>`密文长度必须是 16 字节的整数倍且非空（当前 ${p.got} 字节）`,
 'err.invalidPriv':'私钥无效（须在 1 到 n-2 范围内）','err.invalidPub':'公钥无效（不在 SM2 曲线上）','err.sm2dec':'解密失败（密文或私钥不匹配）',
 'err.sm4dec':'解密失败：填充校验不通过。密钥、IV、模式或密文可能有误（例如密文错了一个字节）。','err.badPad':'解密失败：PKCS#7 填充校验不通过。密钥、模式或密文可能有误（例如密文错了一个字节）。',
 'noResult':'无结果',
 'err.tooBig':p=>`输入超过 ${p.lim}，本工具不支持这么大的输入`,
 'sm4.checkHint':'要核对密文：把它贴进“输入”框，勾上“明文也按二进制编码解析”（点“解密”时会自动勾上），用相同的“模式”“填充”和 IV 点“解密”。ECB 无填充时无法发现密文错误，请直接比对输出是否为原明文。',
 'sm4.noPadDec':'注意：无填充解密不做任何校验，密文或密钥错了也会输出（乱码），请比对输出是否为原明文。',
 'err.sign':'签名失败','err.encrypt':'加密失败','err.unknown':p=>`未知错误：${p.msg}`,
 'w.input':'输入','w.sm4key':'SM4 密钥','w.pt':'明文','w.ct':'密文','w.priv':'SM2 私钥','w.pub':'SM2 公钥','w.sig':'签名','w.sm2ct':'SM2 密文',
 't.sm3':'SM3 "abc" 标准向量','t.sm4kat':'SM4 标准向量加密（无填充）','t.sm4katdec':'SM4 标准向量解密','t.sm4pkcs7':'SM4 ECB PKCS#7 往返',
 't.sm4cbc':'SM4 CBC 往返','t.sm2key':'SM2 密钥生成（公钥与私钥匹配）','t.sm2def':'SM2 签名/验签（默认 ID）','t.sm2cid':'SM2 签名/验签（自定义 ID）',
 't.sm2tamper':'篡改消息后验签失败','t.sm2wrongid':'ID 错误时验签失败','t.sm2enc':'SM2 加密/解密往返',
},
en: {...COMMON,
 'howto.aria':'How to use','howto.1':'All three algorithms, one page','howto.2':'Click "Try an example"','howto.3':'Compare with the standard result',
 'badge.run':'Checking…','badge.ok':p=>`Self-test ${p.ok}/${p.n}`,'badge.bad':p=>`✗ ${p.ok}/${p.n}`,'badge.aria':'Self-test result (SM3/SM4 against the GB/T vectors, SM2 by round trip), click for details','badge.title':'Self-test: SM3/SM4 against the GB/T vectors, SM2 by round trip',
 'tagline':'Debug SM2/SM3/SM4 in your browser — computed locally, nothing uploaded.','tryEx':'Try an example','nav.test':'Self-test','nav.aria':'Page navigation',
 'sm3.desc':'Compute the SM3 digest (256-bit) of UTF-8 text.','sm4.desc':'Encrypt or decrypt data with SM4 using a 16-byte key (ECB or CBC).','sm2.desc':'Generate an SM2 key pair, sign and verify, and encrypt/decrypt with public/private keys.',
 'test.prompt':'Click Run to check this page: SM3/SM4 against the GB/T vectors, SM2 by round trip.','test.summary':p=>`${p.ok}/${p.n} passed (SM3/SM4 against the GB/T vectors, SM2 by round trip)`,
 'kind.text':'Text','bytes':p=>`${p.n} bytes`,
 'conv.fail':p=>`⚠ Could not convert to ${p.to}: content is not valid ${p.from}; kept as ${p.from}`,
 'sm4.ivEcb':'ECB does not use an IV','sm4.match':'✓ Matches the official test vector (GB/T 32907)','sm4.mismatch':'✗ Does not match the official test vector',
 'err.pubCompressed':'Only uncompressed public keys (65 bytes, 04-prefixed) are supported; compressed 02/03 keys are not','foot.home':'Author: ',
 'meta.title':'SM2 / SM3 / SM4 Online Tool (runs locally)',
 'meta.desc':'In-browser Chinese national cryptography (ShangMi) tool: SM3 hash, SM4 ECB/CBC encryption, SM2 key generation, signatures and encryption. Everything runs locally in WebAssembly; nothing is uploaded. Unaudited — do not use production keys.',
 'h1':'SM2 / SM3 / SM4 Online Tool',
 'lang.aria':'Switch language',
 'lang.other':'中文','site.aria':'Primary','site.home':'Home','site.about':'About','site.work':'Work','site.notes':'Notes',
 'notice.localH':'Runs locally','notice.auditH':'Unaudited','notice.keys':'Do not use production keys.',
 'notice.local':'All computation happens in your browser (WebAssembly); nothing is uploaded.','notice.audit':'The underlying gmcrypto-core library has not been independently audited — for learning, debugging and interoperability testing only.',
 'enc.label':'Binary encoding:','enc.hint':'(keys, IV, ciphertext and signatures use this encoding; plaintext is UTF-8 text)',
 'ex':'Fill example','copy':'Copy','copied':'Copied','copyFail':'Copy failed','copyEmpty':'Empty','copy.aria':'Copy to clipboard',
 'sm3.h':'SM3 hash','sm3.in':'Input text (UTF-8)','sm3.go':'Compute SM3','sm3.out':'Digest (32 bytes)',
 'sm4.h':'SM4 block cipher (ECB / CBC)','sm4.mode':'Mode','sm4.pad':'Padding','pad.none':'None (ECB only)',
 'sm4.cbcNote':'CBC always uses PKCS#7 padding.','sm4.notes':'Notes','sm4.key':'Key (16 bytes)','sm4.iv':'IV (16 bytes, CBC only)',
 'sm4.in':'Input (encrypt: plaintext; decrypt: ciphertext)','sm4.bin':'Parse plaintext with the binary encoding too (otherwise UTF-8 text)',
 'sm4.enc':'Encrypt','sm4.dec':'Decrypt','sm4.out':'Output','sm4.exNote':'Example: GB/T 32907 standard test vector (ECB, no padding); the ciphertext should be 681edf34d206965e86b3e94f536e4246.',
 'sm2.h':'SM2 public-key cryptography','sm2.keys':'SM2 key pair','sm2.gen':'Generate random key pair','sm2.d':'Private key (32 bytes)','sm2.p':'Public key (65 bytes, uncompressed 04‖x‖y)',
 'sm2.sigH':'SM2 signature / verification','sm2.idLabel':'User ID:','sm2.idDef':'Default 1234567812345678','sm2.idCustom':'Custom','sm2.idAria':'Custom user ID',
 'sm2.msg':'Message (UTF-8)','sm2.sign':'Sign','sm2.verify':'Verify','sm2.sig':'Signature (DER)',
 'sm2.sigNote':'Each signature uses a fresh random k, so results differ every time. The example\'s private key, ID (ALICE123@YAHOO.COM) and message are on the SM2 recommended curve; the repository\'s Rust tests check a known-answer signature for the same inputs with a fixed k.',
 'sm2.encH':'Encryption / decryption','sm2.enc':'Encrypt message with public key','sm2.dec':'Decrypt ciphertext with private key','sm2.ct':'Ciphertext C1C3C2 (DER)','sm2.pt':'Decrypted plaintext',
 'sm2.ok':'✅ Signature valid','sm2.bad':'❌ Signature invalid',
 'test.h':'Self-test','test.run':'Run self-test','pass':'PASS','fail':'FAIL',
 'foot.notice':'Runs locally · Unaudited · Do not use production keys.','foot.src':'Source: ','foot.lib':'Library: ',
 'err.prefix':'Error: ',
 'err.hexChar':p=>`${p.what} contains invalid hex characters (only 0-9, a-f allowed)`,'err.hexOdd':p=>`${p.what} has an odd number of hex digits (2 per byte)`,
 'err.b64':p=>`${p.what} is not valid Base64`,'err.empty':p=>`Please enter the ${p.what}`,'err.len':p=>`${p.what} must be ${p.n} bytes (got ${p.got})`,
 'err.pub04':'SM2 public key must start with 04 (uncompressed form)','err.idEmpty':'Please enter a custom user ID',
 'err.noPadLen':p=>`Without padding, plaintext length must be a multiple of 16 bytes (got ${p.got})`,'err.ctLen':p=>`Ciphertext length must be a non-zero multiple of 16 bytes (got ${p.got})`,
 'err.invalidPriv':'Invalid private key (must be in range 1 to n-2)','err.invalidPub':'Invalid public key (not on the SM2 curve)','err.sm2dec':'Decryption failed (ciphertext and private key do not match)',
 'err.sm4dec':'Decryption failed: the padding check did not pass. The key, IV, mode or ciphertext may be wrong (e.g. one wrong byte in the ciphertext).','err.badPad':'Decryption failed: the PKCS#7 padding check did not pass. The key, mode or ciphertext may be wrong (e.g. one wrong byte in the ciphertext).',
 'noResult':'No result',
 'err.tooBig':p=>`Input exceeds ${p.lim}; this tool does not support inputs that large`,
 'sm4.checkHint':'To check a ciphertext: paste it into "Input", tick "Parse plaintext with the binary encoding too" (Decrypt ticks it for you), and click "Decrypt" with the same Mode, Padding and IV. ECB with no padding cannot detect a wrong ciphertext, so compare the output with the original plaintext instead.',
 'sm4.noPadDec':'Note: decryption without padding performs no check, so a wrong ciphertext or key still produces (garbage) output. Compare it with the original plaintext.',
 'err.sign':'Signing failed','err.encrypt':'Encryption failed','err.unknown':p=>`Unexpected error: ${p.msg}`,
 'w.input':'Input','w.sm4key':'SM4 key','w.pt':'Plaintext','w.ct':'Ciphertext','w.priv':'SM2 private key','w.pub':'SM2 public key','w.sig':'Signature','w.sm2ct':'SM2 ciphertext',
 't.sm3':'SM3 "abc" test vector','t.sm4kat':'SM4 test vector encrypt (no padding)','t.sm4katdec':'SM4 test vector decrypt','t.sm4pkcs7':'SM4 ECB PKCS#7 round trip',
 't.sm4cbc':'SM4 CBC round trip','t.sm2key':'SM2 key generation (public matches private)','t.sm2def':'SM2 sign/verify (default ID)','t.sm2cid':'SM2 sign/verify (custom ID)',
 't.sm2tamper':'Verification fails for tampered message','t.sm2wrongid':'Verification fails with wrong ID','t.sm2enc':'SM2 encrypt/decrypt round trip',
}};
export const LANGS=['zh','en'];
export const CANON='https://www.frankxue.dev/gm-crypto-web/';
let cur='zh';
export const lang=()=>cur;
export function t(k,p){const v=DICT[cur][k];if(v===undefined)return `⟦${k}⟧`;return typeof v==='function'?v(p||{}):v}
export function detect(){
 const q=new URLSearchParams(location.search).get('lang');
 if(LANGS.includes(q)){try{localStorage.setItem('gmweb.lang',q)}catch{}return q}
 let s=null;try{s=localStorage.getItem('gmweb.lang')}catch{}
 if(LANGS.includes(s))return s;
 const ls=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];
 return /^zh/i.test(ls[0]||'')?'zh':'en'}
export function apply(l,save){cur=l;if(save){try{localStorage.setItem('gmweb.lang',l)}catch{}}
 document.documentElement.lang=l==='zh'?'zh-CN':'en';document.title=t('meta.title');
 document.querySelector('meta[name=description]').setAttribute('content',t('meta.desc'));
 // canonical is JS-only (static hosting cannot vary it by ?lang=): create it if missing, follow the language
 let c=document.querySelector('link[rel=canonical]');if(!c){c=document.createElement('link');c.rel='canonical';document.head.appendChild(c)}c.href=CANON+'?lang='+l;
 document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));
 {const h=document.querySelector('h1[data-i18n]'),A='SM2 / SM3 / SM4';if(h){const x=h.textContent,i=x.indexOf(A);if(i>=0){const n=document.createElement('span');n.className='nw';n.textContent=A;h.replaceChildren(x.slice(0,i),n,x.slice(i+A.length))}}}
 document.querySelectorAll('[data-i18n-aria]').forEach(e=>e.setAttribute('aria-label',t(e.dataset.i18nAria)));
 document.querySelectorAll('[data-i18n-ph]').forEach(e=>e.setAttribute('placeholder',t(e.dataset.i18nPh)));
 // one ⇄ toggle: it always offers (and switches to) the other language
 const o=l==='zh'?'en':'zh';document.querySelectorAll('[data-site-path]').forEach(e=>{e.href='https://www.frankxue.dev/'+(l==='zh'?'zh/':'')+e.dataset.sitePath});document.querySelectorAll('[data-lang]').forEach(b=>{b.dataset.lang=o;const x=b.querySelector('[data-i18n]');if(x)x.setAttribute('lang',o==='zh'?'zh-CN':'en')})}
