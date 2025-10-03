// script.js
class NexPingApp {
    constructor() {
        this.userUuid = null;
        this.contacts = [];
        this.activeContact = null;
        this.messages = {};
        
        this.init();
    }
    
    init() {
        this.generateUserUuid();
        this.loadContacts();
        this.loadMessages();
        this.setupEventListeners();
        this.renderContacts();
        this.setupAutoCleanup();
    }
    
    generateUserUuid() {
        // Проверяем, есть ли уже UUID в localStorage
        let storedUuid = localStorage.getItem('nexping_user_uuid');
        
        if (storedUuid) {
            this.userUuid = storedUuid;
        } else {
            // Генерируем новый UUID
            this.userUuid = 'user-' + Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
            localStorage.setItem('nexping_user_uuid', this.userUuid);
        }
        
        document.getElementById('userUuid').textContent = this.userUuid;
    }
    
    loadContacts() {
        const storedContacts = localStorage.getItem('nexping_contacts');
        if (storedContacts) {
            this.contacts = JSON.parse(storedContacts);
        }
    }
    
    saveContacts() {
        localStorage.setItem('nexping_contacts', JSON.stringify(this.contacts));
    }
    
    loadMessages() {
        const storedMessages = localStorage.getItem('nexping_messages');
        if (storedMessages) {
            this.messages = JSON.parse(storedMessages);
        }
    }
    
    saveMessages() {
        localStorage.setItem('nexping_messages', JSON.stringify(this.messages));
    }
    
    setupEventListeners() {
        // Копирование UUID
        document.getElementById('copyUuidBtn').addEventListener('click', () => {
            this.copyToClipboard(this.userUuid);
            this.showNotification('UUID скопирован в буфер обмена', 'success');
        });
        
        // Добавление контакта
        document.getElementById('addContactBtn').addEventListener('click', () => {
            this.openAddContactModal();
        });
        
        // Закрытие модального окна
        document.getElementById('closeAddContactModal').addEventListener('click', () => {
            this.closeAddContactModal();
        });
        
        document.getElementById('cancelAddContact').addEventListener('click', () => {
            this.closeAddContactModal();
        });
        
        // Сохранение контакта
        document.getElementById('saveContact').addEventListener('click', () => {
            this.saveNewContact();
        });
        
        // Отправка сообщения
        document.getElementById('sendMessageBtn').addEventListener('click', () => {
            this.sendMessage();
        });
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Очистка старых сообщений каждые 6 дней
        this.setupAutoCleanup();
    }
    
    openAddContactModal() {
        document.getElementById('addContactModal').style.display = 'flex';
        document.getElementById('contactUuid').value = '';
        document.getElementById('contactName').value = '';
    }
    
    closeAddContactModal() {
        document.getElementById('addContactModal').style.display = 'none';
    }
    
    saveNewContact() {
        const uuid = document.getElementById('contactUuid').value.trim();
        const name = document.getElementById('contactName').value.trim() || `Контакт ${this.contacts.length + 1}`;
        
        if (!uuid) {
            this.showNotification('Введите UUID контакта', 'error');
            return;
        }
        
        if (uuid === this.userUuid) {
            this.showNotification('Нельзя добавить себя в контакты', 'error');
            return;
        }
        
        // Проверяем, не добавлен ли уже этот контакт
        if (this.contacts.some(contact => contact.uuid === uuid)) {
            this.showNotification('Этот контакт уже добавлен', 'error');
            return;
        }
        
        // Добавляем контакт
        const newContact = {
            uuid: uuid,
            name: name,
            added: new Date().toISOString()
        };
        
        this.contacts.push(newContact);
        this.saveContacts();
        this.renderContacts();
        this.closeAddContactModal();
        this.showNotification('Контакт успешно добавлен', 'success');
        
        // Инициируем соединение WebRTC
        if (window.webrtcManager) {
            window.webrtcManager.initiateConnection(uuid);
        }
    }
    
