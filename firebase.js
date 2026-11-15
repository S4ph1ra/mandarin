// =====================================================
// FIREBASE.JS : CONNEXION À FIREBASE
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { firebaseConfig } from "./config.js";
import { state } from "./state.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Raccourcis : les données de chaque utilisateur sont dans users/{id}/...
export function userCollection(name) {
    return collection(db, "users", state.user.uid, name);
}

export function userDoc(name, id) {
    return doc(db, "users", state.user.uid, name, id);
}
