/**
 * TikTok弹幕WebSocket服务器
 *
 * 连接TikTok直播间，通过WebSocket转发弹幕给Python客户端
 *
 * 使用方法:
 *   node tiktok_ws_server.js <主播用户名> [端口] [代理地址]
 *
 * 示例:
 *   node tiktok_ws_server.js himmathyturner
 *   node tiktok_ws_server.js username 8766 http://127.0.0.1:7890
 *
 * Python客户端连接: ws://localhost:8766
 */
const { TikTokLiveConnection, WebcastEvent } = require('./dist/index.js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const WebSocket = require('ws');

// ==================== 配置参数 ====================
const USERNAME = process.argv[2];
const PORT = parseInt(process.argv[3]) || 8766;
const PROXY_URL = process.argv[4] || 'http://127.0.0.1:7890';

if (!USERNAME) {
    console.log('[ERROR] 请提供主播用户名');
    console.log('用法: node tiktok_ws_server.js <用户名> [端口] [代理]');
    console.log('示例: node tiktok_ws_server.js himmathyturner 8766 http://127.0.0.1:7890');
    process.exit(1);
}

// ==================== 启动信息 ====================
console.log('='.repeat(50));
console.log('TikTok弹幕WebSocket服务器');
console.log('='.repeat(50));
console.log(`主播: @${USERNAME}`);
console.log(`端口: ${PORT}`);
console.log(`代理: ${PROXY_URL}`);
console.log('='.repeat(50));

// ==================== WebSocket服务器 ====================
const wss = new WebSocket.Server({ port: PORT });
console.log(`[SERVER] WebSocket服务已启动: ws://localhost:${PORT}`);

// ==================== TikTok连接 ====================
const httpsAgent = new HttpsProxyAgent(PROXY_URL);
const wsAgent = new HttpsProxyAgent(PROXY_URL);

const tiktok = new TikTokLiveConnection(USERNAME, {
    webClientOptions: { httpsAgent, timeout: 30000 },
    wsClientOptions: { agent: wsAgent, timeout: 30000 }
});

// TikTok连接成功
tiktok.connect().then(state => {
    console.log(`[SERVER] TikTok连接成功! Room ID: ${state.roomId}`);
    broadcast({ type: 'connected', roomId: state.roomId, username: USERNAME });
}).catch(err => {
    console.log(`[SERVER] TikTok连接失败: ${err.message}`);
    broadcast({ type: 'error', message: err.message });
    // 不退出，可能主播还没开播，保持服务运行
});

// ==================== TikTok事件监听 ====================

// 弹幕事件
tiktok.on(WebcastEvent.CHAT, data => {
    const msg = {
        type: 'chat',
        platform: 'tiktok',
        userId: data.user.uniqueId,
        username: data.user.nickname || data.user.uniqueId,
        text: data.comment,
        timestamp: new Date().toISOString()
    };

    // 服务端也打印（方便调试）
    console.log(`[DANMU] ${msg.username}: ${msg.text}`);

    // 广播给所有客户端
    broadcast(msg);
});

// 礼物事件
tiktok.on(WebcastEvent.GIFT, data => {
    const msg = {
        type: 'gift',
        platform: 'tiktok',
        userId: data.user.uniqueId,
        giftId: data.giftId,
        timestamp: new Date().toISOString()
    };
    console.log(`[GIFT] ${msg.userId}: #${msg.giftId}`);
    broadcast(msg);
});

// 断开连接
tiktok.on('disconnected', () => {
    console.log('[SERVER] TikTok连接断开');
    broadcast({ type: 'disconnected', reason: 'tiktok_disconnected' });
});

// 错误
tiktok.on('error', err => {
    console.log(`[SERVER] TikTok错误: ${err.message || 'unknown'}`);
    broadcast({ type: 'error', message: err.message || 'unknown' });
});

// ==================== WebSocket客户端处理 ====================

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[CLIENT] 新客户端连接: ${clientIp}`);

    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'welcome',
        server: 'tiktok-danmu',
        username: USERNAME,
        port: PORT,
        timestamp: new Date().toISOString()
    }));

    ws.on('close', () => {
        console.log(`[CLIENT] 客户端断开: ${clientIp}`);
    });

    ws.on('error', err => {
        console.log(`[CLIENT] 客户端错误: ${err.message}`);
    });
});

// ==================== 广播函数 ====================

function broadcast(data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

// ==================== 退出处理 ====================

process.on('SIGINT', () => {
    console.log('\n[SERVER] 正在关闭...');
    wss.close();
    process.exit(0);
});

// 保持运行
console.log('\n[SERVER] 等待客户端连接...');
console.log('[SERVER] Python连接地址: ws://localhost:' + PORT);
console.log('\n按 Ctrl+C 停止服务\n');