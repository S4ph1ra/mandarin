// =====================================================
// ECRITURE.JS : ANIMATION ET TRACÉ DES CARACTÈRES
// =====================================================
// Utilise la bibliothèque Hanzi Writer (chargée dans index.html).
// Les réglages (textes, taille, couleurs) sont dans config.js (WRITING).

import { state, onStateChange } from "./state.js";
import { el } from "./ui.js";
import { WRITING } from "./config.js";

let categorySelect, wordSelect, info, board, animateAllBtn;
let writers = [];   // un tracé par caractère affiché

// =====================================================
// CONSTRUCTION DE LA PAGE
// =====================================================

function buildPage() {
    const page = document.getElementById(WRITING.pageId);
    if (!page) return false;

    page.innerHTML = `
        <header class="page-header">
            <div class="header-text">
                <h1></h1>
                <p class="header-description"></p>
            </div>
        </header>

        <div class="writing-controls">
            <div class="writing-field">
                <label for="writing-category"></label>
                <select id="writing-category"></select>
            </div>
            <div class="writing-field">
                <label for="writing-word"></label>
                <select id="writing-word"></select>
            </div>
        </div>

        <div class="writing-info" style="display: none;"></div>
        <div class="hanzi-board"></div>
        <button type="button" class="add-category-btn writing-all-btn" style="display: none;"></button>
    `;

    page.querySelector("h1").textContent = WRITING.title;
    page.querySelector(".header-description").textContent = WRITING.description;
    page.querySelector('label[for="writing-category"]').textContent = WRITING.categoryLabel;
    page.querySelector('label[for="writing-word"]').textContent = WRITING.wordLabel;

    categorySelect = page.querySelector("#writing-category");
    wordSelect = page.querySelector("#writing-word");
    info = page.querySelector(".writing-info");
    board = page.querySelector(".hanzi-board");
    animateAllBtn = page.querySelector(".writing-all-btn");
    animateAllBtn.textContent = WRITING.animateAllButton;

    return true;
}

// =====================================================
// LISTES DÉROULANTES
// =====================================================

function fillCategories() {
    const previous = categorySelect.value;

    categorySelect.innerHTML = "";
    categorySelect.appendChild(new Option(WRITING.chooseCategory, ""));

    state.categories
        .filter(category => category.words.length > 0)
        .forEach(category => {
            categorySelect.appendChild(new Option(category.icon + " " + category.name, category.id));
        });

    // Garder la sélection si elle existe encore
    categorySelect.value = [...categorySelect.options].some(o => o.value === previous) ? previous : "";

    fillWords();
}

function fillWords() {
    const previous = wordSelect.value;
    const category = state.categories.find(c => c.id === categorySelect.value);

    wordSelect.innerHTML = "";
    wordSelect.appendChild(new Option(WRITING.chooseWord, ""));

    if (category) {
        category.words.forEach((word, index) => {
            wordSelect.appendChild(new Option(word.chinese + " · " + word.translation, String(index)));
        });
    }

    wordSelect.value = [...wordSelect.options].some(o => o.value === previous) ? previous : "";

    showWord();
}

// =====================================================
// AFFICHAGE DU MOT
// =====================================================

function clearBoard() {
    writers.forEach(writer => writer.cancelQuiz());
    writers = [];
    board.innerHTML = "";
    info.style.display = "none";
    animateAllBtn.style.display = "none";
}

function showWord() {
    clearBoard();

    const category = state.categories.find(c => c.id === categorySelect.value);
    const word = category && category.words[wordSelect.value];

    // Pas encore de mot choisi
    if (!word) {
        if (state.categories.every(c => c.words.length === 0)) {
            board.appendChild(el("p", "empty-message", WRITING.noWords));
        }
        return;
    }

    if (!window.HanziWriter) {
        board.appendChild(el("p", "empty-message", WRITING.loadError));
        return;
    }

    // Seulement les caractères chinois (on ignore ponctuation, lettres...)
    const characters = [...word.chinese].filter(char => /\p{Script=Han}/u.test(char));

    if (characters.length === 0) {
        board.appendChild(el("p", "empty-message", WRITING.noHanzi));
        return;
    }

    info.textContent = word.pinyin + " : " + word.translation;
    info.style.display = "block";

    characters.forEach(char => board.appendChild(buildCharacterCard(char)));

    animateAllBtn.style.display = characters.length > 1 ? "inline-block" : "none";
}

// Une carte = un caractère + ses boutons
function buildCharacterCard(char) {
    const card = el("div", "hanzi-card");
    const box = el("div", "hanzi-box");
    const status = el("p", "hanzi-status", "");

    box.style.width = WRITING.size + "px";
    box.style.height = WRITING.size + "px";

    const buttons = el("div", "hanzi-buttons");

    const animateBtn = el("button", "secondary-btn", WRITING.animateButton);
    animateBtn.type = "button";

    const practiceBtn = el("button", "add-category-btn", WRITING.practiceButton);
    practiceBtn.type = "button";

    buttons.appendChild(animateBtn);
    buttons.appendChild(practiceBtn);

    card.appendChild(box);
    card.appendChild(buttons);
    card.appendChild(status);

    const writer = window.HanziWriter.create(box, char, {
        width: WRITING.size,
        height: WRITING.size,
        padding: 8,
        showOutline: true,
        strokeColor: WRITING.strokeColor,
        outlineColor: WRITING.outlineColor,
        drawingColor: WRITING.drawingColor,
        highlightColor: WRITING.highlightColor,
        strokeAnimationSpeed: WRITING.animationSpeed,
        delayBetweenStrokes: WRITING.delayBetweenStrokes,
        showHintAfterMisses: WRITING.showHintAfterMisses,
        onLoadCharDataError: () => {
            box.innerHTML = "";
            status.textContent = WRITING.charError;
            buttons.style.display = "none";
        }
    });

    writers.push(writer);

    animateBtn.addEventListener("click", () => {
        status.textContent = "";
        writer.cancelQuiz();
        writer.animateCharacter();
    });

    practiceBtn.addEventListener("click", () => {
        status.textContent = WRITING.practiceHint;
        writer.quiz({
            onComplete: () => {
                status.textContent = WRITING.practiceDone;
            }
        });
    });

    return card;
}

// Animer tous les caractères du mot, l'un après l'autre
function animateAll(index = 0) {
    if (index >= writers.length) return;

    writers[index].cancelQuiz();
    writers[index].animateCharacter({
        onComplete: () => animateAll(index + 1)
    });
}

// =====================================================
// INITIALISATION
// =====================================================

export function initEcriture() {
    if (!buildPage()) return;

    categorySelect.addEventListener("change", fillWords);
    wordSelect.addEventListener("change", showWord);
    animateAllBtn.addEventListener("click", () => animateAll());

    // Remplir les listes quand les données sont chargées ou modifiées
    onStateChange(fillCategories);
    fillCategories();
}
