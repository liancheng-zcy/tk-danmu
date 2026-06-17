# 第三方声明与致谢

本项目基于多个开源项目、插件与官方文档完成实现。在此向相关作者与团队表示感谢。

## 1. TikTok-Live-Connector

- 项目：`zerodytrash/TikTok-Live-Connector`
- 主页：<https://github.com/zerodytrash/TikTok-Live-Connector>
- 许可证：MIT
- 用途：连接 TikTok LIVE 并接收聊天、礼物等事件

说明：

- 本仓库当前保留了原有 `tiktok_connector/` 目录作为上游依赖来源
- `worker` 运行时通过该依赖完成直播事件接入

## 2. Tauri

- 项目：`tauri-apps/tauri`
- 主页：<https://github.com/tauri-apps/tauri>
- 官网：<https://tauri.app/>
- 许可证：MIT / Apache-2.0
- 用途：桌面应用壳、窗口管理、打包、sidecar 生命周期管理

本项目还使用了 Tauri 官方插件：

- `@tauri-apps/plugin-shell`
- `@tauri-apps/plugin-store`
- `tauri-plugin-opener`

## 3. React

- 项目：`facebook/react`
- 主页：<https://github.com/facebook/react>
- 许可证：MIT
- 用途：前端界面渲染

## 4. Vite

- 项目：`vitejs/vite`
- 主页：<https://github.com/vitejs/vite>
- 许可证：MIT
- 用途：前端开发服务器与构建工具

## 5. 翻译服务官方文档

本项目的翻译适配实现参考了相关官方文档与接口说明，包括但不限于：

- 阿里云机器翻译 / DashScope 文档
- Microsoft Translator Text API 文档
- SiliconFlow 官方文档
- 智谱 BigModel 官方文档

这些服务的 API 规范、额度政策、限流策略、免费策略和服务条款都可能变化，使用者应以各服务商官方文档为准。

## 6. 版权与责任说明

- 本文件仅用于声明项目中引用或依赖的第三方成果与资料来源
- 各第三方项目、商标、接口和文档的版权均归其原作者或权利人所有
- 本项目不声称拥有上述第三方内容的版权
