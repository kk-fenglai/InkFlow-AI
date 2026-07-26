# InkFlow AI — iOS 提审 Checklist

> 提交 App Store Review 前逐项勾选。  
> 配套文档：[IOS_APP_STORE_PLAN.md](./IOS_APP_STORE_PLAN.md) · [IOS_APP_STORE_CONNECT.md](./IOS_APP_STORE_CONNECT.md)

---

## A. 账号与商品

- [ ] Apple Developer Program 已激活（$99/年）
- [ ] App Store Connect 已创建 App（Bundle ID `com.inkflow.ai`）
- [ ] 4 个 IAP 已创建且 Product ID 与代码一致
- [ ] Paid Apps Agreement + 银行 + 税务已完成
- [ ] Server Notifications URL 已指向 `/api/apple/webhook`

---

## B. 后端 / Vercel

- [ ] `JWT_ACCESS_SECRET` 已设置
- [ ] `APPLE_BUNDLE_ID` 与 `APPLE_IAP_*` 已设置
- [ ] 生产环境 **未** 启用 `APPLE_IAP_SKIP_VERIFY`
- [ ] Prisma 迁移已 deploy（含 mobile auth + apple 字段）
- [ ] 生产 API 可访问：`/api/mobile/login`、`/api/apple/products`

---

## C. Mac 构建与功能测试

在 Mac 执行 `cd ios && ./setup-mac.sh`，然后：

- [ ] Xcode Team 签名成功，真机或模拟器可安装
- [ ] App Icon 已生成（`scripts/prepare-icons.sh`）
- [ ] 注册新账户
- [ ] 登录 / 登出
- [ ] 忘记密码邮件可收到
- [ ] Studio：选模板 + 滑块 → 生成（扣 1 积分）
- [ ] Studio：分享 PNG、保存到 Library
- [ ] Library：列表、删除
- [ ] Refine：选图 → 分析
- [ ] Sign PDF：选 PDF → 放签名 → 签署 → 分享
- [ ] Account：积分显示、购买页、删除账户
- [ ] IAP 沙盒：至少测 1 个积分包 + 订阅（如已配置）
- [ ] 恢复购买（订阅）无崩溃

---

## D. App Store Connect 元数据

- [ ] **App Name:** InkFlow AI
- [ ] **Subtitle**（可选，≤30 字符）
- [ ] **Description**（功能说明，含 Studio / PDF / Library）
- [ ] **Keywords**
- [ ] **Support URL**（网站或 support 邮箱页）
- [ ] **Privacy Policy URL:** https://signaturegeneratorai.vercel.app/privacy
- [ ] **Screenshots**（6.7"、6.5"、5.5" 等必需尺寸）
- [ ] **App Preview**（可选）

建议截图场景：
1. Studio 生成签名  
2. Cloud Library  
3. Sign PDF 放置签名  
4. 购买 / 积分页  
5. Account  

---

## E. App Privacy（隐私问卷）

如实声明收集的数据类型，例如：

| 数据 | 用途 | 是否关联用户 |
|------|------|--------------|
| Email | 账户 | 是 |
| User Content（签名笔迹、上传照片） | 功能 | 是 |
| Purchase History | IAP | 是 |
| Diagnostics（如崩溃，若接入） | 可选 | 视情况 |

App 内 **不得** 收集未在问卷中声明的数据。

---

## F. 审核信息

- [ ] **Sign-in required:** Yes
- [ ] **Demo account** 用户名 + 密码
- [ ] **Notes for reviewer**（英文），示例：

```
InkFlow AI is a native signature studio app.

Test account: review@example.com / TestPassword123

Flow:
1. Sign in
2. Studio tab → enter a name → Render Final Ink (uses 1 credit; account has credits preloaded)
3. Library tab → view saved signatures
4. Sign PDF tab → pick a PDF, place signature, sign (1 credit)
5. Account → Buy credits uses Apple IAP (Sandbox)

Account deletion: Account tab → Delete account.
Privacy: https://signaturegeneratorai.vercel.app/privacy
```

- [ ] 联系人姓名、电话、邮箱

---

## G. TestFlight

- [ ] Archive → Upload to App Store Connect（Xcode Organizer）
- [ ] Internal Testing 通过（至少 1 台真机）
- [ ] External Testing（可选，1–2 周）
- [ ] 无 Blocker 崩溃

---

## H. 提交审核

- [ ] 选择构建版本
- [ ] IAP 与 App 版本一并提交审核
- [ ] Export Compliance：通常选 No（若无自定义加密 beyond HTTPS）
- [ ] **Submit for Review**

---

## I. 上线后

- [ ] 监控 `/api/apple/webhook` 日志（续订、退款）
- [ ] 关注 App Store Connect 评论与崩溃报告
- [ ] 准备 1.0.1 修复版本流程

---

## 快速命令参考（Mac）

```bash
# 生成工程 + 图标
cd ios && ./setup-mac.sh

# 本地后端联调（可选）
# Xcode Scheme → INKFLOW_API_BASE=http://localhost:3000

# 生产 API（默认）
# https://signaturegeneratorai.vercel.app
```

---

**当前代码位置：** `ios/InkFlowAI/`  
**未完成时仍可推进：** 阶段 A（账号）与阶段 C（Mac 测试）可并行。
