const CACHE_NAME = 'matriculas-pucpr-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/public/css/style.css',
    '/public/js/app.js',
    '/manifest.json'
];

// Evento de Instalação: Salva os arquivos essenciais no cache do navegador
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Armazenando arquivos no cache estrutural');
            return cache.addAll(ASSETS);
        })
    );
});

// Evento de Ativação: Limpa caches antigos se houver atualizações no código
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('Service Worker: Limpando cache antigo', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// Estratégia de Cache: Tenta buscar na rede primeiro para garantir dados atualizados; se falhar (offline), busca no cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});