# 代码规范（前端）

> 本文件是「前后端分离计算器系统」**前端项目**的代码规范说明。

## 规范来源

本规范来源于以下主流官方规范，并结合本项目（原生 HTML/CSS/JS，无构建工具）的实际情况做了取舍：

| 来源 | 链接 | 采用情况 |
| --- | --- | --- |
| **Google JavaScript Style Guide** | <https://google.github.io/styleguide/jsguide.html> | **主要依据**：命名、注释、字符串引号、分号策略 |
| **Google HTML/CSS Style Guide** | <https://google.github.io/styleguide/htmlcssguide.html> | 采纳：类名命名、属性顺序、类型选择器限制 |
| **Airbnb JavaScript Style Guide** | <https://github.com/airbnb/javascript> | 采纳：变量声明、比较运算符、数组遍历 |
| **MDN CSS 命名建议 / BEM** | <https://en.bem.info/methodology/naming-convention/> | 采纳 BEM 类名规范 |
| **WCAG 2.1 无障碍指南** | <https://www.w3.org/WAI/WCAG21/quickref/> | 采纳：语义化标签、ARIA 属性、键盘可达、对比度 |

本项目**不引入** ESLint / Prettier 作为强制门禁，原因：
作业环境可能无法联网安装 npm 依赖，且本项目为零构建的纯静态项目。
但代码本身遵守下表全部规则。

---

## 1. 通用规范

### 1.1 编码与换行

- 所有文件使用 **UTF-8**（无 BOM）
- 换行符统一 **LF**（通过 `.gitattributes` 强制）
- 缩进使用 **2 个空格**，禁止 Tab（HTML / CSS / JS 统一）
- 行尾**不留空格**
- 文件末尾保留 **1 个换行**

### 1.2 行长

| 文件类型 | 上限 |
| --- | --- |
| JavaScript | 100 字符 |
| CSS | 100 字符 |
| HTML | 不强制（但属性过多时每个属性一行） |

### 1.3 大小写

- 标签名、属性名、CSS 属性名一律**小写**
- 十六进制颜色值使用小写（`#7c8aff`，不用 `#7C8AFF`）

---

## 2. JavaScript 规范

### 2.1 命名

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 变量 / 函数 | 小驼峰 | `expressionInput`、`refreshHistory()` |
| 常量（模块级不变值） | 全大写 + 下划线 | `ICONS`、`DEFAULT_UNITS` |
| 构造函数 / 类 | 大驼峰 | `ApiError` |
| 私有函数 | 不加下划线前缀，靠 IIFE 作用域隔离 | `showResult()`、`copyText()` |
| 布尔变量 | `is` / `has` / `can` 前缀 | `isTypingField`、`hasRecords` |
| DOM 引用变量 | 加 `Element` / `Button` 或无后缀 | `deleteButton`、`themeToggle` |
| 事件处理函数 | `on` + 动作 | `onDelete`、`onToggleFavorite` |
| 状态对象 | 统一放 `state` 对象内 | `state.page`、`state.busy` |

**禁止**：单字符变量名（`i` 除外）、无意义缩写、拼音命名。

### 2.2 变量声明

- 一律使用 `var`（本项目需支持 ES5 环境）或 `const` / `let`
- 同一作用域内**不重复声明**同名变量
- 每个变量**单独一行**声明，禁止 `var a = 1, b = 2;`
- 变量声明后**立即赋值**，避免出现 `undefined` 中间态

```javascript
// 正确
var expression = getExpression();
var isBusy = state.busy;

// 错误：一次声明多个
var expression = getExpression(), isBusy = state.busy;
```

### 2.3 引号与分号

- 字符串统一使用**单引号** `'...'`（Google 风格）
- 字符串内含单引号时改用双引号
- **每条语句必须以分号结尾**（禁止依赖自动分号插入 ASI）

```javascript
// 正确
var message = '请求超时，请检查后端服务是否已启动';
var html = "it's ok";

// 错误：省略分号可能因 ASI 规则产生意外行为
var message = 'hello'
```

### 2.4 相等比较

- 一律使用 `===` / `!==`，**禁止** `==` / `!=`
- 判断 null/undefined 时可用 `value === null || value === undefined`
  或利用 `if (!value)` 的假值语义

```javascript
// 正确
if (record.is_favorite === true) { ... }
if (error.name === 'AbortError') { ... }

// 错误：隐式类型转换可能带来意外
if (status == 200) { ... }
```

### 2.5 函数

- 函数职责单一，超过 **40 行**应考虑拆分
- 嵌套层级不超过 **3 层**
- 优先**提前返回**，减少 `else` 嵌套

```javascript
// 正确：提前返回
function getExpression() {
  var input = $('#expressionInput');
  if (!input) {
    return '';
  }
  return (input.value || '').trim();
}

// 错误：深层嵌套
function getExpression() {
  var input = $('#expressionInput');
  if (input) {
    if (input.value) {
      return input.value.trim();
    } else {
      return '';
    }
  } else {
    return '';
  }
}
```

