// =====================================================
// SW.JS : SERVICE WORKER (SITE DISPONIBLE HORS LIGNE)
// =====================================================
// Ce fichier doit rester à côté de index.html.
// Si tu ajoutes un nouveau fichier au site, ajoute-le dans APP_FILES
// et change le numéro de CACHE_NAME (ex : "mandarin-v2").

const CACHE_NAME = "mandarin-v1";

const APP_FILES = [
    "./",
    "index.html",
    "style.css",
    "script.js",
    "config.js",
    "state.js",
    "firebase.js",
    "ui.js",
    "navigation.js",
    "auth.js",
    "vocabulary.js",
    "notes.js",
    "dashboard.js",
    "revisions.js",
    "ecriture.js",
    "offline.js",
    "favicon.png"
];

// Sites externes dont on garde une copie (Firebase, tracé des caractères)
const CACHED_HOSTS = [
    self.location.hostname,
    "www.gstatic.com",
    "cdn.jsdelivr.net"
];

// Installation : garder les fichiers du site en mémoire
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.all(APP_FILES.map(file => cache.add(file).catch(() => {})))
        ).then(() => self.skipWaiting())
    );
});

// Activation : supprimer les anciennes versions
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// Chargement : internet d'abord (pour avoir la dernière version),
// sinon la copie gardée en mémoire
self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (!CACHED_HOSTS.includes(url.hostname)) return;

    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok || response.type === "opaque") {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(() =>
                caches.match(request, { ignoreSearch: true }).then(cached =>
                    cached || (request.mode === "navigate" ? caches.match("index.html") : Response.error())
                )
            )
    );
});
