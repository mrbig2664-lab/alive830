const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if ('serviceWorker' in navigator && window.isSecureContext && !isLocalDevelopment) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // PWA registration is progressive enhancement; the app remains usable if it fails.
    });
  });
}
