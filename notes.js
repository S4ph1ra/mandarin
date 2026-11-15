// =====================================================
// NOTES.JS : SECTIONS DE NOTES LIBRES (COURS, GRAMMAIRE...)
// =====================================================
// Les sections sont définies dans config.js (NOTES_SECTIONS).
// Chaque section est construite automatiquement dans sa page.
// Structure d'une note dans Firestore :
//   { title, content, createdAt, updatedAt }

import {
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userCollection, userDoc } from "./firebase.js";
import { state, notifyChange } from "./state.js";
import { el } from "./ui.js";
import { NOTES_SECTIONS, TEXTS } from "./config.js";

const sections = {};   // { cours: { render, showList }, ... }

// =====================================================
// CONSTRUCTION D'UNE SECTION
// =====================================================

function buildSection(key, config) {
    const page = document.getElementById(config.pageId);
    if (!page) {
        console.warn("Page introuvable pour la section :", key);
        return;
    }

    state.notes[key] = [];
    let editingId = null;   // note en cours d'édition (null = nouvelle note)

    // ----- Structure HTML -----
    page.innerHTML = `
        <header class="page-header">
            <div class="header-text">
                <h1></h1>
                <p class="header-description"></p>
            </div>
        </header>

        <div class="notes-list-view">
            <div class="notes-toolbar">
                <button type="button" class="add-category-btn"></button>
            </div>
            <div class="notes-grid"></div>
        </div>

        <div class="note-editor" style="display: none;">
            <button type="button" class="back-btn"></button>
            <input type="text" class="note-title-input" maxlength="80">
            <textarea class="note-content-input"></textarea>
            <div class="note-editor-actions">
                <button type="button" class="danger-btn note-delete-btn"></button>
                <button type="button" class="add-category-btn note-save-btn"></button>
            </div>
        </div>
    `;

    const listView = page.querySelector(".notes-list-view");
    const grid = page.querySelector(".notes-grid");
    const editor = page.querySelector(".note-editor");
    const titleInput = page.querySelector(".note-title-input");
    const contentInput = page.querySelector(".note-content-input");
    const deleteBtn = page.querySelector(".note-delete-btn");
    const saveBtn = page.querySelector(".note-save-btn");

    // ----- Textes (depuis la config) -----
    page.querySelector("h1").textContent = config.title;
    page.querySelector(".header-description").textContent = config.description;
    page.querySelector(".notes-toolbar .add-category-btn").textContent = config.addButton;
    page.querySelector(".back-btn").textContent = TEXTS.backToList;
    titleInput.placeholder = config.titlePlaceholder;
    contentInput.placeholder = config.contentPlaceholder;
    deleteBtn.textContent = TEXTS.deleteNote;
    saveBtn.textContent = TEXTS.saveNote;

    // ----- Affichage -----

    function showList() {
        editor.style.display = "none";
        listView.style.display = "block";
        editingId = null;
    }

    function openEditor(note = null) {
        editingId = note ? note.id : null;

        titleInput.value = note ? note.title : "";
        contentInput.value = note ? note.content : "";
        deleteBtn.style.display = note ? "" : "none";

        listView.style.display = "none";
        editor.style.display = "block";
        titleInput.focus();
    }

    function render() {
        grid.innerHTML = "";

        const notes = state.notes[key];

        if (notes.length === 0) {
            grid.appendChild(el("p", "empty-message", config.emptyMessage));
            return;
        }

        notes.forEach(note => {
            const card = el("div", "note-card");

            card.appendChild(el("h3", "", note.title));
            card.appendChild(el("p", "", note.content.replace(/\s+/g, " ").slice(0, 160)));
            card.appendChild(el("span", "note-date", new Date(note.updatedAt).toLocaleDateString("fr-FR")));

            card.addEventListener("click", () => openEditor(note));

            grid.appendChild(card);
        });
    }

    // ----- Actions -----

    async function save() {
        const title = titleInput.value.trim() || TEXTS.untitledNote;
        const content = contentInput.value.trim();
        const now = Date.now();

        try {
            if (editingId) {
                await updateDoc(userDoc(config.collection, editingId), {
                    title: title,
                    content: content,
                    updatedAt: now
                });

                const note = state.notes[key].find(n => n.id === editingId);
                note.title = title;
                note.content = content;
                note.updatedAt = now;

            } else {
                const data = { title: title, content: content, createdAt: now, updatedAt: now };
                const saved = await addDoc(userCollection(config.collection), data);
                state.notes[key].push({ id: saved.id, ...data });
            }

            sortNotes(key);
            render();
            showList();
            notifyChange();

        } catch (error) {
            console.error(error);
            alert(TEXTS.saveError);
        }
    }

    async function remove() {
        if (!editingId) return;
        if (!confirm(config.deleteConfirm)) return;

        try {
            await deleteDoc(userDoc(config.collection, editingId));

            state.notes[key] = state.notes[key].filter(n => n.id !== editingId);

            render();
            showList();
            notifyChange();

        } catch (error) {
            console.error(error);
            alert(TEXTS.deleteError);
        }
    }

    // ----- Boutons -----
    page.querySelector(".notes-toolbar .add-category-btn").addEventListener("click", () => openEditor());
    page.querySelector(".back-btn").addEventListener("click", showList);
    saveBtn.addEventListener("click", save);
    deleteBtn.addEventListener("click", remove);

    sections[key] = { config, render, showList };
    render();
}

// Les notes les plus récentes en premier
function sortNotes(key) {
    state.notes[key].sort((a, b) => b.updatedAt - a.updatedAt);
}

// =====================================================
// CHARGEMENT
// =====================================================

export async function loadNotes() {
    for (const key of Object.keys(sections)) {
        const { config, render } = sections[key];
        state.notes[key] = [];

        try {
            const snapshot = await getDocs(userCollection(config.collection));

            snapshot.forEach(documentSnapshot => {
                const data = documentSnapshot.data();
                state.notes[key].push({
                    id: documentSnapshot.id,
                    title: data.title || TEXTS.untitledNote,
                    content: data.content || "",
                    createdAt: data.createdAt || 0,
                    updatedAt: data.updatedAt || data.createdAt || 0
                });
            });

            sortNotes(key);

        } catch (error) {
            console.error("Erreur de chargement (" + key + ") :", error);
        }

        render();
    }
}

export function resetNotes() {
    for (const key of Object.keys(sections)) {
        state.notes[key] = [];
        sections[key].showList();
        sections[key].render();
    }
}

export function initNotes() {
    Object.entries(NOTES_SECTIONS).forEach(([key, config]) => buildSection(key, config));
}