- 回调统一使用 `function () {}` 而非箭头函数（保持 ES5 一致性）

### 2.6 异步与错误处理

- 异步统一使用 **Promise 链**（`.then().catch().finally()`）
- **每个 Promise 链必须有 `.catch()`**，禁止未捕获的 rejection
- 请求超时必须用 `AbortController` 实现
- 错误对象统一为 `ApiError`，包含 `message` / `code` / `status`

```javascript
api.calculate(expression)
  .then(function (data) {
    showResult(data.result);
  })
  .catch(function (error) {
    showError(error.message);
  })
  .finally(function () {
    state.busy = false;
  });
```

### 2.7 DOM 操作安全（重要）

**禁止**用 `innerHTML` 拼接任何含用户输入的内容。

用户输入的表达式会原样显示在界面上，拼接字符串会产生 XSS 漏洞：

```javascript
// 正确：用 textContent，内容被当作纯文本
expression.textContent = record.expression;

// 严禁：表达式里的 <img src=x onerror=alert(1)> 会被执行
list.innerHTML += '<div>' + record.expression + '</div>';
```

`innerHTML` **仅允许**用于以下场景：内容是代码内定义的静态 SVG 图标字符串。

### 2.8 模块组织

- 每个文件用一个 **IIFE** 包裹，避免污染全局作用域：

```javascript
(function (global) {
  'use strict';
  // 模块内容
  global.CalculatorApi = api;
})(window);
```

- 模块通过 `global` 对象显式导出，导出接口集中在文件末尾
- 文件顶部写 `'use strict';`
- 模块之间的依赖顺序在 `index.html` 中体现，不允许循环依赖

### 2.9 注释

- 每个文件顶部写文件级注释，说明模块职责与设计理由
- 每个导出函数写 JSDoc 风格注释：

```javascript
/**
 * 分页查询历史。
 * @param {{page?:number,pageSize?:number,keyword?:string}} params
 * @returns {Promise<object>}
 */
listHistory: function (params) { ... }
```

- 注释解释**为什么**，不重复代码**做什么**
- 行内注释与代码之间至少 2 个空格

### 2.10 控制台输出

- 允许通过 `config.verboseLog` 开关控制 `console.log`
- **禁止**在提交的代码中保留 `debugger` 语句
- 生产环境不输出敏感信息（本项目无敏感数据）

---

## 3. HTML 规范

### 3.1 文档结构

- 必须声明 `<!DOCTYPE html>`
- `<html>` 必须带 `lang` 属性（本项目为 `zh-CN`）
- `<head>` 中必须有 `charset` 与 `viewport`：

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### 3.2 语义化

优先使用语义化标签，而不是一堆 `<div>`：

| 用途 | 使用标签 |
| --- | --- |
| 页面头部 | `<header>` |
| 主体内容 | `<main>` |
| 独立区块 | `<section>` |
| 页脚 | `<footer>` |
| 计算结果输出 | `<output>` |
| 表单标签 | `<label for="...">` |
| 列表 | `<ul>` / `<li>` |

### 3.3 属性书写

- 属性值**必须加双引号**
- 属性之间**不留多余空格**
- `class` 属性写在 `id` 之前
- 布尔属性不写值（`disabled` 而非 `disabled="true"`）
- 每个 `<button>` 必须显式写 `type`（`button` 或 `submit`），
  否则在表单内会默认为 `submit` 导致意外提交

```html
<!-- 正确 -->
<button class="key key--operator" data-value="/" type="button">÷</button>

<!-- 错误：缺少 type，缺少引号 -->
<button class=key data-value=/ >÷</button>
```

### 3.4 无障碍

- 纯图标按钮必须有 `title` 或 `aria-label`
- 装饰性元素加 `aria-hidden="true"`
- 动态区域加 `aria-live="polite"`
- 表单控件必须有对应的 `<label>`
- 图片（若有）必须有 `alt`

```html
<button class="icon-button" id="themeToggle" type="button" title="切换主题">
  <svg viewBox="0 0 24 24" aria-hidden="true">...</svg>
</button>

<div class="toast" id="toast" role="status" aria-live="polite"></div>
```

### 3.5 脚本与样式引入

- CSS 在 `<head>` 中引入（避免页面闪烁 FOUC）
- JS 在 `</body>` 前引入（不阻塞页面渲染）
- 通过 `defer` 或 `DOMContentLoaded` 保证 DOM 就绪后再执行

---

## 4. CSS 规范

### 4.1 类名：BEM 规范

采用 **BEM**（Block\_\_Element--Modifier）：

```
block                 独立组件        .keypad、.history-item
block__element        组件的子元素    .app-header__title、.history-item__result
block--modifier       组件的变体      .key--operator、.button--primary
is-state              状态类          .is-active、.is-hidden
```

