// =====================================================
// PARAMETRES.JS : PAGE PARAMÈTRES
// =====================================================
// Fichier autonome : il ajoute une page ⚙️ Paramètres dans le menu.
// Les réglages sont gardés sur ton appareil ET sur ton compte
// (tu les retrouves sur ta tablette comme sur ton téléphone).
//
// Réglages : taille du texte, mode sombre, couleur du site, particules,
// tons en couleur, vitesse de la voix, réglages par défaut des révisions.
// Les textes et les choix proposés sont juste en dessous.

import { getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userDoc, sendWrite } from "./firebase.js";
import { state, onStateChange } from "./state.js";
import { showPage } from "./navigation.js";

// ---------- TEXTES ET CHOIX (modifie ici) ----------
const PARAMETRES = {
    pageName: "parametres",
    menuIcon: "⚙",
    menuLabel: "Paramètres",

    title: "Paramètres",
    description: "Règle le site comme tu l'aimes. Tes choix sont gardés sur ton compte.",

    displayTitle: "Affichage",
    textSizeLabel: "Taille du texte",
    textSizeHelp: "Ne s'applique pas aux pages Écriture et Tracé libre.",
    darkLabel: "Mode sombre",
    paletteLabel: "Couleur du site",
    quickButtonLabel: "Bouton de révision éclair ⚡",
    quickButtonHelp: "Un bouton flottant ⚡ (en bas à droite de l'écran) ouvre une révision rapide par-dessus n'importe quelle page du site.",
    quickMissing: "⚠️ Le bouton n'apparaît pas car le fichier fenetre-flottante.js n'est pas chargé. Vérifie qu'il est sur GitHub, au même niveau que index.html, et que la ligne <script type=\"module\" src=\"fenetre-flottante.js\"></script> est tout en bas de index.html.",
    quickOffInFile: "ℹ️ Le bouton est coupé dans le fichier fenetre-flottante.js (quickButton: false).",
    quickTry: "⚡ Essayer maintenant",

    animationsTitle: "Animations",
    particlesLabel: "Particules flottantes",
    particlesAmountLabel: "Nombre de particules",
    particlesSpeedLabel: "Vitesse des particules",
    particlesOutdated: "⚠️ Ces réglages n'ont aucun effet : le fichier particules.js n'est pas à jour (ou n'est pas chargé). Remplace-le par la dernière version.",
    particlesReduced: "ℹ️ Ton appareil demande de réduire les animations, donc les particules sont coupées. Pour les afficher quand même, mets respectReducedMotion: false dans particules.js.",
    particlesOffInFile: "ℹ️ Les particules sont coupées dans le fichier particules.js (enabled: false).",

    learningTitle: "Apprentissage",
    tonesLabel: "Pinyin en couleur selon le ton",
    speechLabel: "Vitesse de la voix",
    speechHelp: "Pour les boutons 🔊 (si ton appareil a une voix chinoise).",
    revisionsTitle: "Révisions : réglages par défaut",
    revisionsModeLabel: "Type d'exercice",
    revisionsDirectionLabel: "Sens des questions",
    revisionsCountLabel: "Nombre de questions",
    revisionsPinyinLabel: "Pinyin comme aide",

    accountTitle: "Compte",
    connectedAs: "Connecté avec : ",
    notConnected: "Non connecté",
    goBackup: "💾 Aller à la sauvegarde",
    logout: "Se déconnecter",
    reset: "↺ Réinitialiser les réglages",
    confirmReset: "Remettre tous les réglages par défaut ?",

    on: "Oui",
    off: "Non"
};

const TEXT_SIZES = [
    { value: 0.9, label: "Petit" },
    { value: 1, label: "Normal" },
    { value: 1.15, label: "Grand" },
    { value: 1.3, label: "Très grand" }
];

// Couleurs du site : main = boutons et accents, dark = titres
const PALETTES = [
    { value: "rouge", label: "Rouge", main: "#A92732", dark: "#741E29" },
    { value: "bleu", label: "Bleu", main: "#2563A8", dark: "#1B467A" },
    { value: "vert", label: "Vert", main: "#2E7D4F", dark: "#1F5A37" },
    { value: "violet", label: "Violet", main: "#7B3FA0", dark: "#58287A" },
    { value: "orange", label: "Orange", main: "#D2691E", dark: "#9C4C14" },
    { value: "rose", label: "Rose", main: "#C2417A", dark: "#8E2C58" }
];

