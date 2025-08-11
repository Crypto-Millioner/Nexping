let peer = null;
let currentConnection = null;
let currentCall = null;
let localStream = null;

function initP2P(userId) {
    peer = new Peer(userId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        pingInterval: 5000
    });

    peer.on('connection', handleIncomingConnection);
    
    peer.on('call', handleIncomingCall);
    
    peer.on('error', handlePeerError);
}

function handleIncomingConnection(conn) {
    conn.on('data', handleIncomingData);
    currentConnection = conn;
}

function handleIncomingData(data) {
    if (data.type === 'message') {
        window.handleIncomingMessage(data.payload);
    }
}

function sendP2PMessage(recipientId, message) {
    if (currentConnection && currentConnection.peer === recipientId) {
        currentConnection.send({
            type: 'message',
            payload: message
        });
    } else {
        const conn = peer.connect(recipientId);
        conn.on('open', () => {
            conn.send({
                type: 'message',
                payload: message
            });
            currentConnection = conn;
        });
    }
}

async function startP2PCall(recipientId) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        document.getElementById('local-video').srcObject = localStream;
        
        const call = peer.call(recipientId, localStream);
        setupCallEventHandlers(call);
        currentCall = call;
    } catch (error) {
        console.error('Ошибка доступа к медиаустройствам:', error);
        alert('Не удалось получить доступ к камере/микрофону');
    }
}

async function handleIncomingCall(call) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        document.getElementById('local-video').srcObject = localStream;
        document.getElementById('call-status').textContent = 'Входящий звонок...';
        showModal(document.getElementById('call-modal'));
        
        call.answer(localStream);
        setupCallEventHandlers(call);
        currentCall = call;
    } catch (error) {
        console.error('Ошибка доступа к медиаустройствам:', error);
        call.close();
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
}

function handlePeerError(error) {
    console.error('PeerJS ошибка:', error);
}

function handleCallError(error) {
    console.error('Ошибка звонка:', error);
    endCall();
}

window.initP2P = initP2P;
window.sendP2PMessage = sendP2PMessage;
window.startP2PCall = startP2PCall;
window.endP2PCall = endCall;
window.handleIncomingMessage = null; 