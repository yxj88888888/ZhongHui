# sxyxerp.online 固定金价牌与分级后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Each task has a checkpoint and must be verified before the next task.

**Goal:** 将公开金价页改造成参考站的五行固定价格牌，并在 /admin 实现管理员、店长、店员分级的安全后台。

**Architecture:** 保留现有 EdgeOne 静态页面和 Functions 结构，新增强一致 Pages Blob 控制存储层。公开接口只读固定价格配置；后台 Functions 负责 Cookie 会话、PBKDF2 密码哈希、角色校验、价格保存、账号管理和审计日志；前端继续使用原生 HTML/CSS/JavaScript。

**Tech Stack:** EdgeOne Pages Functions, @edgeone/pages-blob, Web Crypto API (HMAC/PBKDF2), plain HTML/CSS/JavaScript, Node.js assert/strict tests.

---

## 文件结构与职责

- Create: cloud-functions/api/_shared/http.js — JSON 响应、Cookie 解析和统一错误响应。
- Create: cloud-functions/api/_shared/store.js — Pages Blob 实例、JSON 读写和测试内存存储。
- Create: cloud-functions/api/_shared/permissions.js — admin、manager、clerk 角色和能力矩阵。
- Create: cloud-functions/api/_shared/auth.js — PBKDF2 哈希、HMAC 会话、Bootstrap 管理员和鉴权。
- Create: cloud-functions/api/gold/defaults.js — 五行 ID、初始价格和固定价格校验。
- Modify: cloud-functions/api/gold/_service.js、current.js、history.js — 固定价格服务与公开接口。
- Create: cloud-functions/api/admin/login.js、logout.js、me.js、password.js、prices.js、users.js、audit.js。
- Create: cloud-functions/api/admin/users/[id].js — 删除、停用和重置指定账号。
- Modify: 中汇黄金/public/index.html、css/style.css、js/app.js — 参考站风格公开页。
- Create: 中汇黄金/public/admin/index.html、admin.css、admin.js — 独立后台。
- Modify: 中汇黄金/README.md、package.json。
- Create/modify tests: test/fixed-price-service.test.mjs、admin-auth.test.mjs、admin-functions.test.mjs、cloud-function-gold.test.mjs、yuexin-template-sync.test.mjs。

## Task 1: 先写固定价格和权限的失败测试

**Files:** test/fixed-price-service.test.mjs, test/admin-auth.test.mjs, package.json

- [ ] **Step 1: 写固定价格红灯测试**

创建 test/fixed-price-service.test.mjs，使用下面的测试内容：

~~~js
import assert from 'node:assert/strict';
import {
  DEFAULT_PRICES, normalizePriceRows, formatPublicPrices, appendPriceSnapshot,
} from '../cloud-functions/api/gold/defaults.js';

assert.deepEqual(DEFAULT_PRICES.map(({ id }) => id), [
  'jewelry_gold', 'non_member_bar', 'member_bar', 'platinum', 'silver',
]);
assert.equal(DEFAULT_PRICES[0].sell_price, 1107);
assert.equal(DEFAULT_PRICES[4].recycle_price, 12.7);
assert.throws(
  () => normalizePriceRows([{ id: 'jewelry_gold', sell_price: -1, recycle_price: 918 }]),
  /positive|invalid/i,
);
assert.throws(() => normalizePriceRows(DEFAULT_PRICES.slice(0, 4)), /complete|five|missing/i);
assert.deepEqual(formatPublicPrices(DEFAULT_PRICES)[0], {
  id: 'jewelry_gold', label: '首饰金', sell_price: '1107.00',
  recycle_price: '918.00', unit: '元/克',
});
const snapshot = appendPriceSnapshot([], DEFAULT_PRICES, {
  username: 'XBZJ001', timestamp: '2026-09-22T00:00:00.000Z',
});
assert.equal(snapshot.length, 1);
assert.equal(snapshot[0].prices.length, 5);
~~~

- [ ] **Step 2: 写认证和角色红灯测试**

创建 test/admin-auth.test.mjs：

~~~js
import assert from 'node:assert/strict';
import {
  hashPassword, verifyPassword, createSessionCookie, readSessionCookie,
  can, ensureBootstrapAdmin,
} from '../cloud-functions/api/_shared/auth.js';
import { createMemoryStore } from '../cloud-functions/api/_shared/store.js';