const PARTICLE_AMOUNTS = [
    { value: 0.5, label: "Peu" },
    { value: 1, label: "Normal" },
    { value: 2, label: "Beaucoup" }
];

const PARTICLE_SPEEDS = [
    { value: 0.6, label: "Lente" },
    { value: 1, label: "Normale" },
    { value: 1.6, label: "Rapide" }
];

const SPEECH_RATES = [
    { value: 0.6, label: "Très lente" },
    { value: 0.8, label: "Lente" },
    { value: 1, label: "Normale" }
];

const REVISION_MODES = [
    { value: "flashcards", label: "Flashcards" },
    { value: "characters", label: "Sinogrammes seuls" },
    { value: "qcm", label: "QCM" },
    { value: "typed", label: "Réponse écrite" },
    { value: "pinyin-qcm", label: "QCM du pinyin" },
    { value: "pinyin-typed", label: "Écrire le pinyin" },
    { value: "truefalse", label: "Vrai ou faux" },
    { value: "match", label: "Paires" },
    { value: "timed", label: "Chrono" },
    { value: "eval", label: "Évaluation" }
];

const REVISION_DIRECTIONS = [
    { value: "zh-fr", label: "Chinois → Français" },
    { value: "fr-zh", label: "Français → Chinois" },
    { value: "mixed", label: "Mixte" }
];

const REVISION_COUNTS = [
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 0, label: "Tous" }
];

const STORAGE_KEY = "mandarin-parametres";

export const DEFAULTS = {
    textSize: 1,
    dark: false,
    palette: "rouge",
    quickButton: true,
    particles: { enabled: true, amount: 1, speed: 1 },
    tones: true,
    speechRate: 0.8,
    revisions: { mode: "qcm", direction: "zh-fr", count: 10, pinyin: true }
};

// ---------- RÉGLAGES : VÉRIFICATION ----------

function pick(options, value, fallback) {
    const found = options.filter(option => option.value === value)[0];
    return found ? found.value : fallback;
}

// Garde seulement des valeurs valides (au cas où le contenu serait abîmé)
export function normalizeSettings(raw) {
    const r = raw || {};
    const p = r.particles || {};
    const v = r.revisions || {};

    return {
        textSize: pick(TEXT_SIZES, r.textSize, DEFAULTS.textSize),
        dark: r.dark === true,
        palette: pick(PALETTES, r.palette, DEFAULTS.palette),
        quickButton: r.quickButton !== false,
        particles: {
            enabled: p.enabled !== false,
            amount: pick(PARTICLE_AMOUNTS, p.amount, DEFAULTS.particles.amount),
            speed: pick(PARTICLE_SPEEDS, p.speed, DEFAULTS.particles.speed)
        },
        tones: r.tones !== false,
        speechRate: pick(SPEECH_RATES, r.speechRate, DEFAULTS.speechRate),
        revisions: {
            mode: pick(REVISION_MODES, v.mode, DEFAULTS.revisions.mode),
            direction: pick(REVISION_DIRECTIONS, v.direction, DEFAULTS.revisions.direction),
            count: pick(REVISION_COUNTS, v.count, DEFAULTS.revisions.count),
            pinyin: v.pinyin !== false
        }
    };
}

// ---------- APPLIQUER LES RÉGLAGES AU SITE ----------

let settings = normalizeSettings(null);

function injectStyles() {
    const style = document.createElement("style");
    style.textContent =
        // Mode sombre : on inverse les couleurs de toute la page
        "html.dark-mode { filter: invert(0.9) hue-rotate(180deg); }" +
        // Taille du texte (sauf pages où l'on trace au doigt)
        "#app .page { zoom: var(--text-zoom, 1); }" +
        "#page-ecriture, #page-trace-libre, #page-trace-guide { zoom: 1 !important; }" +
        // Tons en couleur désactivés
        "body.no-tones #vocabulary-table-body td:nth-child(2) span, body.no-tones #translator-results span { color: inherit !important; }" +
        "body.no-tones #tones-legend { display: none; }";
    document.head.appendChild(style);
}

