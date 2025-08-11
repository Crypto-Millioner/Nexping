let peer = null;
let currentConnection = null;
let currentCall = null;
let localStream = null;
let isCallActive = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

const PEER_SERVERS = [
    {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        path: '/'
    },
    {
        host: '1.peerjs.com',
        port: 443,
        secure: true,
        path: '/'
    },
    {
        host: 'peerjs-server.herokuapp.com',
        port: 443,
        secure: true,
        path: '/peerjs'
    },
    {
        host: 'peerjs-server-9s8w.onrender.com',
        port: 443,
        secure: true,
        path: '/peerjs'
    }
];

function initP2P(userId) {
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.error('Max connection attempts reached');
        window.updateConnectionStatus('error');
        return;
    }

    const serverConfig = PEER_SERVERS[connectionAttempts % PEER_SERVERS.length];
    console.log(`Attempting connection to ${serverConfig.host} (attempt ${connectionAttempts + 1})`);
    
    try {
        peer = new Peer(userId, {
            host: serverConfig.host,
            port: serverConfig.port,
            path: serverConfig.path,
            secure: serverConfig.secure,
            pingInterval: 5000,
            debug: 2
        });

        peer.on('open', () => {
            console.log('PeerJS connected with ID:', peer.id);
            connectionAttempts = 0;
            window.updateConnectionStatus('connected');
            
            setInterval(() => {
                if (!peer || peer.disconnected) {
                    peer.reconnect();
                }
            }, 15000);
        });

        peer.on('connection', handleIncomingConnection);
        peer.on('call', handleIncomingCall);
        peer.on('error', handlePeerError);
        peer.on('disconnected', handlePeerDisconnect);
        peer.on('close', handlePeerClose);

        peer.on('disconnected', () => {
            window.updateConnectionStatus('connecting');
        });

    } catch (error) {
        console.error('PeerJS init error:', error);
        setTimeout(() => {
            connectionAttempts++;
            initP2P(userId);
        }, 2000);
    }
}

function handlePeerDisconnect() {
    console.log('PeerJS disconnected, attempting reconnect...');
    window.updateConnectionStatus('connecting');
    if (peer && !peer.destroyed) {
        peer.reconnect();
    }
}

function handlePeerClose() {
    console.log('PeerJS connection closed');
    window.updateConnectionStatus('error');
    if (isCallActive) {
        endCall();
    }
}

function handleIncomingConnection(conn) {
    console.log('Incoming connection from:', conn.peer);
    conn.on('open', () => {
        currentConnection = conn;
        conn.on('data', handleIncomingData);
        conn.on('close', () => {
            if (currentConnection === conn) currentConnection = null;
        });
        conn.on('error', handlePeerError);
    });
}

function handleIncomingData(data) {
    if (data.type === 'message') {
        window.handleIncomingMessage(data.payload);
    } else if (data.type === 'ping') {

        currentConnection.send({ type: 'pong' });
    }
}

function sendP2PMessage(recipientId, message) {
    return new Promise((resolve, reject) => {
        if (!peer || !peer.open) {
            reject(new Error('No P2P connection'));
            return;
        }

        const sendData = () => {
            if (currentConnection && currentConnection.peer === recipientId && currentConnection.open) {
                currentConnection.send({
                    type: 'message',
                    payload: message
                });
                resolve();
            } else {
                const conn = peer.connect(recipientId, {
                    reliable: true,
                    serialization: 'json',
                    metadata: { type: 'message' }
                });

                conn.on('open', () => {
                    currentConnection = conn;
                    conn.send({
                        type: 'message',
                        payload: message
                    });
                    resolve();
                });

                conn.on('error', error => {
                    console.error('Connection error:', error);
                    reject(error);
                });

                setTimeout(() => {
                    if (!conn.open) {
                        conn.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);
            }
        };

        if (peer.open) {
            sendData();
        } else {
            const timeout = setTimeout(() => {
                reject(new Error('Peer not connected'));
            }, 5000);

            peer.on('open', () => {
                clearTimeout(timeout);
                sendData();
            });
        }
    });
}

async function startP2PCall(recipientId) {
    if (isCallActive) return;
    
    try {
        document.getElementById('call-status').textContent = 'Доступ к устройствам...';
        
        const mediaPromise = navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout accessing media devices')), 10000);
        });
        
        localStream = await Promise.race([mediaPromise, timeoutPromise]);
        
        document.getElementById('local-video').srcObject = localStream;
        document.getElementById('call-status').textContent = 'Соединение...';
        
        const call = peer.call(recipientId, localStream, {
            metadata: { 
                caller: peer.id,
                timestamp: Date.now()
            }
        });
        
        setupCallEventHandlers(call);
        currentCall = call;
        isCallActive = true;
    } catch (error) {
        console.error('Media access error:', error);
        endCall();
        
        let errorMessage = 'Ошибка доступа к устройствам';
        if (error.message.includes('Timeout')) {
            errorMessage = 'Время ожидания истекло';
        } else if (error.name === 'NotAllowedError') {
            errorMessage = 'Доступ запрещен';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'Устройства не найдены';
        }
        
        alert(errorMessage);
    }
}

async function handleIncomingCall(call) {
    if (isCallActive) {
        call.close();
        return;
    }
    
    try {
        document.getElementById('call-status').textContent = 'Входящий звонок...';
        
        const mediaPromise = navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout accessing media devices')), 10000);
        });
        
        localStream = await Promise.race([mediaPromise, timeoutPromise]);
        document.getElementById('local-video').srcObject = localStream;
        
        call.answer(localStream);
        setupCallEventHandlers(call);
        currentCall = call;
        isCallActive = true;
    } catch (error) {
        console.error('Answer call error:', error);
        call.close();
        endCall();
        
        let errorMessage = 'Ошибка ответа на звонок';
        if (error.message.includes('Timeout')) {
            errorMessage = 'Время ожидания истекло';
        }
        
        alert(errorMessage);
    }
}

function setupCallEventHandlers(call) {
    call.on('stream', handleRemoteStream);
    call.on('close', endCall);
    call.on('error', handleCallError);
}

function handleRemoteStream(remoteStream) {
    document.getElementById('remote-video').srcObject = remoteStream;
    document.getElementById('call-status').textContent = 'Звонок активен';
}

function endCall() {
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    document.getElementById('remote-video').srcObject = null;
    document.getElementById('local-video').srcObject = null;
    isCallActive = false;
}

function handlePeerError(error) {
    console.error('PeerJS error:', error);
    window.updateConnectionStatus('error');
    
    if (error.type === 'peer-unavailable' || error.type === 'network') {
        setTimeout(() => {
            if (peer && peer.disconnected) {
                peer.reconnect();
            }
        }, 2000);
    }
}

function handleCallError(error) {
    console.error('Call error:', error);
    endCall();
    alert('Ошибка звонка: ' + (error.message || error.type));
}

function checkConnection(recipientId) {
    return new Promise((resolve) => {
        if (!peer || !peer.open) {
            resolve(false);
            return;
        }

        const conn = peer.connect(recipientId, {
            metadata: { type: 'ping' }
        });

        const timeout = setTimeout(() => {
            conn.close();
            resolve(false);
        }, 3000);

        conn.on('data', (data) => {
            if (data.type === 'pong') {
                clearTimeout(timeout);
                conn.close();
                resolve(true);
            }
        });

        conn.on('open', () => {
            conn.send({ type: 'ping' });
        });
    });
}

window.initP2P = initP2P;
window.sendP2PMessage = sendP2PMessage;
window.startP2PCall = startP2PCall;
window.endP2PCall = endCall;
window.checkConnection = checkConnection;