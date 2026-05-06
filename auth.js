/* ===== Authentication Module ===== */
const AUTH_KEY = 'ren_users';
const SESSION_KEY = 'ren_session';

/* ===== Credenciales Admin por Defecto ===== */
/* Modificar aquí para cambiar usuario/contraseña del admin */
const DEFAULT_ADMIN = {
    id: 'admin_root',
    name: 'Administrador',
    username: 'admin',
    defaultPassword: 'admin123',
    isAdmin: true,
    createdAt: '2026-01-01T00:00:00Z'
};

/* SHA-256 Hash */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Ensure default admin exists — restores if missing */
async function ensureDefaultAdmin() {
    const users = getUsers();
    const adminExists = users.find(u => u.id === DEFAULT_ADMIN.id);
    if (!adminExists) {
        const hash = await hashPassword(DEFAULT_ADMIN.defaultPassword);
        users.push({
            id: DEFAULT_ADMIN.id,
            name: DEFAULT_ADMIN.name,
            username: DEFAULT_ADMIN.username,
            passwordHash: hash,
            isAdmin: true,
            createdAt: DEFAULT_ADMIN.createdAt
        });
        saveUsers(users);
        console.log('✅ Cuenta admin restaurada: usuario "admin", contraseña "admin123"');
    }
}

/* Get stored users */
function getUsers() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || []; }
    catch { return []; }
}

function saveUsers(users) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
}

/* Session management */
function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch { return null; }
}

function setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        username: user.username,
        name: user.name,
        isAdmin: user.isAdmin || false,
        loginTime: Date.now()
    }));
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

/* Toggle password visibility */
function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🔒';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

/* Show the main app */
function showApp(session) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    const badge = document.getElementById('userBadge');
    const rolLabel = session.isAdmin ? '👑 ' : '👤 ';
    badge.textContent = rolLabel + (session.name || session.username);
    badge.title = 'Sesión: ' + session.username + (session.isAdmin ? ' (Administrador)' : '');
}

/* Show login screen */
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginError').textContent = '';
    document.getElementById('formLogin').reset();
}

/* Login handler */
document.getElementById('formLogin').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim().toLowerCase();
    const password = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
        errorEl.textContent = 'Completa todos los campos';
        return;
    }

    const users = getUsers();
    const hash = await hashPassword(password);
    const user = users.find(u => u.username === username && u.passwordHash === hash);

    if (!user) {
        errorEl.textContent = 'Usuario o contraseña incorrectos';
        document.getElementById('loginPass').value = '';
        return;
    }

    setSession(user);
    showApp(getSession());
    errorEl.textContent = '';
});

/* Logout */
document.getElementById('btnLogout').addEventListener('click', function() {
    clearSession();
    showLoginScreen();
});

/* ===== Change Password ===== */
document.getElementById('btnChangePass').addEventListener('click', function() {
    document.getElementById('formChangePass').reset();
    document.getElementById('cpError').textContent = '';
    document.getElementById('passOverlay').classList.add('active');
    document.getElementById('cpCurrent').focus();
});

document.getElementById('formChangePass').addEventListener('submit', async function(e) {
    e.preventDefault();
    const current = document.getElementById('cpCurrent').value;
    const newPass = document.getElementById('cpNew').value;
    const confirm = document.getElementById('cpConfirm').value;
    const errorEl = document.getElementById('cpError');

    if (!current || !newPass || !confirm) {
        errorEl.textContent = 'Completa todos los campos';
        return;
    }

    if (newPass.length < 6) {
        errorEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres';
        return;
    }

    if (newPass !== confirm) {
        errorEl.textContent = 'Las contraseñas nuevas no coinciden';
        return;
    }

    if (current === newPass) {
        errorEl.textContent = 'La nueva contraseña debe ser diferente a la actual';
        return;
    }

    const session = getSession();
    if (!session) return;

    const users = getUsers();
    const currentHash = await hashPassword(current);
    const userIndex = users.findIndex(u => u.username === session.username && u.passwordHash === currentHash);

    if (userIndex === -1) {
        errorEl.textContent = 'La contraseña actual es incorrecta';
        document.getElementById('cpCurrent').value = '';
        return;
    }

    const newHash = await hashPassword(newPass);
    users[userIndex].passwordHash = newHash;
    saveUsers(users);

    closeModal('passOverlay');
    if (typeof toast === 'function') {
        toast('Contraseña actualizada correctamente', 'success');
    }
});

/* Close password modal on overlay click */
document.getElementById('passOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal('passOverlay');
});

/* ===== Init: Check session on load ===== */
(async function initAuth() {
    // Apply theme before anything renders
    if (localStorage.getItem('ren_theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = '☀️';
    }

    // Ensure default admin account exists
    await ensureDefaultAdmin();

    const session = getSession();
    if (session) {
        showApp(session);
    } else {
        showLoginScreen();
    }
})();