function broadcast() {
    window.MANDARIN_SETTINGS = settings;

    let event;
    try {
        event = new CustomEvent("mandarin-settings", { detail: settings });
    } catch (error) {
        event = document.createEvent("CustomEvent");
        event.initCustomEvent("mandarin-settings", false, false, settings);
    }

    window.dispatchEvent(event);
}

export function applySettings() {
    const root = document.documentElement;
    const palette = PALETTES.filter(item => item.value === settings.palette)[0] || PALETTES[0];

    root.style.setProperty("--text-zoom", String(settings.textSize));
    root.style.setProperty("--primary-red", palette.main);
    root.style.setProperty("--dark-red", palette.dark);

    root.classList.toggle("dark-mode", settings.dark);
    document.body.classList.toggle("no-tones", !settings.tones);

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", palette.main);

    broadcast();
}

// ---------- ENREGISTREMENT (appareil + compte) ----------

let saveTimer = null;

function saveLocal() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        // pas grave : les réglages seront gardés seulement sur le compte
    }
}

function loadLocal() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
        return null;
    }
}

function saveSettings() {
    saveLocal();

    if (!state.user) return;

    // Petite pause pour ne pas écrire à chaque clic
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        if (!state.user) return;
        sendWrite(setDoc(userDoc("settings", "app"), settings, { merge: true }), "Impossible d'enregistrer les réglages.");
    }, 500);
}

let loadedFor = null;
let render = null;

async function loadRemote() {
    if (!state.user) {
        loadedFor = null;
        return;
    }

    if (loadedFor === state.user.uid) return;
    loadedFor = state.user.uid;

    try {
        const snapshot = await getDoc(userDoc("settings", "app"));

        if (snapshot.exists()) {
            settings = normalizeSettings(snapshot.data());
            saveLocal();
            applySettings();
        }
    } catch (error) {
        loadedFor = null;   // on réessaiera à la prochaine occasion
        console.warn("Réglages du compte indisponibles :", error);
    }

    if (render) render();
}

// ---------- PAGE ----------

function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function segmented(options, current, onPick) {
    const group = create("div");
    group.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";

    options.forEach(option => {
        const button = create("button", option.value === current ? "add-category-btn" : "secondary-btn", option.label);
        button.type = "button";
        button.style.padding = "10px 16px";
        button.addEventListener("click", () => onPick(option.value));
        group.appendChild(button);
    });

    return group;
}

function yesNo(current, onPick) {
    return segmented([
        { value: true, label: PARAMETRES.on },
        { value: false, label: PARAMETRES.off }
    ], current, onPick);
}

function palettePicker(current, onPick) {
    const group = create("div");
    group.style.cssText = "display: flex; flex-wrap: wrap; gap: 12px;";

    PALETTES.forEach(palette => {
        const button = create("button");
        button.type = "button";
        button.title = palette.label;
        button.setAttribute("aria-label", palette.label);
        button.style.cssText =
            "width: 42px; height: 42px; border-radius: 50%; cursor: pointer; background: " + palette.main + "; " +
            "border: 4px solid " + (palette.value === current ? "#292525" : "#FFFFFF") + "; " +
            "box-shadow: 0 0 0 1px #DED5CE;";
        button.addEventListener("click", () => onPick(palette.value));
        group.appendChild(button);
    });

    return group;
}

function row(label, control, help) {
    const wrapper = create("div");
    wrapper.style.cssText = "margin-bottom: 20px;";

    const title = create("p", "", label);
    title.style.cssText = "margin: 0 0 8px; font-weight: 600; font-size: 14px; color: #453B37;";
    wrapper.appendChild(title);

    wrapper.appendChild(control);

    if (help) {
        const note = create("p", "", help);
        note.style.cssText = "margin: 6px 0 0; font-size: 12px; color: #82766F;";
        wrapper.appendChild(note);
    }

    return wrapper;
}

