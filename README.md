# TK 弹幕翻译

> ⚠️ 非官方开源项目，仅供学习研究。使用前请阅读 [免责声明](./DISCLAIMER.md)。

一个独立的 TikTok 直播弹幕抓取与翻译桌面工具，当前首发面向 Windows。  
项目采用 `Tauri v2 + React + TypeScript + Node sidecar` 架构，目标是把”输入直播间 -> 抓取弹幕 -> 翻译展示 -> 悬浮窗显示”这条链路做成可直接运行的本地桌面应用。

## 1. 项目定位

- 本项目是独立工具，不接入其他商业产品。
- 本项目不提供任何内置翻译额度、代理服务、账号体系、卡密体系或远程日志服务。
- 用户需要自行配置翻译服务的 `API Key / Region / Base URL / Model`。
- 礼物消息只展示，不走翻译。
- 源语言支持自动检测和手动切换，目标语言支持手动切换。

## 2. 当前功能

- 支持输入 `username`、`@username`、完整 TikTok 直播 URL。
- 支持抓取直播弹幕。
- 支持展示礼物消息。
- 支持阿里云 MT、微软翻译、OpenAI 兼容三种翻译模式。
- 支持主窗口消息流。
- 支持悬浮窗显示。
- 支持深浅色模式切换。
- 支持本地保存直播间、代理、语言、翻译配置等设置。

## 3. 技术架构

### 3.1 总体结构

仓库分成三层：

- `src/`
  React 前端。负责设置界面、消息列表、悬浮窗 UI、状态提示和本地交互。
- `worker/`
  Node sidecar。负责连接 TikTok 直播、调用翻译服务、输出标准化事件流。
- `src-tauri/`
  Tauri 桌面壳。负责窗口管理、启动 sidecar、读取 sidecar 输出、向前端广播事件、打包桌面安装包。

### 3.2 运行链路

程序正式运行时不是前端直接连 WebSocket，而是走这条链路：

1. Tauri 启动桌面应用。
2. Rust 侧启动 Node sidecar。
3. Rust 把当前会话配置写给 sidecar。
4. sidecar 连接 TikTok 直播并抓取弹幕、礼物事件。
5. sidecar 按需调用翻译服务。
6. sidecar 通过标准输出持续输出 NDJSON 事件流。
7. Rust 读取事件流并转成 Tauri 事件广播给前端。
8. React 主窗口和悬浮窗分别消费同一类事件，更新各自界面。

### 3.3 为什么要带 Node sidecar

- `worker` 依赖 `tiktok-live-connector`，更适合跑在 Node 环境。
- 最终用户不需要单独安装 Python。
- 不需要额外开本地 WebSocket 端口，减少端口占用和防火墙干扰。
- 打包时可以把 `node.exe + worker/dist + worker/node_modules` 一起带进安装包。

### 3.4 sidecar 是怎么准备的

根目录脚本 `scripts/prepare-sidecar.mjs` 会做一件关键事情：

- 把当前本机正在使用的 Node 运行时复制到 `src-tauri/binaries/` 里。

这意味着：

- 你在开发机或打包机上用什么版本的 Node，打包时带进去的就是那个版本的 Node。
- 打包前必须保证当前环境的 Node 是你想交付的版本。

## 4. 目录说明

```text
.
├─ src/                   React 前端
├─ worker/                Node sidecar
├─ src-tauri/             Tauri 桌面壳与打包配置
├─ shared/                前后端共享类型、配置、语言定义
├─ scripts/               辅助脚本
├─ DISCLAIMER.md          免责声明
├─ THIRD_PARTY_NOTICES.md 第三方声明
└─ LICENSE                开源协议
```

## 5. 开发环境要求

当前以 Windows 开发和打包为主，建议准备以下环境。

### 5.1 必需软件

- Node.js `24.x` 或以上
- npm
- Rust / Cargo
- Visual Studio C++ Build Tools
- WebView2 Runtime

### 5.2 建议版本

- Node.js：建议固定在你准备交付时要使用的版本
- Rust：建议使用稳定版

### 5.3 检查命令

```bash
node -v
npm -v
rustc -V
cargo -V
```

如果这些命令里有任意一个不可用，先把环境装好再继续。

## 6. 首次安装步骤

### 6.1 安装根目录依赖

```bash
npm install
```

这个命令会完成两件事：