const store = createMemoryStore();
const hash = await hashPassword('change-me');
assert.equal(await verifyPassword('change-me', hash), true);
assert.equal(await verifyPassword('wrong', hash), false);
const cookie = await createSessionCookie(
  { userId: 'u1', role: 'manager' }, 'test-secret', 3600, 1700000000000,
);
assert.deepEqual(
  await readSessionCookie(cookie, 'test-secret', 1700000000000),
  { userId: 'u1', role: 'manager' },
);
assert.equal(can('manager', 'prices:write'), true);
assert.equal(can('manager', 'users:write'), false);
assert.equal(can('clerk', 'password:self'), true);
const admin = await ensureBootstrapAdmin(store, { username: 'XBZJ001', password: '123456' });
assert.equal(admin.username, 'XBZJ001');
assert.equal(admin.forcePasswordChange, true);
~~~

- [ ] **Step 3: 运行红灯测试**

运行：

~~~powershell
node test/fixed-price-service.test.mjs
node test/admin-auth.test.mjs
~~~

预期两个命令都因模块或导出尚不存在而失败；如果任一测试直接通过，先修正测试。

- [ ] **Step 4: 更新根测试脚本**

package.json 的 test 脚本改为依次运行 fixed-price-service、admin-auth、cloud-function-gold、admin-functions、yuexin-template-sync 五个测试。

- [ ] **Step 5: 提交测试红灯基线**

~~~powershell
git add test/fixed-price-service.test.mjs test/admin-auth.test.mjs package.json
git commit -m "test: define fixed price and admin auth behavior"
~~~

## Task 2: 实现共享存储、价格模型和认证核心

**Files:** cloud-functions/api/_shared/http.js、store.js、permissions.js、auth.js、cloud-functions/api/gold/defaults.js

- [ ] **Step 1: 实现存储适配器**

store.js 导出 createMemoryStore、getControlStore、readJson、writeJson。线上适配器必须使用：

~~~js
import { getStore } from '@edgeone/pages-blob';
const STORE_NAME = 'zhonghui-gold-control';
export function getControlStore() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
~~~

读操作使用 type=json 和 consistency=strong；内存存储实现同样支持 get/setJSON，使测试不访问云端。

- [ ] **Step 2: 实现权限矩阵和 HTTP 工具**

permissions.js 导出 ROLES、ROLE_LABELS、CAPABILITIES 和 can(role, capability)。管理员拥有全部能力，店长拥有 prices:read、prices:write、password:self、audit:read，店员只有 prices:read 和 password:self。http.js 导出 json、parseJson、getCookie、setSessionCookie、clearSessionCookie。

- [ ] **Step 3: 实现 PBKDF2 和 HMAC 会话**

auth.js 使用 Web Crypto：随机 16 字节盐，PBKDF2-SHA-256 120000 次迭代，输出 32 字节；存储格式为 pbkdf2$120000$盐$摘要。会话内容使用 URL-safe Base64 JSON 加 HMAC-SHA-256 签名，包含 userId、role、passwordChangeOnly、exp。导出 hashPassword、verifyPassword、createSessionCookie、readSessionCookie、getSessionUser、requireCapability、ensureBootstrapAdmin、appendAudit。线上 AUTH_SECRET 缺失时登录返回配置错误，不使用固定后备密钥。

- [ ] **Step 4: 实现五行默认值和校验**

defaults.js 导出 DEFAULT_PRICES、PRICE_IDS、normalizePriceRows、formatPublicPrices、appendPriceSnapshot。五个 ID 必须恰好各出现一次；价格必须是有限正数、不超过 999999.99 且最多两位小数；输出按 PRICE_IDS 固定排序。

- [ ] **Step 5: 运行绿灯测试并提交**

~~~powershell
node test/fixed-price-service.test.mjs
node test/admin-auth.test.mjs
git add cloud-functions/api/_shared cloud-functions/api/gold/defaults.js test/fixed-price-service.test.mjs test/admin-auth.test.mjs
git commit -m "feat: add fixed price storage and role auth core"
~~~

预期两个测试退出码为 0，且输出不包含密码或密钥。

## Task 3: 改造公开金价 Functions

**Files:** cloud-functions/api/gold/_service.js、current.js、history.js、test/cloud-function-gold.test.mjs

- [ ] **Step 1: 将旧外部请求测试改为固定配置红灯测试**

删除 getRealTimePrices?sid=1003 断言，改为断言 getCurrentPrices(store) 返回五行默认值，savePrices(store, rows, actor) 产生历史快照，存储读取失败返回 503。

- [ ] **Step 2: 实现固定价格服务**

_service.js 导出 readCurrentPrices、saveCurrentPrices、readPriceHistory、toPublicPricePayload。首次读取写入 DEFAULT_PRICES；保存前调用 normalizePriceRows，保存后向 gold/history.json 追加快照并限制最多 1000 条。

