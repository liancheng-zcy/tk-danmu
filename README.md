# TikTok Live Danmu - 直播弹幕抓取SDK

实时抓取TikTok直播间弹幕，通过WebSocket接口提供给Python应用集成。

## 项目架构

```
┌─────────────────┐
│   TikTok直播     │
└─────────────────┘
        ↓ WebSocket (TikTok内部协议)
┌─────────────────┐     ws://localhost:8766     ┌─────────────────┐
│  Node.js Server │ ◄────────────────────────► │  Python Client  │
│ (tiktok_ws_     │                              │ (你的应用)       │
│  server.js)     │                              │                 │
└─────────────────┘                              └─────────────────┘
                                                         ↓
                                                 翻译/显示/语音合成
```

**设计说明**：
- Node.js负责连接TikTok（使用成熟的 `tiktok-live-connector` 库）
- Python通过WebSocket接收弹幕数据（标准协议，无编码问题）
- 解耦设计，支持多客户端、易于集成

## 快速开始

### 1. 环境要求

- Node.js >= 20.0.0
- Python >= 3.8
- 代理软件（国内访问TikTok必须）

### 2. 安装依赖

```bash
# Node.js依赖已预装，如需重新安装：
cd tiktok_connector && npm install

# Python依赖
pip install websockets
```

### 3. 启动服务

```bash
# 启动Node.js弹幕服务器
node tiktok_connector/tiktok_ws_server.js <主播用户名>

# 示例
node tiktok_connector/tiktok_ws_server.js himmathyturner
```

服务器启动后监听 `ws://localhost:8766`

### 4. Python集成示例

```python
import asyncio
import json
import websockets

async def connect_danmu():
    async with websockets.connect("ws://localhost:8766") as ws:
        async for message in ws:
            data = json.loads(message)
            if data['type'] == 'chat':
                username = data['username']
                text = data['text']
                
                # 接入你的翻译API
                translated = your_translate(text)
                
                # 显示或语音合成
                print(f"[{username}] {text} → {translated}")

asyncio.run(connect_danmu())
```

## 配置参数

### Node.js服务器参数

```bash
node tiktok_ws_server.js <username> [port] [proxy]

# 参数说明：
# username  - TikTok主播用户名（必填，不含@）
# port      - WebSocket服务端口（默认8766）
# proxy     - 代理地址（默认 http://127.0.0.1:7890）
```

### 代理配置

国内访问TikTok必须配置代理。如果你的代理端口不是7890：

```bash
# Clash默认端口
node tiktok_ws_server.js username 8766 http://127.0.0.1:7890

# V2Ray默认端口
node tiktok_ws_server.js username 8766 http://127.0.0.1:10808
```

## 数据格式

服务器发送JSON格式消息：

### 连接成功
```json
{"type": "connected", "roomId": "7627124670646569758", "username": "himmathyturner"}
```

### 弹幕消息
```json
{
  "type": "chat",
  "platform": "tiktok",
  "userId": "user123",
  "username": "User Name",
  "text": "弹幕内容",
  "timestamp": "2026-04-10T15:10:00.000Z"
}
```

### 礼物消息
```json
{"type": "gift", "userId": "user123", "giftId": 7934, "timestamp": "..."}
```

### 断开连接
```json
{"type": "disconnected"}
```

## 集成指南

### 方式一：直接集成到现有应用

在你的Python应用中添加弹幕接收模块：

```python
import asyncio
import json
import websockets
from threading import Thread

class TikTokDanmuReceiver:
    def __init__(self, on_danmu_callback, server_url="ws://localhost:8766"):
        self.server_url = server_url
        self.on_danmu = on_danmu_callback
        self._running = False
    
    def start(self):
        self._running = True
        Thread(target=self._run_async, daemon=True).start()
    
    def _run_async(self):
        asyncio.run(self._connect())
    
    async def _connect(self):
        async with websockets.connect(self.server_url) as ws:
            async for message in ws:
                data = json.loads(message)
                if data['type'] == 'chat':
                    self.on_danmu(data['username'], data['text'])

# 使用示例
def handle_danmu(username, text):
    translated = translate_api(text)  # 你的翻译
    display_result(username, text, translated)  # 你的显示

receiver = TikTokDanmuReceiver(handle_danmu)
receiver.start()
```

