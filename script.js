// Основная логика приложения NexPing

class NexPingApp {
    constructor() {
        this.currentUser = null;
        this.contacts = [];
        this.activeContact = null;
        this.messages = {};
        
        this.init();
    }
    
    init() {
        this.loadUserData();
        this.loadContacts();
        this.setupEventListeners();
        this.renderContacts();
        
        // Инициализация WebRTC
        if (typeof webRTCManager !== 'undefined') {
            webRTCManager.init();
        }
    }
    
    // Загрузка данных пользователя
    loadUserData() {
        const userData = localStorage.getItem('nexping_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        } else {
            // Создание нового пользователя с UUID
            this.currentUser = {
                id: this.generateUUID(),
                name: 'Пользователь ' + Math.floor(Math.random() * 1000),
                avatar: this.getRandomColor()
            };
            localStorage.setItem('nexping_user', JSON.stringify(this.currentUser));
        }
        
        // Обновление UI
        document.getElementById('userName').textContent = this.currentUser.name;
        document.getElementById('userAvatar').textContent = this.currentUser.name.charAt(0).toUpperCase();
        document.getElementById('userAvatar').style.backgroundColor = this.currentUser.avatar;
        document.getElementById('myUUID').value = this.currentUser.id;
    }
    
    // Загрузка контактов
    loadContacts() {
        const contactsData = localStorage.getItem('nexping_contacts');
        if (contactsData) {
            this.contacts = JSON.parse(contactsData);
            // Очистка устаревших контактов (старше 6 дней)
            this.cleanOldContacts();
        }
        
        // Загрузка сообщений для каждого контакта
        this.contacts.forEach(contact => {
            this.loadMessages(contact.id);
        });
    }
    
    // Сохранение контактов
    saveContacts() {
        localStorage.setItem('nexping_contacts', JSON.stringify(this.contacts));
    }
    
    // Загрузка сообщений для контакта
    loadMessages(contactId) {
        const messagesKey = `nexping_messages_${contactId}`;
        const messagesData = localStorage.getItem(messagesKey);
        
        if (messagesData) {
            this.messages[contactId] = JSON.parse(messagesData);
            // Очистка старых сообщений (старше 6 дней)
            this.cleanOldMessages(contactId);
        } else {
            this.messages[contactId] = [];
        }
    }
    
    // Сохранение сообщений для контакта
    saveMessages(contactId) {
        const messagesKey = `nexping_messages_${contactId}`;
        localStorage.setItem(messagesKey, JSON.stringify(this.messages[contactId]));
    }
    
    // Очистка старых контактов
    cleanOldContacts() {
        const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
        const initialLength = this.contacts.length;
        
        this.contacts = this.contacts.filter(contact => {
            return contact.createdAt > sixDaysAgo;
        });
        
        if (this.contacts.length !== initialLength) {
            this.saveContacts();
        }
    }
    
    // Очистка старых сообщений
    cleanOldMessages(contactId) {
        const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
        const initialLength = this.messages[contactId].length;
        
        this.messages[contactId] = this.messages[contactId].filter(message => {
            return message.timestamp > sixDaysAgo;
        });
        
        if (this.messages[contactId].length !== initialLength) {
            this.saveMessages(contactId);
        }
    }
    
