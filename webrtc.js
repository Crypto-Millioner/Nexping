// webrtc.js
class WebRTCManager {
    constructor() {
        this.peerConnections = {};
        this.dataChannels = {};
        this.localUuid = localStorage.getItem('nexping_user_uuid');
        this.stunServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ];
        
        this.iceServers = [
            ...this.stunServers,
            // В реальном приложении можно добавить TURN серверы для обхода NAT
        ];
        
        this.signalingChannel = this.createSignalingChannel();
        this.init();
    }
    
    createSignalingChannel() {
        // Эмуляция сигнального канала через localStorage (для демонстрации)
        // В реальном приложении здесь был бы WebSocket сервер
        return {
            sendOffer: (targetUuid, offer) => {
                console.log(`Отправка offer к ${targetUuid}`);
                this.simulateSignalReceive(targetUuid, {
                    type: 'offer',
                    from: this.localUuid,
                    offer: offer
                });
            },
            
            sendAnswer: (targetUuid, answer) => {
                console.log(`Отправка answer к ${targetUuid}`);
                this.simulateSignalReceive(targetUuid, {
                    type: 'answer', 
                    from: this.localUuid,
                    answer: answer
                });
            },
            
            sendIceCandidate: (targetUuid, candidate) => {
                console.log(`Отправка ICE candidate к ${targetUuid}`);
                this.simulateSignalReceive(targetUuid, {
                    type: 'ice-candidate',
                    from: this.localUuid,
                    candidate: candidate
                });
            }
        };
    }
    
    simulateSignalReceive(targetUuid, signal) {
        // Имитация получения сигнала другим клиентом
        // В реальном приложении сигналы передавались бы через сервер
        setTimeout(() => {
            if (window.webrtcManager) {
                window.webrtcManager.handleSignalingMessage(signal);
            }
        }, 100);
    }
    
    init() {
        // Слушаем сообщения от других пиров
        window.addEventListener('storage', (e) => {
            if (e.key === 'nexping_signaling' && e.newValue) {
                const signal = JSON.parse(e.newValue);
                if (signal.to === this.localUuid) {
                    this.handleSignalingMessage(signal);
                }
                localStorage.removeItem('nexping_signaling');
            }
        });
        
        console.log('WebRTC Manager инициализирован с STUN серверами');
    }
    
    async initiateConnection(contactUuid) {
        console.log(`Инициирование WebRTC соединения с ${contactUuid}`);
        
        try {
            // Создаем PeerConnection
            const pc = new RTCPeerConnection({
                iceServers: this.iceServers
            });
            
            this.peerConnections[contactUuid] = pc;
            
            // Создаем DataChannel для обмена сообщениями
            const dc = pc.createDataChannel('chat', {
                ordered: true
            });
            
            this.setupDataChannel(contactUuid, dc);
            
            // Обработчики ICE кандидатов
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.signalingChannel.sendIceCandidate(contactUuid, event.candidate);
                }
            };
            
            // Обработчик изменения состояния соединения
            pc.onconnectionstatechange = () => {
                console.log(`Состояние соединения с ${contactUuid}: ${pc.connectionState}`);
                this.updateConnectionStatus(contactUuid);
            };
            
            // Создаем offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            // Отправляем offer через сигнальный канал
            this.signalingChannel.sendOffer(contactUuid, offer);
            
        } catch (error) {
            console.error('Ошибка при инициировании соединения:', error);
        }
    }
    
    async handleSignalingMessage(signal) {
        const { type, from, offer, answer, candidate } = signal;
        
        console.log(`Получен сигнал типа ${type} от ${from}`);
        
        try {
            switch (type) {
                case 'offer':
                    await this.handleOffer(from, offer);
                    break;
                    
                case 'answer':
                    await this.handleAnswer(from, answer);
                    break;
                    
                case 'ice-candidate':
                    await this.handleIceCandidate(from, candidate);
                    break;
            }
        } catch (error) {
            console.error('Ошибка обработки сигнала:', error);
        }
    }
    
    async handleOffer(contactUuid, offer) {
        console.log(`Обработка offer от ${contactUuid}`);
        
        // Создаем PeerConnection если его нет
        if (!this.peerConnections[contactUuid]) {
            const pc = new RTCPeerConnection({
                iceServers: this.iceServers
            });
            
            this.peerConnections[contactUuid] = pc;
            
            // Обработчик входящего DataChannel
            pc.ondatachannel = (event) => {
                const dc = event.channel;
                this.setupDataChannel(contactUuid, dc);
            };
            
            // Обработчики ICE кандидатов
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.signalingChannel.sendIceCandidate(contactUuid, event.candidate);
                }
            };
            
            // Обработчик изменения состояния соединения
            pc.onconnectionstatechange = () => {
                console.log(`Состояние соединения с ${contactUuid}: ${pc.connectionState}`);
                this.updateConnectionStatus(contactUuid);
            };
        }
        
        const pc = this.peerConnections[contactUuid];
        
        // Устанавливаем удаленное описание
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Создаем answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Отправляем answer
        this.signalingChannel.sendAnswer(contactUuid, answer);
    }
    
    async handleAnswer(contactUuid, answer) {
        console.log(`Обработка answer от ${contactUuid}`);
        
        const pc = this.peerConnections[contactUuid];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }
    
    async handleIceCandidate(contactUuid, candidate) {
        console.log(`Обработка ICE candidate от ${contactUuid}`);
        
        const pc = this.peerConnections[contactUuid];
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }
    
    setupDataChannel(contactUuid, dc) {
        dc.onopen = () => {
            console.log(`DataChannel с ${contactUuid} открыт`);
            this.dataChannels[contactUuid] = dc;
            this.updateConnectionStatus(contactUuid);
        };
        
        dc.onclose = () => {
            console.log(`DataChannel с ${contactUuid} закрыт`);
            delete this.dataChannels[contactUuid];
            this.updateConnectionStatus(contactUuid);
        };
        
        dc.onerror = (error) => {
            console.error(`Ошибка DataChannel с ${contactUuid}:`, error);
        };
        
        dc.onmessage = (event) => {
            console.log(`Получено сообщение от ${contactUuid}:`, event.data);
            
            if (window.nexpingApp) {
                window.nexpingApp.receiveMessage(contactUuid, event.data);
            }
        };
    }
    
    sendMessage(contactUuid, message) {
        const dc = this.dataChannels[contactUuid];
        
        if (dc && dc.readyState === 'open') {
            dc.send(message);
            console.log(`Сообщение отправлено ${contactUuid}: ${message}`);
            return true;
        } else {
            console.log(`Нет открытого DataChannel с ${contactUuid}`);
            
            // Пытаемся переподключиться
            if (!this.peerConnections[contactUuid] || 
                this.peerConnections[contactUuid].connectionState === 'failed' ||
                this.peerConnections[contactUuid].connectionState === 'disconnected') {
                
                this.initiateConnection(contactUuid);
            }
            
            return false;
        }
    }
    
    updateConnectionStatus(contactUuid) {
        if (window.nexpingApp) {
            window.nexpingApp.updateConnectionStatus();
        }
    }
    
    isConnected(contactUuid) {
        const dc = this.dataChannels[contactUuid];
        return dc && dc.readyState === 'open';
    }
    
    getConnectionStatus(contactUuid) {
        const pc = this.peerConnections[contactUuid];
        if (!pc) return 'not-connected';
        
        return pc.connectionState;
    }
    
    // Метод для закрытия всех соединений
    closeAllConnections() {
        Object.keys(this.peerConnections).forEach(uuid => {
            this.peerConnections[uuid].close();
        });
        
        this.peerConnections = {};
        this.dataChannels = {};
    }
}

// Инициализация WebRTC менеджера
document.addEventListener('DOMContentLoaded', () => {
    window.webrtcManager = new WebRTCManager();
});