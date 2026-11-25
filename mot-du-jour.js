// =====================================================
// MOT-DU-JOUR.JS : UN NOUVEAU MOT CHAQUE JOUR
// =====================================================
// Fichier autonome. Au premier passage de la journée :
//   - il choisit un (ou plusieurs) mot(s) dans la liste de mots-hsk.js,
//     en mélangeant les niveaux HSK (réglable dans Paramètres)
//   - il l'ajoute automatiquement à ton vocabulaire, dans la catégorie
//     « 📅 Mots du jour »
//   - il l'affiche sur la page d'accueil
// Il saute les mots que tu as déjà. Les textes sont juste en dessous.

import { getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userDoc, newDocRef, sendWrite } from "./firebase.js";
import { state, onStateChange, notifyChange } from "./state.js";
import { showPage } from "./navigation.js";
import { CATEGORIES_COLLECTION } from "./config.js";

// ---------- RÉGLAGES ET TEXTES (modifie ici) ----------
const DAILY = {
    categoryName: "Mots du jour",
    categoryIcon: "📅",

    cardTitle: "📅 Mot du jour",
    cardTitlePlural: "📅 Mots du jour",
    addedNote: "Ajouté à ton vocabulaire, dans la catégorie « 📅 Mots du jour ».",
    seeVocabulary: "Voir mon vocabulaire",
    noMoreWords: "Tu connais déjà tous les mots de la liste, bravo ! Tu peux en ajouter dans le fichier mots-hsk.js.",
    saveError: "Impossible d'enregistrer le mot du jour.",

    // Niveaux HSK de chaque choix des Paramètres
    levelGroups: {
        mix: [1, 2, 3, 4, 5, 6],
        beginner: [1, 2],
        intermediate: [3, 4],
        advanced: [5, 6]
    },

    waitForSettings: 4000      // attente maximale des réglages du compte (ms)
};

// ---------- OUTILS (testables) ----------

// "2026-11-24"
export function todayString(date) {
    const d = date || new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + month + "-" + day;
}

function hashString(text) {
    let hash = 2166136261;

    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

// Nombres « au hasard » toujours identiques pour une même graine
function seededRandom(seed) {
    let a = seed >>> 0;

    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Choisit des mots : niveaux mélangés, sans les mots déjà dans le vocabulaire
export function pickWords(list, existingChinese, count, levelMode, seed) {
    const random = seededRandom(hashString(seed));
    const allowed = DAILY.levelGroups[levelMode] || DAILY.levelGroups.mix;

    const free = list.filter(entry => !existingChinese[entry[0]]);
    let pool = free.filter(entry => allowed.indexOf(entry[3]) !== -1);

    if (pool.length === 0) pool = free;      // ce niveau est épuisé : on élargit

    const chosen = [];

    while (chosen.length < count && pool.length > 0) {
        // On tire d'abord un niveau, puis un mot de ce niveau (mélange équitable)
        const levels = [];
        pool.forEach(entry => { if (levels.indexOf(entry[3]) === -1) levels.push(entry[3]); });

        const level = levels[Math.floor(random() * levels.length)];
        const group = pool.filter(entry => entry[3] === level);
        const entry = group[Math.floor(random() * group.length)];

        chosen.push(entry);
        pool = pool.filter(other => other !== entry);
    }

    return chosen.map(entry => ({
        chinese: entry[0],
        pinyin: capitalize(entry[1]),
        translation: entry[2],
        hsk: "HSK " + entry[3]
    }));
}

// ---------- ÉTAT ----------

window.MANDARIN_DAILY_STATE = "loading";

let wordList = null;            // la liste de mots-hsk.js
let vocabularyModule = null;    // pour réafficher le vocabulaire après l'ajout
let cfg = { enabled: true, count: 1, level: "mix" };
let ranKey = "";
let waitingSince = 0;
let running = false;
let card = null;

import("./mots-hsk.js")
    .then(module => {
        wordList = module.DAILY_WORDS;
        window.MANDARIN_DAILY_STATE = "ready";
        maybeRun();
    })
    .catch(error => {
        window.MANDARIN_DAILY_STATE = "no-list";
        console.warn("mots-hsk.js indisponible :", error);
    });

const vocabularyReady = import("./vocabulary.js")
    .then(module => { vocabularyModule = module; })
    .catch(error => console.warn("vocabulary.js indisponible :", error));

// ---------- ENREGISTREMENT DE LA JOURNÉE ----------

function recordKey() {
    return "mandarin-motdujour-" + state.user.uid;
}

function readLocalRecord() {
    try {
        return JSON.parse(localStorage.getItem(recordKey()));
    } catch (error) {
        return null;
    }
}

async function loadRecord() {
    const local = readLocalRecord();

    try {
        const snapshot = await getDoc(userDoc("stats", "daily"));
        if (snapshot.exists()) return snapshot.data();
    } catch (error) {
        console.warn("Mot du jour du compte indisponible :", error);
    }

    return local;
}

function saveRecord(record) {
    try {
        localStorage.setItem(recordKey(), JSON.stringify(record));
    } catch (error) {
        // pas grave : il reste le compte
    }

    setDoc(userDoc("stats", "daily"), record).catch(error => {
        console.warn("Mot du jour non enregistré sur le compte :", error);
    });
}

// ---------- AJOUT AU VOCABULAIRE ----------

function existingChinese() {
    const existing = {};

    state.categories.forEach(category => {
        category.words.forEach(word => { existing[word.chinese] = true; });
    });

    return existing;
}

function addToVocabulary(entries) {
    const now = Date.now();

    const words = entries.map((entry, index) => ({
        chinese: entry.chinese,
        pinyin: entry.pinyin,
        translation: entry.translation,
        hsk: entry.hsk,
        example: "",
        addedAt: now + index
    }));

    const category = state.categories.filter(item => item.name === DAILY.categoryName)[0];

    if (category) {
        category.words = category.words.concat(words);
        sendWrite(updateDoc(userDoc(CATEGORIES_COLLECTION, category.id), { words: category.words }), DAILY.saveError);
    } else {
        const reference = newDocRef(CATEGORIES_COLLECTION);
        const data = { name: DAILY.categoryName, icon: DAILY.categoryIcon, words: words, createdAt: now };

        sendWrite(setDoc(reference, data), DAILY.saveError);
        state.categories.push({ id: reference.id, ...data });
    }

    if (vocabularyModule && typeof vocabularyModule.refreshVocabulary === "function") {
        vocabularyModule.refreshVocabulary();
    }

    notifyChange();
}

// ---------- CARTE SUR LA PAGE D'ACCUEIL ----------

function ensureCard() {
    if (card) return card;

    const header = document.querySelector("#page-accueil .page-header");
    if (!header) return null;

    card = document.createElement("div");
    card.style.cssText = "background: #FFFFFF; border: 1px solid #EEE7E0; border-radius: 16px; padding: 22px 26px; margin-bottom: 30px;";
    header.after(card);

    return card;
}

function removeCard() {
    if (card && card.parentNode) card.parentNode.removeChild(card);
    card = null;
}

function create(tag, text, css) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (css) element.style.cssText = css;
    return element;
}

function renderCard(record, emptyMessage) {
    const target = ensureCard();
    if (!target) return;

    target.innerHTML = "";

    const words = record.words || [];
    target.appendChild(create("p", words.length > 1 ? DAILY.cardTitlePlural : DAILY.cardTitle,
        "margin: 0 0 14px; font-size: 13px; font-weight: 600; letter-spacing: 1px; color: var(--primary-red);"));

    if (words.length === 0) {
        target.appendChild(create("p", emptyMessage || DAILY.noMoreWords, "margin: 0; font-size: 15px; color: #82766F;"));
        return;
    }

    words.forEach(word => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 12px;";

        row.appendChild(create("span", word.chinese, "font-size: 40px; font-weight: 600; color: var(--dark-red);"));

        const info = document.createElement("div");
        info.appendChild(create("div", word.pinyin, "font-size: 16px; color: #82766F;"));
        info.appendChild(create("div", word.translation, "font-size: 18px; font-weight: 600; color: #292525;"));
        row.appendChild(info);

        row.appendChild(create("span", word.hsk, "font-size: 12px; padding: 3px 10px; border-radius: 10px; background: #F0EAE3; color: #453B37;"));

        target.appendChild(row);
    });

    const footer = document.createElement("div");
    footer.style.cssText = "display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 6px;";
    footer.appendChild(create("span", DAILY.addedNote, "font-size: 13px; color: #82766F;"));

    const link = create("button", DAILY.seeVocabulary, "background: none; border: none; color: var(--primary-red); font-weight: 600; cursor: pointer; padding: 0; font-size: 13px;");
    link.type = "button";
    link.addEventListener("click", () => showPage("vocabulaire"));
    footer.appendChild(link);

    target.appendChild(footer);
}

