# InkFlow AI — 苹果 App Store 上架规划

> 文档版本：**2026-06-15**（已同步代码现状）  
> 线上网站：https://signaturegeneratorai.vercel.app  
> 仓库：InkFlow AI（Next.js 14 + Vercel + Neon）  
> iOS 工程：`ios/`（与 Web 同仓，**无需单独再建工程**）

---

## 进度总览

| 阶段 | 完成度 | 说明 |
|------|--------|------|
| **阶段 0** 账号与 Connect | ~0% | 需你注册 Apple Developer、创建 IAP |
| **阶段 1** 后端移动端 | **~90%** | 已部署生产；webhook 为 stub |
| **阶段 2** SwiftUI 客户端 | **~70%** | 主流程已实现；需在 Mac 编译联调 |
| **阶段 3** TestFlight / 提审 | 未开始 | 依赖阶段 0 + Mac 测试 |

**整体约 55–60%**（以可上架为准，不是代码行数）。

---

## 一、已确认方案

| 决策项 | 选择 | 说明 |
|--------|------|------|
| **客户端** | SwiftUI 原生 | 最佳 iOS 体验 |
| **支付** | 仅 Apple IAP | App 内不出现 Stripe |
| **首版范围** | 全功能 | Studio、PDF 签署、Cloud Library、Refinement、账户、IAP |
| **工程结构** | 单仓库 `ios/` | 与 Next.js API 共用后端，不拆独立仓库 |

网站继续用 Stripe；App 与网站共用 Neon 账户与积分余额。

---

## 二、现状（2026-06-15）

### 架构（不变）

- **Web**：Next.js 14 + React + Tailwind
- **API**：Vercel Serverless（`src/app/api/`）
- **数据库**：Neon PostgreSQL + Prisma
- **Web 支付**：Stripe Live
- **邮件**：Brevo（忘记密码）
- **iOS**：SwiftUI，`ios/InkFlowAI/`

### 已完成 ✅

#### 后端（阶段 1）

| 项目 | 路径 / 说明 |
|------|-------------|
| 移动端 JWT 登录 / 注册 / 刷新 / 登出 | `src/app/api/mobile/*` |
| Bearer + Cookie 双鉴权 | `src/lib/session.ts` → `getAuthenticatedUser()` |
| CORS（移动端） | `src/lib/mobile-auth/cors.ts`、`src/middleware.ts` |
| Apple IAP 商品列表 | `GET /api/apple/products` |
| Apple 交易校验与入账 | `POST /api/apple/verify-transaction` |
| Apple JWS 解析（含生产验签） | `src/lib/apple/verify-transaction.ts` |
| Apple 购买结算 | `src/lib/payments/settle-apple-purchase.ts` |
| Prisma 扩展 | `MobileRefreshToken`、`CreditPurchase.paymentProvider`、`appleTransactionId` |
| 迁移 | `prisma/migrations/20250616120000_mobile_auth_apple_iap/` |
| 环境变量模板 | `.env.example`（`JWT_ACCESS_SECRET`、`MOBILE_CORS_ORIGINS`、`APPLE_IAP_*`） |

#### iOS 客户端（阶段 2）

| 模块 | 状态 | 路径 |
|------|------|------|
| 工程配置（XcodeGen） | ✅ | `ios/project.yml`、`ios/setup-mac.sh` |
| 登录 / 注册 | ✅ | `Features/Auth/` |
| 忘记密码 | ✅ | `ForgotPasswordView.swift` → `/api/auth/forgot-password` |
| Studio 生成 + 预览 + 分享 PNG | ✅ | `Features/Studio/` |
| 保存到 Cloud Library | ✅ | `POST /api/signatures` |
| Cloud Library 列表 / 删除 | ✅ | `Features/Library/` |
| Refinement 上传 + 分析 | ✅ | `Features/Refine/`（免费分析，无本地导出） |
| PDF 签署 + 分享 | ✅ | `Features/SignPDF/`（PDFKit，1 积分） |
| 账户 / 积分 / 登出 | ✅ | `Features/Account/` |
| 删除账户 | ✅ | `DELETE /api/account` |
| StoreKit 2 购买 UI | ✅ | `PricingView.swift`、`StoreManager.swift` |
| 恢复购买（基础） | ✅ | `AppStore.sync()` |
| API Client + Keychain | ✅ | `Core/APIClient.swift`、`KeychainHelper.swift` |
| 笔迹预览渲染 | ✅ | `Core/SignaturePreviewView.swift` |

