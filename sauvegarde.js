// =====================================================
// SAUVEGARDE.JS : SAUVEGARDE DE SÉCURITÉ (ET RESTAURATION)
// =====================================================
// Fichier autonome : il ajoute une page "Sauvegarde" dans le menu.
//   - Sauvegarder : télécharge (ou copie) tout ton vocabulaire et tes notes
//   - Restaurer : remet tout depuis un fichier de sauvegarde
// Les textes sont juste en dessous.

import { writeBatch } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { db, userDoc, newDocRef } from "./firebase.js";
import { state } from "./state.js";
import { showPage } from "./navigation.js";
import { CATEGORIES_COLLECTION, NOTES_SECTIONS } from "./config.js";

// ---------- TEXTES (modifie ici) ----------
const SAUVEGARDE = {
    pageName: "sauvegarde",
    menuIcon: "💾",
    menuLabel: "Sauvegarde",

    title: "Sauvegarde",
    description: "Garde une copie de tout ton contenu, ou remets-le depuis un fichier.",

    saveTitle: "Sauvegarder",
    saveHelp: "Crée une copie de ton vocabulaire (catégories, mots, niveaux HSK) et de tes notes (cours, grammaire).",
    downloadButton: "💾 Télécharger la sauvegarde",
    copyButton: "📋 Copier la sauvegarde",
    downloaded: "Sauvegarde téléchargée.",
    copied: "Sauvegarde copiée. Colle-la dans une note ou un message pour la garder.",
    copyFailed: "Copie automatique impossible : appuie longtemps sur le texte ci-dessous pour le copier.",
    fileName: "mandarin-sauvegarde-",

    restoreTitle: "Restaurer",
    restoreHelp: "Choisis un fichier de sauvegarde, ou colle son contenu. Attention : ça remplace tout ton vocabulaire et toutes tes notes actuelles.",
    chooseFile: "Choisir un fichier",
    pastePlaceholder: "Ou colle ici le contenu de la sauvegarde...",
    restoreButton: "♻️ Restaurer",
    fileLoaded: "Fichier chargé. Appuie sur « Restaurer » pour continuer.",
    fileError: "Impossible de lire ce fichier.",

    emptyRestore: "Choisis un fichier ou colle d'abord le contenu d'une sauvegarde.",
    invalid: "Ce n'est pas une sauvegarde valide de ton site.",
    needOnline: "Il faut une connexion internet pour restaurer.",
    confirm: (backup, current) =>
        "Remplacer ton contenu actuel (" + current + ") par la sauvegarde (" + backup + ") ?\n\n" +
        "Conseil : fais d'abord une sauvegarde de ton contenu actuel.",
    working: "Restauration en cours...",
    done: "Restauration terminée ! La page va se recharger.",
    error: "La restauration a échoué. Vérifie ta connexion et réessaie."
};

// ---------- CRÉER LA SAUVEGARDE ----------

export function buildBackup() {
    const notes = {};

    Object.keys(NOTES_SECTIONS).forEach(key => {
        notes[key] = (state.notes[key] || []).map(note => ({
            title: note.title,
            content: note.content,
            format: note.format || "text",
            createdAt: note.createdAt || 0,
            updatedAt: note.updatedAt || 0
        }));
    });

    return {
        app: "mandarin-notebook",
        version: 1,
        date: new Date().toISOString(),
        categories: state.categories.map(category => ({
            name: category.name,
            icon: category.icon,
            createdAt: category.createdAt || 0,
            words: category.words.map(word => ({
                chinese: word.chinese,
                pinyin: word.pinyin || "",
                translation: word.translation || "",
                hsk: word.hsk || "",
                example: word.example || ""
            }))
        })),
        notes: notes
    };
}

// ---------- LIRE UNE SAUVEGARDE ----------

