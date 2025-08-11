document.addEventListener('DOMContentLoaded', () => {

    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerTab = document.querySelector('[data-tab="register"]');
    const contactsList = document.getElementById('contacts-list');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const contactSearch = document.getElementById('contact-search');
    const chatSection = document.getElementById('chat-section');
    const contactsSection = document.getElementById('contacts-section');
    const backToContacts = document.getElementById('back-to-contacts');
    const profileBtn = document.getElementById('profile-btn');
    const addContactBtn = document.getElementById('add-contact-btn');
    const callBtn = document.getElementById('call-btn');

    const profileModal = document.getElementById('profile-modal');
    const addContactModal = document.getElementById('add-contact-modal');
    const callModal = document.getElementById('call-modal');
    const userAvatar = document.getElementById('user-avatar');
    const userNameInput = document.getElementById('user-name');
    const userUuidSpan = document.getElementById('user-uuid');
    const saveProfileBtn = document.getElementById('save-profile');
    const copyUuidBtn = document.getElementById('copy-uuid');
    const contactUuidInput = document.getElementById('contact-uuid');
    const addContactBtnModal = document.getElementById('add-contact');
    const endCallBtn = document.getElementById('end-call');
    
    let currentUser = null;
    let currentContact = null;
    
    init();
    
    function init() {
        setupEventListeners();
        checkAuth();
    }
    
    function setupEventListeners() {
    
        loginTab.addEventListener('click', () => switchAuthTab('login'));
        registerTab.addEventListener('click', () => switchAuthTab('register'));
        
        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);
     
        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        backToContacts.addEventListener('click', showContacts);
        profileBtn.addEventListener('click', () => showModal(profileModal));
        addContactBtn.addEventListener('click', () => showModal(addContactModal));
        callBtn.addEventListener('click', startCall);
       
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
        
        saveProfileBtn.addEventListener('click', saveProfile);
        copyUuidBtn.addEventListener('click', copyUuid);
        document.getElementById('avatar-upload').addEventListener('change', handleAvatarUpload);
        
        addContactBtnModal.addEventListener('click', addNewContact);
        
        endCallBtn.addEventListener('click', endCall);
        
        contactSearch.addEventListener('input', searchContacts);
    }

    function checkAuth() {
        const user = getCurrentUser();
        if (user) {
            currentUser = user;
            initP2P(user.uuid);
            showMainScreen();
            loadContacts();
        }
    }

    function switchAuthTab(tab) {
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'flex';
            registerForm.style.display = 'none';
        } else {
            registerTab.classList.remove('active');
            loginTab.classList.add('active');
            registerForm.style.display = 'flex';
            loginForm.style.display = 'none';
        }
    }
    
    function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        const user = loginUser(username, password);
        if (user) {
            currentUser = user;
            initP2P(user.uuid);
            showMainScreen();
            loadContacts();
        } else {
            alert('Неверное имя пользователя или пароль');
        }
    }
    
    function handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        
        if (registerUser(username, password)) {
            currentUser = getCurrentUser();
            initP2P(currentUser.uuid);
            showMainScreen();
            loadContacts();
        } else {
            alert('Пользователь с таким именем уже существует');
        }
    }
    
    function showMainScreen() {
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
        updateProfileUI();
    }
    
    function updateProfileUI() {

    userAvatar.src = generateAvatar(currentUser.uuid);
    userNameInput.value = currentUser.name || '';
    userUuidSpan.textContent = currentUser.uuid;
}