**Bundle ID：** `com.inkflow.ai`  
**IAP Product ID：**

- `com.inkflow.ai.credits.20`
- `com.inkflow.ai.credits.50`
- `com.inkflow.ai.credits.120`
- `com.inkflow.ai.pro.monthly`

### 未完成 / 待加强 ⚠️

| 项目 | 优先级 | 说明 |
|------|--------|------|
| Apple Developer 账号 | **高** | 阶段 0，$99/年 |
| App Store Connect App + IAP 商品 | **高** | ID 须与上表一致 |
| Mac 上生成 `.xcodeproj` 并联调 | **高** | Windows 无法打包 |
| App 图标 `Assets.xcassets` | **高** | 提审必需 |
| `/api/apple/webhook` 业务逻辑 | **高** | 目前仅记录日志并返回 200 |
| 恢复购买 → 后端重新校验 | 中 | 现仅 `AppStore.sync()`，未逐笔 verify |
| Studio 多模板 / 滑块调参 | 中 | 未接 `/api/tune`，仅默认 `baseId: poet` |
| Refine 本地图像导出 | 中 | Web 有客户端处理，iOS 仅 API 分析 |
| Sign PDF 多页 / 捏合缩放 | 低 | 当前主要支持首页 + 拖拽 |
| Universal Links 重置密码 | 低 | 邮件仍跳网站 |
| 隐私政策移动端补充 | 中 | `src/app/privacy` 需写明 App 数据收集 |
| TestFlight / 截图 / 审核文案 | 中 | 阶段 3 |

---

## 三、目标架构

```
┌─────────────────────────────────────────────────────────┐
│              iOS App (SwiftUI) — ios/InkFlowAI/          │
│  Auth │ Studio │ Library │ Refine │ SignPDF │ StoreKit  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + Bearer Token
┌──────────────────────────▼──────────────────────────────┐
│         Vercel API（生产已部署）                           │
│  /api/*  │  /api/mobile/*  │  /api/apple/*              │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    Neon PostgreSQL    Apple IAP         Stripe（仅 Web）
```

---

## 四、分阶段计划（更新版）

### 阶段 0 — 准备与账号（1–2 周）【你做】

