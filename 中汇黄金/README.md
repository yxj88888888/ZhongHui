# 粤鑫金固定贵金属价格牌

公开页是参考水贝贵金属价格牌制作的五行固定价格展示页，后台地址为 /admin/。公开价格不再请求外部金价源，五行数据由后台人工维护。

## 公开页和后台

- 公开页：https://sxyxerp.online/
- 管理后台：https://sxyxerp.online/admin/
- 初始管理员：XBZJ001
- 初始密码：123456

管理员首次登录后必须修改初始密码。初始密码只用于首次 Bootstrap，不写入前端或 Git。

初始五行价格为：

| 品类 | 今日价格 | 回收价格 |
| --- | ---: | ---: |
| 首饰金 | 1107 | 918 |
| 非会员金条 | 1042 | 918 |
| 会员金条 | 976 | 918 |
| 铂金 | 441 | 357 |
| 白银 | 19.8 | 12.7 |

## 角色权限

- 管理员：改价格、改自己密码、创建/删除账号、设置身份、停用账号、重置密码、查看全部日志。
- 店长：改五行价格、改自己密码、查看价格日志。
- 店员：查看价格、改自己密码。

创建的店长和店员首次登录同样必须修改临时密码。

## EdgeOne 环境变量

在 EdgeOne Makers 项目的生产环境变量中设置以下值，不能提交 .env：

~~~text
AUTH_SECRET=<随机长字符串>
INITIAL_ADMIN_USERNAME=XBZJ001
INITIAL_ADMIN_PASSWORD=123456
~~~

AUTH_SECRET 用于签发 HttpOnly 登录 Cookie。不要在聊天、日志、截图或前端代码中暴露它。

## 本地启动

~~~bash
npm install
npm start
~~~

默认监听 0.0.0.0:3001，同一局域网设备可通过电脑 IP 访问：

~~~text
http://192.168.1.168:3001/
http://192.168.1.168:3001/admin/
~~~

如需指定端口或主机：

~~~bash
PORT=3310 HOST=127.0.0.1 npm start
~~~

本地服务同样使用固定五行价格，不依赖过期的外部证书或金价接口。

本地 Express 主要用于公开页和旧登记/订单接口的页面冒烟；完整的账号、权限和价格后台接口由 EdgeOne Functions 提供，部署到线上后使用 /admin/ 完整验证。

## 测试

仓库根目录运行 EdgeOne Functions 和模板契约：

~~~bash
npm test
~~~

运行中汇黄金本地测试：

~~~bash
node test/asset-versioning.test.js
node test/cloud-deployment.test.js
node test/display-aspect-ratio.test.js
node test/fixed-local-price-service.test.js
node test/fixed-price-board.test.js
node test/header-qr.test.js
node test/header-single-row.test.js
node test/lan-listen.test.js
node test/mobile-health-page.test.js
node test/portable-deployment.test.js
node test/visible-copy.test.js
~~~

## 数据说明

本地运行时会在 data/ 下生成订单、登记和每日行情数据。该目录中的本机运行数据默认不提交到仓库，避免上传客户信息或历史运行记录。线上价格、账号、历史和审计数据存储在 EdgeOne Pages Blob。
