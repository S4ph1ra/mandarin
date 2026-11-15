// =====================================================
// STATE.JS : DONNÉES PARTAGÉES ENTRE LES MODULES
// =====================================================

export const state = {
    user: null,        // utilisateur connecté
    categories: [],    // [{ id, name, icon, words: [{chinese, pinyin, translation, example}] }]
    notes: {}          // { cours: [{id, title, content, ...}], grammaire: [...] }
};

const bus = new EventTarget();

// À appeler après chaque modification des données
export function notifyChange() {
    bus.dispatchEvent(new Event("change"));
}

// Pour réagir quand les données changent (statistiques, révisions...)
export function onStateChange(callback) {
    bus.addEventListener("change", callback);
}
