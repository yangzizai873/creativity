# 界面自检

`harness.html` 用与本机 DSH Desktop 相同的 React 18.3.1 渲染真实业务面板，不启动宿主：

- `?w=420`：把业务容器固定为 420px，检查窄宽度重排；
- `?empty=1`：首次使用、没有创意时的入口；
- `?select=1`：自动选中第一条创意，检查详情；
- `?ai=1`：打开 AI 协助抽屉；
- `?metrics=1`：把关键元素宽度写进页面标题，便于查横向溢出。

浏览器渲染命令示例（Edge）：

```powershell
msedge --headless=new --disable-gpu --hide-scrollbars --window-size=1280,860 --virtual-time-budget=6000 --screenshot=shot.png "file:///<绝对路径>/harness.html?select=1&w=1220"
```

`vendor/` 里是与本机 Desktop 同版本的 React 18.3.1 UMD 构建（MIT），只用于本地渲染测试，不在 npm 包内（`files` 不包含 `test/`）。
