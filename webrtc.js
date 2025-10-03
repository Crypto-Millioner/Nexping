// WebRTC менеджер для установки P2P соединений

class WebRTCManager {
    constructor() {
        this.peerConnections = {};
        this.dataChannels = {};
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }
    
    init() {
        console.log('WebRTC Manager инициализирован');
    }
    
    // Инициирование соединения с контактом
    initiateConnection(contactId) {
        console.log(`Инициирование соединения с ${contactId}`);
        
        // Создание PeerConnection
        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections[contactId] = peerConnection;
        
        // Создание канала данных
        const dataChannel = peerConnection.createDataChannel('messaging', {
            ordered: true
        });
        
        this.setupDataChannel(dataChannel, contactId);
        
        // Обработчики событий ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // В реальном приложении здесь бы отправлялся кандидат сигнальному серверу
                console.log('Новый ICE кандидат:', event.candidate);
            }
        };
        
        // Создание офера
        peerConnection.createOffer()
            .then(offer => {
                return peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                console.log('Офер создан');
                // В реальном приложении здесь бы офер отправлялся контакту через сигнальный сервер
            })
            .catch(error => {
                console.error('Ошибка создания офера:', error);
            });
        
        // Обработка входящих сообщений
        peerConnection.ondatachannel = (event) => {
            const dataChannel = event.channel;
            this.setupDataChannel(dataChannel, contactId);
        };
    }
    
    // Настройка канала данных
    setupDataChannel(dataChannel, contactId) {
        this.dataChannels[contactId] = dataChannel;
        
        dataChannel.onopen = () => {
            console.log(`Канал данных с ${contactId} открыт`);
            // Можно обновить статус соединения в UI
        };
        
        dataChannel.onclose = () => {
            console.log(`Канал данных с ${contactId} закрыт`);
            // Можно обновить статус соединения в UI
        };
        
        dataChannel.onmessage = (event) => {
            console.log(`Получено сообщение от ${contactId}:`, event.data);
            
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'text') {
                    // Передаем сообщение в основное приложение
                    if (typeof app !== 'undefined') {
                        app.receiveMessage(contactId, message.content);
                    }
                }
            } catch (error) {
                console.error('Ошибка обработки сообщения:', error);
            }
        };
    }
    
    // Отправка сообщения
    sendMessage(contactId, text) {
        const dataChannel = this.dataChannels[contactId];
        
        if (dataChannel && dataChannel.readyState === 'open') {
            const message = {
                type: 'text',
                content: text,
                timestamp: Date.now()
            };
            
            dataChannel.send(JSON.stringify(message));
            console.log(`Сообщение отправлено ${contactId}:`, text);
        } else {
            console.warn(`Канал данных с ${contactId} не доступен`);
            // Сообщение будет сохранено локально, но не отправлено
        }
    }
    
    // Обработка входящего офера (в реальном приложении)
    handleOffer(contactId, offer) {
        console.log(`Обработка офера от ${contactId}`);
        
        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections[contactId] = peerConnection;
        
        // Обработчики событий ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // В реальном приложении здесь бы отправлялся кандидат сигнальному серверу
                console.log('Новый ICE кандидат:', event.candidate);
            }
        };
        
        // Установка удаленного описания
        peerConnection.setRemoteDescription(offer)
            .then(() => {
                return peerConnection.createAnswer();
            })
            .then(answer => {
                return peerConnection.setLocalDescription(answer);
            })
            .then(() => {
                console.log('Ответ создан');
                // В реальном приложении здесь бы ответ отправлялся контакту через сигнальный сервер
            })
            .catch(error => {
                console.error('Ошибка обработки офера:', error);
            });
        
        // Обработка входящих каналов данных
        peerConnection.ondatachannel = (event) => {
            const dataChannel = event.channel;
            this.setupDataChannel(dataChannel, contactId);
        };
    }
    
    // Обработка ICE кандидата (в реальном приложении)
    handleICECandidate(contactId, candidate) {
        const peerConnection = this.peerConnections[contactId];
        if (peerConnection) {
            peerConnection.addIceCandidate(candidate)
                .catch(error => {
                    console.error('Ошибка добавления ICE кандидата:', error);
                });
        }
    }
}

// Создание экземпляра WebRTC менеджера
const webRTCManager = new WebRTCManager();