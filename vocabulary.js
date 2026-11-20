// =====================================================
// VOCABULAIRE.JS : CATÉGORIES ET MOTS
// =====================================================
// Structure d'une catégorie dans Firestore :
//   { name, icon, words: [{ chinese, pinyin, translation, example }], createdAt }

import {
    setDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userDoc, newDocRef, sendWrite, loadDocs } from "./firebase.js";
import { state, notifyChange } from "./state.js";
import { el, openModal, closeModal, closeOnOutsideClick, countLabel } from "./ui.js";
import { CATEGORIES_COLLECTION, CATEGORY_ICONS, HSK_LEVELS, TEXTS } from "./config.js";

// ---------- ÉLÉMENTS HTML ----------

const toolbar = document.querySelector(".vocabulary-toolbar");
const categoriesContainer = document.getElementById("categories-container");
const detail = document.getElementById("category-detail");
const detailName = document.getElementById("detail-category-name");
const detailCount = document.getElementById("detail-category-count");
const tableBody = document.getElementById("vocabulary-table-body");

// Fenêtre catégorie
const categoryModal = document.getElementById("category-modal");
const categoryModalTitle = document.getElementById("category-modal-title");
const categoryNameInput = document.getElementById("category-name");
const iconPicker = document.getElementById("icon-picker");
const saveCategoryBtn = document.getElementById("create-category");

// Fenêtre mot
const wordModal = document.getElementById("word-modal");
const wordModalTitle = document.getElementById("word-modal-title");
const chineseInput = document.getElementById("word-chinese");
const pinyinInput = document.getElementById("word-pinyin");
const translationInput = document.getElementById("word-translation");
const exampleInput = document.getElementById("word-example");
const hskSelect = document.getElementById("word-hsk");
const saveWordBtn = document.getElementById("save-word");

// ---------- ÉTAT LOCAL ----------

let currentCategoryId = null;   // catégorie ouverte
let editingCategoryId = null;   // catégorie en cours de modification (null = création)
let editingWordIndex = null;    // mot en cours de modification (null = ajout)
let selectedIcon = CATEGORY_ICONS[0];

function getCurrentCategory() {
    return state.categories.find(category => category.id === currentCategoryId);
}

// =====================================================
// CHARGEMENT
// =====================================================

export async function loadCategories() {
    state.categories = [];

    try {
        const docs = await loadDocs(CATEGORIES_COLLECTION);

        docs.forEach(({ id, data }) => {
            state.categories.push({
                id: id,
                name: data.name,
                icon: data.icon,
                words: data.words || [],
                createdAt: data.createdAt || 0
            });
        });

        state.categories.sort((a, b) => a.createdAt - b.createdAt);

    } catch (error) {
        console.error("Erreur de chargement des catégories :", error);
    }

    renderCategories();
}

export function resetVocabulary() {
    state.categories = [];
    showCategoriesList();
    renderCategories();
}

// =====================================================
// AFFICHAGE
// =====================================================

function renderCategories() {
    categoriesContainer.innerHTML = "";

    if (state.categories.length === 0) {
        categoriesContainer.appendChild(el("p", "empty-message", TEXTS.emptyCategories));
        return;
    }

    state.categories.forEach(category => {
        const card = el("div", "category-card");

        card.appendChild(el("div", "category-icon", category.icon));
        card.appendChild(el("h3", "", category.name));
        card.appendChild(el("p", "", countLabel(category.words.length, TEXTS.wordSingular, TEXTS.wordPlural)));

        card.addEventListener("click", () => openCategory(category.id));

        categoriesContainer.appendChild(card);
    });
}