function section(title) {
    const card = create("div", "note-editor");
    card.style.marginBottom = "20px";

    const heading = create("h2", "", title);
    heading.style.cssText = "margin: 0 0 18px; font-size: 20px; color: var(--dark-red);";
    card.appendChild(heading);

    return card;
}

// Explique pourquoi les particules ne réagiraient pas
function particlesHelp() {
    const status = window.MANDARIN_PARTICLES_STATE;

    if (!status) return PARAMETRES.particlesOutdated;
    if (status === "reduced-motion") return PARAMETRES.particlesReduced;
    if (status === "disabled-in-file") return PARAMETRES.particlesOffInFile;
    return "";
}

// Explique pourquoi le bouton ⚡ n'apparaîtrait pas
function quickHelp() {
    const status = window.MANDARIN_QUICK_STATE;

    if (!status) return PARAMETRES.quickMissing;
    if (status === "disabled-in-file") return PARAMETRES.quickOffInFile;
    return PARAMETRES.quickButtonHelp;
}

// Prévient les autres fichiers (ouvrir la révision éclair)
function fire(name) {
    let event;
    try {
        event = new CustomEvent(name);
    } catch (error) {
        event = document.createEvent("CustomEvent");
        event.initCustomEvent(name, false, false, null);
    }

    window.dispatchEvent(event);
}