// ---------- LA JOURNÉE ----------

async function run() {
    if (running) return;
    running = true;

    try {
        await vocabularyReady;     // pour pouvoir réafficher le vocabulaire après l'ajout

        if (!cfg.enabled) {
            removeCard();
            return;
        }

        const today = todayString();
        let record = await loadRecord();

        if (!record || record.date !== today || !Array.isArray(record.words)) {
            record = { date: today, words: [] };
        }

        const need = cfg.count - record.words.length;

        if (need > 0) {
            const seed = state.user.uid + "|" + today + "|" + record.words.length;
            const chosen = pickWords(wordList, existingChinese(), need, cfg.level, seed);

            if (chosen.length > 0) {
                addToVocabulary(chosen);
                record.words = record.words.concat(chosen);
                saveRecord(record);
            }
        }

        renderCard(record);
    } catch (error) {
        console.error("Mot du jour :", error);
    } finally {
        running = false;
    }
}

function maybeRun() {
    if (!state.user || !wordList) return;

    const key = state.user.uid + "|" + todayString();
    if (key === ranKey) return;

    // On attend que les réglages du compte soient arrivés (ex : mot du jour coupé)
    const ready = window.MANDARIN_SETTINGS_READY === state.user.uid;

    if (!ready) {
        if (!waitingSince) waitingSince = Date.now();

        if (Date.now() - waitingSince < DAILY.waitForSettings) {
            setTimeout(maybeRun, 400);
            return;
        }
    }

    waitingSince = 0;
    ranKey = key;
    run();
}

function applySettings(settings) {
    const daily = settings && settings.dailyWords;
    if (!daily) return;

    const next = { enabled: daily.enabled !== false, count: daily.count || 1, level: daily.level || "mix" };
    const changed = JSON.stringify(next) !== JSON.stringify(cfg);
    cfg = next;

    if (changed) {
        ranKey = "";        // réglage modifié : on refait le point sur la journée
        maybeRun();
    }
}

onStateChange(maybeRun);
window.addEventListener("mandarin-settings", event => applySettings(event.detail));
applySettings(window.MANDARIN_SETTINGS);
