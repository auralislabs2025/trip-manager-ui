// Authentication System

// Check if user is authenticated
function isAuthenticated() {
    const session = storage.SessionStorage.get();
    // Check for access_token (JWT token from backend)
    return session && session.access_token;
}

// Get current user
function getCurrentUser() {
    const session = storage.SessionStorage.get();
    if (!session) return null;
    
    // Return session info (username from session)
    return {
        username: session.username,
        loginTime: session.loginTime
    };
}

// Login function - calls backend API
async function login(username, password) {
    // Validate inputs
    if (!username || !password) {
        return { success: false, message: 'Please enter username and password' };
    }
    
    // Check if API is available
    if (!window.api) {
        return { success: false, message: 'API not initialized. Please refresh the page.' };
    }
    
    try {
        // Call backend login API
        const response = await window.api.post('/auth/login', {
            username: username,
            password: password
        });
        
        if (response.success) {
            // Store token and session info
            const session = {
                access_token: response.data.access_token,
                token_type: response.data.token_type || 'bearer',
                username: username,
                loginTime: new Date().toISOString()
            };
            
            storage.SessionStorage.set(session);
            
            return { 
                success: true, 
                message: 'Login successful',
                session: session 
            };
        } else {
            // Handle error response
            const errorMessage = response.error || response.data?.detail || 'Invalid credentials';
            return { 
                success: false, 
                message: errorMessage 
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            message: error.message || 'Network error. Please check your connection.' 
        };
    }
}

// Logout function
function logout() {
    storage.SessionStorage.clear();
    window.location.href = 'index.html';
}

// Protect route - redirect to login if not authenticated
function protectRoute() {
    if (!isAuthenticated()) {
        // Determine correct path to index.html based on current location
        const currentPath = window.location.pathname;
        let redirectPath = 'index.html';
        
        // If we're in a subdirectory, go up one level
        if (currentPath.includes('/trips-table/') || currentPath.includes('\\trips-table\\')) {
            redirectPath = '../index.html';
        }
        
        window.location.href = redirectPath;
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
        if (el) el.textContent = session.username || 'User';
    });
    
    // Role is not available from backend token, so hide or set default
    userRoleElements.forEach(el => {
        if (el) {
            // You can fetch user role from backend if needed
            el.textContent = 'User';
        }
    });
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    // Login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
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
            
            // Disable submit button and show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Signing in...';
            
            // Attempt login with backend API
            try {
                const result = await login(username, password);
                
                if (result.success) {
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // Show error
                    if (errorMessage) {
                        errorMessage.textContent = result.message;
                        errorMessage.style.display = 'block';
                    }
                    // Re-enable submit button
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            } catch (error) {
                // Handle unexpected errors
                if (errorMessage) {
                    errorMessage.textContent = 'An unexpected error occurred. Please try again.';
                    errorMessage.style.display = 'block';
                }
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
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

