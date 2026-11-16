// =====================================================
// REORGANISER.JS : RÉORGANISER LE VOCABULAIRE AVEC CLAUDE
// =====================================================
// Principe (sans clé secrète ni service payant) :
//   1. le bouton "Réorganiser" copie ton vocabulaire + une consigne
//   2. tu colles ça dans une conversation avec Claude
//   3. tu colles sa réponse ici, et le site range tes mots
//
// Ce fichier est autonome : il ajoute son propre bouton dans la page
// Vocabulaire. Les textes sont juste en dessous.

import {
    setDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userDoc, newDocRef, sendWrite } from "./firebase.js";
import { state, notifyChange } from "./state.js";
import { refreshVocabulary } from "./vocabulary.js";
import { el, openModal, closeModal, closeOnOutsideClick } from "./ui.js";
import { CATEGORIES_COLLECTION, CATEGORY_ICONS, HSK_LEVELS, TEXTS } from "./config.js";

// ---------- TEXTES (modifie ici) ----------
const REORGANISER = {
    button: "✨ Réorganiser",
    title: "Réorganiser mon vocabulaire",
    intro: "Claude peut regrouper tes mots par thème, créer de nouvelles catégories, déplacer les mots et remplir le niveau HSK.",

    step1: "1. Copie ceci et colle-le dans une conversation avec Claude",
    copyButton: "Copier",
    copied: "Copié !",
    copyFailed: "Copie impossible : appuie longtemps sur le texte pour le copier.",

    step2: "2. Colle ici la réponse de Claude",
    replyPlaceholder: "Colle la réponse ici...",

    apply: "Appliquer",
    cancel: "Annuler",

    emptyVocabulary: "Ton vocabulaire est vide, il n'y a rien à réorganiser.",
    noReply: "Colle d'abord la réponse de Claude.",
    badReply: "Je n'ai pas compris cette réponse. Vérifie que tu as collé tout le JSON de Claude.",
    noWords: "La réponse ne contient aucun mot.",
    confirmLoss: (missing) => "Attention : " + missing + " mot(s) de ton vocabulaire ne sont plus dans la réponse et seraient supprimés. Continuer quand même ?",
    confirmApply: (categories, words) => "Remplacer ton organisation actuelle par " + categories + " catégorie(s) et " + words + " mot(s) ?",
    done: "Vocabulaire réorganisé !"
};

// Consigne envoyée à Claude (le JSON est ajouté à la fin)
function buildPrompt(json) {
    return `Voici mon vocabulaire de mandarin au format JSON. Réorganise-le :
- regroupe les mots par thème pour que mes catégories soient claires, crée de nouvelles catégories si besoin, fusionne celles qui sont trop proches, et déplace les mots dans la bonne catégorie ;
- garde TOUS mes mots : n'en supprime aucun, n'en invente aucun, et ne modifie ni le chinois, ni le pinyin, ni la traduction, ni l'exemple ;
- pour chaque mot, remplis le champ "hsk" avec son niveau (${HSK_LEVELS.map(l => '"' + l + '"').join(", ")}), ou "" si tu n'es pas sûr ;
- garde l'"id" des catégories qui existent déjà, et mets "id": "" pour les nouvelles ;
- choisis l'icône de chaque catégorie parmi : ${CATEGORY_ICONS.join(" ")}.

Réponds uniquement avec le JSON final, dans le même format, dans un seul bloc de code.

${json}`;
}

// ---------- EXPORT : vocabulaire → JSON ----------

function exportVocabulary() {
    const data = {
        categories: state.categories.map(category => ({
            id: category.id,
            name: category.name,
            icon: category.icon,
            words: category.words.map(word => ({
                chinese: word.chinese,
                pinyin: word.pinyin,
                translation: word.translation,
                hsk: word.hsk || "",
                example: word.example || ""
            }))
        }))
    };

    return JSON.stringify(data, null, 1);
}

