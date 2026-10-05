/**
 * 前端配置。
 *
 * apiBaseUrl 指向后端 API 的地址：
 *   本地开发  http://127.0.0.1:8000
 *   线上部署  https://eight32401325-calculator-backend.onrender.com
 *
 * 注意：index.html 中的内联配置会覆盖本文件，两处都要改。
 */
(function (global) {
  'use strict';

  var existing = global.CALCULATOR_CONFIG || {};

  global.CALCULATOR_CONFIG = {
    // 后端 API 根地址（不要以 / 结尾）
    apiBaseUrl: existing.apiBaseUrl || 'https://eight32401325-calculator-backend.onrender.com',

    // 单次请求超时时间（毫秒）
    //
    // 这里设为 60 秒而不是 15 秒，是为了适配 Render 免费实例的冷启动：
    // 免费实例 15 分钟无请求会休眠，下次请求需要 30~50 秒重新启动容器。
    // 若设为 15 秒，冷启动期间会误报「请求超时」，让助教以为项目坏了。
    requestTimeoutMs: existing.requestTimeoutMs || 60000,

    // 历史记录每页条数
    historyPageSize: existing.historyPageSize || 10,

    // 关键字搜索防抖延迟（毫秒）
    searchDebounceMs: existing.searchDebounceMs || 320,

    // 是否在控制台输出请求日志，便于演示前后端通信
    verboseLog: existing.verboseLog !== undefined ? existing.verboseLog : true
  };
})(window);
