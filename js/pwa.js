// PWA Installation and Service Worker Registration

// Register service worker
// if ('serviceWorker' in navigator) {
//     // Only register service worker if running on http/https (not file://)
//     if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
//         window.addEventListener('load', () => {
//             navigator.serviceWorker.register('/service-worker.js')
//                 .then((registration) => {
//                     console.log('Service Worker registered:', registration);
//                 })
//                 .catch((error) => {
//                     if (!error.message.includes('protocol')) {
//                         console.error('Service Worker registration failed:', error);
//                     }
//                 });
//         });
//     }
// }

console.warn('🚫 PWA / Service Worker disabled');

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




