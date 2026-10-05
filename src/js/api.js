/**
 * API 客户端：封装所有与后端的 HTTP 通信。
 *
 * 为什么单独抽出一层：
 *   页面逻辑不应该关心 fetch、超时、错误结构等细节，
 *   集中在这里后，界面代码只调用语义化的方法（calculate / listHistory）。
 *
 * 统一错误处理：
 *   后端所有失败响应结构都是 { success:false, code, message }，
 *   这里把它转成 ApiError，携带 code 与 HTTP 状态码，交给界面层决定怎么提示。
 */
(function (global) {
  'use strict';

  var config = global.CALCULATOR_CONFIG;

  /**
   * 业务错误对象。
   * @param {string} message 面向用户的错误信息
   * @param {string} code    后端返回的错误码
   * @param {number} status  HTTP 状态码
   */
  function ApiError(message, code, status) {
    this.name = 'ApiError';
    this.message = message;
    this.code = code || 'UNKNOWN';
    this.status = status || 0;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  /**
   * 统一的请求封装：负责超时、JSON 解析、错误归一化。
   * @param {string} path    形如 /api/calculate
   * @param {object} options fetch 选项
   * @returns {Promise<object>}
   */
  function request(path, options) {
    var settings = options || {};
    var url = config.apiBaseUrl + path;
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, config.requestTimeoutMs);

    var init = {
      method: settings.method || 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    };

    if (settings.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(settings.body);
    }

    if (config.verboseLog) {
      console.log('[API] ' + init.method + ' ' + url, settings.body || '');
    }

    return fetch(url, init)
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            // 后端返回了非 JSON（例如 502 网关错误页）
            throw new ApiError(
              '服务器返回了无法解析的响应（HTTP ' + response.status + '）',
              'BAD_RESPONSE',
              response.status
            );
          })
          .then(function (data) {
            if (config.verboseLog) {
              console.log('[API] <- ' + response.status, data);
            }
            if (!response.ok) {
              throw new ApiError(
                data && data.message ? data.message : '请求失败',
                data && data.code ? data.code : 'HTTP_' + response.status,
                response.status
              );
            }
            return data;
          });
      })
      .catch(function (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error && error.name === 'AbortError') {
          throw new ApiError('请求超时，请检查后端服务是否已启动', 'TIMEOUT', 0);
        }
        // 网络层错误：后端未启动、跨域被拦截等情况都会走到这里
        throw new ApiError(
          '无法连接后端服务（' + config.apiBaseUrl + '），请确认后端已启动且允许跨域',
          'NETWORK_ERROR',
          0
        );
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  var api = {
    ApiError: ApiError,

    /** 健康检查：用于界面顶部的后端状态指示 */
    health: function () {
      return request('/api/health');
    },

    /**
     * 计算表达式（功能一、功能二）。
     * 注意：前端只发送表达式，结果完全由后端产生。
     * @param {string} expression
     * @param {boolean} [isExtended]
     */
    calculate: function (expression, isExtended) {
      return request('/api/calculate', {
        method: 'POST',
        body: {
          expression: expression,
          is_extended: Boolean(isExtended)
        }
      });
    },

    /**
     * 分页查询历史（功能三）。
     * @param {{page?:number,pageSize?:number,keyword?:string,favoritesOnly?:boolean}} params
     */
    listHistory: function (params) {
      var options = params || {};
      var query = [
        'page=' + encodeURIComponent(options.page || 1),
        'page_size=' + encodeURIComponent(options.pageSize || config.historyPageSize)
      ];
      if (options.keyword) {
        query.push('keyword=' + encodeURIComponent(options.keyword));
      }
      if (options.favoritesOnly) {
        query.push('favorites_only=true');
      }
      return request('/api/history?' + query.join('&'));
    },

    /** 删除指定历史记录（功能四） */
    deleteHistory: function (id) {
      return request('/api/history/' + encodeURIComponent(id), {
        method: 'DELETE'
      });
    },

    /** 清空全部历史 */
    clearHistory: function () {
      return request('/api/history', { method: 'DELETE' });
    },

    /** 切换收藏状态 */
    toggleFavorite: function (id) {
      return request('/api/history/' + encodeURIComponent(id) + '/favorite', {
        method: 'PATCH'
      });
    },

    /** 统计信息 */
    statistics: function () {
      return request('/api/statistics');
    },

    /** 扩展功能能力清单（科学函数、进制、单位） */
    capabilities: function () {
      return request('/api/extended/capabilities');
    },

    /**
     * 扩展功能计算（科学计算 / 进制转换 / 单位换算）。
     * @param {object} payload 形如 { type:'scientific', function:'sqrt', operands:['16'] }
     */
    extended: function (payload) {
      return request('/api/extended', { method: 'POST', body: payload });
    }
  };

  global.CalculatorApi = api;
})(window);
