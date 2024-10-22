const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

const clients = new Map();

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`새로운 클라이언트 접속: ${ip}`);

    // 핑-퐁 간격 설정 (30초)
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000);

    ws.on('message', (message) => {
        console.log('받은 메시지:', message.toString());
        try {
            const data = JSON.parse(message);
            if (data.type === 'name') {
                console.log(`클라이언트 이름: ${data.name} (IP: ${ip})`);
                clients.set(ws, { name: data.name, ip: ip });
                broadcastClientUpdate();
            } else if (data.type === 'pong') {
                console.log('Pong received from client');
            }
        } catch (error) {
            console.error('메시지 파싱 오류:', error);
        }
    });

    ws.on('close', () => {
        clearInterval(pingInterval);
        clients.delete(ws);
        broadcastClientUpdate();
    });

    ws.on('pong', () => {
        console.log('Pong received from client');
    });
});

function broadcastClientUpdate() {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send('updateClients');
        }
    });
}

app.post('/ping', (req, res) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send('ping');
        }
    });
    res.send('Ping sent to all clients');
});

app.get('/clients', (req, res) => {
    const clientList = Array.from(clients.values()).map(client => ({
        name: client.name
    }));
    res.json(clientList);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});