- 安装根目录前端和 Tauri 依赖
- 通过 `postinstall` 自动安装 `worker/` 里的 Node 依赖

### 6.2 可选：单独安装 worker 依赖

如果你怀疑 `worker` 依赖没装完整，可以手动补一次：

```bash
npm install --prefix worker --no-workspaces
```

### 6.3 首次安装完成后建议先跑一次测试

```bash
npm test
```

## 7. 日常开发流程

这一节按“平时改功能时的真实顺序”来写，不是只列命令。

### 7.1 第一步：拉代码并安装依赖

如果你刚切分支或者刚拉到新代码，先执行：

```bash
npm install
```

建议在这几种情况下重新执行一次：

- 切换分支后
- `package.json` 或 `package-lock.json` 有变更后
- `worker/package.json` 有变更后

### 7.2 第二步：跑基础检查

先确认当前代码至少是可测试、可编译状态。

```bash
npm test
```

如果你怀疑是 Rust 层问题，额外再跑：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

### 7.3 第三步：启动开发环境

日常开发统一使用：

```bash
npm run tauri dev
```

这个命令会串起整条开发链路：

1. 执行 `npm run dev`
2. `npm run dev` 内部会先执行 `npm run prepare:sidecar`
3. 启动 Vite 开发服务器
4. 启动 `worker` 的 TypeScript watch 编译
5. 启动 Tauri 桌面窗口

### 7.4 第四步：按你修改的层来判断是否需要重启

#### 改 `src/` 前端

- 大多数情况下 Vite 会热更新
- 如果改的是窗口初始化、主题注入、事件订阅这类全局逻辑，建议手动关掉窗口重新开

#### 改 `worker/` 逻辑

- `tsc --watch` 会重新编译
- 但 sidecar 进程通常不会自动热重启成“新逻辑”
- 最稳妥的做法是停止当前会话，必要时重开整个应用

#### 改 `src-tauri/` Rust 逻辑

- Tauri 会触发 Rust 重新编译
- 这类修改通常建议完整重启一次桌面应用

### 7.5 第五步：改完后做回归验证

至少建议跑下面两条：

```bash
npm test
npm run build
```

如果你这次动到了 Tauri 侧、打包逻辑或 sidecar 生命周期，再补一条：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## 8. 常用开发命令

### 8.1 启动开发环境

```bash
npm run tauri dev
```

### 8.2 只启动前端和 worker 的开发链路

```bash
npm run dev
```

这个命令不会直接打开 Tauri 窗口，但会：

- 准备 sidecar
- 启动 Vite
- 启动 worker 的 TypeScript watch

### 8.3 只启动 Vite

```bash
npm run dev:vite
```

### 8.4 只监听编译 worker

```bash
npm run dev:worker
```

### 8.5 编译 worker

```bash
npm run build:worker
```

### 8.6 准备 sidecar

```bash
npm run prepare:sidecar
```

### 8.7 跑测试

```bash
npm test
```

### 8.8 测试监听模式

```bash
npm run test:watch
```

### 8.9 构建前端和 worker

```bash
npm run build
```

注意：

- 这个命令会产出前端 `dist/`
- 会编译 `worker/dist/`
- 会重新准备 sidecar
- 但它本身不会生成桌面安装包

## 9. 打包发布步骤

这一节是“交付安装包”时真正要执行的流程。

### 9.1 打包前检查清单

正式打包前建议先确认：

- 当前 Node 版本正确
- `npm install` 已执行
- `npm test` 通过
- `npm run build` 通过
- 你要带进安装包的窗口标题、图标、资源都已经确认
- `worker/dist/` 是最新编译结果

### 9.2 先做一次前置构建

```bash
npm run build
```

用途：

- 编译 worker
- 构建 Vite 前端
- 把当前 Node 运行时复制为 sidecar

### 9.3 生成正式安装包

```bash
npm run tauri build
```

这是最常用的正式打包命令。  
它会读取 `src-tauri/tauri.conf.json`，再根据其中的 `bundle.targets` 和 `externalBin/resources` 设置生成桌面安装包。

### 9.4 生成调试安装包

```bash
npm run tauri build -- --debug
```

适合这些场景：

- 你想先验证打包链路通不通
- 你想快速拿一个可安装的调试版本
- 你暂时不关心正式优化和 release 产物

### 9.5 常见输出目录

正式构建通常在：

```text
src-tauri/target/release/bundle/
```

调试构建通常在：