export function parseBackup(text) {
    let raw;

    try {
        raw = JSON.parse(text);
    } catch (error) {
        return null;
    }

    if (!raw || raw.app !== "mandarin-notebook" || !Array.isArray(raw.categories)) return null;

    const categories = [];

    raw.categories.forEach(category => {
        const name = String((category && category.name) || "").trim();
        if (!name || !Array.isArray(category.words)) return;

        const words = [];

        category.words.forEach(word => {
            const chinese = String((word && word.chinese) || "").trim();
            if (!chinese) return;

            words.push({
                chinese: chinese,
                pinyin: String(word.pinyin || "").trim(),
                translation: String(word.translation || "").trim(),
                hsk: String(word.hsk || "").trim(),
                example: String(word.example || "").trim()
            });
        });

        categories.push({
            name: name.slice(0, 40),
            icon: String(category.icon || "").trim() || "📚",
            createdAt: Number(category.createdAt) || 0,
            words: words
        });
    });

    const notes = {};

    Object.keys(NOTES_SECTIONS).forEach(key => {
        const list = raw.notes && Array.isArray(raw.notes[key]) ? raw.notes[key] : [];

        notes[key] = list.map(note => ({
            title: String((note && note.title) || "Sans titre"),
            content: String((note && note.content) || ""),
            format: note && note.format === "html" ? "html" : "text",
            createdAt: Number(note && note.createdAt) || 0,
            updatedAt: Number(note && note.updatedAt) || 0
        }));
    });

    return { categories: categories, notes: notes };
}

// ---------- RÉSUMÉS ET RESTAURATION ----------

function countWords(categories) {
    return categories.reduce((total, category) => total + category.words.length, 0);
}

function countNotes(notes) {
    return Object.keys(NOTES_SECTIONS).reduce((total, key) => total + (notes[key] || []).length, 0);
}

function summary(categories, notes) {
    return categories.length + " catégorie(s), " + countWords(categories) + " mot(s), " + countNotes(notes) + " note(s)";
}

async function restore(data) {
    const operations = [];
    const base = Date.now();

    // 1. Supprimer le contenu actuel
    state.categories.forEach(category => {
        operations.push({ type: "delete", ref: userDoc(CATEGORIES_COLLECTION, category.id) });
    });

    Object.keys(NOTES_SECTIONS).forEach(key => {
        (state.notes[key] || []).forEach(note => {
            operations.push({ type: "delete", ref: userDoc(NOTES_SECTIONS[key].collection, note.id) });
        });
    });

    // 2. Créer le contenu de la sauvegarde
    data.categories.forEach((category, index) => {
        operations.push({
            type: "set",
            ref: newDocRef(CATEGORIES_COLLECTION),
            data: {
                name: category.name,
                icon: category.icon,
                words: category.words,
                createdAt: category.createdAt || base + index
            }
        });
    });

    Object.keys(NOTES_SECTIONS).forEach(key => {
        data.notes[key].forEach((note, index) => {
            const created = note.createdAt || base + index;

            operations.push({
                type: "set",
                ref: newDocRef(NOTES_SECTIONS[key].collection),
                data: {
                    title: note.title,
                    content: note.content,
                    format: note.format,
                    createdAt: created,
                    updatedAt: note.updatedAt || created
                }
            });
        });
    });

    // 3. Envoyer par paquets (limite de Firebase : 500 opérations)
    for (let start = 0; start < operations.length; start += 400) {
        const batch = writeBatch(db);

        operations.slice(start, start + 400).forEach(operation => {
            if (operation.type === "delete") batch.delete(operation.ref);
            else batch.set(operation.ref, operation.data);
        });

        await batch.commit();
    }
}

// ---------- TÉLÉCHARGEMENT ----------

