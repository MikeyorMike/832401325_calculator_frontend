/**
 * 前端配置。
 *
 * 部署后只需修改 apiBaseUrl 一处：
 *   本地开发  http://127.0.0.1:8000
 *   线上部署  https://<你的后端服务名>.onrender.com
 *
 * 也可以在 index.html 中用 window.CALCULATOR_CONFIG 覆盖，便于同一份代码
 * 部署到不同环境而不必改动源码。
 */
(function (global) {
  'use strict';

  var existing = global.CALCULATOR_CONFIG || {};

  global.CALCULATOR_CONFIG = {
    // 后端 API 根地址（不要以 / 结尾）
    apiBaseUrl: existing.apiBaseUrl || 'http://127.0.0.1:8000',

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
