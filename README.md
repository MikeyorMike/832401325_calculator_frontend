# Calculator Frontend —— 前后端分离计算器系统（前端）

> 本项目实现计算器系统的**前端界面**，负责用户交互与结果展示，**不参与任何算术运算**。

---

## 目录

- [1. 项目简介](#1-项目简介)
- [2. 技术栈](#2-技术栈)
- [3. 运行环境](#3-运行环境)
- [4. 安装与启动](#4-安装与启动)
- [5. 配置说明](#5-配置说明)
- [6. 前后端连接方式](#6-前后端连接方式)
- [7. 功能说明](#7-功能说明)
- [8. 项目结构](#8-项目结构)
- [9. 界面设计说明](#9-界面设计说明)
- [10. 部署](#10-部署)
- [11. 常见问题](#11-常见问题)

---

## 1. 项目简介

本项目是「前后端分离计算器系统」的**前端部分**，形态为 **Web 网页应用**。

**核心设计原则**：前端只做两件事——**把表达式发出去**、**把结果显示出来**。

```
用户在界面输入表达式
        ↓
前端把表达式字符串 POST 给后端      ← 前端到此为止，不做任何计算
        ↓
后端校验、解析、计算、存入数据库、返回结果
        ↓
前端把后端返回的 result 渲染到屏幕   ← 前端只负责展示
```

**验证方法**：把后端服务停掉，前端界面仍可正常点击、输入、切换主题，
但**无法得到任何一个新的有效计算结果**，只会提示「无法连接后端服务」。
这正好证明了核心计算确实在后端。

---

## 2. 技术栈

| 层次 | 选型 | 选择理由 |
| --- | --- | --- |
| 标记语言 | HTML5 | 语义化标签（`header`/`main`/`section`/`output`） |
| 样式 | 原生 CSS3 | CSS 变量实现主题切换，Grid/Flex 布局，**无需构建工具** |
| 脚本 | 原生 JavaScript (ES5+) | 零依赖、零构建，助教克隆即可运行，降低环境门槛 |
| 网络请求 | Fetch API + AbortController | 浏览器原生，支持请求超时控制 |
| 本地存储 | localStorage | 仅用于记住主题偏好，**不存储任何计算历史** |

> **为什么不用 Vue / React？**
> 作业原文明确说明「技术复杂度本身只占一定分数」，
> 且实现目标是「达成功能并理解前后端分离」。
> 原生方案的优势是：**零构建、零依赖安装**，
> 助教 clone 后只需一个静态服务器就能跑起来，不会因 npm 环境问题卡住验收。
> 同时，手写 DOM 操作与事件绑定更能体现对前后端通信过程的理解。

---

## 3. 运行环境

| 项目 | 要求 |
| --- | --- |
| 浏览器 | Chrome 90+ / Edge 90+ / Firefox 88+ / Safari 14+ |
| 静态服务器 | 任意（Python 自带、VS Code Live Server、Nginx 等） |
| Node.js | **不需要** |
| 构建工具 | **不需要** |

> ⚠️ **不要直接双击 `index.html` 打开**。
> `file://` 协议下浏览器会限制跨域请求，导致无法连接后端。
> 必须通过 HTTP 服务器访问（见第 4 节）。

---

## 4. 安装与启动

### 4.1 前置条件

后端已启动（默认 `http://127.0.0.1:8000`）。
如果还没启动，请先看后端仓库的 README。

### 4.2 方式一：Python 自带静态服务器（推荐）

```bash
# 进入前端源码目录
cd 832401325_calculator_frontend/src

# 启动静态服务器，端口 5500
python -m http.server 5500
```

浏览器打开 <http://127.0.0.1:5500>

> macOS / Linux 用户若 `python` 不可用，改用 `python3 -m http.server 5500`。

### 4.3 方式二：VS Code Live Server 插件

1. VS Code 安装 **Live Server** 插件
2. 右键 `src/index.html` → **Open with Live Server**
3. 浏览器会自动打开，通常是 <http://127.0.0.1:5500>

### 4.4 方式三：Node.js（如已安装）

```bash
cd 832401325_calculator_frontend/src
npx serve -l 5500
```

### 4.5 启动成功的标志

页面顶部状态徽标显示绿点 **「后端已连接 · v1.0.0」**。

若显示「后端未连接」红点，请检查：
1. 后端是否已启动（浏览器访问 <http://127.0.0.1:8000/api/health>）
2. `src/js/config.js` 里的 `apiBaseUrl` 是否正确
3. 浏览器 F12 控制台是否有 CORS 报错

---

## 5. 配置说明

所有可配置项集中在 **`src/js/config.js`** 一个文件里：

```javascript
window.CALCULATOR_CONFIG = {
  apiBaseUrl: 'http://127.0.0.1:8000',  // 后端 API 根地址（不要以 / 结尾）
  requestTimeoutMs: 15000,              // 请求超时（毫秒）
  historyPageSize: 10,                  // 历史记录每页条数
  searchDebounceMs: 320,                // 搜索防抖延迟
  verboseLog: true                      // 是否在控制台打印请求日志
};
```

### 各环境推荐配置

| 环境 | `apiBaseUrl` | `requestTimeoutMs` |
| --- | --- | --- |
| 本地开发 | `http://127.0.0.1:8000` | `15000` |
| 线上部署（Render 免费实例） | `https://你的服务名.onrender.com` | **`60000`** |

> **线上要把超时放宽到 60 秒**：Render 免费实例休眠后冷启动需要 30~50 秒，
> 15 秒超时会误报「请求超时」。

### 也可以不改源码来覆盖配置

在 `index.html` 中，`config.js` 之前插入：

```html
<script>
  window.CALCULATOR_CONFIG = { apiBaseUrl: 'https://your-backend.onrender.com' };
</script>
```

`config.js` 会保留已存在的值，不会被覆盖。

---

## 6. 前后端连接方式

### 6.1 请求一览

| 前端操作 | HTTP 请求 | 说明 |
| --- | --- | --- |
| 点击「=」 | `POST /api/calculate` | 发送表达式，接收结果 |
| 页面加载 / 计算后 | `GET /api/history` | 拉取历史列表 |
| 输入搜索关键字 | `GET /api/history?keyword=xxx` | 关键字搜索 |
| 勾选「仅收藏」 | `GET /api/history?favorites_only=true` | 收藏筛选 |
| 点击翻页 | `GET /api/history?page=2` | 分页 |
| 点击删除图标 | `DELETE /api/history/{id}` | 删除单条记录 |
| 点击清空图标 | `DELETE /api/history` | 清空全部 |
| 点击星标 | `PATCH /api/history/{id}/favorite` | 切换收藏 |
| 点击科学函数键 | `POST /api/extended` | 科学计算 |
| 点击「进制」转换 | `POST /api/extended` | 进制转换 |
| 点击「单位」换算 | `POST /api/extended` | 单位换算 |
| 页面加载 | `GET /api/health` | 检测后端是否在线 |
| 页面加载 | `GET /api/extended/capabilities` | 获取可选函数与单位 |

### 6.2 代码层面的分层

前端 JS 分为四层，职责清晰：

```
config.js   配置常量
    ↓
api.js      网络层：封装 fetch、超时、错误归一化（ApiError）
    ↓
ui.js       渲染层：DOM 查询、提示条、历史列表渲染
    ↓
app.js      控制层：事件绑定、状态管理、业务编排
```

**好处**：`app.js` 里看不到 `fetch`，`api.js` 里看不到 DOM 操作。
要改接口地址只改 `config.js`，要改界面样式只改 `ui.js`。

### 6.3 错误处理

`api.js` 把所有失败统一转成 `ApiError`，携带 `message` / `code` / `status`：

| `code` | 界面表现 |
| --- | --- |
| `NETWORK_ERROR` | 「无法连接后端服务…请确认后端已启动」 |
| `TIMEOUT` | 「请求超时，请检查后端服务是否已启动」 |
| `DIVISION_BY_ZERO` | 结果区红字显示「除数不能为零」 |
| `INVALID_EXPRESSION` | 结果区红字显示具体语法错误位置 |
| `RECORD_NOT_FOUND` | 提示「删除失败：历史记录不存在」 |

---

## 7. 功能说明

### 7.1 基础功能（对应作业功能一 ~ 功能四）

| 功能 | 界面位置 | 说明 |
| --- | --- | --- |
| 基础四则运算 | 标准键盘 | `+` `−` `×` `÷`，结果由后端返回 |
| 复合表达式 | 表达式输入框 | 支持优先级、括号、小数、一元正负号 |
| 计算历史 | 右侧面板 | 从后端数据库读取，刷新页面不丢失 |
| 删除历史 | 历史条目垃圾桶图标 | 调后端 API 真实删除 |
| 错误提示 | 结果区 + 浮动提示条 | 展示后端返回的错误信息 |

### 7.2 扩展功能（加分项）

| 扩展功能 | 入口 | 说明 |
| --- | --- | --- |
| 科学计算 | 「科学」标签 | 平方根、平方、立方、幂、倒数、绝对值、阶乘、log、ln、log₂、eˣ、sin、cos、tan、取整，共 17 个函数 |
| 进制转换 | 「进制」标签 | 2 / 8 / 10 / 16 进制互转 |
| 单位换算 | 「单位」标签 | 长度、质量、面积、温度四类共 21 个单位 |
| 历史搜索 | 历史面板搜索框 | 按表达式或结果关键字搜索，带 320ms 防抖 |
| 历史分页 | 历史面板底部 | 每页 10 条，可翻页 |
| 收藏记录 | 历史条目星标图标 | 收藏后可勾选「仅收藏」筛选 |
| 计算统计 | 历史面板统计卡片 | 总记录数、今日计算数、收藏数 |
| 键盘快捷键 | 全局 | 数字键、`+ - * /`、`Enter` 计算、`Esc` 清空、`Backspace` 退格 |
| 主题切换 | 右上角太阳图标 | 深色 / 浅色切换，用 localStorage 记住偏好 |
| 一键复用 | 点击历史条目 | 把历史表达式填回输入框继续编辑 |
| 复制表达式 | 历史条目复制图标 | 复制到剪贴板 |
| 后端状态指示 | 顶部徽标 | 实时显示后端连接状态与版本号 |

> **所有扩展功能的运算同样在后端完成**，前端只传参数、只显示结果。
> 例如点击 `√x` 实际发出的是：
> ```json
> { "type": "scientific", "function": "sqrt", "operands": ["144"] }
> ```

---

## 8. 项目结构

```
832401325_calculator_frontend/
├── src/
│   ├── index.html              # 页面结构（语义化标签 + BEM 类名）
│   ├── css/
│   │   └── style.css           # 全部样式：CSS 变量主题 + Grid/Flex 布局
│   └── js/
│       ├── config.js           # 配置：后端地址、超时、分页大小
│       ├── api.js              # 网络层：fetch 封装、超时、ApiError
│       ├── ui.js               # 渲染层：DOM 工具、提示条、历史列表渲染
│       └── app.js              # 控制层：事件绑定、状态管理、业务编排
├── netlify.toml                # Netlify 部署配置
├── codestyle.md                # 代码规范文档
└── README.md                   # 本文件
```

**分层依赖**：`index.html → app.js → ui.js / api.js → config.js`（单向）

---

## 9. 界面设计说明

### 9.1 布局

```
┌─────────────────────────────────────────────────────────┐
│  标题 + 副标题          后端状态徽标   主题切换按钮        │
├──────────────────────────┬──────────────────────────────┤
│  模式标签                │  计算历史          [刷新][清空] │
│  [标准][科学][进制][单位] │  ┌────────────────────────┐  │
│                          │  │ 搜索框      仅收藏 □   │  │
│  ┌────────────────────┐  │  ├────────────────────────┤  │
│  │ 表达式输入框        │  │  │ 总数  今日  收藏        │  │
│  │ = 结果大字          │  │  ├────────────────────────┤  │
│  └────────────────────┘  │  │ 1+2   = 3   [★][⧉][🗑] │  │
│                          │  │ (1+2)*3 = 9 [★][⧉][🗑] │  │
│  ┌──┬──┬──┬──┐           │  │ ...                    │  │
│  │C │⌫ │()│÷ │           │  └────────────────────────┘  │
│  │7 │8 │9 │× │           │  [上一页] 第1/3页 [下一页]    │
│  │4 │5 │6 │− │           │                              │
│  │1 │2 │3 │+ │           │                              │
│  │± │0 │. │= │           │                              │
│  └──┴──┴──┴──┘           │                              │
└──────────────────────────┴──────────────────────────────┘
```

### 9.2 设计要点

| 要点 | 实现方式 | 目的 |
| --- | --- | --- |
| 主题切换 | CSS 变量 + `data-theme` 属性 | 切换只需改一个 attribute，无闪烁 |
| 响应式 | 媒体查询 `max-width: 980px` 单列 | 手机上也能正常使用 |
| 计算中状态 | 按钮 disabled + 显示「计算中…」 | 防止重复提交 |
| 双通道错误提示 | 结果区红字（详细）+ 顶部浮动条（醒目） | 用户不会错过错误 |
| 历史条目分类色 | 左侧 3px 色条：扩展=绿、收藏=黄 | 一眼区分记录类型 |
| 无障碍 | 语义化标签、`aria-label`、`aria-live`、`:focus-visible` | 键盘可完全操作 |
| 动效克制 | 仅 120~220ms 过渡，尊重 `prefers-reduced-motion` | 不炫技、不干扰 |

### 9.3 安全考虑

历史列表**不使用 `innerHTML` 拼接**用户输入，而是用 DOM API
（`createElement` + `textContent`）构建。因为用户输入的表达式会原样显示在界面上，
拼字符串会有 XSS 风险：

```javascript
// 本项目采用：安全
expression.textContent = record.expression;

// 危险写法（未采用）：表达式里的 <script> 会被执行
list.innerHTML += '<div>' + record.expression + '</div>';
```

---

## 10. 部署

推荐 **Netlify**（免费、无需信用卡、支持直接连 GitHub 自动部署）。

### 10.1 部署步骤

1. 修改 `src/js/config.js` 的 `apiBaseUrl` 为线上后端地址，**提交并推送**
2. 访问 <https://app.netlify.com>，用 GitHub 账号登录
3. **Add new site** → **Import an existing project** → 选择 GitHub 仓库
4. 填写：Base directory = `src`，Build command 留空，Publish directory = `src`
5. 点击 **Deploy site**，约 30 秒后得到公网地址

> 仓库中已包含 `netlify.toml`，Netlify 会自动读取上述配置。

### 10.2 部署后必做

回到后端 Render 服务，把 `CORS_ALLOW_ORIGINS` 改成 Netlify 的域名：

```
CORS_ALLOW_ORIGINS=https://你的站点名.netlify.app
```

### 10.3 其他部署方式

| 平台 | 说明 |
| --- | --- |
| Vercel | 同样免费，`vercel --prod` 或连 GitHub |
| GitHub Pages | 免费，但需在仓库 Settings → Pages 中开启 |
| 自己的服务器 | 把 `src/` 目录内容拷到 Nginx 的网站根目录即可 |

---

## 11. 常见问题

**Q1：页面能打开，但一直提示「后端未连接」**
→ 按顺序检查：
1. 后端是否启动？浏览器直接访问 <http://127.0.0.1:8000/api/health>
2. `config.js` 的 `apiBaseUrl` 是否正确（注意不要有多余的结尾 `/`）
3. 后端 `CORS_ALLOW_ORIGINS` 是否放行了前端地址
4. F12 → Console 是否有红色 CORS 错误

**Q2：直接双击 index.html 打不开功能**
→ 这是正常的。`file://` 协议下浏览器禁止跨域请求。
请用 `python -m http.server 5500` 启动本地服务器访问。

**Q3：点击「=」提示「请求超时」**
→ 线上部署时最常见。Render 免费实例冷启动需要 30~50 秒。
把 `config.js` 的 `requestTimeoutMs` 改成 `60000`。

**Q4：历史记录刷新后消失了**
→ 说明后端数据库文件被重置（云端临时磁盘）或后端换了实例。
本地开发时检查 `DATABASE_PATH` 是否指向同一个文件。
若在 Render 上，免费实例重新部署会清空数据，这是平台限制。

**Q5：键盘输入数字没反应**
→ 需要先点击表达式输入框使其获得焦点。
在历史搜索框里输入时不会触发计算，这是有意设计。

**Q6：科学计算里 sin(30) 为什么是 0.5？**
→ 本项目三角函数使用**角度制**而非弧度制，更符合计算器使用习惯。
界面上按钮提示为「sin（角度）」。

**Q7：想换配色**
→ 修改 `src/css/style.css` 顶部的 CSS 变量即可，
深色主题在 `[data-theme="dark"]`，浅色在 `[data-theme="light"]`。

---

## 附：代码规范

本项目的代码规范见 [codestyle.md](./codestyle.md)，主要参考：

- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [MDN Web Docs – JavaScript](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)

---

## 附：相关链接

| 内容 | 地址 |
| --- | --- |
| 后端仓库 | `<待填写>` |
| 后端代码规范 | `<待填写>` |
| 前端代码规范 | [codestyle.md](./codestyle.md) |
| 作业博客 | `<待填写>` |
