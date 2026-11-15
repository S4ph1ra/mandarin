// =====================================================
// SCRIPT.JS : POINT D'ENTRÉE (ASSEMBLE TOUS LES MODULES)
// =====================================================
// Pour ajouter une nouvelle partie au site :
//   1. crée un fichier (ex : monmodule.js) avec une fonction initMonModule()
//   2. importe-la ici et appelle-la dans la liste ci-dessous

import { initAuth } from "./auth.js";
import { initNavigation, showPage } from "./navigation.js";
import { initVocabulary, loadCategories, resetVocabulary } from "./vocabulary.js";
import { initNotes, loadNotes, resetNotes } from "./notes.js";
import { initDashboard } from "./dashboard.js";
import { initRevisions } from "./revisions.js";
import { initEcriture } from "./ecriture.js";
import { notifyChange } from "./state.js";

// Préparer chaque partie du site
initNavigation();
initVocabulary();
initNotes();
initRevisions();
initEcriture();
initDashboard();

// Connexion : charger les données ou tout vider à la déconnexion
initAuth({
    onLogin: async () => {
        await Promise.all([loadCategories(), loadNotes()]);
        notifyChange();
    },

    onLogout: () => {
        resetVocabulary();
        resetNotes();
        showPage("accueil");
        notifyChange();
    }
});