    // Генерация UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Получение случайного цвета для аватара
    getRandomColor() {
        const colors = [
            '#4a6ee0', '#e74c3c', '#2ecc71', '#f39c12', 
            '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопка добавления контакта
        document.getElementById('addContactBtn').addEventListener('click', () => {
            this.showAddContactModal();
        });
        
        // Модальное окно добавления контакта
        document.getElementById('closeAddContactModal').addEventListener('click', () => {
            this.hideAddContactModal();
        });
        
        document.getElementById('cancelAddContact').addEventListener('click', () => {
            this.hideAddContactModal();
        });
        
        document.getElementById('saveContact').addEventListener('click', () => {
            this.addContact();
        });
        
        // Модальное окно информации о чате
        document.getElementById('chatInfoBtn').addEventListener('click', () => {
            this.showChatInfoModal();
        });
        
        document.getElementById('closeChatInfoModal').addEventListener('click', () => {
            this.hideChatInfoModal();
        });
        
        document.getElementById('closeChatInfo').addEventListener('click', () => {
            this.hideChatInfoModal();
        });
        
        // Отправка сообщения
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Адаптивное меню
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    // Показать модальное окно добавления контакта
    showAddContactModal() {
        document.getElementById('addContactModal').style.display = 'flex';
        document.getElementById('contactUUID').value = '';
        document.getElementById('contactName').value = '';
    }
    
    // Скрыть модальное окно добавления контакта
    hideAddContactModal() {
        document.getElementById('addContactModal').style.display = 'none';
    }
    
    // Добавление контакта
    addContact() {
        const uuid = document.getElementById('contactUUID').value.trim();
        const name = document.getElementById('contactName').value.trim() || `Контакт ${this.contacts.length + 1}`;
        
        if (!uuid) {
            alert('Пожалуйста, введите UUID контакта');
            return;
        }
        
        if (uuid === this.currentUser.id) {
            alert('Нельзя добавить себя в контакты');
            return;
        }
        
        // Проверка на дубликат
        if (this.contacts.some(contact => contact.id === uuid)) {
            alert('Этот контакт уже добавлен');
            return;
        }
        
        const newContact = {
            id: uuid,
            name: name,
            avatar: this.getRandomColor(),
            createdAt: Date.now()
        };
        
        this.contacts.push(newContact);
        this.saveContacts();
        this.loadMessages(newContact.id);
        this.renderContacts();
        this.hideAddContactModal();
        
        // Попытка установить соединение через WebRTC
        if (typeof webRTCManager !== 'undefined') {
            webRTCManager.initiateConnection(uuid);
        }
    }
    
    // Удаление контакта
    deleteContact(contactId) {
        if (confirm('Вы уверены, что хотите удалить этот контакт?')) {
            this.contacts = this.contacts.filter(contact => contact.id !== contactId);
            this.saveContacts();
            
            // Удаление сообщений контакта
            localStorage.removeItem(`nexping_messages_${contactId}`);
            delete this.messages[contactId];
            
            this.renderContacts();
            
            if (this.activeContact && this.activeContact.id === contactId) {
                this.showEmptyChat();
            }
        }
    }
    
    // Отображение контактов
    renderContacts() {
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';
        
        if (this.contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <i class="fas fa-users"></i>
                    <p>Контакты не добавлены</p>
                </div>
            `;
            return;
        }
        
        this.contacts.forEach(contact => {
            const lastMessage = this.getLastMessage(contact.id);
            const contactElement = document.createElement('div');
            contactElement.className = 'contact-item';
            if (this.activeContact && this.activeContact.id === contact.id) {
                contactElement.classList.add('active');
            }
            
            contactElement.innerHTML = `
                <div class="contact-avatar" style="background-color: ${contact.avatar}">
                    ${contact.name.charAt(0).toUpperCase()}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="last-message">${lastMessage}</div>
                </div>
                <div class="contact-actions">
                    <button class="btn-icon delete-contact" data-id="${contact.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            contactElement.addEventListener('click', () => {
                this.selectContact(contact);
            });
            
            contactsList.appendChild(contactElement);
        });
        
