use gmcrypto_core::{sm3, sm4::{cipher::Sm4Cipher, mode_cbc}, sm2};
#[cfg(test)]
use rand_core::{TryRng, TryCryptoRng};
use wasm_bindgen::prelude::*;
type R<T> = Result<T, JsError>;
fn a16(b:&[u8], what:&str)->R<[u8;16]>{ b.try_into().map_err(|_|JsError::new(&format!("{what} must be 16 bytes"))) }
fn a32(b:&[u8])->R<[u8;32]>{ b.try_into().map_err(|_|JsError::new("private key must be 32 bytes")) }
fn sk(d:&[u8])->R<sm2::Sm2PrivateKey>{ Option::from(sm2::Sm2PrivateKey::from_bytes_be(&a32(d)?)).ok_or_else(||JsError::new("invalid private key")) }
fn pk(p:&[u8])->R<sm2::Sm2PublicKey>{ sm2::Sm2PublicKey::from_sec1_bytes(p).ok_or_else(||JsError::new("invalid public key")) }

#[wasm_bindgen] pub fn sm3_hash(m:&[u8])->Vec<u8>{ sm3::hash(m).to_vec() }

#[wasm_bindgen] pub fn sm4_ecb_encrypt(key:&[u8], data:&[u8], pkcs7:bool)->R<Vec<u8>>{
  let c=Sm4Cipher::new(&a16(key,"key")?); let mut v=data.to_vec();
  if pkcs7 { let p=16-v.len()%16; v.extend(std::iter::repeat(p as u8).take(p)); }
  else if v.len()%16!=0 { return Err(JsError::new("no padding: input must be multiple of 16 bytes")); }
  for ch in v.chunks_exact_mut(16){ let mut b:[u8;16]=ch.try_into().unwrap(); c.encrypt_block(&mut b); ch.copy_from_slice(&b);} Ok(v) }
#[wasm_bindgen] pub fn sm4_ecb_decrypt(key:&[u8], data:&[u8], pkcs7:bool)->R<Vec<u8>>{
  if data.is_empty()||data.len()%16!=0 { return Err(JsError::new("ciphertext must be non-empty multiple of 16 bytes")); }
  let c=Sm4Cipher::new(&a16(key,"key")?); let mut v=data.to_vec();
  for ch in v.chunks_exact_mut(16){ let mut b:[u8;16]=ch.try_into().unwrap(); c.decrypt_block(&mut b); ch.copy_from_slice(&b);}
  if pkcs7 { let p=*v.last().unwrap() as usize; if p==0||p>16||!v[v.len()-p..].iter().all(|&x|x as usize==p){ return Err(JsError::new("bad padding")); } v.truncate(v.len()-p); }
  Ok(v) }
#[wasm_bindgen] pub fn sm4_cbc_encrypt(key:&[u8], iv:&[u8], p:&[u8])->R<Vec<u8>>{ Ok(mode_cbc::encrypt(&a16(key,"key")?,&a16(iv,"IV")?,p)) }
#[wasm_bindgen] pub fn sm4_cbc_decrypt(key:&[u8], iv:&[u8], c:&[u8])->R<Vec<u8>>{ mode_cbc::decrypt(&a16(key,"key")?,&a16(iv,"IV")?,c).ok_or_else(||JsError::new("decrypt failed (bad length/padding)")) }

/// returns 32-byte private key || 65-byte SEC1 public key
#[wasm_bindgen] pub fn sm2_keygen()->R<Vec<u8>>{
  loop { let mut d=[0u8;32]; getrandom::fill(&mut d).map_err(|e|JsError::new(&e.to_string()))?;
    if let Some(k)=Option::<sm2::Sm2PrivateKey>::from(sm2::Sm2PrivateKey::from_bytes_be(&d)) {
      let mut out=k.to_bytes_be().to_vec(); out.extend_from_slice(&k.public_key().to_sec1_uncompressed()); return Ok(out);} } }
