// =====================================================
// TABLETTE.JS : CONFORT SUR TABLETTE
// =====================================================
// Fichier autonome, deux ajouts :
//   1. un clavier d'accents de pinyin (ā á ǎ à...) dans la fenêtre « Ajouter un mot »
//   2. un menu qui se replie derrière un bouton ☰ quand l'écran est étroit
// Les réglages sont juste en dessous (enabled: false pour couper un ajout).

const TABLETTE = {
    pinyinKeyboard: {
        enabled: true,

        // Les lignes du clavier : une voyelle avec ses 4 tons (ü et ses tons en dernier)
        rows: [
            ["ā", "á", "ǎ", "à"],
            ["ē", "é", "ě", "è"],
            ["ī", "í", "ǐ", "ì"],
            ["ō", "ó", "ǒ", "ò"],
            ["ū", "ú", "ǔ", "ù"],
            ["ǖ", "ǘ", "ǚ", "ǜ", "ü"]
        ],

        // Couleur de chaque ton (comme dans tons-couleur.js)
        colors: { 0: "#7F8C8D", 1: "#C0392B", 2: "#D68910", 3: "#1E8449", 4: "#2563A8" },

        shiftLabel: "⇧",
        shiftTitle: "Majuscules"
    },

    menu: {
        enabled: true,
        breakpoint: 900,          // en dessous de cette largeur (pixels), le menu se replie
        icon: "☰",
        label: "Ouvrir le menu"
    }
};

// ---------- 1. CLAVIER DE PINYIN ----------

// Écrit du texte à la position du curseur dans un champ
export function insertAt(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (typeof start !== "number") {
        input.value += text;
    } else {
        const value = input.value;
        input.value = value.slice(0, start) + text + value.slice(end);

        const position = start + text.length;
        input.setSelectionRange(position, position);
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
}

// Quel ton a cette lettre ? (1 à 4 selon sa place dans la ligne, 0 pour ü)
function toneOf(index, rowLength) {
    return index < 4 ? index + 1 : 0;
}

function startPinyinKeyboard() {
    const input = document.getElementById("word-pinyin");
    const modalBox = document.querySelector("#word-modal .modal-box");
    if (!input || !modalBox) return;

    const config = TABLETTE.pinyinKeyboard;

    // La fenêtre peut défiler si l'écran est petit
    modalBox.style.maxHeight = "92vh";
    modalBox.style.overflowY = "auto";

    const keyboard = document.createElement("div");
    keyboard.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;";

    let uppercase = false;
    const keys = [];

    function makeButton(label) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.cssText =
            "min-width: 38px; height: 38px; padding: 0 6px; font-size: 19px; font-family: inherit; " +
            "background: #F0EAE3; border: none; border-radius: 8px; cursor: pointer;";

        // Garde le curseur dans le champ (le clavier de la tablette reste ouvert)
        button.addEventListener("mousedown", event => event.preventDefault());

        return button;
    }

    config.rows.forEach(row => {
        const group = document.createElement("div");
        group.style.cssText = "display: inline-flex; gap: 4px;";

        row.forEach((letter, index) => {
            const button = makeButton(letter);
            button.style.color = config.colors[toneOf(index, row.length)];
            button.style.fontWeight = "600";

            button.addEventListener("click", () => {
                insertAt(input, uppercase ? letter.toUpperCase() : letter);
                input.focus();
            });

            keys.push({ button: button, letter: letter });
            group.appendChild(button);
        });

        keyboard.appendChild(group);
    });

    // Bouton majuscules
    const shift = makeButton(config.shiftLabel);
    shift.title = config.shiftTitle;
    shift.addEventListener("click", () => {
        uppercase = !uppercase;
        shift.style.background = uppercase ? "#E8C9CC" : "#F0EAE3";

        keys.forEach(key => {
            key.button.textContent = uppercase ? key.letter.toUpperCase() : key.letter;
        });
    });
    keyboard.appendChild(shift);

    input.after(keyboard);
}

// ---------- 2. MENU REPLIABLE ----------

function startMenu() {
    const sidebar = document.querySelector(".sidebar");
    const app = document.getElementById("app");
    if (!sidebar || !app) return;

    const config = TABLETTE.menu;

    // Styles ajoutés par ce fichier (style.css n'est pas modifié)
    const style = document.createElement("style");
    style.textContent =
        "#menu-toggle { display: none; position: fixed; top: 12px; left: 12px; width: 46px; height: 46px; " +
        "align-items: center; justify-content: center; font-size: 24px; background: #FFFFFF; " +
        "color: var(--dark-red); border: 1px solid #DED5CE; border-radius: 12px; " +
        "box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); cursor: pointer; z-index: 900; }" +
        "#menu-backdrop { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; " +
        "background: rgba(35, 25, 25, 0.45); z-index: 1400; }" +
        "@media (max-width: " + config.breakpoint + "px) {" +
        "  #menu-toggle { display: flex; }" +
        "  .sidebar { transform: translateX(-100%); visibility: hidden; " +
        "    transition: transform 0.25s, visibility 0.25s; z-index: 1500; " +
        "    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15); }" +
        "  .sidebar.open { transform: none; visibility: visible; }" +
        "  #menu-backdrop.show { display: block; }" +
        "  #app { margin-left: 0; padding-top: 76px; }" +
        "}";
    document.head.appendChild(style);

    // Bouton ☰ et fond sombre
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "menu-toggle";
    toggle.textContent = config.icon;
    toggle.setAttribute("aria-label", config.label);

    const backdrop = document.createElement("div");
    backdrop.id = "menu-backdrop";

    document.body.appendChild(toggle);
    document.body.appendChild(backdrop);

    function openMenu() {
        sidebar.classList.add("open");
        backdrop.classList.add("show");
    }

    function closeMenu() {
        sidebar.classList.remove("open");
        backdrop.classList.remove("show");
    }

    toggle.addEventListener("click", openMenu);
    backdrop.addEventListener("click", closeMenu);

    // Choisir une page (ou se déconnecter) referme le menu
    sidebar.addEventListener("click", event => {
        if (event.target.closest && event.target.closest("[data-page], #logout-btn")) closeMenu();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });

    // Si l'écran redevient large, on remet tout en place
    window.addEventListener("resize", () => {
        if (window.innerWidth > config.breakpoint) closeMenu();
    });
}

// ---------- DÉMARRAGE ----------

function start() {
    if (TABLETTE.pinyinKeyboard.enabled) startPinyinKeyboard();
    if (TABLETTE.menu.enabled) startMenu();
}

if (typeof document !== "undefined") start();
