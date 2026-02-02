// PWA Installation and Service Worker Registration

// Disable service worker to avoid UI caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.getRegistrations()
            .then((registrations) => {
                registrations.forEach((registration) => registration.unregister());
            })
            .catch((error) => {
                console.warn('Service Worker unregister failed:', error);
            });
    });
}

// Handle install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button or banner
    showInstallPrompt();
});

// Show install prompt
function showInstallPrompt() {
    // You can show a custom install button here
    // For now, we'll just log it
    console.log('PWA install prompt available');
}

// Install PWA
function installPWA() {
    if (!deferredPrompt) {
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            utils.showToast('App installed successfully!', 'success');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        deferredPrompt = null;
    });
}

// Check if app is installed
function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
}

// Export PWA functions
window.pwa = {
    installPWA,
    isPWAInstalled
};




