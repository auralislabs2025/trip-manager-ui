// Authentication System

// Check if user is authenticated
function isAuthenticated() {
    const session = storage.SessionStorage.get();
    return session && session.userId && session.role;
}

// Get current user
function getCurrentUser() {
    const session = storage.SessionStorage.get();
    if (!session) return null;
    
    const users = storage.UserStorage.getAll();
    const user = users.find(u => u.id === session.userId);
    return user || null;
}

// Login function
function login(username, password, role) {
    const user = storage.UserStorage.getByUsername(username);
    
    if (!user) {
        return { success: false, message: 'Invalid username or password' };
    }
    
    // Check password
    const hashedPassword = storage.hashPassword(password);
    if (user.password !== hashedPassword) {
        return { success: false, message: 'Invalid username or password' };
    }
    
    // Check role if specified
    if (role && user.role !== role) {
        return { success: false, message: 'Invalid role selected' };
    }
    
    // Create session
    const session = {
        userId: user.id,
        username: user.username,
        role: user.role,
        loginTime: new Date().toISOString()
    };
    
    storage.SessionStorage.set(session);
    
    return { success: true, user: user, session: session };
}

// Logout function
function logout() {
    storage.SessionStorage.clear();
    window.location.href = 'index.html';
}

// Protect route - redirect to login if not authenticated
function protectRoute() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Update user info in navigation
function updateUserInfo() {
    const session = storage.SessionStorage.get();
    if (!session) return;
    
    const userNameElements = document.querySelectorAll('#userName');
    const userRoleElements = document.querySelectorAll('#userRole');
    
    userNameElements.forEach(el => {
        if (el) el.textContent = session.username;
    });
    
    userRoleElements.forEach(el => {
        if (el) {
            el.textContent = session.role.charAt(0).toUpperCase() + session.role.slice(1);
        }
    });
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    // Login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            const errorMessage = document.getElementById('errorMessage');
            
            // Clear previous error
            if (errorMessage) {
                errorMessage.style.display = 'none';
                errorMessage.textContent = '';
            }
            
            // Validate inputs
            if (!username || !password) {
                if (errorMessage) {
                    errorMessage.textContent = 'Please enter username and password';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            // Attempt login
            const result = login(username, password, role);
            
            if (result.success) {
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Show error
                if (errorMessage) {
                    errorMessage.textContent = result.message;
                    errorMessage.style.display = 'block';
                }
            }
        });
    }
    
    // Logout button
    const logoutButtons = document.querySelectorAll('#logoutBtn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    });
    
    // Protect routes (except login page)
    if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('index.html')) {
        if (!protectRoute()) {
            return;
        }
        updateUserInfo();
    }
});

// Export auth functions
window.auth = {
    isAuthenticated,
    getCurrentUser,
    login,
    logout,
    protectRoute,
    updateUserInfo
};