- [ ] 注册 [Apple Developer Program](https://developer.apple.com/programs/)（$99/年）
- [ ] [App Store Connect](https://appstoreconnect.apple.com) 创建 App
  - Bundle ID：`com.inkflow.ai`
  - 显示名称：InkFlow AI
- [ ] 创建 IAP 商品（消耗型 + 自动续订，见上文 Product ID）
- [ ] 签署 **Paid Apps Agreement**（协议、税务、银行）
- [ ] 配置 App Store Server Notifications URL → `https://signaturegeneratorai.vercel.app/api/apple/webhook`
- [ ] 更新隐私政策（邮箱、签名图、PDF、购买、AI 处理）
- [ ] 准备审核测试账号（邮箱 + 密码 + 足够积分）
- [x] App 内账户删除入口（`AccountView` → `DELETE /api/account`）

---

### 阶段 1 — 后端移动端（3–4 周）【~90% 完成】

#### 1.1 移动端 JWT 认证

| 接口 | 状态 |
|------|------|
| `POST /api/mobile/login` | ✅ |
| `POST /api/mobile/register` | ✅ |
| `POST /api/mobile/refresh` | ✅ |
| `POST /api/mobile/logout` | ✅ |
| `GET /api/mobile/me` | ✅ |
| `getAuthenticatedUser()` Bearer 支持 | ✅ |

#### 1.2 环境与 CORS

- [x] `JWT_ACCESS_SECRET`（未设时回退 `NEXTAUTH_SECRET`）
- [x] `MOBILE_CORS_ORIGINS`
- [ ] 生产环境确认 Vercel 已配置全部 `APPLE_IAP_*` 变量

#### 1.3 Apple IAP 服务端

| 接口 | 状态 |
|------|------|
| `GET /api/apple/products` | ✅ |
| `POST /api/apple/verify-transaction` | ✅（沙盒可用 transactionId；生产需 JWS） |
| `POST /api/apple/webhook` | ⚠️ stub only |
| Prisma `paymentProvider` / `appleTransactionId` | ✅ |

#### 1.4 深链（可选）

- [ ] Universal Links / URL Scheme：`inkflow://reset-password?token=`

**阶段 1 剩余工作：** webhook 续费/退款、Vercel 生产 env 核对、关闭 `APPLE_IAP_SKIP_VERIFY`。

---

### 阶段 2 — SwiftUI 客户端（10–14 周）【~70% 完成】

#### 2.1 工程结构（已实现）

```
ios/
  project.yml
  setup-mac.sh
  README.md
  InkFlowAI/
    App/              # InkFlowAIApp, RootView, MainTabView
    Core/             # APIClient, AuthStore, StoreManager, DesignTokens, …
    Features/
      Auth/           # Login, Register, ForgotPassword
      Studio/
      Library/
      Refine/
      SignPDF/
      Account/
      Pricing/
```

设计 token 对齐 `tailwind.config.ts`（`DesignTokens.swift`）。

#### 2.2 功能映射

| 模块 | 状态 | 主要 API |
|------|------|----------|
| 认证 | ✅ | `/api/mobile/*`、forgot-password |
| Studio | ⚠️ 基础版 | `/api/generate`（缺 tune、多 base） |
| Cloud Library | ✅ | `/api/signatures` |
| Refinement | ⚠️ 分析 only | `/api/refine` |
| PDF 签署 | ✅ 基础版 | `/api/sign/pdf` |
| 账户 | ✅ | credits、delete account |
| 购买 | ⚠️ UI 完成 | `/api/apple/verify-transaction` + StoreKit 2 |

#### 2.3 里程碑

| 里程碑 | 状态 | 内容 |
|--------|------|------|
| **2a** 骨架 + 认证 | ✅ | API Client、Keychain、Tab 导航 |
| **2b** Studio + Library + Refine | ⚠️ | 主流程有；Studio/Refine 未对齐 Web 全功能 |
| **2c** PDF + IAP + 账户 | ⚠️ | PDF/IAP/删除已有；IAP 需 Connect 真测 |
| **2d** 联调 + 无障碍 | ❌ | 需 Mac 真机 / 模拟器 |

**阶段 2 剩余工作：** Mac 编译测试、App 图标、Studio 增强、Refine 导出、恢复购买后端同步。

#### 2.4 在 Mac 上启动

```bash
cd ios
chmod +x setup-mac.sh
./setup-mac.sh
```

Xcode → Signing 选 Team → ⌘R 运行。

---

### 阶段 3 — TestFlight 与提审（3–4 周）【未开始】

#### App Store Connect 素材

- [ ] 分类：Graphics & Design 或 Productivity
- [ ] 截图：Studio、PDF 签署、Library、定价（多尺寸）
- [ ] 描述与关键词
- [ ] 隐私问卷（邮箱、用户内容、购买记录）
- [ ] 年龄分级：4+

#### 审核风险与对策

| 风险 | 对策 |
|------|------|
| 3.1.1 数字商品未走 IAP | App 内仅 StoreKit，无 Stripe |
| 4.2 纯网站套壳 | 原生 PDFKit、文件选择、完整创作流程 |
| 5.1.1 隐私 | 链到 `/privacy`；说明 AI 与数据用途 |
| 账户删除 | Account → Delete account ✅ |
| 登录审核 | 提供测试账号说明 |

#### 测试矩阵

- [ ] 设备：iPhone SE、标准屏、Pro Max；iOS 17+
- [ ] IAP 沙盒：积分包、订阅、恢复购买
- [ ] PDF：≤10MB、签署、分享
- [ ] 弱网与错误提示

#### 发布节奏

1. Internal TestFlight  
2. External TestFlight（1–2 周）  
3. Submit for Review  
4. 灰度发布（建议 10% 起）

---

## 五、你接下来最该做的（按优先级）

### 本周（无需写代码）

1. **注册 Apple Developer**（$99/年）  
2. **App Store Connect** 创建 App + 4 个 IAP（ID 与 `StoreManager.swift` 一致）  
3. **签署 Paid Apps Agreement**  

### 有 Mac 后

4. 运行 `ios/setup-mac.sh`，真机跑通：登录 → 生成 → 存库 → Sign PDF → 沙盒购买  
5. 修崩溃与 IAP 入账问题  

### 提审前（开发 / 运营）

6. 补 **App 图标** 与截图  
7. 完成 **webhook** 与生产 **JWS** 配置（关掉 `APPLE_IAP_SKIP_VERIFY`）  
8. 更新 **隐私政策**  
9. **TestFlight** → 提交审核  

---

## 六、工期与成本（修订）

| 阶段 | 原估 | 当前 |
|------|------|------|
| 阶段 0 准备 | 1–2 周 | 未开始 |
| 阶段 1 后端 | 3–4 周 | **~90%**，剩 webhook + env |
| 阶段 2 SwiftUI | 10–14 周 | **~70%**，剩 Mac 联调 + 增强 |
| 阶段 3 提审 | 3–4 周 | 未开始 |
| **距上架（乐观）** | — | **约 4–8 周**（假设已有 Mac + 开发者账号） |

**持续成本**

- Apple Developer：$99/年  
- IAP 抽成：15%（小企业计划）或 30%  
- 基础设施：沿用 Vercel + Neon  

---

## 七、v1.0 产品范围

### 包含（目标）

- [x] 账户：注册、登录、忘记密码、删除账户  
- [x] Studio：AI 签名生成、预览、PNG 分享、存库  
- [x] Cloud Library：列表、删除（重命名 API 有，UI 未做）  
- [⚠️] Refinement：上传分析（导出待补）  
- [x] PDF 签署：选 PDF、放置签名、分享  
- [⚠️] 商业化：StoreKit UI + 后端校验（需 Connect 真测）  
- [⚠️] 合规：隐私链接已有，文案待更新  

### 不包含

- Admin 后台（保留 Web）  
- Android（可复用同一 API）  

---

## 八、任务清单（Checklist）

### 阶段 0

- [ ] Apple Developer 账号  
- [ ] App Store Connect App 记录  
- [ ] IAP 商品创建（4 个）  
- [ ] Paid Apps Agreement  
- [ ] Server Notifications URL  
- [ ] 隐私政策更新  
- [ ] 审核测试账号  

### 阶段 1

- [x] `POST /api/mobile/login` 等认证接口  
- [x] Bearer 鉴权（`getAuthenticatedUser`）  
- [x] `POST /api/apple/verify-transaction`  
- [⚠️] `POST /api/apple/webhook`（stub）  
- [x] Prisma Apple / mobile 字段  
- [ ] Vercel 生产 env 完整配置  

### 阶段 2

- [x] XcodeGen 工程与 API Client  
- [x] 认证 + Keychain  
- [⚠️] Studio 模块（基础）  
- [x] Library 模块  
- [⚠️] Refinement 模块（分析 only）  
- [x] PDF 签署（PDFKit 基础）  
- [⚠️] StoreKit 2（待 Connect 联调）  
- [x] 账户与删除  
- [ ] App 图标 Assets  
- [ ] Mac 真机联调通过  

### 阶段 3

- [ ] TestFlight 内测  
- [ ] App Store 截图与文案  
- [ ] 隐私问卷  
- [ ] 提交审核  
- [ ] 正式上线  

---

## 九、相关代码索引

| 用途 | 路径 |
|------|------|
| iOS 工程 | `ios/`、`ios/README.md` |
| 移动端 API | `src/app/api/mobile/` |
| Apple IAP API | `src/app/api/apple/` |
| 移动端鉴权 | `src/lib/mobile-auth/` |
| 会话 / Bearer | `src/lib/session.ts` |
| Apple 验签 | `src/lib/apple/verify-transaction.ts` |
| Apple 入账 | `src/lib/payments/settle-apple-purchase.ts` |
| CORS 中间件 | `src/middleware.ts` |
| Prisma 迁移 | `prisma/migrations/20250616120000_mobile_auth_apple_iap/` |
| 环境变量示例 | `.env.example` |
| StoreKit 商品 ID | `ios/InkFlowAI/Core/StoreManager.swift` |
| PDF 签署 API | `src/app/api/sign/pdf/route.ts` |
| 账户删除 API | `src/app/api/account/route.ts` |
| 定价常量 | `src/lib/constants.ts` |
| 隐私政策页 | `src/app/privacy/page.tsx` |
| 设计 token（Web） | `tailwind.config.ts` |
| 设计 token（iOS） | `ios/InkFlowAI/Core/DesignTokens.swift` |

---

## 十、建议启动顺序（2026-06 更新）

1. **你：** 注册 Apple Developer + Connect 建 App / IAP  
2. **你（Mac）：** `setup-mac.sh` → 全流程测试  
3. **开发：** webhook + 图标 + Studio/Refine 补齐  
4. **运营：** 截图、隐私问卷、TestFlight  
5. **提审**  

> 不需要再单独建一个「App Store 专用工程」；`ios/` 即为上架工程，与 Web 同仓共用 API。
