// =====================================================
// FIREBASE.JS : CONNEXION À FIREBASE (AVEC MODE HORS LIGNE)
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentSingleTabManager,
    collection,
    doc,
    getDocs,
    getDocsFromCache
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { firebaseConfig } from "./config.js";
import { state } from "./state.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Le cache garde une copie des données dans l'appareil.
// Hors ligne, les ajouts sont mis de côté puis envoyés à la reconnexion.
// - persistentSingleTabManager : plus fiable sur tablette (un seul onglet)
// - experimentalAutoDetectLongPolling : aide quand la connexion directe échoue
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true })
    }),
    experimentalAutoDetectLongPolling: true
});

// Raccourcis : les données de chaque utilisateur sont dans users/{id}/...
export function userCollection(name) {
    return collection(db, "users", state.user.uid, name);
}

export function userDoc(name, id) {
    return doc(db, "users", state.user.uid, name, id);
}

// Crée une référence avec un identifiant tout de suite (sans attendre le serveur)
export function newDocRef(name) {
    return doc(userCollection(name));
}

// Envoie une écriture sans bloquer l'écran.
// Hors ligne, elle part toute seule à la reconnexion.
export function sendWrite(promise, errorMessage) {
    promise.catch(error => {
        console.error(error);
        alert(errorMessage);
    });
}

// Charge une collection : depuis le serveur si possible, sinon depuis l'appareil
export async function loadDocs(name) {
    const reference = userCollection(name);
    let snapshot;

    if (!navigator.onLine) {
        snapshot = await getDocsFromCache(reference);
    } else {
        try {
            snapshot = await getDocs(reference);
        } catch (error) {
            snapshot = await getDocsFromCache(reference);
        }
    }

    return snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
}