// ---------- IMPORT : réponse de Claude → catégories ----------

function parseReply(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;

    let data;
    try {
        data = JSON.parse(text.slice(start, end + 1));
    } catch (error) {
        return null;
    }

    if (!data || !Array.isArray(data.categories)) return null;

    const categories = [];

    data.categories.forEach(raw => {
        const name = String(raw.name || "").trim();
        if (!name || !Array.isArray(raw.words)) return;

        const words = [];

        raw.words.forEach(w => {
            const chinese = String(w.chinese || "").trim();
            if (!chinese) return;

            words.push({
                chinese: chinese,
                pinyin: String(w.pinyin || "").trim(),
                translation: String(w.translation || "").trim(),
                hsk: HSK_LEVELS.includes(w.hsk) ? w.hsk : "",
                example: String(w.example || "").trim()
            });
        });

        categories.push({
            id: String(raw.id || ""),
            name: name.slice(0, 40),
            icon: String(raw.icon || "").trim() || CATEGORY_ICONS[0],
            words: words
        });
    });

    return categories.length > 0 ? categories : null;
}

function countWords(categories) {
    return categories.reduce((total, category) => total + category.words.length, 0);
}

// Mots de l'ancien vocabulaire qui ne se retrouvent pas dans la réponse
function countMissing(newCategories) {
    const remaining = new Map();

    newCategories.forEach(category => category.words.forEach(word => {
        const key = word.chinese + "|" + word.translation;
        remaining.set(key, (remaining.get(key) || 0) + 1);
    }));

    let missing = 0;

    state.categories.forEach(category => category.words.forEach(word => {
        const key = word.chinese + "|" + word.translation;
        if (remaining.get(key) > 0) remaining.set(key, remaining.get(key) - 1);
        else missing++;
    }));

    return missing;
}

function applyCategories(newCategories) {
    const oldCategories = state.categories;
    const usedIds = new Set();
    const result = [];
    const base = Date.now();

    newCategories.forEach((category, index) => {
        const existing = oldCategories.find(old => old.id === category.id);
        const createdAt = base + index;   // garde l'ordre proposé par Claude

        if (existing && !usedIds.has(existing.id)) {
            // Catégorie existante : mise à jour
            usedIds.add(existing.id);

            const data = { name: category.name, icon: category.icon, words: category.words, createdAt: createdAt };
            sendWrite(updateDoc(userDoc(CATEGORIES_COLLECTION, existing.id), data), TEXTS.saveError);
            result.push({ id: existing.id, ...data });

        } else {
            // Nouvelle catégorie : création
            const reference = newDocRef(CATEGORIES_COLLECTION);
            const data = { name: category.name, icon: category.icon, words: category.words, createdAt: createdAt };

            sendWrite(setDoc(reference, data), TEXTS.saveError);
            result.push({ id: reference.id, ...data });
        }
    });

    // Anciennes catégories qui n'existent plus : suppression
    oldCategories.forEach(old => {
        if (!usedIds.has(old.id)) {
            sendWrite(deleteDoc(userDoc(CATEGORIES_COLLECTION, old.id)), TEXTS.deleteError);
        }
    });

    state.categories = result;
    refreshVocabulary();
    notifyChange();
}

// ---------- FENÊTRE ----------

