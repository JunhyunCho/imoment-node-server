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

    // 접속 시간 추가
    const connectionTime = new Date().toLocaleTimeString();

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
            if (data.type === 'register') {
                console.log(`클라이언트 UUID: ${data.deviceId} (IP: ${ip})`);

                // UUID가 이미 존재하는지 확인
                let charToSend;
                const existingClient = Array.from(clients.values()).find(client => client.name === data.deviceId);
                if (existingClient) {
                    charToSend = existingClient.index; // 기존 인덱스 사용
                } else {
                    // 새로운 인덱스 할당
                    // A, B, C 각각의 개수를 세는 객체 생성
                    const counts = { A: 0, B: 0, C: 0 };

                    // 현재 연결된 모든 클라이언트의 인덱스를 세어 counts 객체에 저장
                    clients.forEach(client => {
                        counts[client.index]++;
                    });

                    // 가장 적은 수의 인덱스를 선택하여 할당
                    // 같은 수일 경우 A > B > C 순으로 우선순위 부여
                    if (counts.A <= counts.B && counts.A <= counts.C) {
                        charToSend = 'A';
                    } else if (counts.B <= counts.A && counts.B <= counts.C) {
                        charToSend = 'B';
                    } else {
                        charToSend = 'C';
                    }

                    // 이 방식으로 A, B, C가 최대한 균등하게 분배됨
                }

                // 수정된 부분: 문자열 대신 객체 전송
                ws.send(JSON.stringify({ group: charToSend })); // 클라이언트에게 그룹 정보 전송

                // 클라이언트 정보 저장
                clients.set(ws, {
                    name: data.deviceId,
                    ip: ip,
                    connectionTime: connectionTime,
                    index: charToSend
                });
                // broadcastClientUpdate();  // 주석 처리
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
        // broadcastClientUpdate();  // 주석 처리
    });

    ws.on('pong', () => {
        console.log('Pong received from client');
    });
});

/*
function broadcastClientUpdate() {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send('updateClients');
        }
    });
}
*/

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
        name: client.name.substring(0, 8), // UUID 앞 8자리
        connectionTime: client.connectionTime,
        index: client.index
    }));
    res.json(clientList);
});

app.post('/sendSceneMessage', (req, res) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send('Scene1'); // 모든 클라이언트에게 'Scene1' 메시지 전송
        }
    });
    res.send('모든 클라이언트에게 Scene1 메시지 전송 완료');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