function renderDetail() {
    const category = getCurrentCategory();

    if (!category) {
        showCategoriesList();
        return;
    }

    detailName.textContent = category.icon + " " + category.name;
    detailCount.textContent = countLabel(category.words.length, TEXTS.wordSingular, TEXTS.wordPlural);

    tableBody.innerHTML = "";

    if (category.words.length === 0) {
        const row = el("tr");
        const cell = el("td", "empty-message", TEXTS.emptyWords);
        cell.colSpan = 6;
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    category.words.forEach((word, index) => {
        const row = el("tr");

        [word.chinese, word.pinyin, word.translation, word.hsk || TEXTS.emptyExample, word.example || TEXTS.emptyExample].forEach(value => {
            row.appendChild(el("td", "", value));
        });

        // Boutons modifier / supprimer
        const actions = el("td");

        const editBtn = el("button", "row-btn", "✎");
        editBtn.type = "button";
        editBtn.title = "Modifier";
        editBtn.addEventListener("click", () => openWordModal(index));

        const deleteBtn = el("button", "row-btn", "🗑");
        deleteBtn.type = "button";
        deleteBtn.title = "Supprimer";
        deleteBtn.addEventListener("click", () => deleteWord(index));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        row.appendChild(actions);

        tableBody.appendChild(row);
    });
}

function openCategory(id) {
    currentCategoryId = id;

    categoriesContainer.style.display = "none";
    toolbar.style.display = "none";
    detail.style.display = "block";

    renderDetail();
}

function showCategoriesList() {
    currentCategoryId = null;

    detail.style.display = "none";
    categoriesContainer.style.display = "grid";
    toolbar.style.display = "flex";
}

// =====================================================
// CATÉGORIES : CRÉER / MODIFIER / SUPPRIMER
// =====================================================

function buildIconPicker() {
    iconPicker.innerHTML = "";

    CATEGORY_ICONS.forEach(icon => {
        const button = el("button", "icon-option", icon);
        button.type = "button";
        button.dataset.icon = icon;
        button.addEventListener("click", () => selectIcon(icon));
        iconPicker.appendChild(button);
    });
}

function selectIcon(icon) {
    selectedIcon = icon;

    iconPicker.querySelectorAll(".icon-option").forEach(option => {
        option.classList.toggle("selected", option.dataset.icon === icon);
    });
}

// category = null → création, sinon modification
function openCategoryModal(category = null) {
    editingCategoryId = category ? category.id : null;

    categoryModalTitle.textContent = category ? TEXTS.categoryModalEditTitle : TEXTS.categoryModalCreateTitle;
    saveCategoryBtn.textContent = category ? TEXTS.categoryModalEditButton : TEXTS.categoryModalCreateButton;
    categoryNameInput.value = category ? category.name : "";

    selectIcon(category ? category.icon : CATEGORY_ICONS[0]);

    openModal(categoryModal);
    categoryNameInput.focus();
}

function closeCategoryModal() {
    closeModal(categoryModal);
    categoryNameInput.value = "";
    editingCategoryId = null;
}

function saveCategory() {
    const name = categoryNameInput.value.trim();

    if (name === "") {
        categoryNameInput.focus();
        return;
    }

    if (editingCategoryId) {
        // Modification
        sendWrite(
            updateDoc(userDoc(CATEGORIES_COLLECTION, editingCategoryId), { name: name, icon: selectedIcon }),
            TEXTS.saveError
        );

        const category = state.categories.find(c => c.id === editingCategoryId);
        category.name = name;
        category.icon = selectedIcon;

    } else {
        // Création
        const reference = newDocRef(CATEGORIES_COLLECTION);
        const data = { name: name, icon: selectedIcon, words: [], createdAt: Date.now() };

        sendWrite(setDoc(reference, data), TEXTS.saveError);
        state.categories.push({ id: reference.id, ...data });
    }

    closeCategoryModal();
    renderCategories();
    if (currentCategoryId) renderDetail();
    notifyChange();
}

function deleteCategory() {
    const category = getCurrentCategory();
    if (!category) return;

    if (!confirm(TEXTS.confirmDeleteCategory)) return;

    sendWrite(deleteDoc(userDoc(CATEGORIES_COLLECTION, category.id)), TEXTS.deleteError);

    state.categories = state.categories.filter(c => c.id !== category.id);

    showCategoriesList();
    renderCategories();
    notifyChange();
}

// =====================================================
// MOTS : AJOUTER / MODIFIER / SUPPRIMER
// =====================================================

// index = null → ajout, sinon modification du mot à cette position
function openWordModal(index = null) {
    editingWordIndex = index;

    const word = index !== null ? getCurrentCategory().words[index] : null;

    wordModalTitle.textContent = word ? TEXTS.wordModalEditTitle : TEXTS.wordModalCreateTitle;
    saveWordBtn.textContent = word ? TEXTS.wordModalEditButton : TEXTS.wordModalCreateButton;

    chineseInput.value = word ? word.chinese : "";
    pinyinInput.value = word ? word.pinyin : "";
    translationInput.value = word ? word.translation : "";
    exampleInput.value = word ? (word.example || "") : "";
    hskSelect.value = word ? (word.hsk || "") : "";

    openModal(wordModal);
    chineseInput.focus();
}

function closeWordModal() {
    closeModal(wordModal);
    editingWordIndex = null;

    chineseInput.value = "";
    pinyinInput.value = "";
    translationInput.value = "";
    exampleInput.value = "";
    hskSelect.value = "";
}

// Enregistre la nouvelle liste de mots puis rafraîchit l'écran
function saveWords(category, words) {
    sendWrite(
        updateDoc(userDoc(CATEGORIES_COLLECTION, category.id), { words: words }),
        TEXTS.saveError
    );

    category.words = words;

    renderDetail();
    renderCategories();
    notifyChange();
}

function saveWord() {
    const word = {
        chinese: chineseInput.value.trim(),
        pinyin: pinyinInput.value.trim(),
        translation: translationInput.value.trim(),
        hsk: hskSelect.value,
        example: exampleInput.value.trim()
    };

    if (!word.chinese || !word.pinyin || !word.translation) {
        alert(TEXTS.requiredWordFields);
        return;
    }

    const category = getCurrentCategory();
    if (!category) return;

    // Date d'ajout (pour « les derniers mots ajoutés » dans les révisions)
    if (editingWordIndex !== null) {
        const previous = category.words[editingWordIndex];
        if (previous && previous.addedAt) word.addedAt = previous.addedAt;
    } else {
        word.addedAt = Date.now();
    }

    const words = [...category.words];

    if (editingWordIndex !== null) {
        words[editingWordIndex] = word;
    } else {
        words.push(word);
    }

    saveWords(category, words);
    closeWordModal();
}

function deleteWord(index) {
    const category = getCurrentCategory();
    if (!category) return;

    if (!confirm(TEXTS.confirmDeleteWord)) return;

    saveWords(category, category.words.filter((_, i) => i !== index));
}

// =====================================================
// INITIALISATION : BRANCHER LES BOUTONS
// =====================================================

export function initVocabulary() {
    buildIconPicker();
    selectIcon(CATEGORY_ICONS[0]);

    // Liste des niveaux HSK (définie dans config.js)
    hskSelect.appendChild(new Option(TEXTS.hskNone, ""));
    HSK_LEVELS.forEach(level => hskSelect.appendChild(new Option(level, level)));

    // Catégories
    document.getElementById("new-category-btn").addEventListener("click", () => openCategoryModal());
    document.getElementById("edit-category-btn").addEventListener("click", () => openCategoryModal(getCurrentCategory()));
    document.getElementById("delete-category-btn").addEventListener("click", deleteCategory);
    document.getElementById("back-to-categories").addEventListener("click", showCategoriesList);

    document.getElementById("close-category-modal").addEventListener("click", closeCategoryModal);
    document.getElementById("cancel-category").addEventListener("click", closeCategoryModal);
    saveCategoryBtn.addEventListener("click", saveCategory);
    closeOnOutsideClick(categoryModal, closeCategoryModal);

    // Mots
    document.getElementById("add-word-btn").addEventListener("click", () => openWordModal());
    document.getElementById("close-word-modal").addEventListener("click", closeWordModal);
    document.getElementById("cancel-word").addEventListener("click", closeWordModal);
    saveWordBtn.addEventListener("click", saveWord);
    closeOnOutsideClick(wordModal, closeWordModal);
}


// Réafficher la liste des catégories (utilisé par reorganiser.js)
export function refreshVocabulary() {
    showCategoriesList();
    renderCategories();
}
