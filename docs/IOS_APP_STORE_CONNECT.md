# InkFlow AI — App Store Connect 配置指南

> 逐步操作清单。在 [App Store Connect](https://appstoreconnect.apple.com) 与 [Apple Developer](https://developer.apple.com) 完成。  
> 代码中的 Bundle ID / Product ID 须与此文档完全一致。

---

## 1. Apple Developer 账号

1. 打开 https://developer.apple.com/programs/
2. 使用 Apple ID 注册（**$99/年**）
3. 等待审核通过（通常 24–48 小时）

---

## 2. 创建 App ID（Bundle ID）

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → **Identifiers** → **+**
2. 选择 **App IDs** → **App**
3. 填写：
   - **Description:** InkFlow AI
   - **Bundle ID:** Explicit → `com.inkflow.ai`
4. Capabilities（按需勾选）：
   - **In-App Purchase**（必选）
5. Register

---

## 3. App Store Connect 创建 App

1. App Store Connect → **My Apps** → **+** → **New App**
2. 填写：

| 字段 | 值 |
|------|-----|
| Platform | iOS |
| Name | InkFlow AI |
| Primary Language | English (U.S.) 或你的主语言 |
| Bundle ID | com.inkflow.ai |
| SKU | inkflow-ai-ios（任意唯一字符串） |
| User Access | Full Access |

3. 保存后在 **App Information** 填写：
   - **Privacy Policy URL:** `https://signaturegeneratorai.vercel.app/privacy`
   - **Category:** Graphics & Design 或 Productivity

---

## 4. 创建 In-App Purchase 商品

App Store Connect → 你的 App → **Monetization** → **In-App Purchases**

### 4.1 消耗型积分包（Consumable）

创建 **3 个 Consumable**，Product ID **必须**与代码一致：

| Product ID | Reference Name | 价格（建议） | 说明 |
|------------|----------------|--------------|------|
| `com.inkflow.ai.credits.20` | 20 Credits | €4.99 / Tier 5 | 20 积分 |
| `com.inkflow.ai.credits.50` | 50 Credits | €9.99 / Tier 10 | 50 积分 |
| `com.inkflow.ai.credits.120` | 120 Credits | €14.99 / Tier 15 | 120 积分 |

每个商品需填写：
- **Display Name**（用户可见）
- **Description**（用户可见）
- **Review screenshot**（可先用 App 内购买页截图）
- 提交 **Ready to Submit**（与 App 版本一起或单独）

### 4.2 自动续订订阅（Auto-Renewable Subscription）

1. **Subscription Groups** → 新建组名：**Studio Pro**
2. 在组内新建订阅：

| 字段 | 值 |
|------|-----|
| Product ID | `com.inkflow.ai.pro.monthly` |
| Reference Name | Studio Pro Monthly |
| Duration | 1 Month |
| Price | €11.99（或与 Stripe €12 接近的档位） |

3. 填写本地化名称与描述（120 credits/month 等）
4. **Subscription Review Information** 按需填写

代码位置：`ios/InkFlowAI/Core/StoreManager.swift`  
后端映射：`src/lib/apple/products.ts`

---

## 5. 签署付费协议

App Store Connect → **Agreements, Tax, and Banking**

1. 签署 **Paid Apps Agreement**
2. 填写 **Banking**（收款账户）
3. 填写 **Tax**（税务表单）

未完成则 IAP 无法正式销售。

---

## 6. App Store Server Notifications

App Store Connect → App → **App Information** → **App Store Server Notifications**

| 环境 | URL |
|------|-----|
| Production | `https://signaturegeneratorai.vercel.app/api/apple/webhook` |
| Sandbox | 同上（或单独沙盒 URL） |

Version：**Version 2 Notifications**

后端已实现：`src/app/api/apple/webhook/route.ts`  
处理：续订入账、退款撤销积分。

---

## 7. Vercel 环境变量

在 Vercel 项目 Settings → Environment Variables 配置：

```
JWT_ACCESS_SECRET=<强随机字符串>
MOBILE_CORS_ORIGINS=*
APPLE_BUNDLE_ID=com.inkflow.ai
APPLE_IAP_PACK_20=com.inkflow.ai.credits.20
APPLE_IAP_PACK_50=com.inkflow.ai.credits.50
APPLE_IAP_PACK_120=com.inkflow.ai.credits.120
APPLE_IAP_PRO_MONTHLY=com.inkflow.ai.pro.monthly
```

生产环境 **不要** 设置 `APPLE_IAP_SKIP_VERIFY=true`。

部署后运行数据库迁移（含 `appleOriginalTransactionId`）：

```bash
npx prisma migrate deploy
```

---

## 8. Xcode 签名（Mac）

```bash
cd ios
./setup-mac.sh
```

1. Target **InkFlow AI** → **Signing & Capabilities**
2. **Team:** 选择你的 Developer Team
3. **Bundle Identifier:** `com.inkflow.ai`
4. Debug 运行已绑定 `InkFlowAI.storekit` 本地 IAP 测试

---

## 9. 沙盒测试账号

App Store Connect → **Users and Access** → **Sandbox** → **Testers**

1. 创建沙盒 Apple ID（勿用真实 Apple ID 密码）
2. 在 iPhone **设置 → App Store → 沙盒账户** 登录
3. 在 App 内测试购买（不会真实扣款）

---

## 10. 审核测试账号（给 Apple 审核员）

在 App Review Information 提供：

- **Demo account email / password**（真实可登录账户）
- **Notes:** 说明如何：登录 → Studio 生成签名 → Library 保存 → Sign PDF → 购买积分（沙盒）

建议邮箱：`inkflow.review@yourdomain.com`，预充足够积分。

---

## 11. 常见拒审与预防

| 规则 | 对策 |
|------|------|
| 3.1.1 虚拟商品须 IAP | App 内不出现 Stripe / 外链付款 |
| 5.1.1 隐私 | 隐私政策 URL + App Privacy 问卷如实填写 |
| 账户删除 | Account → Delete account |
| 4.2 最小功能 | 强调原生 PDF、Studio、Library，非网页套壳 |

---

## 12. 相关文件

| 文件 | 说明 |
|------|------|
| `docs/IOS_APP_STORE_PLAN.md` | 总体规划与进度 |
| `docs/IOS_SUBMISSION_CHECKLIST.md` | 提审前 Checklist |
| `ios/InkFlowAI.storekit` | 本地 StoreKit 测试配置 |
| `ios/scripts/prepare-icons.sh` | 从 Web 图标生成 1024 App Icon |

---

**下一步：** 完成第 1–5 步后，在 Mac 上跑 TestFlight 内测，再按 `IOS_SUBMISSION_CHECKLIST.md` 提交审核。