    renderContacts() {
        const contactsList = document.getElementById('contactsList');
        
        if (this.contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-users"></i>
                    <p>У вас пока нет контактов</p>
                    <p>Добавьте контакт по UUID</p>
                </div>
            `;
            return;
        }
        
        contactsList.innerHTML = '';
        
        this.contacts.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = `contact-item ${this.activeContact === contact.uuid ? 'active' : ''}`;
            contactElement.dataset.uuid = contact.uuid;
            
            contactElement.innerHTML = `
                <div>
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-status">${contact.uuid}</div>
                </div>
                <div class="contact-actions">
                    <i class="fas fa-trash delete-contact" title="Удалить контакт"></i>
                </div>
            `;
            
            contactElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-contact')) {
                    this.selectContact(contact.uuid);
                }
            });
            
            // Удаление контакта
            const deleteBtn = contactElement.querySelector('.delete-contact');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteContact(contact.uuid);
            });
            
            contactsList.appendChild(contactElement);
        });
    }
    
    selectContact(uuid) {
        this.activeContact = uuid;
        this.renderContacts();
        this.renderChat();
        
        // Обновляем заголовок чата
        const contact = this.contacts.find(c => c.uuid === uuid);
        document.getElementById('chatTitle').textContent = contact.name;
        
        // Активируем поле ввода сообщения
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendMessageBtn').disabled = false;
        
        // Обновляем статус соединения
        this.updateConnectionStatus();
    }
    
    deleteContact(uuid) {
        if (confirm('Вы уверены, что хотите удалить этот контакт?')) {
            this.contacts = this.contacts.filter(contact => contact.uuid !== uuid);
            
            // Если удаляем активный контакт, сбрасываем активный контакт
            if (this.activeContact === uuid) {
                this.activeContact = null;
                this.renderChat();
                document.getElementById('chatTitle').textContent = 'Выберите контакт';
                document.getElementById('messageInput').disabled = true;
                document.getElementById('sendMessageBtn').disabled = true;
            }
            
            this.saveContacts();
            this.renderContacts();
            this.showNotification('Контакт удален', 'success');
        }
    }
    
    renderChat() {
        const chatArea = document.getElementById('chatArea');
        
        if (!this.activeContact) {
            chatArea.innerHTML = `
                <div class="no-chat">
                    <i class="far fa-comments"></i>
                    <p>Выберите контакт для начала общения</p>
                </div>
            `;
            return;
        }
        
        const contactMessages = this.messages[this.activeContact] || [];
        
        if (contactMessages.length === 0) {
            chatArea.innerHTML = `
                <div class="no-chat">
                    <i class="far fa-comments"></i>
                    <p>Нет сообщений</p>
                    <p>Начните общение с этим контактом</p>
                </div>
            `;
            return;
        }
        
        chatArea.innerHTML = '';
        
        contactMessages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.sender === this.userUuid ? 'sent' : 'received'}`;
            
            const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            messageElement.innerHTML = `
                <div class="message-text">${message.text}</div>
                <div class="message-time">${time}</div>
            `;
            
            chatArea.appendChild(messageElement);
        });
        
        // Прокручиваем вниз к последнему сообщению
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        
        if (!text || !this.activeContact) {
            return;
        }
        
        // Создаем сообщение
        const message = {
            id: 'msg-' + Date.now(),
            text: text,
            sender: this.userUuid,
            recipient: this.activeContact,
            timestamp: new Date().toISOString()
        };
        
        // Сохраняем сообщение локально
        if (!this.messages[this.activeContact]) {
            this.messages[this.activeContact] = [];
        }
        
        this.messages[this.activeContact].push(message);
        this.saveMessages();
        
        // Очищаем поле ввода
        messageInput.value = '';
        
        // Обновляем чат
        this.renderChat();
        
        // Отправляем сообщение через WebRTC
        if (window.webrtcManager) {
            window.webrtcManager.sendMessage(this.activeContact, text);
        }
    }
    
    receiveMessage(senderUuid, text) {
        // Сохраняем полученное сообщение
        if (!this.messages[senderUuid]) {
            this.messages[senderUuid] = [];
        }
        
        const message = {
            id: 'msg-' + Date.now(),
            text: text,
            sender: senderUuid,
            recipient: this.userUuid,
            timestamp: new Date().toISOString()
        };
        
        this.messages[senderUuid].push(message);
        this.saveMessages();
        
        // Если чат активен для этого отправителя, обновляем его
        if (this.activeContact === senderUuid) {
            this.renderChat();
        } else {
            // Показываем уведомление о новом сообщении
            const contact = this.contacts.find(c => c.uuid === senderUuid);
            if (contact) {
                this.showNotification(`Новое сообщение от ${contact.name}`, 'success');
            }
        }
    }
    
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        const indicator = statusElement.querySelector('.status-indicator');
        const statusText = statusElement.querySelector('span:last-child');
        
        if (window.webrtcManager && this.activeContact) {
            const isConnected = window.webrtcManager.isConnected(this.activeContact);
            
            if (isConnected) {
                indicator.className = 'status-indicator connected';
                statusText.textContent = 'Подключено';
            } else {
                indicator.className = 'status-indicator';
                statusText.textContent = 'Не подключено';
            }
        } else {
            indicator.className = 'status-indicator';
            statusText.textContent = 'Не подключено';
        }
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Ошибка копирования в буфер обмена: ', err);
        });
    }
    
    showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.opacity = '1';
        
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }
    
    setupAutoCleanup() {
        // Очищаем сообщения старше 6 дней
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
        
        for (const contactUuid in this.messages) {
            this.messages[contactUuid] = this.messages[contactUuid].filter(message => {
                return new Date(message.timestamp) > sixDaysAgo;
            });
            
            // Если массив сообщений пуст, удаляем его
            if (this.messages[contactUuid].length === 0) {
                delete this.messages[contactUuid];
            }
        }
        
        this.saveMessages();
        
        // Запускаем очистку каждые 24 часа
        setInterval(() => {
            this.setupAutoCleanup();
        }, 24 * 60 * 60 * 1000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.nexpingApp = new NexPingApp();
});