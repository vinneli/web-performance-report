# web-performance-report
前端性能上报，包括页面性能、错误上报、资源上报

### 用法：
```js
import WebPerformance from 'web-performance-report'

// 使用 GET 上报到指定地址
WebPerformance({
  url: 'http://sample.com/report',   // 上报的地址
  disabled: false,
  reportError: true,
  reportResource: true
})

// 自定义方法上报
WebPerformance({}, (data) => {
  fetch('http://xxx-report.com/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
})

```
