/**
 * 应用主逻辑：事件绑定与业务编排。
 *
 * 核心原则（作业硬性要求）：
 *   本文件不实现任何算术运算。
 *   按「=」时只把表达式字符串 POST 给后端，界面展示的是后端返回的 result。
 *   即使把后端停掉，前端也只是提示错误，无法自行算出一个有效结果。
 */
(function (global) {
  'use strict';

  var config = global.CALCULATOR_CONFIG;
  var api = global.CalculatorApi;
  var ui = global.CalculatorUI;
  var $ = ui.$;
  var $$ = ui.$$;

  /* ============================================================
     应用状态
     ============================================================ */

  var state = {
    mode: 'standard',        // standard | scientific | base | unit
    page: 1,
    totalPages: 1,
    pageSize: config.historyPageSize,
    keyword: '',
    favoritesOnly: false,
    busy: false,             // 是否有请求正在进行，避免重复提交
    lastResult: null,        // 上一次成功计算的结果，供连续运算使用
    lastOperand: null,       // xʸ 的底数暂存
    pendingPower: false,     // 幂运算是否已收集第一个操作数
    capabilities: null       // 后端返回的扩展功能清单
  };

  /* ============================================================
     显示屏
     ============================================================ */

  function getExpression() {
    return ($('#expressionInput').value || '').trim();
  }

  function setExpression(value) {
    $('#expressionInput').value = value;
    $('#expressionInput').focus();
  }

  /** 在表达式末尾追加文本 */
  function appendToExpression(text) {
    setExpression($('#expressionInput').value + text);
  }

  /** 展示结果（成功） */
  function showResult(text) {
    var output = $('#resultOutput');
    output.classList.remove('is-error');
    ui.setText(output, text);
  }

  /** 展示错误信息 */
  function showError(message) {
    var output = $('#resultOutput');
    output.classList.add('is-error');
    ui.setText(output, message);
  }

  function clearError() {
    $('#resultOutput').classList.remove('is-error');
  }

  /**
   * 切换最后一个数字的正负号。
   * 用正则定位末尾的数字串，在其前面插入或去掉负号。
   */
  function negateLastNumber() {
    var expression = $('#expressionInput').value;
    var match = expression.match(/(\d*\.?\d+)$/);
    if (!match) {
      appendToExpression('-');
      return;
    }
    var start = expression.length - match[1].length;
    var before = expression.slice(0, start);
    if (before.endsWith('-')) {
      // 已经是负数 -> 去掉负号
      var trimmed = before.slice(0, -1);
      // 如果负号是被当作运算符用的（前面还有数字），要保留运算符
      if (/(\d|\))$/.test(trimmed)) {
        setExpression(expression);
        return;
      }
      setExpression(trimmed + match[1]);
    } else {
      setExpression(before + '-' + match[1]);
    }
  }

  /* ============================================================
     功能一 / 功能二：调用后端计算
     ============================================================ */

  /**
   * 执行计算：把表达式发给后端，展示后端返回的结果，然后刷新历史。
   * @param {boolean} [isExtended] 是否来自扩展功能
   */
  function calculate(isExtended) {
    var expression = getExpression();
    if (!expression) {
      ui.showToast('请先输入表达式', 'error');
      return Promise.resolve();
    }
    if (state.busy) {
      return Promise.resolve();
    }

    state.busy = true;
    var button = document.querySelector('[data-action="calculate"]');
    if (button) {
      button.disabled = true;
    }
    clearError();
    ui.setText($('#resultOutput'), '计算中…');

    return api
      .calculate(expression, isExtended)
      .then(function (data) {
        showResult(data.result);
        state.lastResult = data.result;
        state.pendingPower = false;
        return refreshHistory();
      })
      .catch(function (error) {
        showError(error.message);
        ui.showToast(error.message, 'error', 4200);
      })
      .finally(function () {
        state.busy = false;
        if (button) {
          button.disabled = false;
        }
      });
  }

  /* ============================================================
     扩展功能：科学计算 / 进制转换 / 单位换算
     ============================================================ */

  /**
   * 科学计算。
   * 一元函数直接取当前输入值；二元函数（如 xʸ）需要收集两个操作数。
   */
  function runScientific(functionName, arity) {
    var current = getExpression();

    if (arity === 2 && !state.pendingPower) {
      // 幂运算第一步：先记住底数
      if (!current) {
        ui.showToast('请先输入底数', 'error');
        return;
      }
      state.pendingPower = true;
      ui.showToast('已记录底数 ' + current + '，请输入指数后再次点击 xʸ', 'info');
      setExpression('');
      return;
    }

    var operands;
    if (arity === 2) {
      // 幂运算第二步：底数来自暂存的 state.lastOperand，指数来自输入框
      if (!current) {
        ui.showToast('请输入指数', 'error');
        return;
      }
      operands = [state.lastOperand === null ? '0' : String(state.lastOperand), current];
    } else {
      // 一元函数：优先用输入框，其次复用上一次结果
      var value = current || (state.lastResult !== null ? String(state.lastResult) : '');
      if (!value) {
        ui.showToast('请先输入一个数值', 'error');
        return;
      }
      operands = [value];
    }

    // 收集完成，清空幂运算的中间状态
    state.pendingPower = false;
    state.lastOperand = null;

    submitExtended({
      type: 'scientific',
      function: functionName,
      operands: operands
    });
  }

  function runBaseConversion() {
    var value = ($('#baseValue').value || '').trim();
    if (!value) {
      ui.showToast('请输入要转换的数值', 'error');
      return;
    }
    submitExtended({
      type: 'base',
      value: value,
      from_base: parseInt($('#baseFrom').value, 10),
      to_base: parseInt($('#baseTo').value, 10)
    });
  }

  function runUnitConversion() {
    var value = ($('#unitValue').value || '').trim();
    if (!value) {
      ui.showToast('请输入要换算的数值', 'error');
      return;
    }
    submitExtended({
      type: 'unit',
      category: $('#unitCategory').value,
      value: value,
      from_unit: $('#unitFrom').value,
      to_unit: $('#unitTo').value
    });
  }

  /** 统一提交扩展功能请求 */
  function submitExtended(payload) {
    if (state.busy) {
      return;
    }
    state.busy = true;
    clearError();
    ui.setText($('#resultOutput'), '计算中…');

    api
      .extended(payload)
      .then(function (data) {
        showResult(data.result);
        state.lastResult = data.result;
        state.pendingPower = false;
        ui.showToast(data.display, 'success', 3600);
        return refreshHistory();
      })
      .catch(function (error) {
        showError(error.message);
        ui.showToast(error.message, 'error', 4200);
      })
      .finally(function () {
        state.busy = false;
      });
  }

  /* ============================================================
     功能三 / 功能四：历史记录
     ============================================================ */

  /** 拉取并渲染历史列表与统计信息 */
  function refreshHistory() {
    return api
      .listHistory({
        page: state.page,
        pageSize: state.pageSize,
        keyword: state.keyword,
        favoritesOnly: state.favoritesOnly
      })
      .then(function (data) {
        ui.setText($('#historyTotal'), data.total);

        var hasRecords = data.items.length > 0;
        ui.toggle($('#historyEmpty'), !hasRecords);
        ui.renderHistoryList(data.items, historyHandlers);

        state.totalPages = Math.max(data.total_pages, 1);
        updatePagination();
      })
      .catch(function (error) {
        ui.showToast('加载历史失败：' + error.message, 'error', 4200);
      });
  }

  function updatePagination() {
    var pagination = $('#pagination');
    ui.toggle(pagination, state.totalPages > 1);
    ui.setText($('#pageInfo'), '第 ' + state.page + ' / ' + state.totalPages + ' 页');
    $('#prevPage').disabled = state.page <= 1;
    $('#nextPage').disabled = state.page >= state.totalPages;
  }

  /** 加载统计数据（扩展功能：计算统计） */
  function refreshStatistics() {
    return api
      .statistics()
      .then(function (data) {
        ui.setText($('#statTotal'), data.total);
        ui.setText($('#statToday'), data.today);
        ui.setText($('#statFavorites'), data.favorites);
      })
      .catch(function () {
        // 统计只是辅助信息，失败时不影响主流程，静默处理
      });
  }

  var historyHandlers = {
    /** 删除单条记录（功能四）：走后端 API，成功后重新查询 */
    onDelete: function (record) {
      if (!global.confirm('确定删除这条历史记录吗？\n' + record.expression + ' = ' + record.result)) {
        return;
      }
      api
        .deleteHistory(record.id)
        .then(function () {
          ui.showToast('已删除该记录', 'success');
          // 删除后按后端最新状态重新查询，而不是本地移除节点
          return Promise.all([refreshHistory(), refreshStatistics()]);
        })
        .catch(function (error) {
          ui.showToast('删除失败：' + error.message, 'error', 4200);
        });
    },

    /** 切换收藏 */
    onToggleFavorite: function (record) {
      api
        .toggleFavorite(record.id)
        .then(function () {
          return Promise.all([refreshHistory(), refreshStatistics()]);
        })
        .catch(function (error) {
          ui.showToast('操作失败：' + error.message, 'error', 4200);
        });
    },

    /** 复制表达式到剪贴板 */
    onCopy: function (record) {
      copyText(record.expression);
    },

    /** 点击记录把表达式填回输入框，便于继续编辑 */
    onReuse: function (record) {
      setExpression(record.expression);
      ui.setText($('#resultOutput'), record.result);
      ui.showToast('已填入表达式：' + record.expression, 'info', 2200);
    }
  };

  /** 复制文本，优先用 Clipboard API，失败时退回 execCommand */
  function copyText(text) {
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard
        .writeText(text)
        .then(function () {
          ui.showToast('已复制：' + text, 'success', 2000);
        })
        .catch(function () {
          ui.showToast('复制失败，请手动选择文本', 'error');
        });
      return;
    }
    var input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      ui.showToast('已复制：' + text, 'success', 2000);
    } catch (error) {
      ui.showToast('复制失败，请手动选择文本', 'error');
    }
    document.body.removeChild(input);
  }

  /* ============================================================
     模式切换
     ============================================================ */

  function setMode(mode) {
    state.mode = mode;
    state.pendingPower = false;

    $$('.mode-tab').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.mode === mode);
    });

    ui.toggle($('#keypadStandard'), mode === 'standard' || mode === 'scientific');
    ui.toggle($('#keypadScientific'), mode === 'scientific');
    ui.toggle($('#panelBase'), mode === 'base');
    ui.toggle($('#panelUnit'), mode === 'unit');

    if (mode === 'base' || mode === 'unit') {
      // 工具面板模式下，把主输入框的值预填到面板里，减少重复输入
      var current = getExpression();
      if (current && /^[\d.]+$/.test(current)) {
        if (mode === 'base') {
          $('#baseValue').value = current;
        } else {
          $('#unitValue').value = current;
        }
      }
    }
  }

  /* ============================================================
     后端状态与能力清单
     ============================================================ */

  function checkBackend() {
    var badge = $('#backendStatus');
    return api
      .health()
      .then(function (data) {
        badge.setAttribute('data-state', 'online');
        ui.setText(
          badge.querySelector('.status-badge__text'),
          '后端已连接 · v' + data.version
        );
        return true;
      })
      .catch(function () {
        badge.setAttribute('data-state', 'offline');
        ui.setText(badge.querySelector('.status-badge__text'), '后端未连接');
        ui.showToast(
          '无法连接后端服务：' + config.apiBaseUrl + '\n请确认后端已启动（python run.py）',
          'error',
          6000
        );
        return false;
      });
  }

  /** 拉取扩展功能能力清单，填充单位下拉框 */
  function loadCapabilities() {
    return api
      .capabilities()
      .then(function (data) {
        state.capabilities = data;
        populateUnitSelects($('#unitCategory').value);
      })
      .catch(function () {
        // 能力清单拿不到时用内置默认值兜底，不影响基础功能
        populateUnitSelects($('#unitCategory').value);
      });
  }

  /** 按类别填充源/目标单位下拉框 */
  function populateUnitSelects(categoryName) {
    var fromSelect = $('#unitFrom');
    var toSelect = $('#unitTo');
    var fallback = {
      length: [
        ['mm', '毫米'], ['cm', '厘米'], ['m', '米'],
        ['km', '千米'], ['inch', '英寸'], ['foot', '英尺'], ['mile', '英里']
      ],
      mass: [
        ['mg', '毫克'], ['g', '克'], ['kg', '千克'],
        ['ton', '吨'], ['pound', '磅'], ['ounce', '盎司']
      ],
      area: [
        ['cm2', '平方厘米'], ['m2', '平方米'], ['km2', '平方千米'],
        ['hectare', '公顷'], ['mu', '亩']
      ],
      temperature: [['c', '摄氏度'], ['f', '华氏度'], ['k', '开尔文']]
    };

    var units = fallback[categoryName] || fallback.length;
    if (state.capabilities) {
      var category = state.capabilities.unit_categories.filter(function (item) {
        return item.name === categoryName;
      })[0];
      if (category) {
        units = category.units.map(function (unit) {
          return [unit.name, unit.label];
        });
      }
    }

    [fromSelect, toSelect].forEach(function (select, index) {
      select.textContent = '';
      units.forEach(function (pair, unitIndex) {
        var option = document.createElement('option');
        option.value = pair[0];
        option.textContent = pair[1];
        // 默认：源单位取第一个，目标单位取第二个，方便直接点「换算」演示
        if (index === 0 && unitIndex === 0) {
          option.selected = true;
        }
        if (index === 1 && unitIndex === Math.min(1, units.length - 1)) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });
  }

  /* ============================================================
     键盘支持（扩展功能）
     ============================================================ */

  function bindKeyboard() {
    document.addEventListener('keydown', function (event) {
      var target = event.target;
      var isTypingField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA');

      // 在搜索框里输入时不拦截按键
      if (isTypingField && target.id !== 'expressionInput') {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (state.mode === 'base') {
          runBaseConversion();
        } else if (state.mode === 'unit') {
          runUnitConversion();
        } else {
          calculate();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setExpression('');
        showResult('0');
        return;
      }

      if (event.key === 'Backspace' && target.id === 'expressionInput') {
        // 交给输入框默认行为处理
        return;
      }

      // 只有在表达式输入框聚焦时才插入字符
      if (target.id !== 'expressionInput') {
        return;
      }

      // 把键盘上的 * 和 / 正常插入即可，后端两种写法都支持
      if (event.key === '(' || event.key === ')') {
        return;
      }
    });
  }

  /* ============================================================
     事件绑定
     ============================================================ */

  function bindEvents() {
    // ---- 数字与运算符键 ----
    $$('.key[data-value]').forEach(function (key) {
      key.addEventListener('click', function () {
        appendToExpression(key.dataset.value);
      });
    });

    // ---- 功能键 ----
    $$('.key[data-action]').forEach(function (key) {
      key.addEventListener('click', function () {
        var action = key.dataset.action;
        if (action === 'clear') {
          setExpression('');
          showResult('0');
          clearError();
        } else if (action === 'backspace') {
          setExpression($('#expressionInput').value.slice(0, -1));
        } else if (action === 'paren') {
          // 智能括号：左括号比右括号多时补右括号，否则补左括号
          var value = $('#expressionInput').value;
          var left = (value.match(/\(/g) || []).length;
          var right = (value.match(/\)/g) || []).length;
          appendToExpression(left > right ? ')' : '(');
        } else if (action === 'negate') {
          negateLastNumber();
        } else if (action === 'calculate') {
          calculate();
        }
      });
    });

    // ---- 科学函数键 ----
    $$('.key[data-sci]').forEach(function (key) {
      key.addEventListener('click', function () {
        var arity = parseInt(key.dataset.arity, 10) || 1;
        if (arity === 2 && !state.pendingPower) {
          // xʸ 第一次点击：把当前输入记为底数，等用户输入指数
          var current = getExpression();
          if (!current) {
            ui.showToast('请先输入底数', 'error');
            return;
          }
          state.lastOperand = current;
        }
        runScientific(key.dataset.sci, arity);
      });
    });

    // ---- 模式切换 ----
    $$('.mode-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        setMode(tab.dataset.mode);
      });
    });

    // ---- 工具面板按钮 ----
    $('[data-action="convert-base"]').addEventListener('click', runBaseConversion);
    $('[data-action="convert-unit"]').addEventListener('click', runUnitConversion);
    $('#unitCategory').addEventListener('change', function (event) {
      populateUnitSelects(event.target.value);
    });

    // ---- 历史工具条 ----
    var searchTimer = null;
    $('#historySearch').addEventListener('input', function (event) {
      clearTimeout(searchTimer);
      var value = event.target.value.trim();
      searchTimer = setTimeout(function () {
        state.keyword = value;
        state.page = 1;
        refreshHistory();
      }, config.searchDebounceMs);
    });

    $('#favoritesOnly').addEventListener('change', function (event) {
      state.favoritesOnly = event.target.checked;
      state.page = 1;
      refreshHistory();
    });

    $('#refreshHistory').addEventListener('click', function () {
      refreshHistory();
      refreshStatistics();
      ui.showToast('已刷新', 'success', 1600);
    });

    $('#clearHistory').addEventListener('click', function () {
      if (!global.confirm('确定清空全部计算历史吗？此操作会删除数据库中的所有记录。')) {
        return;
      }
      api
        .clearHistory()
        .then(function (data) {
          ui.showToast(data.message, 'success');
          state.page = 1;
          return Promise.all([refreshHistory(), refreshStatistics()]);
        })
        .catch(function (error) {
          ui.showToast('清空失败：' + error.message, 'error', 4200);
        });
    });

    // ---- 分页 ----
    $('#prevPage').addEventListener('click', function () {
      if (state.page > 1) {
        state.page -= 1;
        refreshHistory();
      }
    });

    $('#nextPage').addEventListener('click', function () {
      if (state.page < state.totalPages) {
        state.page += 1;
        refreshHistory();
      }
    });

    // ---- 主题切换 ----
    var themeToggle = $('#themeToggle');
    var savedTheme = null;
    try {
      savedTheme = global.localStorage.getItem('calculator-theme');
    } catch (error) {
      savedTheme = null;
    }
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    themeToggle.addEventListener('click', function () {
      var next =
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        global.localStorage.setItem('calculator-theme', next);
      } catch (error) {
        // 隐私模式下 localStorage 可能不可用，忽略即可
      }
    });

    // ---- 输入框回车即计算 ----
    $('#expressionInput').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        calculate();
      }
    });

    bindKeyboard();
  }

  /* ============================================================
     启动
     ============================================================ */

  function init() {
    // 页脚展示当前配置，方便部署后一眼确认连的是哪个后端
    ui.setText($('#apiBaseLabel'), config.apiBaseUrl);
    $('#docsLink').href = config.apiBaseUrl + '/docs';

    bindEvents();
    setMode('standard');

    // 先检测后端，再加载数据：后端不在线时给出明确提示而不是静默空白
    checkBackend().then(function (online) {
      loadCapabilities();
      if (online) {
        refreshHistory();
        refreshStatistics();
      } else {
        ui.setText($('#historyEmpty'), '');
        ui.toggle($('#historyEmpty'), true);
      }
    });

    // 输入框自动聚焦，便于直接敲键盘演示
    $('#expressionInput').focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
