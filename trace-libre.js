// =====================================================
// TRACE-LIBRE.JS : S'ENTRAÎNER À ÉCRIRE UN CARACTÈRE AU DOIGT
// =====================================================
// Fichier autonome : il ajoute une page "Tracé libre" dans le menu.
//   - une feuille quadrillée sur laquelle tu écris au doigt
//   - un modèle facultatif (un caractère de ton vocabulaire), que tu peux cacher
//   - annuler le dernier trait, ou tout effacer
// Le site ne vérifie pas ton tracé : tu compares toi-même avec le modèle.
// Les textes et réglages sont juste en dessous.

import { state, onStateChange } from "./state.js";
import { showPage } from "./navigation.js";

// ---------- TEXTES ET RÉGLAGES (modifie ici) ----------
const TRACE = {
    pageName: "trace-libre",
    menuIcon: "🖌️",
    menuLabel: "Tracé libre",

    title: "Tracé libre",
    description: "Entraîne-toi à écrire un caractère au doigt, avec ou sans modèle. Le site ne corrige pas ton tracé : compare-le toi-même.",

    categoryLabel: "Catégorie (facultatif)",
    wordLabel: "Mot",
    noCategory: "Feuille libre (sans modèle)",
    chooseWord: "Choisis un mot",
    characterLabel: "Caractère à écrire",

    modelOn: "👁 Modèle affiché",
    modelOff: "🙈 Modèle caché",
    undo: "↩ Annuler le trait",
    clear: "🗑 Effacer",
    strokes: (count) => "Traits : " + count,

    // Apparence
    maxSize: 340,                          // taille maximale de la feuille (pixels)
    ink: "#741E29",                        // couleur de ton tracé
    inkWidth: 9,                           // épaisseur du trait
    modelColor: "rgba(130, 118, 111, 0.30)",   // couleur du modèle
    gridColor: "#DCD1C8",                  // couleur du quadrillage
    paperColor: "#FFFFFF"
};

// ---------- OUTILS ----------

function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function hanCharacters(text) {
    return Array.from(text || "").filter(char => /[\u3400-\u9fff]/.test(char));
}

// ---------- PAGE ----------

