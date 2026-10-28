# gm-crypto-web · 国密在线小工具

**Live / 在线使用：https://www.frankxue.dev/gm-crypto-web/** （`frankxue831.github.io/gm-crypto-web/` redirects there / 会自动跳转到此地址）

The page is bilingual (中文 / English): it follows your browser language on first visit, remembers your choice, and accepts `?lang=zh` / `?lang=en`.
页面支持中英双语：首次访问按浏览器语言选择，之后记住你的选择，也可用 `?lang=zh` / `?lang=en` 指定。

[English](#english) · [中文](#中文)

---

## English

An in-browser tool for the Chinese national cryptographic algorithms (ShangMi): **SM3** hash, **SM4** block cipher (ECB/CBC), **SM2** key generation / signature / verification / encryption / decryption, with Hex / Base64 switching.

> ⚠️ **Warning**
> - **All computation runs locally in your browser (WebAssembly); nothing is uploaded.**
> - **UNAUDITED.** For learning, debugging and interoperability testing only.
> - **Do not use production keys.**

### Features

| Algorithm | Supported |
|---|---|
| SM3 | Hash of UTF-8 text |
| SM4 | ECB (no padding / PKCS#7), CBC (PKCS#7); 16-byte key / IV (Hex or Base64) |
| SM2 | Key pair generation; sign / verify (default user ID `1234567812345678` or custom ID, DER signature); public-key encryption / private-key decryption (ciphertext C1C3C2, DER) |

Out of scope (intentionally): accounts / backend / storage, X.509, GCM/CCM/XTS.

### Implementation and verification

- Library: `gmcrypto-core` from [gm-crypto-rs](https://github.com/frankxue831/gm-crypto-rs) **v1.17.0 @ `41d54a5`** (git dependency pinned to that commit), default features, compiled to `wasm32-unknown-unknown` and exposed with `wasm-bindgen --target web`.
- Randomness: `getrandom` 0.4 (`wasm_js`, i.e. the browser's `crypto.getRandomValues`).
- Verified: SM3 `"abc"` and the SM4 standard test vector; SM2 signing matches the **official GB/T 32918.2 Appendix A.2 vector** (fixed k, native Rust test).
- **SM2 encryption is only cross-checked against an independent reference implementation (`ref_sm2enc.py`, Python), not an official test vector.**
- Built-in self-test (11 checks: SM3/SM4 against the GB/T vectors, SM2 by round trip); tested with Playwright in Chromium / Firefox / WebKit, desktop and mobile, in both languages.

### Build and run locally

Requires Rust (see `rust-toolchain.toml`, ≥1.87) and `wasm-bindgen-cli` matching the `wasm-bindgen` version in `Cargo.lock` (currently 0.2.129).

```sh
cargo install wasm-bindgen-cli --version 0.2.129 --locked
cargo test --release
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir www/pkg target/wasm32-unknown-unknown/release/gm_web.wasm
python3 -m http.server 8765 -d www   # open http://127.0.0.1:8765/
```

Browser tests:

```sh
cd pw && npm install && npx playwright-core install chromium firefox webkit
BASE_URL=http://127.0.0.1:8765/ node run.cjs chromium            # or firefox / webkit
MOBILE=1 BASE_URL=http://127.0.0.1:8765/ node run.cjs webkit     # 390x844 viewport
```

### License

Same as gm-crypto-rs: dual-licensed under MIT or Apache-2.0, at your option (see `LICENSE-MIT`, `LICENSE-APACHE`).

---

## 中文

纯浏览器的国密算法小工具：**SM3** 哈希、**SM4** 分组密码（ECB/CBC）、**SM2** 密钥生成 / 签名验签 / 加解密，支持 Hex / Base64 切换。

> ⚠️ **重要提示**
> - **所有计算均在你的浏览器本地完成（WebAssembly），不上传任何数据。**
> - **未经安全审计（UNAUDITED）**，仅供学习、调试与互操作测试。
> - **请勿输入生产环境密钥。**

### 功能

| 算法 | 支持 |
|---|---|
| SM3 | UTF-8 文本哈希 |
| SM4 | ECB（无填充 / PKCS#7）、CBC（PKCS#7）；16 字节 Key / IV（Hex 或 Base64） |
| SM2 | 密钥生成；签名 / 验签（默认用户 ID `1234567812345678` 或自定义 ID，DER 签名）；公钥加密 / 私钥解密（密文 C1C3C2，DER） |

不支持（有意不做）：账号/后端/存储、X.509、GCM/CCM/XTS。

### 底层实现与验证

- 底层库：[gm-crypto-rs](https://github.com/frankxue831/gm-crypto-rs) 的 `gmcrypto-core` **v1.17.0 @ `41d54a5`**（git 依赖，固定提交），默认 features，编译为 `wasm32-unknown-unknown`，经 `wasm-bindgen --target web` 导出。
- 随机数：`getrandom` 0.4（`wasm_js`，即浏览器 `crypto.getRandomValues`）。
- 已验证：SM3 `"abc"` 和 SM4 标准测试向量；SM2 签名通过 **GB/T 32918.2 附录 A.2 官方向量**（固定 k，原生 Rust 测试）。
- **SM2 加密仅与独立参考实现（`ref_sm2enc.py`，Python）交叉验证，未对照官方测试向量。**
- 页面内置自检（11 项：SM3、SM4 对国标向量，SM2 做往返校验），并用 Playwright 在 Chromium / Firefox / WebKit 的桌面与移动视口、中英两种语言下测试。

### 本地构建与运行

需要 Rust（见 `rust-toolchain.toml`，≥1.87）与 `wasm-bindgen-cli`（版本须与 `Cargo.lock` 中 `wasm-bindgen` 一致，当前 0.2.129）。命令同上方 English 部分。

### 许可证

与 gm-crypto-rs 一致：MIT 或 Apache-2.0 双许可，任选其一（见 `LICENSE-MIT`、`LICENSE-APACHE`）。
