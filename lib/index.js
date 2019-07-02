/**
 * 使用方法：
    import WebPerformance from 'web-performance-report'

    // 使用 GET 上报到指定地址
	WebPerformance({
	  url: 'http://sdfasdf.com',   // 上报的地址
	  disabled: false,
	  reportError: true,
	  reportResource: true
	})

    // 自定义方法上报
    WebPerformance({}, (data) => {
      fetch('http://xxx.com/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    })
 */
// 默认通过Get参数发送数据，reportResource 可能会超过get参数的大小限制，含有 reportResource 建议用自定义回调发送


(function () {

  const MARK_USER_FLAG = 'web_performace_markuser';
  const Mark_USER = markUser();
  let ReportUrl, ReportCallback;

  function WebPerformance(options = {}, callback = () => {}) {
    const {
      url = '',
      disabled = false,
      reportResource = false,
      reportError = false
    } = options;
    ReportUrl = url;
    ReportCallback = callback;

    if (disabled) return;

    if (reportError) {
      bindErrorListener();
    }

    window.onload = e => {
      // 不延迟 performance.timing.loadEventEnd 会为0
      window.setTimeout(() => {
        const data = Object.assign({
          type: 'performance',
          url: window.location.href
        }, getPerformanceInfo());
        if (reportResource) {
          data.resources = getResourceInfo();
        }

        reportData(data);
      }, 200);
    };
  }

  function getPerformanceInfo() {
    if (!window.performance) return null;

    const {
      domainLookupEnd,
      domainLookupStart,
      connectEnd,
      connectStart,
      responseStart,
      navigationStart,
      domContentLoadedEventEnd,
      loadEventEnd,
      fetchStart,
      redirectEnd,
      redirectStart,
      loadEventStart,
      unloadEventEnd,
      unloadEventStart,
      responseEnd,
      requestStart,
      domComplete,
      domInteractive,
      domLoading
    } = performance.timing;

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
    let resources = performance.getEntriesByType('resource');

    if (!resources && !resources.length) return false;

    return resources.map(item => ({
      name: item.name,
      type: item.initiatorType,
      duration: item.duration || 0,
      decodedBodySize: item.decodedBodySize || 0
    }));
  }

  // 绑定错误上报
  function bindErrorListener() {
    const baseInfo = {
      type: 'error',
      url: window.location.href,
      msg: '',
      info: {}
    };

    // img,script,css,jsonp
    window.addEventListener('error', e => {
      const info = Object.assign({}, baseInfo, {
        msg: `[resource] ${e.target.localName} is load error`,
        info: {
          target: e.target.localName,
          type: e.type,
          resourceUrl: e.target.href || e.target.currentSrc
        }
      });
      if (e.target !== window) {
        reportData(info);
      }
    }, true);

    // js
    window.onerror = (msg, url, line, col, error) => {
      setTimeout(() => {
        const info = Object.assign({}, baseInfo, {
          msg: `[js] ${msg}`,
          info: {
            resourceUrl: url,
            line: line
          }
        });
        reportData(info);
      }, 0);
    };
    window.addEventListener('unhandledrejection', function (e) {
      const error = e && e.reason;
      const message = error.message || '';
      const stack = error.stack || '';
      let resourceUrl, col, line;
      let errs = stack.match(/\(.+?\)/);
      if (errs && errs.length) errs = errs[0];
      errs = errs.replace(/\w.+[js|html]/g, $1 => {
        resourceUrl = $1;return '';
      });
      errs = errs.split(':');
      if (errs && errs.length > 1) line = parseInt(errs[1] || 0);
      col = parseInt(errs[2] || 0);

      const info = Object.assign({}, baseInfo, {
        msg: `[js] ${message}`,
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
    for (let i = 0; i < len; i++) {
      pwd = pwd + $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
  }

  // 生成用户标识，区分哪些资源是同一个用户上报的
  function markUser() {
    let mark = sessionStorage.getItem(MARK_USER_FLAG) || '';
    if (!mark) {
      mark = randomString();
      sessionStorage.setItem(MARK_USER_FLAG, mark);
    }
    return mark;
  }

  // 上报数据
  function reportData(data) {
    ReportCallback(data);
    if (!ReportUrl || !data) return;

    const reportData = Object.assign({}, data, {
      mark: Mark_USER,
      time: new Date().getTime()
    });
    const dataString = encodeURIComponent(JSON.stringify(reportData));
    const url = `${ReportUrl}${ReportUrl.indexOf('?') > -1 ? '&' : '?'}data=${dataString}`;

    let imgElement = new Image();
    imgElement.src = url;
    imgElement.onload = imgElement.onerror = () => {
      imgElement = null;
    };
  }

  if (typeof require === 'function' && typeof exports === "object" && typeof module === "object") {
    module.exports = WebPerformance;
  } else {
    window.WebPerformance = WebPerformance;
  }
})();
