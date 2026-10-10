# gm-crypto-web · 国密在线小工具

纯浏览器的国密算法小工具：**SM3** 哈希、**SM4** ECB/CBC 加解密、**SM2** 密钥生成 / 签名验签 / 加解密，支持 Hex / Base64 切换。

在线使用：https://www.frankxue.dev/gm-crypto-web/（`frankxue831.github.io/gm-crypto-web/` 会自动跳转到此地址）

> ⚠️ **重要提示 / Warning**
> - **所有计算均在你的浏览器本地完成（WebAssembly），不上传任何数据。** All computation runs locally in your browser; nothing is uploaded.
> - **未经安全审计（UNAUDITED）**，仅供学习、调试与互操作测试。
> - **请勿输入生产环境密钥。** Do not use production keys.

## 功能

| 算法 | 支持 |
|---|---|
| SM3 | UTF-8 文本哈希 |
| SM4 | ECB（无填充 / PKCS#7）、CBC（PKCS#7）；16 字节 Key / IV（Hex 或 Base64） |
| SM2 | 密钥生成；签名 / 验签（默认 ID `1234567812345678` 或自定义 ID，DER 签名）；公钥加密 / 私钥解密（DER，C1C3C2） |

不支持（有意不做）：账号/后端/存储、X.509、GCM/CCM/XTS、多语言。

## 底层实现与验证

- 底层库：[gm-crypto-rs](https://github.com/frankxue831/gm-crypto-rs) 的 `gmcrypto-core` **v1.16.0 @ `5562004`**（git 依赖，固定提交），默认 features，编译为 `wasm32-unknown-unknown`，经 `wasm-bindgen --target web` 导出。
- 随机数：`getrandom` 0.4（`wasm_js`，即浏览器 `crypto.getRandomValues`）。
- 已验证：SM3 `"abc"` 和 SM4 标准已知答案；SM2 签名通过 **GB/T 32918.2 附录 A.2 官方向量**（固定 k，原生 Rust 测试）。
- **SM2 加密仅与独立参考实现（`ref_sm2enc.py`，Python）交叉验证，未对照官方测试向量。**
- 页面内置自检（11 项），并用 Playwright 在 Chromium / Firefox / WebKit 中测试。

## 本地构建与运行

需要 Rust（见 `rust-toolchain.toml`，≥1.87）与 `wasm-bindgen-cli`（版本须与 `Cargo.lock` 中 `wasm-bindgen` 一致，当前 0.2.129）。

```sh
cargo install wasm-bindgen-cli --version 0.2.129 --locked
cargo test --release
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir www/pkg target/wasm32-unknown-unknown/release/gm_web.wasm
python3 -m http.server 8765 -d www   # 打开 http://127.0.0.1:8765/
```

浏览器测试：

```sh
cd pw && npm install && npx playwright-core install chromium firefox webkit
BASE_URL=http://127.0.0.1:8765/ node run.cjs chromium   # 或 firefox / webkit
```

## 许可证

与 gm-crypto-rs 一致：MIT 或 Apache-2.0 双许可，任选其一（见 `LICENSE-MIT`、`LICENSE-APACHE`）。
