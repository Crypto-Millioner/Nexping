// webrtc.js
class WebRTCManager {
    constructor() {
        this.peerConnections = {};
        this.dataChannels = {};
        this.localUuid = localStorage.getItem('nexping_user_uuid');
        this.pendingIceCandidates = {};
        this.stunServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ];
        
        this.iceServers = [...this.stunServers];
        
        this.signalingChannel = this.createSignalingChannel();
        this.init();
    }
    
    createSignalingChannel() {
        // Эмуляция сигнального канала через localStorage (для демонстрации)
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
        setTimeout(() => {
            if (window.webrtcManager && window.webrtcManager.localUuid === targetUuid) {
                window.webrtcManager.handleSignalingMessage(signal);
            }
        }, 100);
    }
    
    init() {
        console.log('WebRTC Manager инициализирован с STUN серверами');
    }
    
    async initiateConnection(contactUuid) {
        console.log(`Инициирование WebRTC соединения с ${contactUuid}`);
        
        // Если соединение уже существует, не создаем новое
        if (this.peerConnections[contactUuid] && 
            this.peerConnections[contactUuid].connectionState !== 'failed' &&
            this.peerConnections[contactUuid].connectionState !== 'disconnected' &&
            this.peerConnections[contactUuid].connectionState !== 'closed') {
            console.log(`Соединение с ${contactUuid} уже существует`);
            return;
        }
        
        try {
            // Закрываем старое соединение если есть
            if (this.peerConnections[contactUuid]) {
                this.peerConnections[contactUuid].close();
            }
            
            // Создаем PeerConnection
            const pc = new RTCPeerConnection({
                iceServers: this.iceServers
            });
            
            this.peerConnections[contactUuid] = pc;
            this.pendingIceCandidates[contactUuid] = [];
            
            // Создаем DataChannel для обмена сообщениями
            const dc = pc.createDataChannel('chat', {
                ordered: true
            });
            
            this.setupDataChannel(contactUuid, dc);
            
            // Обработчики ICE кандидатов
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`Новый ICE candidate для ${contactUuid}`);
                    this.signalingChannel.sendIceCandidate(contactUuid, event.candidate);
                } else {
                    console.log(`Все ICE candidates собраны для ${contactUuid}`);
                }
            };
            
            // Обработчик изменения состояния соединения
            pc.onconnectionstatechange = () => {
                console.log(`Состояние соединения с ${contactUuid}: ${pc.connectionState}`);
                this.updateConnectionStatus(contactUuid);
                
                if (pc.connectionState === 'connected') {
                    console.log(`✅ Соединение с ${contactUuid} установлено!`);
                    // Обрабатываем ожидающие ICE кандидаты
                    this.processPendingIceCandidates(contactUuid);
                } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    console.log(`❌ Соединение с ${contactUuid} разорвано`);
                    // Через 5 секунд пытаемся переподключиться
                    setTimeout(() => {
                        if (!this.isConnected(contactUuid)) {
                            this.initiateConnection(contactUuid);
                        }
                    }, 5000);
                }
            };
            
            // Обработчик ICE соединения
            pc.oniceconnectionstatechange = () => {
                console.log(`ICE состояние с ${contactUuid}: ${pc.iceConnectionState}`);
            };
            
            // Создаем offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log(`Local description установлен для ${contactUuid}`);
            
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
        
        try {
            // Закрываем старое соединение если есть
            if (this.peerConnections[contactUuid]) {
                this.peerConnections[contactUuid].close();
            }
            
            // Создаем новое PeerConnection
            const pc = new RTCPeerConnection({
                iceServers: this.iceServers
            });
            
            this.peerConnections[contactUuid] = pc;
            this.pendingIceCandidates[contactUuid] = [];
            
            // Обработчик входящего DataChannel
            pc.ondatachannel = (event) => {
                console.log(`Входящий DataChannel от ${contactUuid}`);
                const dc = event.channel;
                this.setupDataChannel(contactUuid, dc);
            };
            
            // Обработчики ICE кандидатов
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`Новый ICE candidate для ${contactUuid} (ответ)`);
                    this.signalingChannel.sendIceCandidate(contactUuid, event.candidate);
                }
            };
            
            // Обработчик изменения состояния соединения
            pc.onconnectionstatechange = () => {
                console.log(`Состояние соединения с ${contactUuid}: ${pc.connectionState}`);
                this.updateConnectionStatus(contactUuid);
                
                if (pc.connectionState === 'connected') {
                    console.log(`✅ Соединение с ${contactUuid} установлено!`);
                    this.processPendingIceCandidates(contactUuid);
                }
            };
            
            // Устанавливаем удаленное описание (offer)
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log(`Remote description установлен для ${contactUuid}`);
            
            // Создаем answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(`Local description (answer) установлен для ${contactUuid}`);
            
            // Отправляем answer
            this.signalingChannel.sendAnswer(contactUuid, answer);
            
        } catch (error) {
            console.error('Ошибка при обработке offer:', error);
        }
    }
    
    async handleAnswer(contactUuid, answer) {
        console.log(`Обработка answer от ${contactUuid}`);
        
        const pc = this.peerConnections[contactUuid];
        if (!pc) {
            console.error(`Нет PeerConnection для ${contactUuid}`);
            return;
        }
        
        try {
            // Проверяем текущее состояние
            if (pc.signalingState !== 'have-local-offer') {
                console.warn(`Неожиданное signaling state: ${pc.signalingState}`);
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`Remote description (answer) установлен для ${contactUuid}`);
            
        } catch (error) {
            console.error('Ошибка при обработке answer:', error);
        }
    }
    
    async handleIceCandidate(contactUuid, candidate) {
        console.log(`Обработка ICE candidate от ${contactUuid}`);
        
        const pc = this.peerConnections[contactUuid];
        if (!pc) {
            console.log(`PeerConnection для ${contactUuid} еще не создан, сохраняем candidate`);
            if (!this.pendingIceCandidates[contactUuid]) {
                this.pendingIceCandidates[contactUuid] = [];
            }
            this.pendingIceCandidates[contactUuid].push(candidate);
            return;
        }
        
        try {
            // Проверяем, что remote description установлен
            if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`ICE candidate добавлен для ${contactUuid}`);
            } else {
                // Сохраняем candidate для последующей обработки
                if (!this.pendingIceCandidates[contactUuid]) {
                    this.pendingIceCandidates[contactUuid] = [];
                }
                this.pendingIceCandidates[contactUuid].push(candidate);
                console.log(`Remote description не установлен, candidate сохранен для ${contactUuid}`);
            }
        } catch (error) {
            console.error('Ошибка при добавлении ICE candidate:', error);
        }
    }
    
    async processPendingIceCandidates(contactUuid) {
        const pc = this.peerConnections[contactUuid];
        const pendingCandidates = this.pendingIceCandidates[contactUuid];
        
        if (!pc || !pendingCandidates || pendingCandidates.length === 0) {
            return;
        }
        
        console.log(`Обработка ${pendingCandidates.length} ожидающих ICE candidates для ${contactUuid}`);
        
        for (const candidate of pendingCandidates) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`Ожидающий ICE candidate добавлен для ${contactUuid}`);
            } catch (error) {
                console.error('Ошибка при добавлении ожидающего ICE candidate:', error);
            }
        }
        
        // Очищаем обработанные candidates
        this.pendingIceCandidates[contactUuid] = [];
    }
    
    setupDataChannel(contactUuid, dc) {
        dc.onopen = () => {
            console.log(`✅ DataChannel с ${contactUuid} открыт`);
            this.dataChannels[contactUuid] = dc;
            this.updateConnectionStatus(contactUuid);
            
            if (window.nexpingApp) {
                window.nexpingApp.showNotification(`Соединение с контактом установлено`, 'success');
            }
        };
        
        dc.onclose = () => {
            console.log(`❌ DataChannel с ${contactUuid} закрыт`);
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
            try {
                dc.send(message);
                console.log(`Сообщение отправлено ${contactUuid}: ${message}`);
                return true;
            } catch (error) {
                console.error('Ошибка отправки сообщения:', error);
                return false;
            }
        } else {
            console.log(`Нет открытого DataChannel с ${contactUuid}, состояние: ${dc ? dc.readyState : 'no channel'}`);
            
            // Пытаемся переподключиться
            if (!this.peerConnections[contactUuid] || 
                this.peerConnections[contactUuid].connectionState === 'failed' ||
                this.peerConnections[contactUuid].connectionState === 'disconnected' ||
                this.peerConnections[contactUuid].connectionState === 'closed') {
                
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
            try {
                this.peerConnections[uuid].close();
            } catch (error) {
                console.error(`Ошибка при закрытии соединения с ${uuid}:`, error);
            }
        });
        
        this.peerConnections = {};
        this.dataChannels = {};
        this.pendingIceCandidates = {};
    }
}

// Инициализация WebRTC менеджера
document.addEventListener('DOMContentLoaded', () => {
    window.webrtcManager = new WebRTCManager();
});