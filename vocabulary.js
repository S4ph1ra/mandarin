// =====================================================
// VOCABULAIRE.JS : CATÉGORIES ET MOTS
// =====================================================
// Structure d'une catégorie dans Firestore :
//   { name, icon, words: [{ chinese, pinyin, translation, example }], createdAt }

import {
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userCollection, userDoc } from "./firebase.js";
import { state, notifyChange } from "./state.js";
import { el, openModal, closeModal, closeOnOutsideClick, countLabel } from "./ui.js";
import { CATEGORIES_COLLECTION, CATEGORY_ICONS, TEXTS } from "./config.js";

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
        const snapshot = await getDocs(userCollection(CATEGORIES_COLLECTION));

        snapshot.forEach(documentSnapshot => {
            const data = documentSnapshot.data();
            state.categories.push({
                id: documentSnapshot.id,
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
        cell.colSpan = 5;
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    category.words.forEach((word, index) => {
        const row = el("tr");

        [word.chinese, word.pinyin, word.translation, word.example || TEXTS.emptyExample].forEach(value => {
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

async function saveCategory() {
    const name = categoryNameInput.value.trim();

    if (name === "") {
        categoryNameInput.focus();
        return;
    }

    try {
        if (editingCategoryId) {
            // Modification
            await updateDoc(userDoc(CATEGORIES_COLLECTION, editingCategoryId), {
                name: name,
                icon: selectedIcon
            });

            const category = state.categories.find(c => c.id === editingCategoryId);
            category.name = name;
            category.icon = selectedIcon;

        } else {
            // Création
            const data = { name: name, icon: selectedIcon, words: [], createdAt: Date.now() };
            const saved = await addDoc(userCollection(CATEGORIES_COLLECTION), data);
            state.categories.push({ id: saved.id, ...data });
        }

        closeCategoryModal();
        renderCategories();
        if (currentCategoryId) renderDetail();
        notifyChange();

    } catch (error) {
        console.error(error);
        alert(TEXTS.saveError);
    }
}

async function deleteCategory() {
    const category = getCurrentCategory();
    if (!category) return;

    if (!confirm(TEXTS.confirmDeleteCategory)) return;

    try {
        await deleteDoc(userDoc(CATEGORIES_COLLECTION, category.id));

        state.categories = state.categories.filter(c => c.id !== category.id);

        showCategoriesList();
        renderCategories();
        notifyChange();

    } catch (error) {
        console.error(error);
        alert(TEXTS.deleteError);
    }
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
}

// Enregistre la nouvelle liste de mots dans Firestore puis rafraîchit l'écran
async function saveWords(category, words) {
    await updateDoc(userDoc(CATEGORIES_COLLECTION, category.id), { words: words });

    category.words = words;

    renderDetail();
    renderCategories();
    notifyChange();
}

async function saveWord() {
    const word = {
        chinese: chineseInput.value.trim(),
        pinyin: pinyinInput.value.trim(),
        translation: translationInput.value.trim(),
        example: exampleInput.value.trim()
    };

    if (!word.chinese || !word.pinyin || !word.translation) {
        alert(TEXTS.requiredWordFields);
        return;
    }

    const category = getCurrentCategory();
    if (!category) return;

    const words = [...category.words];

    if (editingWordIndex !== null) {
        words[editingWordIndex] = word;
    } else {
        words.push(word);
    }

    try {
        await saveWords(category, words);
        closeWordModal();
    } catch (error) {
        console.error("Erreur de sauvegarde :", error);
        alert(TEXTS.saveError);
    }
}

async function deleteWord(index) {
    const category = getCurrentCategory();
    if (!category) return;

    if (!confirm(TEXTS.confirmDeleteWord)) return;

    try {
        await saveWords(category, category.words.filter((_, i) => i !== index));
    } catch (error) {
        console.error(error);
        alert(TEXTS.deleteError);
    }
}

// =====================================================
// INITIALISATION : BRANCHER LES BOUTONS
// =====================================================

export function initVocabulary() {
    buildIconPicker();
    selectIcon(CATEGORY_ICONS[0]);

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
