// =====================================================
// OFFLINE.JS : MODE HORS LIGNE ET SUIVI DE LA SYNCHRONISATION
// =====================================================
// - affiche un bandeau quand il n'y a plus de connexion
// - affiche l'état de la synchronisation avec Firebase :
//     ⏳ en cours, ✅ terminée, ⚠️ lente ou impossible
// - enregistre le "service worker" (sw.js) qui garde le site en mémoire

import { waitForPendingWrites } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { db } from "./firebase.js";
import { onStateChange } from "./state.js";
import { el } from "./ui.js";
import { TEXTS } from "./config.js";

// ---------- TEXTES ET RÉGLAGES (modifie ici) ----------
const SYNC = {
    pending: "⏳ Synchronisation en cours...",
    slow: "⚠️ La synchronisation est lente ou impossible. Vérifie ta connexion, puis recharge la page.",
    synced: "✅ Tout est synchronisé.",

    colors: {
        offline: "var(--dark-red)",
        pending: "#A06A00",
        slow: "#8B1E2B",
        synced: "#2E7D4F"
    },

    showAfter: 1200,      // affiche "en cours" si ça dure plus de 1,2 seconde
    slowAfter: 20000,     // affiche l'avertissement après 20 secondes
    hideAfter: 3000       // cache "synchronisé" après 3 secondes
};

export function initOffline() {

    // ---------- BANDEAU ----------
    const banner = el("div", "", "");
    banner.id = "offline-banner";
    document.body.appendChild(banner);

    let currentKind = "hidden";

    function setBanner(kind) {
        currentKind = kind;

        if (kind === "hidden") {
            banner.classList.remove("show");
            return;
        }

        banner.textContent = kind === "offline" ? TEXTS.offlineBanner : SYNC[kind];
        banner.style.background = SYNC.colors[kind];
        banner.classList.add("show");
    }

    // ---------- SUIVI DE LA SYNCHRONISATION ----------
    let syncToken = 0;       // identifie la vérification en cours
    let hadPending = false;  // des modifications attendaient d'être envoyées
    let showTimer = null;
    let slowTimer = null;
    let hideTimer = null;

    function watchSync() {
        const token = ++syncToken;

        clearTimeout(showTimer);
        clearTimeout(slowTimer);
        clearTimeout(hideTimer);

        if (!navigator.onLine) return;

        showTimer = setTimeout(() => {
            if (token !== syncToken) return;
            hadPending = true;
            setBanner("pending");
        }, SYNC.showAfter);

        slowTimer = setTimeout(() => {
            if (token !== syncToken || !navigator.onLine) return;
            hadPending = true;
            setBanner("slow");
        }, SYNC.slowAfter);

        // Se termine quand Firebase a bien reçu toutes les modifications
        waitForPendingWrites(db).then(() => {
            if (token !== syncToken) return;

            clearTimeout(showTimer);
            clearTimeout(slowTimer);

            if (hadPending) {
                hadPending = false;
                setBanner("synced");
                hideTimer = setTimeout(() => setBanner("hidden"), SYNC.hideAfter);
            } else if (currentKind !== "offline") {
                setBanner("hidden");
            }
        }).catch(error => {
            console.error("Suivi de synchronisation :", error);
        });
    }

    // À chaque modification des données, on vérifie l'envoi
    onStateChange(watchSync);

    window.addEventListener("offline", () => {
        syncToken++;                       // annule la vérification en cours
        clearTimeout(showTimer);
        clearTimeout(slowTimer);
        hadPending = true;
        setBanner("offline");
    });

    window.addEventListener("online", () => {
        hadPending = true;
        setBanner("pending");
        watchSync();
    });

    if (!navigator.onLine) {
        hadPending = true;
        setBanner("offline");
    }

    // ---------- SITE DISPONIBLE HORS LIGNE ----------
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(error => {
            console.warn("Mode hors ligne indisponible :", error);
        });
    }
}
