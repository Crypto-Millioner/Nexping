let peer = null;
let currentConnection = null;
let currentCall = null;
let localStream = null;
let isCallActive = false;

function initP2P(userId) {
    try {
        peer = new Peer(userId, {
            host: 'peerjs-server-9s8w.onrender.com',
            port: 443,
            secure: true,
            pingInterval: 5000,
            debug: 3
        });

        peer.on('open', () => {
            console.log('PeerJS подключен с ID:', peer.id);
        });

        peer.on('connection', handleIncomingConnection);
        
        peer.on('call', handleIncomingCall);
        
        peer.on('error', handlePeerError);
        
        peer.on('disconnected', () => {
            console.log('PeerJS disconnected, attempting reconnect...');
            peer.reconnect();
        });
    } catch (error) {
        console.error('Ошибка инициализации PeerJS:', error);
    }
}

function handleIncomingConnection(conn) {
    console.log('Входящее подключение от:', conn.peer);
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
    }
}

function sendP2PMessage(recipientId, message) {
    return new Promise((resolve, reject) => {
        try {
            if (currentConnection && currentConnection.peer === recipientId && currentConnection.open) {
                currentConnection.send({
                    type: 'message',
                    payload: message
                });
                resolve();
            } else {
                const conn = peer.connect(recipientId, {
                    reliable: true,
                    serialization: 'json'
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
                    console.error('Ошибка подключения:', error);
                    reject(error);
                });
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            reject(error);
        }
    });
}

async function startP2PCall(recipientId) {
    if (isCallActive) return;
    
    try {
        document.getElementById('call-status').textContent = 'Получение доступа к устройствам...';
        showModal(document.getElementById('call-modal'));
        
        const mediaPromise = navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout accessing media devices')), 10000);
        });
        
        localStream = await Promise.race([mediaPromise, timeoutPromise]);
        
        document.getElementById('local-video').srcObject = localStream;
        document.getElementById('call-status').textContent = 'Установка соединения...';
        
        const call = peer.call(recipientId, localStream, {
            metadata: { caller: peer.id }
        });
        
        setupCallEventHandlers(call);
        currentCall = call;
        isCallActive = true;
    } catch (error) {
        console.error('Ошибка доступа к медиаустройствам:', error);
        endCall();
        
        let errorMessage = 'Не удалось получить доступ к камере/микрофону';
        if (error.message.includes('Timeout')) {
            errorMessage = 'Время ожидания доступа к камере/микрофону истекло';
        } else if (error.name === 'NotAllowedError') {
            errorMessage = 'Доступ к камере/микрофону запрещен';
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
        showModal(document.getElementById('call-modal'));
        
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
        console.error('Ошибка ответа на звонок:', error);
        call.close();
        endCall();
        
        let errorMessage = 'Не удалось ответить на звонок';
        if (error.message.includes('Timeout')) {
            errorMessage = 'Время ожидания доступа к камере/микрофону истекло';
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
    document.getElementById('call-status').textContent = 'Идет звонок...';
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
    console.error('PeerJS ошибка:', error);
    
    if (error.type === 'peer-unavailable' || error.type === 'network') {
        setTimeout(() => {
            if (peer && peer.disconnected) {
                peer.reconnect();
            }
        }, 2000);
    }
}

function handleCallError(error) {
    console.error('Ошибка звонка:', error);
    endCall();
    alert('Ошибка во время звонка: ' + (error.message || error.type));
}

window.initP2P = initP2P;
window.sendP2PMessage = sendP2PMessage;
window.startP2PCall = startP2PCall;
window.endP2PCall = endCall;
window.handleIncomingMessage = null;