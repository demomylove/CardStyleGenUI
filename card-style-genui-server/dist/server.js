"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const chat_1 = require("./endpoints/chat");
const dotenv_1 = __importDefault(require("dotenv")); // Load env vars
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // bind on all interfaces for external access
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Basic access log for troubleshooting connectivity on server side
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// AG-UI Protocol Endpoint
app.post('/api/chat', chat_1.chatHandler);
// 兼容某些网关/代理对 POST 带 chunked 的限制：
// 提供 GET /api/chat?payload=<urlencoded base64/json> 的兜底入口。
// 客户端将完整 JSON 载荷放到 payload 参数里（URL 编码的 JSON 字符串）。
app.get('/api/chat', (req, res) => {
    try {
        const payloadRaw = req.query.payload || '';
        if (!payloadRaw) {
            res.status(400).type('text/plain').send('Missing payload');
            return;
        }
        // 直接按 URL 编码 JSON 解析
        const parsed = JSON.parse(payloadRaw);
        // 将解析结果挂到 req.body，复用同一处理器
        req.body = parsed;
        (0, chat_1.chatHandler)(req, res);
    }
    catch (e) {
        console.error('GET /api/chat payload parse error:', e === null || e === void 0 ? void 0 : e.message);
        res.status(400).type('text/plain').send('Invalid payload');
    }
});
// Health endpoints
app.get('/health', (_req, res) => {
    res.status(200).type('text/plain').send('AG-UI Server is running');
});
app.head('/health', (_req, res) => {
    res.status(200).end();
});
// Simple root endpoint for quick testing
app.get('/', (_req, res) => {
    res.status(200).type('text/plain').send('OK');
});
// Global error handler to avoid abrupt socket closes without body
// If any middleware throws, we ensure a response is still sent
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent)
        return; // delegate to default handler if headers already sent
    res.status(500).type('text/plain').send('Internal Server Error');
});
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
