# InkFlow AI — Android / Google Play 指南

> 原生 Kotlin 工程：[`android/`](../android/)  
> 包名：`com.inkflow.ai`  
> 与 iOS / Web 共用 API：`https://signaturegeneratorai.vercel.app`

---

## 与 TWA 壳的区别

| | `android/`（本工程） | `InkFlow-Android-Release` |
|--|----------------------|---------------------------|
| 类型 | Kotlin + Compose **原生** | Bubblewrap **网页壳** |
| 支付 | Google Play Billing | 网站 Stripe |
| 推荐 | Google Play 上架 | 仅作临时分发 |

---

## 后端 API

| 接口 | 说明 |
|------|------|
| `GET /api/google/products` | 商品目录 |
| `POST /api/google/verify-purchase` | 验单 + 入账（需 Bearer） |
| `POST /api/google/webhook` | RTDN stub |

Body 示例：

```json
{
  "productId": "com.inkflow.ai.credits.20",
  "purchaseToken": "...",
  "productType": "inapp"
}
```

Vercel 环境变量：

```
GOOGLE_PLAY_PACKAGE_NAME=com.inkflow.ai
GOOGLE_IAP_PACK_20=com.inkflow.ai.credits.20
GOOGLE_IAP_PACK_50=com.inkflow.ai.credits.50
GOOGLE_IAP_PACK_120=com.inkflow.ai.credits.120
GOOGLE_IAP_PRO_MONTHLY=com.inkflow.ai.pro.monthly
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

开发联调（非 production）：`GOOGLE_PLAY_SKIP_VERIFY=true`

迁移：`npx prisma migrate deploy`（含 `googlePurchaseToken` 字段）

---

## Play Console 步骤

1. 创建应用，包名 `com.inkflow.ai`
2. 创建 3 个 Managed product + 1 个订阅（ID 与上表一致）
3. 关联结算账号；添加许可测试人员
4. 创建服务账号，授予 **View financial data / Manage orders**，下载 JSON 填入 Vercel
5. （可选）配置 RTDN → `https://signaturegeneratorai.vercel.app/api/google/webhook`

---

## 本地构建

```bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Android Studio：Open → `android/` 文件夹。

---

## MVP 范围

登录、Studio、Library、Account、Play Billing。  
Refine / Sign PDF / 忘记密码 → 后续版本。