- [ ] **Step 3: 实现公开接口契约**

current.js 返回：

~~~json
{
  "code": 1,
  "data": {
    "prices": [{"id":"jewelry_gold","label":"首饰金","sell_price":"1107.00","recycle_price":"918.00","unit":"元/克"}],
    "update_time": "..."
  }
}
~~~

history.js 返回 { code: 1, data: [{ timestamp, prices, updated_by }] }。代码中不得再访问 goldcard.yunxua.com。

- [ ] **Step 4: 运行和提交**

~~~powershell
node test/cloud-function-gold.test.mjs
git add cloud-functions/api/gold test/cloud-function-gold.test.mjs
git commit -m "feat: serve fixed five-line gold prices"
~~~

预期输出 Fixed gold service contract passed 并退出码为 0。

## Task 4: 实现管理员 Functions 和接口权限测试

**Files:** cloud-functions/api/admin/*.js、test/admin-functions.test.mjs

- [ ] **Step 1: 写接口红灯契约**

测试各文件导出正确的 onRequestGet/onRequestPost/onRequestPatch/onRequestDelete；manager 对价格写入通过、对用户写入拒绝；clerk 对价格写入拒绝；删除最后管理员的纯函数操作拒绝。

- [ ] **Step 2: 实现登录、登出、当前用户和改密**

登录流程为解析 JSON → ensureBootstrapAdmin → 查询活动账号 → 校验密码 → 写登录审计 → 设置 8 小时 HttpOnly Cookie。forcePasswordChange 为真时会话只允许访问改密接口。新密码至少 8 位且含字母和数字；成功后清除标记并使旧会话失效。

- [ ] **Step 3: 实现价格管理接口**

prices.js GET 要求 prices:read，POST 要求 prices:write；POST 只接受 { prices: [...] }，调用 saveCurrentPrices、写价格审计并返回完整公开结构。异常输入返回 400，存储失败返回 503。

- [ ] **Step 4: 实现账号和日志接口**

users.js GET/POST 只允许管理员；用户名为 3-32 个字母、数字、下划线或短横线，角色只能是 manager 或 clerk，临时密码标记首次改密。[id].js 处理 PATCH/DELETE/reset-password，只允许管理员并禁止删除最后管理员。audit.js 允许管理员读全部记录，店长只读 price.update。

- [ ] **Step 5: 运行和提交**

~~~powershell
node test/admin-functions.test.mjs
git add cloud-functions/api/admin test/admin-functions.test.mjs
git commit -m "feat: add role-based admin functions"
~~~

预期输出 Admin function contract passed 并退出码为 0。

## Task 5: 重做公开页为参考站五行价格牌

**Files:** 中汇黄金/public/index.html、css/style.css、js/app.js、test/yuexin-template-sync.test.mjs

- [ ] **Step 1: 写公开页红灯契约**

测试 HTML 含 gold-price-board、gold-price-table、五个 data-price-id（jewelry_gold、non_member_bar、member_bar、platinum、silver），公开页不含 /admin 链接；CSS 含暖棕变量、白色圆角卡片和移动断点；app.js 含 /api/gold/current 且不含 goldcard.yunxua.com。

- [ ] **Step 2: 替换公开 HTML**

保留现有 Logo 和二维码资源，使用 main.gold-board、header.brand-mark 和 table.gold-price-table。表头为品类/今日价格/回收价格，五个 tr 只含固定 ID 和空数值 span，由 JavaScript 填充；底部有更新时间和风险提示。

- [ ] **Step 3: 实现公开页渲染**

app.js 只负责请求 /api/gold/current、按 data.prices 的 ID 更新行、格式化错误时显示 -- 和错误状态、每 60 秒刷新及更新 #updated-at。不再初始化 ECharts、不再请求外部源、不再依赖旧双卡片元素。

- [ ] **Step 4: 实现样式**

style.css 实现暖棕背景、白色圆角面板、居中悬浮 Logo、红色今日价、深色回收价、细分隔线和二维码区域。桌面表格最大宽度 900px；max-width 640px 时缩小字号/间距/Logo，保证五行一屏可读；prefers-reduced-motion 下不启用动画。

- [ ] **Step 5: 运行和提交**

~~~powershell
node test/yuexin-template-sync.test.mjs
Get-ChildItem '中汇黄金/test/*.test.js' | ForEach-Object { node $_.FullName }
git add '中汇黄金/public/index.html' '中汇黄金/public/css/style.css' '中汇黄金/public/js/app.js' test/yuexin-template-sync.test.mjs '中汇黄金/test'
git commit -m "feat: redesign public page as fixed price board"
~~~

旧测试若只断言被删除的走势图视觉结构，则改为本任务的 gold-price-board 契约；不得删除订单、登记、LAN 或健康检查行为测试。

## Task 6: 实现 /admin 登录和后台界面

**Files:** 中汇黄金/public/admin/index.html、admin.css、admin.js、test/yuexin-template-sync.test.mjs

- [ ] **Step 1: 写后台红灯契约**

测试后台静态文件含 admin-login、admin-app、price-editor、user-manager、audit-log、force-password-change，并调用 /api/admin/login。

- [ ] **Step 2: 实现登录和首次改密**

首次只显示登录卡片；forcePasswordChange 为真时只显示改密表单；成功后读取 /api/admin/me 并进入后台；401 回到登录页，403 显示权限提示。

- [ ] **Step 3: 实现价格编辑**

管理员/店长看到五行输入表，店员看到只读表。保存调用 POST /api/admin/prices，显示服务端校验错误或成功时间。inputmode=decimal 只做体验校验，最终以后端校验为准。

- [ ] **Step 4: 实现用户和日志面板**

仅管理员显示创建、角色、启用/停用、重置密码、删除；管理员和店长按权限看到日志，店长只看价格变更；危险操作显示明确确认文案并在成功后重载表格。

- [ ] **Step 5: 实现后台视觉并提交**

使用深色墨色、金色边框和红色价格强调；桌面双栏、手机单栏；错误/成功/禁用状态同时用文字和颜色表达。

~~~powershell
node test/yuexin-template-sync.test.mjs
git add '中汇黄金/public/admin' test/yuexin-template-sync.test.mjs
git commit -m "feat: add role-aware admin dashboard"
~~~

## Task 7: 文档、全量验证和 EdgeOne 部署

**Files:** 中汇黄金/README.md、package.json

- [ ] **Step 1: 更新部署文档**

README 增加公开地址、后台地址 /admin、角色权限、首次改密规则以及 EdgeOne 变量：AUTH_SECRET、INITIAL_ADMIN_USERNAME=XBZJ001、INITIAL_ADMIN_PASSWORD=123456。明确这些值只能在 EdgeOne 环境变量中配置，不提交 .env，不写入前端。

- [ ] **Step 2: 全量本地验证**

~~~powershell
npm test
Get-ChildItem '中汇黄金/test/*.test.js' | ForEach-Object { node $_.FullName }
~~~

预期所有命令退出码为 0，无未处理异常、外部金价请求或敏感密码输出。

- [ ] **Step 3: 本地启动冒烟测试**

使用临时端口 3310 和主机 127.0.0.1 启动中汇黄金，另开终端验证 /、/api/health、/admin/ 均返回 200；停止临时进程后确认没有修改中汇黄金/data 中已有用户数据。

- [ ] **Step 4: 设置 EdgeOne 环境变量**

在 zhonghui-gold-overseas 生产环境设置随机 AUTH_SECRET，以及 INITIAL_ADMIN_USERNAME=XBZJ001、INITIAL_ADMIN_PASSWORD=123456；不把 AUTH_SECRET 回显到聊天或日志。

- [ ] **Step 5: 推送部署**

~~~powershell
git push origin main
~~~

在 EdgeOne Makers 确认构建命令为 npm test、输出目录为 中汇黄金/public，构建通过后记录部署 ID。

- [ ] **Step 6: 线上验收**

验证根页 200 且五行初始值正确；管理员首次登录强制改密；管理员创建店长/店员；店长能改价但不能管理账号；店员不能改价只能改自己的密码；改价后公开页立即变化；日志包含登录、改密、创建账号和改价；HTTP 跳 HTTPS 且无未处理浏览器错误。

- [ ] **Step 7: 最终复核**

~~~powershell
git status --short --branch
git log -8 --oneline --decorate
~~~

确认没有 .env、密码或密钥进入 Git，再提交 README 和最终测试调整。

## 验收标准

- 公开页具备暖棕背景、白色圆角面板、悬浮 Logo、五行三列价格表、更新时间和风险提示。
- 五行初始值准确，后台可修改并立即公开。
- 权限由服务端强制执行，不依赖前端隐藏按钮。
- 初始管理员首次登录必须改密，密码和密钥不进入代码或日志。
- 价格、账号、历史和审计使用强一致 Pages Blob。
- 全量测试、线上接口和三个角色实际操作均通过。