```text
src-tauri/target/debug/bundle/
```

在 Windows 下常见会看到：

- `msi/`
- `nsis/`

例如：

```text
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

### 9.6 如果你只想验证前端构建，不想出安装包

```bash
npm run build
```

### 9.7 如果你只想验证 Rust 桌面壳是否能编译

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## 10. 打包配置说明

当前关键配置在：

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `scripts/prepare-sidecar.mjs`

### 10.1 当前打包要点

- `beforeDevCommand`：`npm run dev`
- `beforeBuildCommand`：`npm run build`
- `devUrl`：`http://localhost:1420`
- `frontendDist`：`../dist`
- `externalBin`：`binaries/node`
- `resources`：带入 `worker/bundle/**/*`

这代表正式安装包里会包含：

- 前端静态资源
- Node sidecar 可执行文件
- worker 单文件 bundle（所有依赖已内联）

## 11. 翻译服务配置说明

### 11.1 阿里云 MT

通常需要：

- `API Key`

### 11.2 微软翻译

通常需要：

- `API Key`
- `Region`

### 11.3 OpenAI 兼容

通常需要：

- `API Key`
- `Base URL`
- `Model`

### 11.4 不完整配置时的行为

如果翻译配置没填完整：

- 程序仍然可以抓弹幕
- 但聊天消息会回落成原文显示
- 礼物仍然只展示不翻译

## 12. 直播间输入格式

支持三种格式：

```text
username
@username
https://www.tiktok.com/@username/live
```

如果你是做排查，建议优先用完整 URL，最不容易输错。

## 13. 代理说明

- 代理是可选项
- 不填时按直连处理
- 常见示例：

```text
http://127.0.0.1:7890
```

如果当前网络环境访问 TikTok 不稳定，再考虑配置代理。

## 14. 本地存储说明

程序会把这些配置保存在本机应用数据目录：

- 直播间输入
- 代理地址
- 翻译服务选择
- API Key
- Region / Base URL / Model
- 源语言、目标语言
- 是否展示礼物
- 悬浮窗显示模式
- 是否已接受免责声明

当前实现里：

- API Key 保存在用户本机
- 为明文本地存储
- 不会上传到本项目服务器，因为本项目没有远程后端

如果你的电脑是多人共用环境，请自行评估是否适合长期保存密钥。

## 15. 常见问题排查

### 15.1 `npm run tauri dev` 启动失败

优先检查：

- Node、Rust、Cargo 是否都已安装
- `npm install` 是否执行过
- 1420 端口是否被占用
- 上一次 Vite / Tauri 进程是否没关干净

如果 1420 端口被占用，可以先结束旧进程再重新启动。

### 15.2 能打开软件，但点开始监听后没有消息

优先检查：

- 直播间是否真的在开播
- 直播间输入是否正确
- 当前网络是否能访问 TikTok
- 是否需要代理

### 15.3 能抓到弹幕，但没有译文

优先检查：

- 当前翻译服务配置是否完整
- API Key 是否正确
- 微软是否填了 `Region`
- OpenAI 兼容是否填了 `Base URL` 和 `Model`
- 源语言和目标语言是否设成了一样

### 15.4 打包成功但安装后运行异常

优先检查：

- 打包机的 Node 版本是否就是你要交付的版本
- `worker/dist/` 是否是最新编译结果
- `worker/node_modules/` 是否完整
- 杀毒软件是否拦截 sidecar 或 Node 可执行文件

### 15.5 Vite 提示 1420 端口被占用

先关闭旧的开发进程，再重启：

```bash
npm run tauri dev
```

### 15.6 改了 worker 代码但界面行为没变

这是最常见的误判之一。  
原因通常不是代码没改，而是 sidecar 进程还没换成新的那份。

建议处理顺序：

1. 停止当前会话
2. 关闭桌面应用
3. 重新执行 `npm run tauri dev`

## 16. 建议的日常开发节奏

如果你只是平时继续迭代功能，建议固定用这一套节奏：

1. `npm install`
2. `npm test`
3. `npm run tauri dev`
4. 改代码
5. 自测主流程
6. `npm test`
7. `npm run build`
8. 需要交付时再执行 `npm run tauri build`

## 17. 第三方依赖与致谢

本项目建立在多个开源项目和官方文档之上，感谢：

- `tiktok-live-connector`
- `Tauri`
- `React`
- `Vite`
- 各翻译服务官方 API 文档

详细说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