function start() {
    const nav = document.querySelector(".sidebar-nav");
    const app = document.getElementById("app");
    if (!nav || !app) return;

    injectStyles();

    // Réglages de l'appareil : appliqués tout de suite (pas de flash au démarrage)
    settings = normalizeSettings(loadLocal());
    applySettings();

    // Lien dans le menu (en bas, avant "Se déconnecter")
    const link = create("a", "nav-item");
    link.href = "#";
    link.dataset.page = PARAMETRES.pageName;
    link.appendChild(create("span", "nav-icon", PARAMETRES.menuIcon));
    link.appendChild(create("span", "", PARAMETRES.menuLabel));

    const bottom = document.querySelector(".sidebar-bottom");
    const logout = document.getElementById("logout-btn");
    if (bottom && logout) bottom.insertBefore(link, logout); else nav.appendChild(link);

    link.addEventListener("click", event => {
        event.preventDefault();
        showPage(PARAMETRES.pageName);
    });

    // Page
    const page = create("section", "page");
    page.id = "page-" + PARAMETRES.pageName;
    app.appendChild(page);

    // Modifier un réglage : appliquer, enregistrer, redessiner la page
    function update(change) {
        change(settings);
        settings = normalizeSettings(settings);
        applySettings();
        saveSettings();
        render();
    }

    render = function () {
        page.innerHTML = "";

        const header = create("header", "page-header");
        const headerText = create("div", "header-text");
        headerText.appendChild(create("h1", "", PARAMETRES.title));
        headerText.appendChild(create("p", "header-description", PARAMETRES.description));
        header.appendChild(headerText);
        page.appendChild(header);

        // --- Affichage ---
        const display = section(PARAMETRES.displayTitle);
        display.appendChild(row(PARAMETRES.textSizeLabel,
            segmented(TEXT_SIZES, settings.textSize, value => update(s => { s.textSize = value; })),
            PARAMETRES.textSizeHelp));
        display.appendChild(row(PARAMETRES.darkLabel,
            yesNo(settings.dark, value => update(s => { s.dark = value; }))));
        display.appendChild(row(PARAMETRES.paletteLabel,
            palettePicker(settings.palette, value => update(s => { s.palette = value; }))));
        const quickControl = create("div");
        quickControl.style.cssText = "display: flex; flex-wrap: wrap; gap: 12px; align-items: center;";
        quickControl.appendChild(yesNo(settings.quickButton, value => update(s => { s.quickButton = value; })));

        if (window.MANDARIN_QUICK_STATE === "ready") {
            const tryButton = create("button", "secondary-btn", PARAMETRES.quickTry);
            tryButton.type = "button";
            tryButton.style.padding = "10px 16px";
            tryButton.addEventListener("click", () => fire("mandarin-open-quick"));
            quickControl.appendChild(tryButton);
        }

        display.appendChild(row(PARAMETRES.quickButtonLabel, quickControl, quickHelp()));
        page.appendChild(display);

        // --- Animations ---
        const animations = section(PARAMETRES.animationsTitle);
        animations.appendChild(row(PARAMETRES.particlesLabel,
            yesNo(settings.particles.enabled, value => update(s => { s.particles.enabled = value; })),
            particlesHelp()));

        if (settings.particles.enabled) {
            animations.appendChild(row(PARAMETRES.particlesAmountLabel,
                segmented(PARTICLE_AMOUNTS, settings.particles.amount, value => update(s => { s.particles.amount = value; }))));
            animations.appendChild(row(PARAMETRES.particlesSpeedLabel,
                segmented(PARTICLE_SPEEDS, settings.particles.speed, value => update(s => { s.particles.speed = value; }))));
        }
        page.appendChild(animations);

        // --- Apprentissage ---
        const learning = section(PARAMETRES.learningTitle);
        learning.appendChild(row(PARAMETRES.tonesLabel,
            yesNo(settings.tones, value => update(s => { s.tones = value; }))));
        learning.appendChild(row(PARAMETRES.speechLabel,
            segmented(SPEECH_RATES, settings.speechRate, value => update(s => { s.speechRate = value; })),
            PARAMETRES.speechHelp));
        page.appendChild(learning);

        // --- Révisions par défaut ---
        const revisions = section(PARAMETRES.revisionsTitle);
        revisions.appendChild(row(PARAMETRES.revisionsModeLabel,
            segmented(REVISION_MODES, settings.revisions.mode, value => update(s => { s.revisions.mode = value; }))));
        revisions.appendChild(row(PARAMETRES.revisionsDirectionLabel,
            segmented(REVISION_DIRECTIONS, settings.revisions.direction, value => update(s => { s.revisions.direction = value; }))));
        revisions.appendChild(row(PARAMETRES.revisionsCountLabel,
            segmented(REVISION_COUNTS, settings.revisions.count, value => update(s => { s.revisions.count = value; }))));
        revisions.appendChild(row(PARAMETRES.revisionsPinyinLabel,
            yesNo(settings.revisions.pinyin, value => update(s => { s.revisions.pinyin = value; }))));
        page.appendChild(revisions);

        // --- Compte ---
        const account = section(PARAMETRES.accountTitle);

        const email = create("p", "", PARAMETRES.connectedAs + (state.user && state.user.email ? state.user.email : PARAMETRES.notConnected));
        email.style.cssText = "margin: 0 0 16px; font-size: 14px; color: #453B37;";
        account.appendChild(email);

        const buttons = create("div");
        buttons.style.cssText = "display: flex; flex-wrap: wrap; gap: 10px;";

        const backup = create("button", "secondary-btn", PARAMETRES.goBackup);
        backup.type = "button";
        backup.addEventListener("click", () => {
            const target = document.querySelector('[data-page="sauvegarde"]');
            if (target) showPage("sauvegarde");
        });
        buttons.appendChild(backup);

        const reset = create("button", "secondary-btn", PARAMETRES.reset);
        reset.type = "button";
        reset.addEventListener("click", () => {
            if (!confirm(PARAMETRES.confirmReset)) return;
            update(s => {
                const fresh = normalizeSettings(null);
                Object.keys(fresh).forEach(key => { s[key] = fresh[key]; });
            });
        });
        buttons.appendChild(reset);

        const exit = create("button", "danger-btn", PARAMETRES.logout);
        exit.type = "button";
        exit.addEventListener("click", () => {
            const button = document.getElementById("logout-btn");
            if (button) button.click();
        });
        buttons.appendChild(exit);

        account.appendChild(buttons);
        page.appendChild(account);
    };

    render();

    // Une fois la page chargée, on redessine (les autres fichiers sont alors prêts)
    window.addEventListener("load", () => render());

    // Quand les données changent (connexion...), on charge les réglages du compte
    onStateChange(() => {
        loadRemote();
        render();
    });
}

if (typeof document !== "undefined") start();
