// =====================================================
// NOTES.JS : SECTIONS DE NOTES (COURS, GRAMMAIRE...)
// =====================================================
// Les sections sont définies dans config.js (NOTES_SECTIONS).
// Chaque section est construite automatiquement dans sa page.
// Structure d'une note dans Firestore :
//   { title, content, format, createdAt, updatedAt }
//   format = "html" (texte mis en forme) ou absent (ancien texte simple)

import {
    setDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userDoc, newDocRef, sendWrite, loadDocs } from "./firebase.js";
import { state, notifyChange } from "./state.js";
import { el } from "./ui.js";
import { NOTES_SECTIONS, RICH_TEXT_TOOLBAR, TEXTS } from "./config.js";

const sections = {};   // { cours: { render, showList }, ... }

// =====================================================
// OUTILS DE TEXTE ENRICHI
// =====================================================

// Seules ces balises et ces styles sont conservés (sécurité + propreté)
const ALLOWED_TAGS = ["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "BR", "P", "DIV", "SPAN", "UL", "OL", "LI", "H2", "H3", "FONT"];
const ALLOWED_STYLES = ["color", "background-color", "font-weight", "font-style", "text-decoration", "text-decoration-line"];

function cleanNode(node) {
    [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) return;

        if (child.nodeType !== Node.ELEMENT_NODE) {
            child.remove();
            return;
        }

        // Balise non autorisée : on garde seulement son texte
        if (!ALLOWED_TAGS.includes(child.tagName)) {
            cleanNode(child);
            child.replaceWith(...child.childNodes);
            return;
        }

        // Attributs : seulement le style (filtré) et la couleur des <font>
        [...child.attributes].forEach(attribute => {
            const keepColor = attribute.name === "color" && child.tagName === "FONT" &&
                /^[#\w(),.\s%]+$/.test(attribute.value);

            if (attribute.name !== "style" && !keepColor) {
                child.removeAttribute(attribute.name);
            }
        });

        if (child.hasAttribute("style")) {
            const kept = ALLOWED_STYLES
                .map(property => [property, child.style.getPropertyValue(property)])
                .filter(([, value]) => value && !/url\(|expression/i.test(value))
                .map(([property, value]) => property + ": " + value)
                .join("; ");

            if (kept) child.setAttribute("style", kept);
            else child.removeAttribute("style");
        }

        cleanNode(child);
    });
}

function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    cleanNode(template.content);
    return template.innerHTML;
}