function generateAvatar(uuid, size = 100) {

    return `https://api.dicebear.com/7.x/identicon/svg?seed=${uuid}&size=${size}`;
}
    
    function loadContacts() {
        const contacts = getContacts();
        contactsList.innerHTML = '';
        
        contacts.forEach(contact => {
            const contactEl = document.createElement('div');
            contactEl.className = 'contact-item';
            contactEl.innerHTML = `
                <img src="${contact.avatar || generateAvatar(contact.uuid, 40)}" alt="${contact.name}">
                <div class="contact-info">
                    <div class="contact-name">${escapeHTML(contact.name)}</div>
                </div>
            `;
            contactEl.addEventListener('click', () => openChat(contact));
            contactsList.appendChild(contactEl);
        });
    }
    
    function searchContacts() {
        const term = contactSearch.value.toLowerCase();
        const contacts = getContacts();
        
        contactsList.innerHTML = '';
        
        contacts
            .filter(contact => contact.name.toLowerCase().includes(term))
            .forEach(contact => {
                const contactEl = document.createElement('div');
                contactEl.className = 'contact-item';
                contactEl.innerHTML = `
                    <img src="${contact.avatar || generateAvatar(contact.uuid, 40)}" alt="${contact.name}">
                    <div class="contact-info">
                        <div class="contact-name">${escapeHTML(contact.name)}</div>
                    </div>
                `;
                contactEl.addEventListener('click', () => openChat(contact));
                contactsList.appendChild(contactEl);
            });
    }

    function openChat(contact) {
        currentContact = contact;
        document.getElementById('current-contact-name').textContent = contact.name;
        document.getElementById('current-contact-avatar').src = contact.avatar || generateAvatar(contact.uuid, 40);
        
        contactsSection.style.display = 'none';
        chatSection.style.display = 'flex';
        
        loadMessages(contact.uuid);
    }

    function showContacts() {
        contactsSection.style.display = 'flex';
        chatSection.style.display = 'none';
        currentContact = null;
    }
    
    function loadMessages(contactUuid) {
        const messages = getMessages(contactUuid);
        messagesContainer.innerHTML = '';
        
        messages.forEach(msg => {
            addMessageToUI(msg, msg.sender === currentUser.uuid);
        });
    }
    
    function addMessageToUI(message, isSent) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isSent ? 'sent' : 'received'}`;
        messageEl.textContent = message.text;
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !currentContact) return;
        
        const message = {
            id: Date.now(),
            text: escapeHTML(text),
            sender: currentUser.uuid,
            receiver: currentContact.uuid,
            timestamp: Date.now()
        };
        
        saveMessage(message);
        addMessageToUI(message, true);
        
        sendP2PMessage(currentContact.uuid, message);
        
        messageInput.value = '';
    }
    
    function handleIncomingMessage(message) {
        if (message.sender === currentContact?.uuid) {
            addMessageToUI(message, false);
        }
        saveMessage(message);
    }
    
    function handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                userAvatar.src = event.target.result;
                currentUser.avatar = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    function saveProfile() {
        currentUser.name = userNameInput.value.trim();
        updateUser(currentUser);
        profileModal.classList.remove('active');
        loadContacts();
    }
    
    function copyUuid() {
        navigator.clipboard.writeText(currentUser.uuid);
        alert('UUID скопирован в буфер обмена!');
    }
    
    function addNewContact() {
        const uuid = contactUuidInput.value.trim();
        if (!uuid) return;
        
        if (uuid === currentUser.uuid) {
            alert('Нельзя добавить самого себя');
            return;
        }
        
        const contact = {
    uuid,
    name: `Контакт ${uuid.substring(0, 8)}`,
    avatar: generateAvatar(uuid, 40)
};
        
        addContact(contact);
        addContactModal.classList.remove('active');
        contactUuidInput.value = '';
        loadContacts();
    }
    
    function startCall() {
        if (!currentContact) return;
        showModal(callModal);
        startP2PCall(currentContact.uuid);
    }

    function endCall() {
        endP2PCall();
        callModal.classList.remove('active');
    }

    function showModal(modal) {
        modal.classList.add('active');
    }
    
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[tag] || tag));
    }
    
    function getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser'));
    }
    
    function setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    function loginUser(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        if (user) setCurrentUser(user);
        return user;
    }
    
    function registerUser(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.username === username)) return false;
        
        const user = {
    uuid: generateUUID(),
    username,
    password,
    name: username,
    avatar: generateAvatar(generateUUID())
};
        
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
        setCurrentUser(user);
        return true;
    }
    
    function updateUser(user) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const index = users.findIndex(u => u.uuid === user.uuid);
        if (index !== -1) {
            users[index] = user;
            localStorage.setItem('users', JSON.stringify(users));
            setCurrentUser(user);
        }
    }
    
    function getContacts() {
        return JSON.parse(localStorage.getItem(`${currentUser.uuid}_contacts`) || '[]');
    }
    
    function addContact(contact) {
        const contacts = getContacts();
        if (!contacts.some(c => c.uuid === contact.uuid)) {
            contacts.push(contact);
            localStorage.setItem(`${currentUser.uuid}_contacts`, JSON.stringify(contacts));
        }
    }
    
    function getMessages(contactUuid) {
        const messages = JSON.parse(localStorage.getItem(`${currentUser.uuid}_${contactUuid}_messages`) || '[]');
        return messages.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    function saveMessage(message) {
        const key = `${message.sender}_${message.receiver}_messages`;
        const messages = JSON.parse(localStorage.getItem(key) || '[]');
        messages.push(message);
        localStorage.setItem(key, JSON.stringify(messages));
    }
    
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
});