#[wasm_bindgen] pub fn sm2_public_from_private(d:&[u8])->R<Vec<u8>>{ Ok(sk(d)?.public_key().to_sec1_uncompressed().to_vec()) }
#[wasm_bindgen] pub fn sm2_default_id()->Vec<u8>{ sm2::DEFAULT_SIGNER_ID.to_vec() }
#[wasm_bindgen] pub fn sm2_sign(d:&[u8], id:&[u8], m:&[u8])->R<Vec<u8>>{ sm2::sign_with_id(&sk(d)?,id,m,&mut getrandom::SysRng).map_err(|_|JsError::new("sign failed")) }
#[wasm_bindgen] pub fn sm2_verify(p:&[u8], id:&[u8], m:&[u8], sig:&[u8])->R<bool>{ Ok(sm2::verify_with_id(&pk(p)?,id,m,sig)) }
#[wasm_bindgen] pub fn sm2_encrypt(p:&[u8], m:&[u8])->R<Vec<u8>>{ sm2::encrypt(&pk(p)?,m,&mut getrandom::SysRng).map_err(|_|JsError::new("encrypt failed")) }
#[wasm_bindgen] pub fn sm2_decrypt(d:&[u8], c:&[u8])->R<Vec<u8>>{ sm2::decrypt(&sk(d)?,c).map_err(|_|JsError::new("decrypt failed")) }

#[cfg(test)]
mod tests {
  use super::*;
  struct FixedK([u8;32]);
  impl TryRng for FixedK { type Error=core::convert::Infallible;
    fn try_next_u32(&mut self)->Result<u32,Self::Error>{Ok(0)} fn try_next_u64(&mut self)->Result<u64,Self::Error>{Ok(0)}
    fn try_fill_bytes(&mut self,d:&mut [u8])->Result<(),Self::Error>{ d.copy_from_slice(&self.0[..d.len()]); Ok(()) } }
  impl TryCryptoRng for FixedK {}
  fn h(s:&str)->Vec<u8>{ (0..s.len()).step_by(2).map(|i|u8::from_str_radix(&s[i..i+2],16).unwrap()).collect() }
  fn up(b:&[u8])->String{ b.iter().map(|x|format!("{x:02X}")).collect() }
  const D:&str="3945208F7B2144B13F36E38AC6D39F95889393692860B51A42FB81EF4DF7C5B8";
  const K:&str="59276E27D506861A16680F3AD9C02DCFBFBF904F533DA0AC2EE1C9A45B58FF85";
  fn key()->sm2::Sm2PrivateKey{ Option::from(sm2::Sm2PrivateKey::from_bytes_be(&h(D).try_into().unwrap())).unwrap() }
  fn k()->FixedK{ FixedK(h(K).try_into().unwrap()) }
  #[test] fn gbt32918_2_sign_vector(){
    let sig=sm2::sign_with_id(&key(),b"ALICE123@YAHOO.COM",b"message digest",&mut k()).unwrap(); let s=up(&sig);
    assert!(s.contains("88348A09A3E324C4FE946843123E40C175468F3E36481885844A144D2167EA4C"));
    assert!(s.contains("0AD2CE552FD33EAB792E5A2805E0504D014C96135F8E03891087132ABB24D48D"));
    assert!(sm2::verify_with_id(&key().public_key(),b"ALICE123@YAHOO.COM",b"message digest",&sig)); }
  #[test] fn sm2_encrypt_fixed_k_matches_python_ref(){
    let c=up(&sm2::encrypt(&key().public_key(),b"encryption standard",&mut k()).unwrap());
    for x in ["DC3C9EA5864EC3652CEB266F03A4AD930C31D4C7785FAC37235E743E7105E78A","78BB48F4CAD1649BA01CED4C40D43CCE98A5D424023B7768099EF232F61EA029",
              "63A0236A78B85A45815F21379C7825291866BD62235C5C702E2EFC7B86FEFB06","0C0301A9BB356EC2862F47DCCE61D00F3CE0F8"] { assert!(c.contains(x),"{x}"); } }
  #[test] fn sm3_sm4_kat(){
    assert_eq!(up(&sm3_hash(b"abc")),"66C7F0F462EEEDD9D1F2D46BDC10E4E24167C4875CF2F7A2297DA02B8F4BA8E0");
    let kk=h("0123456789abcdeffedcba9876543210"); let c=Sm4Cipher::new(&kk.clone().try_into().unwrap());
    let mut b:[u8;16]=kk.try_into().unwrap(); c.encrypt_block(&mut b); assert_eq!(up(&b),"681EDF34D206965E86B3E94F536E4246"); }
}
