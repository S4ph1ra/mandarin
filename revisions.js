// =====================================================
// REVISIONS.JS : PAGE RÉVISIONS (À COMPLÉTER PAR TOI)
// =====================================================
// Le conteneur HTML est dans index.html : <div id="revisions-container">
//
// Données disponibles :
//   state.categories → [{ id, name, icon, words: [{ chinese, pinyin, translation, example }] }]
//   state.notes.cours / state.notes.grammaire → [{ id, title, content }]
//
// onStateChange(() => ...) te permet de réagir quand les données
// changent (chargement, ajout d'un mot, etc.).

import { state, onStateChange } from "./state.js";

export function initRevisions() {
    const container = document.getElementById("revisions-container");
    if (!container) return;

    // Exemple pour démarrer (à remplacer) :
    // onStateChange(() => {
    //     console.log("Mots disponibles :", state.categories.flatMap(c => c.words));
    // });
}