        // Добавление обработчиков для кнопок удаления
        document.querySelectorAll('.delete-contact').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = button.getAttribute('data-id');
                this.deleteContact(contactId);
            });
        });
    }
    
    // Получение последнего сообщения для контакта
    getLastMessage(contactId) {
        if (!this.messages[contactId] || this.messages[contactId].length === 0) {
            return 'Нет сообщений';
        }
        
        const lastMessage = this.messages[contactId][this.messages[contactId].length - 1];
        return lastMessage.text.length > 30 
            ? lastMessage.text.substring(0, 30) + '...' 
            : lastMessage.text;
    }
    
    // Выбор контакта для чата
    selectContact(contact) {
        this.activeContact = contact;
        this.renderContacts();
        this.renderChat();
        
        // Активация поля ввода сообщения
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        
        // Обновление информации в модальном окне информации о чате
        document.getElementById('contactUUIDInfo').value = contact.id;
        
        // На мобильных устройствах скрываем sidebar после выбора контакта
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
    }
    
    // Отображение пустого чата
    showEmptyChat() {
        this.activeContact = null;
        this.renderContacts();
        
        document.getElementById('chatName').textContent = 'Выберите чат';
        document.getElementById('chatStatus').textContent = 'Начните общение';
        document.getElementById('chatAvatar').textContent = 'C';
        document.getElementById('chatAvatar').style.backgroundColor = '#95a5a6';
        
        document.getElementById('messagesContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>Начните общение</h3>
                <p>Выберите контакт из списка слева или добавьте новый</p>
            </div>
        `;
        
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
    }
    
    // Отображение чата
    renderChat() {
        if (!this.activeContact) {
            this.showEmptyChat();
            return;
        }
        
        document.getElementById('chatName').textContent = this.activeContact.name;
        document.getElementById('chatStatus').textContent = 'В сети';
        document.getElementById('chatAvatar').textContent = this.activeContact.name.charAt(0).toUpperCase();
        document.getElementById('chatAvatar').style.backgroundColor = this.activeContact.avatar;
        
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';
        
        if (!this.messages[this.activeContact.id] || this.messages[this.activeContact.id].length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <h3>Нет сообщений</h3>
                    <p>Напишите первое сообщение</p>
                </div>
            `;
            return;
        }
        
        this.messages[this.activeContact.id].forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.sender === this.currentUser.id ? 'sent' : 'received'}`;
            
            const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            messageElement.innerHTML = `
                <div class="message-text">${message.text}</div>
                <div class="message-time">${time}</div>
            `;
            
            messagesContainer.appendChild(messageElement);
        });
        
        // Прокрутка к последнему сообщению
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Отправка сообщения
    sendMessage() {
        if (!this.activeContact) return;
        
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        
        if (!text) return;
        
        const message = {
            id: this.generateUUID(),
            text: text,
            sender: this.currentUser.id,
            timestamp: Date.now()
        };
        
        // Добавление сообщения в локальное хранилище
        if (!this.messages[this.activeContact.id]) {
            this.messages[this.activeContact.id] = [];
        }
        
        this.messages[this.activeContact.id].push(message);
        this.saveMessages(this.activeContact.id);
        
        // Очистка поля ввода
        messageInput.value = '';
        
        // Обновление UI
        this.renderChat();
        this.renderContacts();
        
        // Отправка сообщения через WebRTC
        if (typeof webRTCManager !== 'undefined') {
            webRTCManager.sendMessage(this.activeContact.id, text);
        }
    }
    
    // Получение сообщения
    receiveMessage(contactId, text) {
        // Проверяем, есть ли такой контакт
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            // Если контакта нет, создаем его
            const newContact = {
                id: contactId,
                name: `Контакт ${contactId.substring(0, 8)}`,
                avatar: this.getRandomColor(),
                createdAt: Date.now()
            };
            
            this.contacts.push(newContact);
            this.saveContacts();
            this.loadMessages(newContact.id);
            this.renderContacts();
        }
        
        // Добавляем сообщение
        const message = {
            id: this.generateUUID(),
            text: text,
            sender: contactId,
            timestamp: Date.now()
        };
        
        if (!this.messages[contactId]) {
            this.messages[contactId] = [];
        }
        
        this.messages[contactId].push(message);
        this.saveMessages(contactId);
        
        // Обновляем UI, если это активный контакт
        if (this.activeContact && this.activeContact.id === contactId) {
            this.renderChat();
        }
        
        // Обновляем список контактов
        this.renderContacts();
    }
    
    // Показать модальное окно информации о чате
    showChatInfoModal() {
        if (!this.activeContact) {
            alert('Сначала выберите чат');
            return;
        }
        
        document.getElementById('chatInfoModal').style.display = 'flex';
    }
    
    // Скрыть модальное окно информации о чате
    hideChatInfoModal() {
        document.getElementById('chatInfoModal').style.display = 'none';
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NexPingApp();
});