function download(fileName, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

// ---------- PAGE ----------

function buildPage() {
    const nav = document.querySelector(".sidebar-nav");
    const app = document.getElementById("app");
    if (!nav || !app) return;

    // Lien dans le menu
    const link = document.createElement("a");
    link.href = "#";
    link.className = "nav-item";
    link.dataset.page = SAUVEGARDE.pageName;
    link.innerHTML = '<span class="nav-icon"></span><span></span>';
    link.children[0].textContent = SAUVEGARDE.menuIcon;
    link.children[1].textContent = SAUVEGARDE.menuLabel;
    nav.appendChild(link);

    link.addEventListener("click", event => {
        event.preventDefault();
        showPage(SAUVEGARDE.pageName);
    });

    // Page
    const page = document.createElement("section");
    page.id = "page-" + SAUVEGARDE.pageName;
    page.className = "page";

    page.innerHTML = `
        <header class="page-header">
            <div class="header-text">
                <h1></h1>
                <p class="header-description"></p>
            </div>
        </header>

        <div class="note-editor" style="margin-bottom: 20px;">
            <h2 class="save-title" style="margin: 0 0 8px; font-size: 20px; color: var(--dark-red);"></h2>
            <p class="save-help" style="margin: 0 0 16px; font-size: 14px; color: #82766F;"></p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="add-category-btn save-download"></button>
                <button type="button" class="secondary-btn save-copy"></button>
            </div>
            <p class="hanzi-status save-message" style="max-width: none; text-align: left; margin-top: 12px;"></p>
            <textarea class="note-content-input save-text" readonly style="display: none; min-height: 140px; font-size: 12px;"></textarea>
        </div>

        <div class="note-editor">
            <h2 class="restore-title" style="margin: 0 0 8px; font-size: 20px; color: var(--dark-red);"></h2>
            <p class="restore-help" style="margin: 0 0 16px; font-size: 14px; color: #82766F;"></p>
            <input type="file" class="restore-file" accept=".json,application/json" style="margin-bottom: 12px; max-width: 100%;">
            <textarea class="note-content-input restore-text" style="min-height: 140px; font-size: 12px; margin-bottom: 12px;"></textarea>
            <button type="button" class="danger-btn restore-button"></button>
            <p class="hanzi-status restore-message" style="max-width: none; text-align: left; margin-top: 12px;"></p>
        </div>
    `;

    app.appendChild(page);

    // Textes
    page.querySelector("h1").textContent = SAUVEGARDE.title;
    page.querySelector(".header-description").textContent = SAUVEGARDE.description;
    page.querySelector(".save-title").textContent = SAUVEGARDE.saveTitle;
    page.querySelector(".save-help").textContent = SAUVEGARDE.saveHelp;
    page.querySelector(".save-download").textContent = SAUVEGARDE.downloadButton;
    page.querySelector(".save-copy").textContent = SAUVEGARDE.copyButton;
    page.querySelector(".restore-title").textContent = SAUVEGARDE.restoreTitle;
    page.querySelector(".restore-help").textContent = SAUVEGARDE.restoreHelp;
    page.querySelector(".restore-text").placeholder = SAUVEGARDE.pastePlaceholder;
    page.querySelector(".restore-button").textContent = SAUVEGARDE.restoreButton;

    const saveMessage = page.querySelector(".save-message");
    const saveText = page.querySelector(".save-text");
    const fileInput = page.querySelector(".restore-file");
    const restoreText = page.querySelector(".restore-text");
    const restoreMessage = page.querySelector(".restore-message");
    const restoreButton = page.querySelector(".restore-button");

    function backupText() {
        return JSON.stringify(buildBackup(), null, 1);
    }

    // Télécharger
    page.querySelector(".save-download").addEventListener("click", () => {
        saveText.style.display = "none";

        try {
            download(SAUVEGARDE.fileName + today() + ".json", backupText());
            saveMessage.textContent = SAUVEGARDE.downloaded;
        } catch (error) {
            console.error(error);
            saveText.value = backupText();
            saveText.style.display = "block";
            saveMessage.textContent = SAUVEGARDE.copyFailed;
        }
    });

    // Copier (avec le texte affiché si la copie automatique échoue)
    page.querySelector(".save-copy").addEventListener("click", async () => {
        const text = backupText();

        try {
            await navigator.clipboard.writeText(text);
            saveText.style.display = "none";
            saveMessage.textContent = SAUVEGARDE.copied;
        } catch (error) {
            saveText.value = text;
            saveText.style.display = "block";
            saveText.select();
            saveMessage.textContent = SAUVEGARDE.copyFailed;
        }
    });

    // Charger un fichier dans la zone de texte
    fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            restoreText.value = String(reader.result);
            restoreMessage.textContent = SAUVEGARDE.fileLoaded;
        };

        reader.onerror = () => {
            restoreMessage.textContent = SAUVEGARDE.fileError;
        };

        reader.readAsText(file);
    });

    // Restaurer
    restoreButton.addEventListener("click", async () => {
        const text = restoreText.value.trim();

        if (!text) {
            restoreMessage.textContent = SAUVEGARDE.emptyRestore;
            return;
        }

        const data = parseBackup(text);

        if (!data) {
            restoreMessage.textContent = SAUVEGARDE.invalid;
            return;
        }

        if (!navigator.onLine) {
            restoreMessage.textContent = SAUVEGARDE.needOnline;
            return;
        }

        const current = summary(state.categories, state.notes);
        const backup = summary(data.categories, data.notes);

        if (!confirm(SAUVEGARDE.confirm(backup, current))) return;

        restoreButton.disabled = true;
        restoreMessage.textContent = SAUVEGARDE.working;

        try {
            await restore(data);
            alert(SAUVEGARDE.done);
            location.reload();
        } catch (error) {
            console.error(error);
            restoreMessage.textContent = SAUVEGARDE.error;
            restoreButton.disabled = false;
        }
    });
}

if (typeof document !== "undefined") buildPage();
