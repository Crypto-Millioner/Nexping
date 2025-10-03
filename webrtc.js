// webrtc.js
class WebRTCManager {
    constructor() {
        this.peerConnections = {};
        this.dataChannels = {};
        this.stunServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ];
        
        this.init();
    }
    
    init() {
        // В реальном приложении здесь была бы логика установки P2P соединений
        // через сигнальный сервер, но так как мы работаем без бэкенда,
        // эта часть является упрощенной демонстрацией
        
        console.log('WebRTC Manager инициализирован');
    }
    
    initiateConnection(contactUuid) {
        // В реальном приложении здесь создавалось бы P2P соединение
        console.log(`Инициирование соединения с ${contactUuid}`);
        
        // Для демонстрации имитируем успешное соединение через 2 секунды
        setTimeout(() => {
            this.simulateConnection(contactUuid);
        }, 2000);
    }
    
    simulateConnection(contactUuid) {
        // Имитация успешного соединения для демонстрации
        this.dataChannels[contactUuid] = {
            send: (message) => {
                console.log(`Сообщение отправлено ${contactUuid}: ${message}`);
                // В реальном приложении сообщение отправлялось бы через data channel
                
                // Имитация получения ответа через случайное время
                setTimeout(() => {
                    if (window.nexpingApp) {
                        window.nexpingApp.receiveMessage(contactUuid, `Ответ на: ${message}`);
                    }
                }, 1000 + Math.random() * 2000);
            }
        };
        
        this.peerConnections[contactUuid] = { connected: true };
        
        // Обновляем статус соединения в UI
        if (window.nexpingApp && window.nexpingApp.activeContact === contactUuid) {
            window.nexpingApp.updateConnectionStatus();
        }
        
        console.log(`Соединение с ${contactUuid} установлено`);
    }
    
    sendMessage(contactUuid, message) {
        if (this.dataChannels[contactUuid]) {
            this.dataChannels[contactUuid].send(message);
            return true;
        } else {
            console.log(`Нет соединения с ${contactUuid}`);
            return false;
        }
    }
    
    isConnected(contactUuid) {
        return this.peerConnections[contactUuid] && this.peerConnections[contactUuid].connected;
    }
}

// Инициализация WebRTC менеджера
document.addEventListener('DOMContentLoaded', () => {
    window.webrtcManager = new WebRTCManager();
});