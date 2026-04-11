"""
TikTok弹幕接收客户端示例

使用方法:
1. 先启动Node.js服务器: node tiktok_connector/tiktok_ws_server.js <主播用户名>
2. 运行此脚本: PYTHONIOENCODING=utf-8 python tiktok_ws_client.py

集成到你的应用:
- 将 connect_danmu() 函数复制到你的代码
- 在弹幕回调中调用你的翻译API
"""
import asyncio
import json
import websockets
import sys
import re

SERVER_URL = "ws://localhost:8766"


def parse_username(user_input: str) -> str:
    """解析用户输入，提取TikTok主播用户名

    支持格式:
    - "himmathyturner" (纯用户名)
    - "@himmathyturner" (带@)
    - "https://www.tiktok.com/@himmathyturner/live" (完整URL)
    """
    if user_input.startswith("http"):
        match = re.search(r'@([^/]+)/live', user_input)
        if match:
            return match.group(1)
    return user_input.lstrip('@')


async def connect_danmu(on_danmu_callback=None, on_connected_callback=None):
    """连接弹幕服务器

    Args:
        on_danmu_callback: 弹幕回调函数，参数: (username, text, data)
        on_connected_callback: 连接成功回调，参数: (room_id, username)

    使用示例:
        async def main():
            def handle_danmu(username, text, data):
                print(f"[弹幕] {username}: {text}")
                # 这里接入你的翻译API

            await connect_danmu(on_danmu_callback=handle_danmu)

        asyncio.run(main())
    """
    print(f"Connecting to: {SERVER_URL}")

    try:
        async with websockets.connect(SERVER_URL) as ws:
            async for message in ws:
                try:
                    data = json.loads(message)
                    msg_type = data.get('type')

                    if msg_type == 'connected':
                        room_id = data.get('roomId', '')
                        username = data.get('username', '')
                        print(f"[Connected] Room: {room_id}, Streamer: @{username}")
                        if on_connected_callback:
                            on_connected_callback(room_id, username)

                    elif msg_type == 'chat':
                        username = data.get('username', '')
                        text = data.get('text', '')

                        # 调用回调（如果有）
                        if on_danmu_callback:
                            on_danmu_callback(username, text, data)
                        else:
                            print(f"[弹幕] {username}: {text}")

                    elif msg_type == 'gift':
                        user_id = data.get('userId', '')
                        gift_id = data.get('giftId', '')
                        print(f"[礼物] {user_id} 送了礼物 #{gift_id}")

                    elif msg_type == 'disconnected':
                        print("[断开] TikTok连接已断开")
                        break

                    elif msg_type == 'error':
                        print(f"[错误] {data.get('message', 'unknown')}")

                except json.JSONDecodeError:
                    print(f"[非JSON] {message}")

    except websockets.exceptions.ConnectionClosed:
        print("\n[断开] 服务器已关闭")
    except Exception as e:
        print(f"\n[错误] {e}")


# ============================================================
# 集成示例：带翻译功能的弹幕接收器
# ============================================================

class TikTokDanmuClient:
    """TikTok弹幕客户端类 - 便于集成到现有应用"""

    def __init__(self, server_url: str = SERVER_URL):
        self.server_url = server_url
        self.on_danmu = None      # 弹幕回调: (username, text, data)
        self.on_connected = None  # 连接回调: (room_id, username)
        self.on_gift = None       # 礼物回调: (user_id, gift_id)
        self.on_error = None      # 错误回调: (message)
        self._running = False

    async def start(self):
        """启动弹幕接收"""
        self._running = True
        await self._connect()

    def stop(self):
        """停止接收"""
        self._running = False

    async def _connect(self):
        """内部连接方法"""
        try:
            async with websockets.connect(self.server_url) as ws:
                async for message in ws:
                    if not self._running:
                        break

                    data = json.loads(message)
                    msg_type = data.get('type')

                    if msg_type == 'connected' and self.on_connected:
                        self.on_connected(data['roomId'], data['username'])

                    elif msg_type == 'chat' and self.on_danmu:
                        self.on_danmu(data['username'], data['text'], data)

                    elif msg_type == 'gift' and self.on_gift:
                        self.on_gift(data['userId'], data['giftId'])

                    elif msg_type == 'error' and self.on_error:
                        self.on_error(data.get('message', 'unknown'))

                    elif msg_type == 'disconnected':
                        self._running = False

        except Exception as e:
            if self.on_error:
                self.on_error(str(e))


# ============================================================
# 独立运行示例
# ============================================================

if __name__ == '__main__':
    print("=" * 50)
    print("TikTok弹幕接收示例")
    print("=" * 50)
    print("\n使用前请先启动Node.js服务器:")
    print("  node tiktok_connector/tiktok_ws_server.js <主播用户名>")
    print("\n按Ctrl+C停止\n")

    asyncio.run(connect_danmu())