// Ancien texte simple → HTML
function textToHtml(text) {
    return (text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

// HTML → texte brut (pour les aperçus)
function htmlToText(html) {
    const spaced = sanitizeHtml(html).replace(/<\/(div|p|li|h2|h3)>|<br\s*\/?>/gi, " ");
    return new DOMParser().parseFromString(spaced, "text/html").body.textContent
        .replace(/\s+/g, " ")
        .trim();
}

// Texte brut d'une note, quel que soit son format
function noteText(note) {
    return note.format === "html" ? htmlToText(note.content) : note.content;
}

// =====================================================
// CHAMPS DE CONTENU (texte simple ou texte enrichi)
// =====================================================
// Un champ expose : element (à afficher), set(note), get() → { content, format }

function createPlainField(config) {
    const textarea = el("textarea", "note-content-input");
    textarea.placeholder = config.contentPlaceholder;

    return {
        element: textarea,
        set: note => { textarea.value = note ? noteText(note) : ""; },
        get: () => ({ content: textarea.value.trim(), format: "text" })
    };
}

function createRichField(config) {
    const wrapper = el("div", "rich-field");
    const toolbar = el("div", "rich-toolbar");
    const editor = el("div", "rich-editor");

    editor.contentEditable = "true";
    editor.dataset.placeholder = config.contentPlaceholder;

    // Mémoriser la sélection pour que les boutons l'appliquent bien
    let savedRange = null;

    document.addEventListener("selectionchange", () => {
        const selection = window.getSelection();
        if (selection.rangeCount && editor.contains(selection.anchorNode)) {
            savedRange = selection.getRangeAt(0).cloneRange();
        }
    });

    function runCommand(command, value) {
        editor.focus();

        if (savedRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
        }

        document.execCommand("styleWithCSS", false, true);
        document.execCommand(command, false, value || null);
    }

    // Boutons de la barre d'outils (définis dans config.js)
    RICH_TEXT_TOOLBAR.forEach(item => {
        if (item.separator) {
            toolbar.appendChild(el("span", "rich-separator"));
            return;
        }

        const button = el("button", "rich-btn", item.label);
        button.type = "button";
        button.title = item.title;
        if (item.style) button.style.cssText = item.style;

        // Empêche le bouton de faire perdre la sélection du texte
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", () => runCommand(item.command, item.value));

        toolbar.appendChild(button);
    });

    // Coller : texte simple seulement (évite le style venu d'ailleurs)
    editor.addEventListener("paste", event => {
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
    });

    wrapper.appendChild(toolbar);
    wrapper.appendChild(editor);

    return {
        element: wrapper,

        set: note => {
            if (!note) {
                editor.innerHTML = "";
            } else if (note.format === "html") {
                editor.innerHTML = sanitizeHtml(note.content);
            } else {
                editor.innerHTML = textToHtml(note.content);
            }
        },

        get: () => {
            const html = sanitizeHtml(editor.innerHTML);
            const isEmpty = htmlToText(html) === "";
            return { content: isEmpty ? "" : html, format: "html" };
        }
    };
}

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
            <div class="note-content-slot"></div>
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
    const deleteBtn = page.querySelector(".note-delete-btn");
    const saveBtn = page.querySelector(".note-save-btn");

    // Champ de contenu : texte enrichi ou texte simple selon la config
    const field = config.richText ? createRichField(config) : createPlainField(config);
    page.querySelector(".note-content-slot").appendChild(field.element);

    // ----- Textes (depuis la config) -----
    page.querySelector("h1").textContent = config.title;
    page.querySelector(".header-description").textContent = config.description;
    page.querySelector(".notes-toolbar .add-category-btn").textContent = config.addButton;
    page.querySelector(".back-btn").textContent = TEXTS.backToList;
    titleInput.placeholder = config.titlePlaceholder;
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
        field.set(note);
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
            card.appendChild(el("p", "", noteText(note).replace(/\s+/g, " ").slice(0, 160)));
            card.appendChild(el("span", "note-date", new Date(note.updatedAt).toLocaleDateString("fr-FR")));

            card.addEventListener("click", () => openEditor(note));

            grid.appendChild(card);
        });
    }

    // ----- Actions -----

    function save() {
        const title = titleInput.value.trim() || TEXTS.untitledNote;
        const { content, format } = field.get();
        const now = Date.now();

        if (editingId) {
            sendWrite(
                updateDoc(userDoc(config.collection, editingId), {
                    title: title,
                    content: content,
                    format: format,
                    updatedAt: now
                }),
                TEXTS.saveError
            );

            const note = state.notes[key].find(n => n.id === editingId);
            note.title = title;
            note.content = content;
            note.format = format;
            note.updatedAt = now;

        } else {
            const reference = newDocRef(config.collection);
            const data = { title: title, content: content, format: format, createdAt: now, updatedAt: now };

            sendWrite(setDoc(reference, data), TEXTS.saveError);
            state.notes[key].push({ id: reference.id, ...data });
        }

        sortNotes(key);
        render();
        showList();
        notifyChange();
    }

    function remove() {
        if (!editingId) return;
        if (!confirm(config.deleteConfirm)) return;

        sendWrite(deleteDoc(userDoc(config.collection, editingId)), TEXTS.deleteError);

        state.notes[key] = state.notes[key].filter(n => n.id !== editingId);

        render();
        showList();
        notifyChange();
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
            const docs = await loadDocs(config.collection);

            docs.forEach(({ id, data }) => {
                state.notes[key].push({
                    id: id,
                    title: data.title || TEXTS.untitledNote,
                    content: data.content || "",
                    format: data.format || "text",
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
