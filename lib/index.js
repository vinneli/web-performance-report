'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * 使用方法：
    import WebPerformance from 'web-performance-report'
	WebPerformance({
	  url: 'http://sdfasdf.com',
	  disabled: false,
	  reportPage: true,
	  reportError: true,
	  reportResource: true
	}, (data)=>{
	  featch('http://xxx.com/report', {
	    type: 'POST',
	    headers: { 'Content-Type': 'application/json' },
	    body: JSON.stringify(data)
	  })
 */
// 默认通过Get参数发送数据，reportResource 可能会超过get参数的大小限制，含有 reportResource 建议用自定义回调发送


(function () {

  var MARK_USER_FLAG = 'web_performace_markuser';
  var Mark_USER = markUser();
  var ReportUrl = '';

  function WebPerformance() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var reportCallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};
    var _options$url = options.url,
        url = _options$url === undefined ? '' : _options$url,
        _options$disabled = options.disabled,
        disabled = _options$disabled === undefined ? false : _options$disabled,
        _options$reportPage = options.reportPage,
        reportPage = _options$reportPage === undefined ? true : _options$reportPage,
        _options$reportResour = options.reportResource,
        reportResource = _options$reportResour === undefined ? true : _options$reportResour,
        _options$reportError = options.reportError,
        reportError = _options$reportError === undefined ? false : _options$reportError;

    ReportUrl = url;

    if (disabled) return;

    if (reportError) {
      bindErrorListener();
    }

    window.onload = function (e) {
      var data = {};
      if (reportPage) {
        data.page = getPerformanceInfo();
      }
      if (reportResource) {
        data.resource = getResourceInfo();
      }
      reportCallback(data);
      if (ReportUrl) {
        reportData(data);
      }
    };
  }

  function getPerformanceInfo() {
    if (!window.performance) return null;

    var _performance$timing = performance.timing,
        domainLookupEnd = _performance$timing.domainLookupEnd,
        domainLookupStart = _performance$timing.domainLookupStart,
        connectEnd = _performance$timing.connectEnd,
        connectStart = _performance$timing.connectStart,
        responseStart = _performance$timing.responseStart,
        navigationStart = _performance$timing.navigationStart,
        domContentLoadedEventEnd = _performance$timing.domContentLoadedEventEnd,
        loadEventEnd = _performance$timing.loadEventEnd,
        fetchStart = _performance$timing.fetchStart,
        redirectEnd = _performance$timing.redirectEnd,
        redirectStart = _performance$timing.redirectStart,
        unloadEventEnd = _performance$timing.unloadEventEnd,
        unloadEventStart = _performance$timing.unloadEventStart,
        responseEnd = _performance$timing.responseEnd,
        requestStart = _performance$timing.requestStart,
        domComplete = _performance$timing.domComplete,
        domInteractive = _performance$timing.domInteractive,
        domLoading = _performance$timing.domLoading;


    return {
      // DNS解析时间
      dns: domainLookupEnd - domainLookupStart || 0,
      //TCP建立时间
      tcp: connectEnd - connectStart || 0,
      // 白屏时间  
      whiteScreen: responseStart - navigationStart || 0,
      //页面解析dom耗时
      dom: domComplete - domInteractive || 0,
      //dom渲染完成时间
      domReady: domContentLoadedEventEnd - navigationStart || 0,
      //页面onload时间
      load: loadEventEnd - navigationStart || 0,
      // 页面准备时间 
      ready: fetchStart - navigationStart || 0,
      // unload时间
      unload: unloadEventEnd - unloadEventStart || 0,
      //request请求耗时
      request: responseEnd - requestStart || 0
    };
  }

  // 统计页面资源
  function getResourceInfo() {
    if (!window.performance && !window.performance.getEntries) return null;
    var resources = performance.getEntriesByType('resource');

    if (!resources && !resources.length) return false;

    return resources.map(function (item) {
      return {
        name: item.name,
        type: item.initiatorType,
        duration: item.duration || 0,
        decodedBodySize: item.decodedBodySize || 0
      };
    });
  }

  // 绑定错误上报
  function bindErrorListener() {
    var baseInfo = {
      type: 'error',
      msg: '',
      info: {}
    };

    // img,script,css,jsonp
    window.addEventListener('error', function (e) {
      var info = Object.assign({}, baseInfo, {
        msg: '[resource] ' + e.target.localName + ' is load error',
        info: {
          target: e.target.localName,
          type: e.type,
          resourceUrl: e.target.href || e.target.currentSrc
        }
      });
      if (e.target !== window) reportData(info);
    }, true);

    // js
    window.onerror = function (msg, url, line, col, error) {
      setTimeout(function () {
        var info = Object.assign({}, baseInfo, {
          msg: '[js] ' + (error && error.stack ? error.stack.toString() : msg),
          info: {
            resourceUrl: url,
            line: line
          }
        });
        reportData(info);
      }, 0);
    };
    window.addEventListener('unhandledrejection', function (e) {
      var error = e && e.reason;
      var message = error.message || '';
      var stack = error.stack || '';
      var resourceUrl = void 0,
          col = void 0,
          line = void 0;
      var errs = stack.match(/\(.+?\)/);
      if (errs && errs.length) errs = errs[0];
      errs = errs.replace(/\w.+[js|html]/g, function ($1) {
        resourceUrl = $1;return '';
      });
      errs = errs.split(':');
      if (errs && errs.length > 1) line = parseInt(errs[1] || 0);
      col = parseInt(errs[2] || 0);

      var info = Object.assign({}, baseInfo, {
        msg: '[js] ' + message,
        info: {
          resourceUrl: resourceUrl,
          line: col,
          col: line
        }
      });
      reportData(info);
    });
  }

  // 生成随机数
  function randomString(len) {
    len = len || 10;
    var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz123456789';
    var maxPos = $chars.length;
    var pwd = '';
    for (var i = 0; i < len; i++) {
      pwd = pwd + $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
  }

  // 生成用户标识，区分哪些资源是同一个用户上报的
  function markUser() {
    var mark = sessionStorage.getItem(MARK_USER_FLAG) || '';
    if (!mark) {
      mark = randomString();
      sessionStorage.setItem(MARK_USER_FLAG, mark);
    }
    return mark;
  }

  // 上报数据
  function reportData(data) {
    if (!ReportUrl || !data) return;

    var reportData = Object.assign({}, data, {
      mark: Mark_USER,
      time: new Date().getTime()
    });
    var dataString = encodeURIComponent(JSON.stringify(reportData));
    var url = '' + ReportUrl + (ReportUrl.indexOf('?') > -1 ? '&' : '?') + 'data=' + dataString;

    var imgElement = new Image();
    imgElement.src = url;
    imgElement.onload = imgElement.onerror = function () {
      imgElement = null;
    };
  }

  if (typeof require === 'function' && (typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === "object" && (typeof module === 'undefined' ? 'undefined' : _typeof(module)) === "object") {
    module.exports = WebPerformance;
  } else {
    window.WebPerformance = WebPerformance;
  }
})();
