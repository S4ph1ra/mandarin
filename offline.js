// =====================================================
// OFFLINE.JS : MODE HORS LIGNE
// =====================================================
// - affiche un bandeau quand il n'y a plus de connexion
// - enregistre le "service worker" (sw.js) qui garde le site en mémoire

import { el } from "./ui.js";
import { TEXTS } from "./config.js";

export function initOffline() {

    // Bandeau d'information
    const banner = el("div", "", TEXTS.offlineBanner);
    banner.id = "offline-banner";
    document.body.appendChild(banner);

    function updateBanner() {
        banner.classList.toggle("show", !navigator.onLine);
    }

    window.addEventListener("online", updateBanner);
    window.addEventListener("offline", updateBanner);
    updateBanner();

    // Garder le site en mémoire pour l'ouvrir sans connexion
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(error => {
            console.warn("Mode hors ligne indisponible :", error);
        });
    }
}
