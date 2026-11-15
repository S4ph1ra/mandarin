// =====================================================
// TRADUCTEUR.JS : TRADUCTEUR FRANÇAIS ↔ CHINOIS
// =====================================================
// Ce fichier est autonome : il crée tout seul son lien dans le menu
// et sa page. Les réglages et les textes sont juste en dessous.
//
// - Traduction : service gratuit MyMemory (internet obligatoire)
// - Pinyin : bibliothèque pinyin-pro (chargée au premier usage)

import { showPage } from "./navigation.js";
import { el } from "./ui.js";

// ---------- RÉGLAGES ET TEXTES (modifie ici) ----------
const TRADUCTEUR = {
    pageName: "traducteur",          // identifiant de la page
    menuIcon: "译",
    menuLabel: "Traducteur",

    title: "Traducteur",
    description: "Traduis un mot ou une phrase entre le français et le chinois.",

    directionLabel: "Direction",
    inputLabel: "Texte à traduire",
    inputPlaceholder: "Écris ton texte ici...",
    translateButton: "Traduire",
    copyButton: "Copier",
    copied: "Copié !",
    pinyinPrefix: "Pinyin : ",

    emptyInput: "Écris d'abord un texte à traduire.",
    tooLong: "Texte trop long : 500 octets maximum (environ 160 caractères chinois ou 500 lettres).",
    offline: "La traduction demande une connexion internet.",
    quota: "Limite de traductions gratuites atteinte pour aujourd'hui. Réessaie demain.",
    error: "Impossible de traduire pour le moment. Réessaie.",
    loading: "Traduction en cours...",

    // Service MyMemory : mets ton adresse e-mail ici pour multiplier la
    // limite quotidienne par 10 (facultatif, laisse "" sinon).
    email: "",

    // Directions proposées (langpair = langue source | langue cible)
    directions: [
        { label: "Français → Chinois", langpair: "fr|zh-CN", resultIsChinese: true },
        { label: "Chinois → Français", langpair: "zh-CN|fr", resultIsChinese: false }
    ],

    pinyinScript: "https://cdn.jsdelivr.net/npm/pinyin-pro@3.18.2/dist/index.js"
};

// ---------- PINYIN (chargé seulement quand on en a besoin) ----------

let pinyinPromise = null;

function loadPinyin() {
    if (window.pinyinPro) return Promise.resolve(window.pinyinPro);

    if (!pinyinPromise) {
        pinyinPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = TRADUCTEUR.pinyinScript;
            script.onload = () => resolve(window.pinyinPro);
            script.onerror = () => {
                pinyinPromise = null;   // permettre un nouvel essai plus tard
                reject(new Error("pinyin-pro indisponible"));
            };
            document.head.appendChild(script);
        });
    }

    return pinyinPromise;
}

// ---------- TRADUCTION ----------

async function translate(text, langpair) {
    const params = new URLSearchParams({ q: text, langpair: langpair });
    if (TRADUCTEUR.email) params.set("de", TRADUCTEUR.email);

    const response = await fetch("https://api.mymemory.translated.net/get?" + params);
    if (!response.ok) throw new Error("HTTP " + response.status);

    const data = await response.json();
    const translated = data.responseData && data.responseData.translatedText;

    if (data.quotaFinished || data.responseStatus === 429 ||
        (translated && translated.includes("MYMEMORY WARNING"))) {
        throw new Error("quota");
    }

    if (Number(data.responseStatus) !== 200 || !translated) {
        throw new Error("translation");
    }

    return translated;
}

// ---------- CONSTRUCTION DE LA PAGE ----------

