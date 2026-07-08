# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

TikTok直播弹幕抓取SDK。Node.js连接TikTok，WebSocket转发弹幕给Python。

## Architecture

```
TikTok Live → Node.js Server → WebSocket(8766) → Python Client
```

**Why Node.js**: Python TikTokLive库已停止维护(2025)，签名API 403错误。Node.js版正常工作。

## Commands

```bash
# 启动弹幕服务器
node tiktok_connector/tiktok_ws_server.js <主播用户名>

# 测试Python客户端
PYTHONIOENCODING=utf-8 python tiktok_ws_client.py

# 重装Node.js依赖（如需要）
cd tiktok_connector && npm install
```

## Key Files

| 文件 | 说明 |
|------|------|
| `tiktok_connector/tiktok_ws_server.js` | **核心** Node.js WebSocket服务器 |
| `tiktok_ws_client.py` | Python客户端示例（含集成代码） |
| `tiktok_connector/dist/` | tiktok-live-connector编译产物 |

## WebSocket Protocol

服务器发送JSON：
- `{"type": "connected", "roomId": "..."}` - 连接成功
- `{"type": "chat", "username": "...", "text": "..."}` - 弹幕
- `{"type": "gift", "userId": "...", "giftId": ...}` - 礼物
- `{"type": "disconnected"}` - 断开
- `{"type": "error", "message": "..."}` - 错误

## Proxy

国内必须用代理，默认 `http://127.0.0.1:7890`（Clash）。

修改方式：
```bash
node tiktok_ws_server.js username 8766 http://127.0.0.1:10808
```

## Integration

Python集成核心代码：
```python
import asyncio, json, websockets

async def connect_danmu():
    async with websockets.connect("ws://localhost:8766") as ws:
        async for msg in ws:
            data = json.loads(msg)
            if data['type'] == 'chat':
                your_translate(data['text'])  # 你的翻译API
```

## Common Issues

| 问题 | 解决 |
|------|------|
| 连接失败 | 检查代理是否运行、主播是否在直播 |
| 无弹幕 | 等待几秒，TikTok连接需要时间 |
| Windows乱码 | `PYTHONIOENCODING=utf-8` |

## Do NOT

- ❌ 不要用Python TikTokLive库（已失效）
- ❌ 不要用subprocess桥接（Windows编码问题）
- ❌ 不要添加多平台抽象层（只有TikTok能跑）