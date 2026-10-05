/**
 * UI 工具层：DOM 查询、提示条、时间格式化、历史列表渲染。
 *
 * 与 app.js 的分工：
 *   ui.js  只负责「把数据变成界面」，不关心数据从哪里来；
 *   app.js 负责「业务编排」——事件绑定、调用 API、状态管理。
 */
(function (global) {
  'use strict';

  /** 简写 querySelector */
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  /** 简写 querySelectorAll，返回真正的数组便于使用 forEach/map */
  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /** 安全写文本，避免 XSS */
  function setText(element, text) {
    if (element) {
      element.textContent = text === null || text === undefined ? '' : String(text);
    }
  }

  /** 切换元素的可见性 */
  function toggle(element, visible) {
    if (!element) {
      return;
    }
    element.classList.toggle('is-hidden', !visible);
  }

  /* ---------------- 提示条 ---------------- */

  var toastTimer = null;

  /**
   * 显示一条浮动提示。
   * @param {string} message
   * @param {'info'|'success'|'error'} [type]
   * @param {number} [duration]
   */
  function showToast(message, type, duration) {
    var toast = $('#toast');
    if (!toast) {
      return;
    }
    setText(toast, message);
    toast.setAttribute('data-type', type || 'info');
    toast.classList.add('is-visible');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, duration || 3200);
  }

  /* ---------------- 时间格式化 ---------------- */

  /**
   * 把后端的 ISO 时间字符串转成「2026-10-05 19:42:07」这样的展示格式。
   * 后端返回的是带时区偏移的 ISO 字符串，浏览器会自动转成本地时区。
   */
  function formatTime(isoString) {
    if (!isoString) {
      return '';
    }
    var date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString;
    }
    function pad(value) {
      return value < 10 ? '0' + value : String(value);
    }
    return (
      date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds())
    );
  }

  /**
   * 相对时间，例如「3 分钟前」，用于历史列表的辅助信息。
   */
  function formatRelative(isoString) {
    if (!isoString) {
      return '';
    }
    var then = new Date(isoString).getTime();
    if (isNaN(then)) {
      return '';
    }
    var seconds = Math.floor((Date.now() - then) / 1000);
    if (seconds < 60) {
      return '刚刚';
    }
    if (seconds < 3600) {
      return Math.floor(seconds / 60) + ' 分钟前';
    }
    if (seconds < 86400) {
      return Math.floor(seconds / 3600) + ' 小时前';
    }
    return Math.floor(seconds / 86400) + ' 天前';
  }

  /* ---------------- 图标 ---------------- */

  var ICONS = {
    copy:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/>' +
      '<path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    star:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'
  };

  /**
   * 构建单条历史记录的 DOM 节点。
   *
   * 使用 DOM API 而不是拼 innerHTML 字符串，理由有两点：
   *   1. 用户输入的表达式会原样出现在界面上，拼接字符串会有 XSS 风险；
   *   2. DOM 构建便于精确绑定每个按钮的事件。
   *
   * @param {object} record 后端返回的历史记录
   * @param {{onDelete:Function, onToggleFavorite:Function, onReuse:Function}} handlers
   * @returns {HTMLLIElement}
   */
  function createHistoryItem(record, handlers) {
    var item = document.createElement('li');
    item.className = 'history-item';
    if (record.is_extended) {
      item.classList.add('is-extended');
    }
    if (record.is_favorite) {
      item.classList.add('is-favorite');
    }

    // --- 主体：表达式 / 结果 / 元信息 ---
    var main = document.createElement('div');
    main.className = 'history-item__main';
    main.title = '点击可把该表达式填回输入框';

    var expression = document.createElement('div');
    expression.className = 'history-item__expression';
    expression.textContent = record.expression;

    var result = document.createElement('div');
    result.className = 'history-item__result';
    result.textContent = '= ' + record.result;

    var meta = document.createElement('div');
    meta.className = 'history-item__meta';

    var time = document.createElement('span');
    time.textContent = formatTime(record.created_at);
    time.title = formatRelative(record.created_at);
    meta.appendChild(time);

    var relative = document.createElement('span');
    relative.textContent = '· ' + formatRelative(record.created_at);
    meta.appendChild(relative);

    if (record.is_extended) {
      var tag = document.createElement('span');
      tag.className = 'history-item__tag';
      tag.textContent = '扩展功能';
      meta.appendChild(tag);
    }

    main.appendChild(expression);
    main.appendChild(result);
    main.appendChild(meta);

    main.addEventListener('click', function () {
      handlers.onReuse(record);
    });

    // --- 操作按钮：收藏 / 复制 / 删除 ---
    var actions = document.createElement('div');
    actions.className = 'history-item__actions';

    var favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'mini-button mini-button--star';
    if (record.is_favorite) {
      favoriteButton.classList.add('is-active');
    }
    favoriteButton.title = record.is_favorite ? '取消收藏' : '收藏该记录';
    favoriteButton.innerHTML = ICONS.star;
    favoriteButton.addEventListener('click', function (event) {
      event.stopPropagation();
      handlers.onToggleFavorite(record);
    });

    var copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'mini-button';
    copyButton.title = '复制表达式';
    copyButton.innerHTML = ICONS.copy;
    copyButton.addEventListener('click', function (event) {
      event.stopPropagation();
      handlers.onCopy(record);
    });

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'mini-button mini-button--danger';
    deleteButton.title = '删除该记录';
    deleteButton.innerHTML = ICONS.trash;
    deleteButton.addEventListener('click', function (event) {
      event.stopPropagation();
      handlers.onDelete(record);
    });

    actions.appendChild(favoriteButton);
    actions.appendChild(copyButton);
    actions.appendChild(deleteButton);

    item.appendChild(main);
    item.appendChild(actions);
    return item;
  }

  /**
   * 渲染历史列表。
   * @param {Array} records
   * @param {object} handlers
   */
  function renderHistoryList(records, handlers) {
    var list = $('#historyList');
    if (!list) {
      return;
    }
    list.textContent = '';
    records.forEach(function (record) {
      list.appendChild(createHistoryItem(record, handlers));
    });
  }

  global.CalculatorUI = {
    $: $,
    $$: $$,
    setText: setText,
    toggle: toggle,
    showToast: showToast,
    formatTime: formatTime,
    formatRelative: formatRelative,
    renderHistoryList: renderHistoryList,
    createHistoryItem: createHistoryItem
  };
})(window);