function start() {
    const nav = document.querySelector(".sidebar-nav");
    const app = document.getElementById("app");
    if (!nav || !app) return;

    // Lien dans le menu (après "Écriture" si possible)
    const link = create("a", "nav-item");
    link.href = "#";
    link.dataset.page = TRACE.pageName;
    link.appendChild(create("span", "nav-icon", TRACE.menuIcon));
    link.appendChild(create("span", "", TRACE.menuLabel));

    const after = nav.querySelector('[data-page="ecriture"]');
    if (after) after.after(link); else nav.appendChild(link);

    link.addEventListener("click", event => {
        event.preventDefault();
        showPage(TRACE.pageName);
    });

    // Page
    const page = create("section", "page");
    page.id = "page-" + TRACE.pageName;

    const header = create("header", "page-header");
    const headerText = create("div", "header-text");
    headerText.appendChild(create("h1", "", TRACE.title));
    headerText.appendChild(create("p", "header-description", TRACE.description));
    header.appendChild(headerText);
    page.appendChild(header);

    // Choix du modèle
    const controls = create("div", "writing-controls");

    function field(label, select) {
        const wrapper = create("div", "writing-field");
        wrapper.appendChild(create("label", "", label));
        wrapper.appendChild(select);
        return wrapper;
    }

    const categorySelect = create("select");
    const wordSelect = create("select");
    controls.appendChild(field(TRACE.categoryLabel, categorySelect));
    controls.appendChild(field(TRACE.wordLabel, wordSelect));
    page.appendChild(controls);

    const characterRow = create("div");
    characterRow.style.cssText = "display: none; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 16px;";
    page.appendChild(characterRow);

    // Feuille de tracé
    const card = create("div", "hanzi-card");
    card.style.cssText = "align-items: stretch; max-width: " + (TRACE.maxSize + 40) + "px;";

    const canvas = create("canvas");
    canvas.style.cssText =
        "display: block; border: 1px solid #DED5CE; border-radius: 10px; " +
        "background: " + TRACE.paperColor + "; touch-action: none; margin: 0 auto;";
    card.appendChild(canvas);

    const counter = create("p", "hanzi-status", TRACE.strokes(0));
    counter.style.cssText = "margin: 0; max-width: none; text-align: center;";
    card.appendChild(counter);

    const buttons = create("div", "hanzi-buttons");
    const undoButton = create("button", "secondary-btn", TRACE.undo);
    const clearButton = create("button", "secondary-btn", TRACE.clear);
    const modelButton = create("button", "secondary-btn", TRACE.modelOn);
    [undoButton, clearButton, modelButton].forEach(button => {
        button.type = "button";
        buttons.appendChild(button);
    });
    card.appendChild(buttons);

    page.appendChild(card);
    app.appendChild(page);

    // ---------- DESSIN ----------
    const ctx = canvas.getContext("2d");
    let size = 300;
    let ratio = 1;
    let strokes = [];        // chaque trait = liste de points (entre 0 et 1)
    let currentStroke = null;
    let showModel = true;
    let currentChar = "";

    function resize() {
        const available = Math.max(160, (card.clientWidth || TRACE.maxSize) - 36);
        size = Math.min(TRACE.maxSize, available);
        ratio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(size * ratio);
        canvas.height = Math.round(size * ratio);
        canvas.style.width = size + "px";
        canvas.style.height = size + "px";

        redraw();
    }

    function drawGrid() {
        ctx.save();
        ctx.strokeStyle = TRACE.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(size / 2, size);
        ctx.moveTo(0, size / 2);
        ctx.lineTo(size, size / 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(size, size);
        ctx.moveTo(size, 0);
        ctx.lineTo(0, size);
        ctx.stroke();

        ctx.restore();
    }

    function drawModel() {
        ctx.save();
        ctx.fillStyle = TRACE.modelColor;
        ctx.font = Math.round(size * 0.82) + 'px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(currentChar, size / 2, size / 2 + size * 0.04);
        ctx.restore();
    }

    function drawStroke(points) {
        ctx.strokeStyle = TRACE.ink;
        ctx.fillStyle = TRACE.ink;
        ctx.lineWidth = TRACE.inkWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (points.length === 1) {
            ctx.beginPath();
            ctx.arc(points[0].x * size, points[0].y * size, TRACE.inkWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x * size, points[0].y * size);

        // Courbes douces entre les points
        for (let i = 1; i < points.length - 1; i++) {
            const midX = (points[i].x + points[i + 1].x) / 2 * size;
            const midY = (points[i].y + points[i + 1].y) / 2 * size;
            ctx.quadraticCurveTo(points[i].x * size, points[i].y * size, midX, midY);
        }

        const last = points[points.length - 1];
        ctx.lineTo(last.x * size, last.y * size);
        ctx.stroke();
    }

    function redraw() {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, size, size);

        drawGrid();
        if (showModel && currentChar) drawModel();
        strokes.forEach(drawStroke);

        counter.textContent = TRACE.strokes(strokes.length);
    }

    // ---------- DOIGT ET SOURIS ----------

    function position(event) {
        const point = event.touches && event.touches.length ? event.touches[0] : event;
        const box = canvas.getBoundingClientRect();

        return {
            x: Math.min(1, Math.max(0, (point.clientX - box.left) / box.width)),
            y: Math.min(1, Math.max(0, (point.clientY - box.top) / box.height))
        };
    }

    function begin(event) {
        event.preventDefault();
        currentStroke = [position(event)];
        strokes.push(currentStroke);
        redraw();
    }

    function move(event) {
        if (!currentStroke) return;
        event.preventDefault();
        currentStroke.push(position(event));
        redraw();
    }

    function end() {
        currentStroke = null;
    }

    // Doigt (passive: false pour que la page ne défile pas pendant le tracé)
    canvas.addEventListener("touchstart", begin, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);
    canvas.addEventListener("touchcancel", end);

    // Souris (si tu ouvres le site sur un ordinateur)
    canvas.addEventListener("mousedown", begin);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    // ---------- BOUTONS ----------

    undoButton.addEventListener("click", () => {
        strokes.pop();
        redraw();
    });

    clearButton.addEventListener("click", () => {
        strokes = [];
        redraw();
    });

    modelButton.addEventListener("click", () => {
        showModel = !showModel;
        modelButton.textContent = showModel ? TRACE.modelOn : TRACE.modelOff;
        redraw();
    });

    // ---------- CHOIX DU MOT ET DU CARACTÈRE ----------

    function setCharacter(char) {
        currentChar = char;
        strokes = [];
        currentStroke = null;
        redraw();

        Array.prototype.slice.call(characterRow.querySelectorAll("button")).forEach(button => {
            button.className = button.textContent === char ? "add-category-btn" : "secondary-btn";
        });
    }

    function showCharacters() {
        const category = state.categories.filter(c => c.id === categorySelect.value)[0];
        const word = category && category.words[wordSelect.value];
        const characters = word ? hanCharacters(word.chinese) : [];

        characterRow.innerHTML = "";

        if (characters.length === 0) {
            characterRow.style.display = "none";
            setCharacter("");
            return;
        }

        characterRow.style.display = "flex";
        characterRow.appendChild(create("span", "hanzi-status", TRACE.characterLabel));

        characters.forEach(char => {
            const button = create("button", "secondary-btn", char);
            button.type = "button";
            button.style.cssText = "font-size: 22px; padding: 8px 16px;";
            button.addEventListener("click", () => setCharacter(char));
            characterRow.appendChild(button);
        });

        setCharacter(characters[0]);
    }

    function fillWords() {
        const previous = wordSelect.value;
        const category = state.categories.filter(c => c.id === categorySelect.value)[0];

        wordSelect.innerHTML = "";
        wordSelect.appendChild(new Option(TRACE.chooseWord, ""));

        if (category) {
            category.words.forEach((word, index) => {
                wordSelect.appendChild(new Option(word.chinese + " · " + word.translation, String(index)));
            });
        }

        const exists = Array.prototype.slice.call(wordSelect.options).some(option => option.value === previous);
        wordSelect.value = exists ? previous : "";

        showCharacters();
    }

    function fillCategories() {
        const previous = categorySelect.value;

        categorySelect.innerHTML = "";
        categorySelect.appendChild(new Option(TRACE.noCategory, ""));

        state.categories
            .filter(category => category.words.length > 0)
            .forEach(category => {
                categorySelect.appendChild(new Option(category.icon + " " + category.name, category.id));
            });

        const exists = Array.prototype.slice.call(categorySelect.options).some(option => option.value === previous);
        categorySelect.value = exists ? previous : "";

        fillWords();
    }

    categorySelect.addEventListener("change", fillWords);
    wordSelect.addEventListener("change", showCharacters);

    // Remplir les listes quand les données arrivent ou changent
    onStateChange(fillCategories);
    fillCategories();

    // Adapter la taille à l'écran
    link.addEventListener("click", () => setTimeout(resize, 0));
    window.addEventListener("resize", resize);
    resize();
}

if (typeof document !== "undefined") start();