function buildModal() {
    const modal = el("div", "modal-overlay");
    const box = el("div", "modal-box");
    box.style.maxWidth = "620px";
    box.style.maxHeight = "90vh";
    box.style.overflowY = "auto";

    box.innerHTML = `
        <div class="modal-header">
            <h2></h2>
            <button type="button" class="modal-close">✕</button>
        </div>

        <p class="modal-description"></p>

        <label class="reorg-step1"></label>
        <textarea class="note-content-input reorg-export" readonly style="min-height: 110px; font-size: 13px;"></textarea>
        <p class="hanzi-status reorg-copy-message" style="max-width: none; text-align: left;"></p>
        <button type="button" class="secondary-btn reorg-copy"></button>

        <label class="reorg-step2"></label>
        <textarea class="note-content-input reorg-reply" style="min-height: 110px; font-size: 13px;"></textarea>
        <p class="hanzi-status reorg-message" style="max-width: none; text-align: left;"></p>

        <div class="modal-actions">
            <button type="button" class="reorg-cancel"></button>
            <button type="button" class="reorg-apply"></button>
        </div>
    `;

    modal.appendChild(box);
    document.body.appendChild(modal);

    box.querySelector("h2").textContent = REORGANISER.title;
    box.querySelector(".modal-description").textContent = REORGANISER.intro;
    box.querySelector(".reorg-step1").textContent = REORGANISER.step1;
    box.querySelector(".reorg-step2").textContent = REORGANISER.step2;
    box.querySelector(".reorg-copy").textContent = REORGANISER.copyButton;
    box.querySelector(".reorg-reply").placeholder = REORGANISER.replyPlaceholder;
    box.querySelector(".reorg-cancel").textContent = REORGANISER.cancel;
    box.querySelector(".reorg-apply").textContent = REORGANISER.apply;

    // Boutons de la fenêtre (mêmes couleurs que les autres)
    const cancelButton = box.querySelector(".reorg-cancel");
    cancelButton.style.cssText = "background: #F0EAE3; color: #453B37;";
    const applyButton = box.querySelector(".reorg-apply");
    applyButton.style.cssText = "background: var(--primary-red); color: white;";

    return modal;
}

export function initReorganiser() {
    const newCategoryButton = document.getElementById("new-category-btn");
    if (!newCategoryButton) return;

    // Bouton "Réorganiser" à côté de "+ Nouvelle catégorie"
    const openButton = el("button", "secondary-btn", REORGANISER.button);
    openButton.type = "button";

    const group = el("div");
    group.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap;";
    newCategoryButton.before(group);
    group.appendChild(openButton);
    group.appendChild(newCategoryButton);

    const modal = buildModal();
    const exportBox = modal.querySelector(".reorg-export");
    const copyMessage = modal.querySelector(".reorg-copy-message");
    const reply = modal.querySelector(".reorg-reply");
    const message = modal.querySelector(".reorg-message");

    function close() {
        closeModal(modal);
    }

    openButton.addEventListener("click", () => {
        if (countWords(state.categories) === 0) {
            alert(REORGANISER.emptyVocabulary);
            return;
        }

        exportBox.value = buildPrompt(exportVocabulary());
        reply.value = "";
        message.textContent = "";
        copyMessage.textContent = "";
        openModal(modal);
    });

    modal.querySelector(".modal-close").addEventListener("click", close);
    modal.querySelector(".reorg-cancel").addEventListener("click", close);
    closeOnOutsideClick(modal, close);

    // Copier la consigne
    modal.querySelector(".reorg-copy").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(exportBox.value);
            copyMessage.textContent = REORGANISER.copied;
        } catch (error) {
            exportBox.select();
            copyMessage.textContent = REORGANISER.copyFailed;
        }
    });

    // Appliquer la réponse de Claude
    modal.querySelector(".reorg-apply").addEventListener("click", () => {
        message.textContent = "";

        const text = reply.value.trim();
        if (!text) {
            message.textContent = REORGANISER.noReply;
            return;
        }

        const categories = parseReply(text);
        if (!categories) {
            message.textContent = REORGANISER.badReply;
            return;
        }

        const totalWords = countWords(categories);
        if (totalWords === 0) {
            message.textContent = REORGANISER.noWords;
            return;
        }

        const missing = countMissing(categories);
        const question = missing > 0
            ? REORGANISER.confirmLoss(missing)
            : REORGANISER.confirmApply(categories.length, totalWords);

        if (!confirm(question)) return;

        applyCategories(categories);
        close();
        alert(REORGANISER.done);
    });
}