### 方式二：独立进程模式

弹幕服务作为独立进程运行，你的应用通过HTTP或其他方式获取：

```bash
# 启动弹幕服务（独立进程）
node tiktok_connector/tiktok_ws_server.js username &

# 你的应用通过WebSocket连接
```

### 方式三：启动脚本封装

创建启动脚本一键启动：

```python
import subprocess
import time

def start_danmu_service(username, proxy="http://127.0.0.1:7890"):
    cmd = ["node", "tiktok_connector/tiktok_ws_server.js", username, "8766", proxy]
    subprocess.Popen(cmd)
    time.sleep(3)  # 等待服务启动
    # 然后连接WebSocket...
```

## 最佳实践

### 1. 用户输入处理

```python
def parse_tiktok_input(user_input):
    """解析用户输入，提取主播用户名"""
    # 支持多种格式：
    # - "himmathyturner" (纯用户名)
    # - "@himmathyturner" (带@)
    # - "https://www.tiktok.com/@himmathyturner/live" (完整URL)
    
    if user_input.startswith("http"):
        # 从URL提取用户名
        import re
        match = re.search(r'@([^/]+)/live', user_input)
        if match:
            return match.group(1)
    
    return user_input.lstrip('@')
```

### 2. 错误处理

```python
async def connect_with_retry(url, max_retries=3):
    for i in range(max_retries):
        try:
            async with websockets.connect(url) as ws:
                async for message in ws:
                    yield json.loads(message)
        except Exception as e:
            print(f"连接失败: {e}, 重试 {i+1}/{max_retries}")
            await asyncio.sleep(5)
```

### 3. 翻译集成

```python
# 弹幕回调中调用你的翻译API
def on_danmu(username, text):
    # 你的翻译服务
    result = your_translation_service.translate(
        text=text,
        source_lang="auto",  # 自动检测
        target_lang="zh"     # 目标语言
    )
    
    # 显示结果
    print(f"{username}: {text}")
    print(f"译文: {result.translated_text}")
    
    # 语音合成（如有）
    tts.speak(result.translated_text)
```

## 技术原理

### 为什么用Node.js而不是Python？

| 方案 | Python TikTokLive库 | Node.js tiktok-live-connector |
|------|---------------------|-------------------------------|
| 维护状态 | 已停止维护(2025) | 活跃维护(2026) |
| 签名服务 | 被风控，403错误 | 工作正常 |
| 稳定性 | ❌ 无法连接 | ✅ 实测可用 |

Python的TikTokLive库依赖的签名服务已被TikTok风控拦截，无法正常工作。Node.js版本有更活跃的社区维护，签名服务更新及时。

### WebSocket桥接方案

通过Node.js作为中间层，Python应用通过标准WebSocket协议接收数据，避免了：
- subprocess编码问题（Windows GBK/UTF-8冲突）
- Python库维护滞后问题
- 跨语言集成的复杂性

## 文件结构

```
live_danmu_demo/
├── README.md                    # 本文档
├── CLAUDE.md                    # Claude Code开发指南
├── requirements.txt             # Python依赖
├── tiktok_ws_client.py          # Python客户端示例
│
└── tiktok_connector/            # Node.js弹幕服务
    ├── tiktok_ws_server.js      # WebSocket服务器（核心）
    ├── package.json             # Node.js依赖配置
    ├── package-lock.json        # 依赖锁定
    ├── dist/                    # tiktok-live-connector编译产物
    └── node_modules/            # Node.js依赖
```

## 常见问题

### Q: 无法连接TikTok？

检查：
1. 代理是否正常运行（端口是否正确）
2. 主播是否正在直播（只能连接正在直播的直播间）
3. 用户名是否正确

### Q: 弹幕收不到？

等待几秒，TikTok连接需要时间。检查服务器日志是否有 `[SERVER] Connected` 输出。

### Q: 如何确认主播是否在直播？

访问 `https://www.tiktok.com/@用户名/live`，看是否能打开直播间页面。

## 更新日志

- **2026-04-10**: 初始版本，基于Node.js tiktok-live-connector实现