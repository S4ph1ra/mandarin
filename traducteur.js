// =====================================================
// TRADUCTEUR.JS : TRADUCTEUR DE TON VOCABULAIRE
// =====================================================
// Cherche un mot (en français, en chinois ou en pinyin) dans les mots
// que tu as déjà ajoutés au vocabulaire. Aucun service externe :
// ça marche aussi hors ligne.
//
// Ce fichier est autonome : il crée tout seul son lien dans le menu
// et sa page. Les réglages et les textes sont juste en dessous.

import { state, onStateChange } from "./state.js";
import { showPage } from "./navigation.js";
import { el } from "./ui.js";

// ---------- RÉGLAGES ET TEXTES (modifie ici) ----------
const TRADUCTEUR = {
    pageName: "traducteur",          // identifiant de la page
    menuIcon: "译",
    menuLabel: "Traducteur",

    title: "Recherche",
    description: "Retrouve un mot de ton vocabulaire, en français, en chinois ou en pinyin.",

    inputLabel: "Mot à chercher",
    inputPlaceholder: "Ex : bonjour, 你好, ni hao",

    startMessage: "Écris un mot pour le chercher dans ton vocabulaire.",
    noVocabulary: "Ton vocabulaire est vide. Ajoute d'abord des mots dans la page Vocabulaire.",
    notFound: "Aucun mot trouvé dans ton vocabulaire.",
    exampleLabel: "Exemple : ",

    maxResults: 20                   // nombre maximum de résultats affichés
};

// ---------- RECHERCHE ----------

// Enlève les accents et les majuscules : "nǐ hǎo" → "ni hao", "Café" → "cafe"
function normalize(text) {
    return (text || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

// Note un mot par rapport à la recherche (0 = ne correspond pas)
function score(word, query) {
    const fields = [word.translation, word.chinese, word.pinyin];
    let best = 0;

    fields.forEach(field => {
        const value = normalize(field);
        if (!value) return;

        if (value === query) best = Math.max(best, 3);                  // identique
        else if (value.startsWith(query)) best = Math.max(best, 2);     // commence par
        else if (value.includes(query)) best = Math.max(best, 1);       // contient
    });

    return best;
}

function search(query) {
    const results = [];

    state.categories.forEach(category => {
        category.words.forEach(word => {
            const points = score(word, query);
            if (points > 0) results.push({ word, category, points });
        });
    });

    // Les meilleures correspondances d'abord
    results.sort((a, b) => b.points - a.points);

    return results.slice(0, TRADUCTEUR.maxResults);
}

// ---------- CONSTRUCTION DE LA PAGE ----------

function buildPage() {
    const nav = document.querySelector(".sidebar-nav");
    const app = document.getElementById("app");
    if (!nav || !app) return;

    // Lien dans le menu (placé avant "Révisions" si possible)
    const link = document.createElement("a");
    link.href = "#";
    link.className = "nav-item";
    link.dataset.page = TRADUCTEUR.pageName;
    link.innerHTML = '<span class="nav-icon"></span><span></span>';
    link.children[0].textContent = TRADUCTEUR.menuIcon;
    link.children[1].textContent = TRADUCTEUR.menuLabel;

    const revisionsLink = nav.querySelector('[data-page="revisions"]');
    if (revisionsLink) revisionsLink.before(link); else nav.appendChild(link);

    link.addEventListener("click", (event) => {
        event.preventDefault();
        showPage(TRADUCTEUR.pageName);
    });

    // Page
    const page = document.createElement("section");
    page.id = "page-" + TRADUCTEUR.pageName;
    page.className = "page";

    page.innerHTML = `
        <header class="page-header">
            <div class="header-text">
                <h1></h1>
                <p class="header-description"></p>
            </div>
        </header>

        <div class="writing-field" style="margin-bottom: 20px;">
            <label for="translator-input"></label>
            <input type="text" id="translator-input" class="note-title-input" style="margin-bottom: 0;" autocomplete="off">
        </div>

        <div id="translator-results" style="display: grid; gap: 14px;"></div>
    `;

    app.appendChild(page);

    // Textes
    page.querySelector("h1").textContent = TRADUCTEUR.title;
    page.querySelector(".header-description").textContent = TRADUCTEUR.description;
    page.querySelector('label[for="translator-input"]').textContent = TRADUCTEUR.inputLabel;

    const input = page.querySelector("#translator-input");
    const resultsBox = page.querySelector("#translator-results");

    input.placeholder = TRADUCTEUR.inputPlaceholder;

    // ----- Affichage des résultats -----

    function showMessage(text) {
        resultsBox.innerHTML = "";
        resultsBox.appendChild(el("p", "hanzi-status", text));
        resultsBox.firstChild.style.cssText = "max-width: none; text-align: left;";
    }

    function render() {
        const query = normalize(input.value);
        const totalWords = state.categories.reduce((sum, c) => sum + c.words.length, 0);

        if (totalWords === 0) {
            showMessage(TRADUCTEUR.noVocabulary);
            return;
        }

        if (!query) {
            showMessage(TRADUCTEUR.startMessage);
            return;
        }

        const results = search(query);

        if (results.length === 0) {
            showMessage(TRADUCTEUR.notFound);
            return;
        }

        resultsBox.innerHTML = "";

        results.forEach(({ word, category }) => {
            const card = el("div", "hanzi-card");
            card.style.alignItems = "flex-start";
            card.style.gap = "6px";

            const chinese = el("p", "", word.chinese);
            chinese.style.cssText = "margin: 0; font-size: 30px; font-weight: 600; color: var(--dark-red);";

            const pinyin = el("p", "", word.pinyin);
            pinyin.style.cssText = "margin: 0; font-size: 16px; color: #82766F;";

            const translation = el("p", "", word.translation);
            translation.style.cssText = "margin: 0; font-size: 18px; font-weight: 600;";

            card.appendChild(chinese);
            card.appendChild(pinyin);
            card.appendChild(translation);

            if (word.example) {
                const example = el("p", "", TRADUCTEUR.exampleLabel + word.example);
                example.style.cssText = "margin: 0; font-size: 14px; color: #817873;";
                card.appendChild(example);
            }

            const origin = el("p", "note-date", category.icon + " " + category.name);
            card.appendChild(origin);

            resultsBox.appendChild(card);
        });
    }

    input.addEventListener("input", render);

    // Mettre à jour quand le vocabulaire change (chargement, ajout...)
    onStateChange(render);
    render();
}

export function initTraducteur() {
    buildPage();
}