| 类型 | 命名规则 | 示例 |
| --- | --- | --- |
| Block | 小写 + 连字符 | `.calculator`、`.panel` |
| Element | `块名__元素名` | `.history-item__expression` |
| Modifier | `块名--变体名` | `.icon-button--danger` |
| 状态 | `is-` 前缀 | `.is-hidden`、`.is-active`、`.is-error` |

**禁止**：
- 使用标签选择器做样式（`div { }`），例外：基础重置
- 使用 `!important`，唯一例外是 `.is-hidden { display: none !important; }`
- 行内样式 `style="..."`
- ID 选择器做样式（`#app { }`）

### 4.2 颜色与尺寸：CSS 变量

所有颜色、圆角、过渡时间必须定义为 **CSS 自定义属性**，
主题切换只改变量，不改变规则：

```css
:root {
  --radius-md: 12px;
  --transition-base: 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="dark"] {
  --panel-bg: rgba(23, 29, 49, 0.82);
  --text-primary: #eef2ff;
}

[data-theme="light"] {
  --panel-bg: rgba(255, 255, 255, 0.9);
  --text-primary: #101a33;
}
```

**禁止**在组件规则中硬编码颜色值，必须引用变量。

### 4.3 选择器

- 嵌套层级不超过 **3 层**
- 避免过于具体的选择器（如 `.app .panel .history ul li span`）
- 优先使用类选择器，权重保持低位

### 4.4 属性书写顺序

按以下顺序分组，组间空一行：

1. 定位（`position` / `top` / `z-index`）
2. 盒模型（`display` / `width` / `margin` / `padding`）
3. 排版（`font-*` / `color` / `text-*` / `line-height`）
4. 视觉（`background` / `border` / `border-radius` / `box-shadow`）
5. 动画（`transition` / `animation`）
6. 其他（`cursor` / `overflow`）

```css
.display__input {
  width: 100%;
  padding: 9px 0;

  font-family: var(--font-mono);
  font-size: 20px;
  color: var(--text-primary);

  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--input-border);
  outline: none;
}
```

### 4.5 响应式

- 移动优先或桌面优先均可，本项目采用**桌面优先 + 降级**
- 断点统一定义为 `980px`（布局改单列）与 `520px`（小屏微调）
- 媒体查询写在**相关规则附近**或文件末尾统一区块

### 4.6 动效

- 过渡时长控制在 **120ms ~ 220ms**
- 必须尊重用户的减弱动效偏好：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

### 4.7 浏览器兼容写法

需要加厂商前缀的属性（如 `backdrop-filter`）应同时写标准写法，
或依赖目标浏览器已支持。本项目目标为现代浏览器，不额外引入 autoprefixer。

---

## 5. 文件与目录组织

```
src/
├── index.html          页面结构
├── css/
│   └── style.css       全部样式（单文件，按区块用注释分隔）
└── js/
    ├── config.js       配置层：常量与可调参数
    ├── api.js          网络层：所有 HTTP 通信
    ├── ui.js           渲染层：DOM 操作与列表渲染
    └── app.js          控制层：事件绑定与业务编排
```

**依赖方向必须单向**：`app.js → ui.js / api.js → config.js`
禁止反向引用，禁止循环依赖。

**分层铁律**：
- `api.js` 中**不得出现 DOM 操作**
- `app.js` 中**不得出现 `fetch`**
- `ui.js` 中**不得发起网络请求**

---

## 6. Git 提交规范

提交信息使用 **Conventional Commits** 格式：

```
<类型>: <简述>
```

| 类型 | 用途 |
| --- | --- |
| `feat` | 新增功能 |
| `fix` | 修复缺陷 |
| `style` | 样式调整 |
| `refactor` | 重构（不改变行为） |
| `docs` | 文档变更 |
| `chore` | 构建、配置、依赖 |

示例：

```
feat: 实现计算历史的分页与关键字搜索
fix: 修复冷启动时请求超时被误报为网络错误
docs: 补充 README 中的部署说明
```

---

## 7. 自查清单

提交前逐项确认：

- [ ] 所有语句以分号结尾，字符串使用单引号
- [ ] 相等比较全部使用 `===` / `!==`
- [ ] 没有用 `innerHTML` 拼接用户输入
- [ ] 每个 Promise 链都有 `.catch()`
- [ ] 每个模块用 IIFE 包裹且带 `'use strict';`
- [ ] 每个 `<button>` 都有 `type` 属性
- [ ] 纯图标按钮都有 `title` 或 `aria-label`
- [ ] 类名符合 BEM 规范，无 `!important`（`.is-hidden` 除外）
- [ ] 颜色与尺寸都引用 CSS 变量，无硬编码颜色
- [ ] CSS 选择器嵌套不超过 3 层
- [ ] 没有遗留 `debugger` 语句
- [ ] `api.js` 里没有 DOM 操作，`app.js` 里没有 `fetch`
- [ ] 文件名全小写，目录结构符合约定
