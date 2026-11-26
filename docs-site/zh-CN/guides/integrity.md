# 完整性：canonical 序列化、哈希、签名与迁移

Workbook 文档会被持久化、比对并可能签名。以下规则是**协议**：修改键序或默认参与
哈希的字段集合，会让历史上发布的所有哈希与签名失效。

Canonical 规则版本：**1**。

## 规范化序列化

`canonicalize(value)`：

1. 对象键按字典序排序；
2. 数字使用 ECMAScript `Number#toString` 语义，`-0` 归一为 `0`，`NaN`/`Infinity` 抛错；
3. 字符串使用 `JSON.stringify` 语义；
4. 数组顺序保持；
5. 对象中值为 `undefined` 的键剔除，`null` 保留；
6. 不输出空白。

`canonicalBytes` 返回 UTF-8 字节。

## 内容哈希

- 对 canonical UTF-8 字节做 SHA-256。
- 默认字段：`kind`、`schemaVersion`、`views`、`styles`、`printConfig`、`assets`。
- 默认**不包含** `data`（数据会变，合同模板不变）。需要时显式包含：

```ts
await contentHash(workbook, { include: ["views", "styles", "data"] });
```

浏览器需要 WebCrypto（`crypto.subtle`，HTTPS/localhost）；Node 20+ 自带。
缺失时抛错，不静默降级为非密码学哈希。

## 签名钩子

库只做编排，密钥与算法由宿主负责。

```ts
const signature = await signDocument(workbook, {
  async sign(payload) {
    const value = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, payload);
    return {
      alg: "Ed25519",
      value: Buffer.from(value).toString("base64url"),
      signedAt: new Date().toISOString(),
      contentHash: await contentHash(workbook),
    };
  },
});

const ok = await verifyDocument(workbook, signature, {
  async verify(payload, stored) {
    return crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      Buffer.from(stored.value, "base64url"),
      payload,
    );
  },
});
```

`signDocument` 会重算哈希并拒绝签名者报告的不一致 `contentHash`；
`verifyDocument` 对内容不匹配或密码学失败都返回 `false`。密钥管理不在库内。

安全提示：哈希只有在期望值通过可信渠道传递时才能证明完整性；签名只有在验签方
信任公钥时才能证明来源。

## schemaVersion 迁移

```ts
registerMigration("4.0.0", "4.1.0", (doc) => ({ ...doc, schemaVersion: "4.1.0" }));
registerMigration("4.1.0", "4.1.1", (doc) => ({ ...doc, schemaVersion: "4.1.1" }));

const { workbook: current, applied } = migrateWorkbook(legacy);
```

- 迁移链按版本确定性解析，目标默认 `CURRENT_SCHEMA_VERSION`。
- 未知版本或缺失路径**fail-closed**，错误信息包含支持版本范围，不做猜测。
- 迁移结果必须通过 `validateWorkbookDocument`，否则抛错。