function buildPage() {
    const nav = document.querySelector(".sidebar-nav");
    const app = document.getElementById("app");
    if (!nav || !app) return;

    // Lien dans le menu (placé avant "Révisions" si possible)
    const link = document.createElement("a");
    link.href = "#";
    link.className = "nav-item";
    link.dataset.page = TRADUCTEUR.pageName;
    link.innerHTML = '<span class="nav-icon"></span><span></span>';
    link.children[0].textContent = TRADUCTEUR.menuIcon;
    link.children[1].textContent = TRADUCTEUR.menuLabel;

    const revisionsLink = nav.querySelector('[data-page="revisions"]');
    if (revisionsLink) revisionsLink.before(link); else nav.appendChild(link);

    link.addEventListener("click", (event) => {
        event.preventDefault();
        showPage(TRADUCTEUR.pageName);
    });

    // Page
    const page = document.createElement("section");
    page.id = "page-" + TRADUCTEUR.pageName;
    page.className = "page";

    page.innerHTML = `
        <header class="page-header">
            <div class="header-text">
                <h1></h1>
                <p class="header-description"></p>
            </div>
        </header>

        <div class="writing-controls">
            <div class="writing-field">
                <label for="translator-direction"></label>
                <select id="translator-direction"></select>
            </div>
        </div>

        <div class="writing-field" style="margin-bottom: 14px;">
            <label for="translator-input"></label>
            <textarea id="translator-input" class="note-content-input" style="min-height: 120px;"></textarea>
        </div>

        <button type="button" class="add-category-btn" id="translator-button"></button>

        <p class="hanzi-status" id="translator-message" style="max-width: none; text-align: left; margin-top: 14px;"></p>

        <div class="hanzi-card" id="translator-result" style="display: none; align-items: flex-start; margin-top: 10px;">
            <p id="translator-text" style="margin: 0; font-size: 26px; font-weight: 600; color: var(--dark-red);"></p>
            <p id="translator-pinyin" style="margin: 0; font-size: 16px; color: #82766F;"></p>
            <button type="button" class="secondary-btn" id="translator-copy"></button>
        </div>
    `;

    app.appendChild(page);

    // Textes
    page.querySelector("h1").textContent = TRADUCTEUR.title;
    page.querySelector(".header-description").textContent = TRADUCTEUR.description;
    page.querySelector('label[for="translator-direction"]').textContent = TRADUCTEUR.directionLabel;
    page.querySelector('label[for="translator-input"]').textContent = TRADUCTEUR.inputLabel;

    const directionSelect = page.querySelector("#translator-direction");
    const input = page.querySelector("#translator-input");
    const button = page.querySelector("#translator-button");
    const message = page.querySelector("#translator-message");
    const result = page.querySelector("#translator-result");
    const resultText = page.querySelector("#translator-text");
    const resultPinyin = page.querySelector("#translator-pinyin");
    const copyButton = page.querySelector("#translator-copy");

    input.placeholder = TRADUCTEUR.inputPlaceholder;
    button.textContent = TRADUCTEUR.translateButton;
    copyButton.textContent = TRADUCTEUR.copyButton;

    TRADUCTEUR.directions.forEach((direction, index) => {
        directionSelect.appendChild(new Option(direction.label, String(index)));
    });

    // ----- Actions -----

    async function run() {
        const text = input.value.trim();
        const direction = TRADUCTEUR.directions[directionSelect.value];

        result.style.display = "none";
        message.textContent = "";

        if (!text) {
            message.textContent = TRADUCTEUR.emptyInput;
            return;
        }

        if (new TextEncoder().encode(text).length > 500) {
            message.textContent = TRADUCTEUR.tooLong;
            return;
        }

        if (!navigator.onLine) {
            message.textContent = TRADUCTEUR.offline;
            return;
        }

        button.disabled = true;
        message.textContent = TRADUCTEUR.loading;

        try {
            const translated = await translate(text, direction.langpair);

            resultText.textContent = translated;
            resultPinyin.textContent = "";
            result.style.display = "flex";
            message.textContent = "";

            // Pinyin du texte chinois (le résultat ou le texte écrit)
            const chineseText = direction.resultIsChinese ? translated : text;

            try {
                const pinyinLib = await loadPinyin();
                resultPinyin.textContent = TRADUCTEUR.pinyinPrefix + pinyinLib.pinyin(chineseText);
            } catch (error) {
                // Pas de pinyin : la traduction reste affichée
            }

        } catch (error) {
            console.error(error);
            message.textContent = error.message === "quota" ? TRADUCTEUR.quota : TRADUCTEUR.error;
        }

        button.disabled = false;
    }

    button.addEventListener("click", run);

    copyButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(resultText.textContent);
            copyButton.textContent = TRADUCTEUR.copied;
            setTimeout(() => { copyButton.textContent = TRADUCTEUR.copyButton; }, 1500);
        } catch (error) {
            console.error(error);
        }
    });
}

export function initTraducteur() {
    buildPage();
}
