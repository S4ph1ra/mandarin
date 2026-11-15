// =====================================================
// DASHBOARD.JS : STATISTIQUES DE LA PAGE D'ACCUEIL
// =====================================================
// Pour ajouter une statistique :
//   1. ajoute une fonction dans STATS ci-dessous
//   2. ajoute une carte dans index.html avec data-stat="nomDeLaStat"

import { state, onStateChange } from "./state.js";

const STATS = {

    // Nombre total de mots
    words: () => state.categories.reduce((total, category) => total + category.words.length, 0),

    // Nombre de leçons (section "cours" de config.js)
    courses: () => (state.notes.cours || []).length,

    // Nombre de caractères chinois différents
    characters: () => {
        const unique = new Set();

        state.categories.forEach(category => {
            category.words.forEach(word => {
                (word.chinese.match(/\p{Script=Han}/gu) || []).forEach(char => unique.add(char));
            });
        });

        return unique.size;
    }
};

function updateStats() {
    document.querySelectorAll("[data-stat]").forEach(element => {
        const compute = STATS[element.dataset.stat];
        if (compute) element.textContent = compute();
    });
}

export function initDashboard() {
    onStateChange(updateStats);
    updateStats();
}
