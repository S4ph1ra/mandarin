// =====================================================
// REVISIONS.JS : RÉVISIONS GÉNÉRÉES À PARTIR DE TON VOCABULAIRE
// =====================================================
// Dix façons de réviser, créées toutes seules :
//   flashcards, sinogrammes seuls, QCM, réponse écrite, QCM du pinyin,
//   écrire le pinyin, vrai ou faux, association de paires, défi chrono, évaluation.
// Les mots que tu rates sont retenus (sur ton compte) pour pouvoir les revoir.
// Les textes et réglages sont juste en dessous.

import { getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userDoc } from "./firebase.js";
import { state, onStateChange } from "./state.js";
import { el } from "./ui.js";

// ---------- RÉGLAGES ET TEXTES (modifie ici) ----------
const REVISIONS = {
    setupTitle: "Préparer une révision",
    sourceLabel: "Vocabulaire à réviser",
    allVocabulary: "Tout mon vocabulaire",
    modeLabel: "Type d'exercice",
    directionLabel: "Sens des questions",
    countLabel: "Nombre de questions",
    countAll: "Tous les mots",
    pinyinLabel: "Afficher le pinyin comme aide",
    start: "Commencer",
    bigReview: "🏆 Grande révision",
    bigReviewHelp: "Tous les mots que tu as ajoutés depuis le début, avec le type d'exercice et le sens choisis ci-dessus.",
    bigReviewCount: (count) => count + (count > 1 ? " mots" : " mot"),

    // id (ne pas changer), label (modifiable), help (explication affichée)
    modes: [
        { id: "flashcards", label: "Flashcards (carte à retourner)", help: "Tu retournes la carte et tu dis si tu savais." },
        { id: "characters", label: "Sinogrammes seuls (sans pinyin ni traduction)", help: "Le caractère seul : retrouve sa prononciation et son sens, puis retourne la carte." },
        { id: "qcm", label: "QCM (choix multiples)", help: "4 réponses possibles, une seule est bonne." },
        { id: "typed", label: "Réponse écrite (je tape la traduction)", help: "On te montre le mot en chinois ou en pinyin : tu tapes sa traduction, sans aucun choix proposé." },
        { id: "pinyin-qcm", label: "QCM du pinyin (caractère → pinyin)", help: "On te montre le caractère : choisis le bon pinyin parmi 4." },
        { id: "pinyin-typed", label: "Écrire le pinyin", help: "On te montre le caractère : écris son pinyin. Les accents sont facultatifs, mais s'ils sont faux, c'est une erreur." },
        { id: "truefalse", label: "Vrai ou faux", help: "On te propose une traduction : est-elle correcte ?" },
        { id: "match", label: "Association de paires", help: "Relie chaque caractère à sa traduction, par manches de 6 mots." },
        { id: "timed", label: "Défi chrono", help: "QCM en rafale : réponds au plus grand nombre de questions avant la fin du temps." },
        { id: "eval", label: "Évaluation notée (sur 20)", help: "QCM et réponses écrites mélangés, avec une note sur 20." }
    ],

    directions: [
        { id: "zh-fr", label: "Chinois → Français" },
        { id: "fr-zh", label: "Français → Chinois" },
        { id: "mixed", label: "Mixte" }
    ],

    // Ce qui est affiché pour la « réponse écrite »
    shownLabel: "Ce qui est affiché",
    shownOptions: [
        { id: "zh", label: "Le mot chinois" },
        { id: "pinyin", label: "Le pinyin" },
        { id: "mixed", label: "Les deux, au hasard" }
    ],

    recentCounts: [10, 20, 50],      // « les N derniers mots ajoutés »

    counts: [5, 10, 20, 0],          // 0 = tous les mots
    timedSeconds: 60,                // durée du défi chrono
    matchPairsPerRound: 6,           // paires par manche (association)

    noWords: "Ajoute d'abord des mots dans ton vocabulaire pour pouvoir réviser.",
    needFour: "Il faut au moins 4 mots dans ton vocabulaire pour cet exercice.",
    needTwo: "Il faut au moins 2 mots pour l'association de paires.",
    noPinyin: "Aucun de ces mots n'a de pinyin : ajoute-le dans ton vocabulaire.",

    questionWord: "Question",
    askZhFr: "Que veut dire ce mot ?",
    askFrZh: "Quel est le mot chinois ?",
    askZhPinyin: "Quel est le pinyin de ce mot ?",
    askTrueFalse: "Cette traduction est-elle correcte ?",
    askPinyinFr: "Que veut dire ce pinyin ?",

    suggestionsTitle: "Pour t'aider à réviser",
    reviewButton: (count) => "❗ Réviser mes mots ratés (" + count + ")",
    recentButton: (count) => "🆕 Réviser les " + count + " derniers mots ajoutés",
    reviewSource: (count) => "❗ Mes mots à revoir (" + count + ")",
    recentSource: (count) => "🆕 Les " + count + " derniers mots ajoutés",
    noReview: "Tu n'as aucun mot à revoir pour l'instant. Les mots que tu rates en révision apparaîtront ici.",
    flip: "Retourner la carte",
    knew: "✅ Je savais",
    didntKnow: "❌ À revoir",
    typePlaceholder: "Écris la traduction en français...",
    typePinyinPlaceholder: "Écris le pinyin (accents facultatifs)...",
    trueLabel: "✅ Vrai",
    falseLabel: "❌ Faux",
    validate: "Valider",
    next: "Suivant →",
    seeResult: "Voir le résultat",
    good: "✅ Bonne réponse !",
    goodNoTones: "✅ Bonne réponse ! N'oublie pas les tons : ",
    bad: "❌ Raté. Bonne réponse : ",

    matchRound: (round, total) => "Manche " + round + " / " + total,
    matchHelp: "Touche un caractère, puis sa traduction.",
    nextRound: "Manche suivante →",
    timeLeft: (seconds) => "⏱ " + seconds + " s",
    timedScore: (correct, total) => correct + (correct > 1 ? " bonnes réponses" : " bonne réponse") + " sur " + total,

    resultTitle: "Résultat",
    noteWord: "Note : ",
    missedTitle: "Mots à revoir",
    yourAnswer: "Ta réponse : ",
    comments: [
        { min: 90, text: "Excellent, bravo ! 🎉" },
        { min: 70, text: "Très bien, continue comme ça !" },
        { min: 50, text: "Pas mal, encore un peu de travail." },
        { min: 0, text: "Courage, revois ces mots et réessaie !" }
    ],
    again: "Recommencer",
    retryMissed: "Refaire les mots ratés",
    changeSettings: "Changer les réglages"
};

// ---------- OUTILS ----------

function shuffle(list) {
    const copy = list.slice();

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
    }

    return copy;
}

function normalizeText(text) {
    return (text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[’']/g, " ")
        .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function removeArticle(text) {
    return text.replace(/^(le|la|les|l|un|une|des|du|de|d|se|s) /, "");
}

function editDistance(a, b) {
    const previous = [];
    for (let j = 0; j <= b.length; j++) previous[j] = j;

    for (let i = 1; i <= a.length; i++) {
        let diagonal = previous[0];
        previous[0] = i;

        for (let j = 1; j <= b.length; j++) {
            const saved = previous[j];
            const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
            previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + cost);
            diagonal = saved;
        }
    }

    return previous[b.length];
}

// "Élève/étudiant" → ["eleve", "etudiant"], et le texte entre parenthèses est facultatif
function acceptedAnswers(translation) {
    const variants = [];

    translation.split(/[\/;,]| ou /i).forEach(part => {
        variants.push(part);
        variants.push(part.replace(/\([^)]*\)/g, " "));
    });

    variants.push(translation);

    return variants
        .map(variant => removeArticle(normalizeText(variant)))
        .filter(variant => variant.length > 0);
}

// Réponse écrite acceptée si elle est identique (ou presque : petite faute de frappe)
export function isCorrectAnswer(answer, translation) {
    const given = removeArticle(normalizeText(answer));
    if (!given) return false;

    return acceptedAnswers(translation).some(variant => {
        if (given === variant) return true;

        const tolerance = variant.length >= 8 ? 2 : (variant.length >= 5 ? 1 : 0);
        return tolerance > 0 && editDistance(given, variant) <= tolerance;
    });
}

// ----- Pinyin -----

// "Nǐ hǎo" → "nihao" (sans tons ni espaces ; v = ü)
function stripTones(text) {
    return (text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/v/g, "u")
        .replace(/[^a-z]/g, "");
}

// Garde les accents, enlève espaces et séparateurs
function exactPinyin(text) {
    return (text || "").normalize("NFC").toLowerCase().replace(/[\s'’\-\/·]/g, "");
}

// A-t-on tapé des accents de ton ? (le tréma de ü ne compte pas)
function hasToneMarks(text) {
    return /[\u0300-\u0307\u0309-\u036f]/.test((text || "").normalize("NFD"));
}

// Sans accents tapés : on compare seulement les lettres. Avec accents : ils doivent être justes.
export function checkPinyin(answer, expected) {
    if (!stripTones(answer)) return { correct: false, perfect: false };

    if (exactPinyin(answer) === exactPinyin(expected)) return { correct: true, perfect: true };

    if (hasToneMarks(answer)) return { correct: false, perfect: false };

    return { correct: stripTones(answer) === stripTones(expected), perfect: false };
}

// ---------- DONNÉES ----------

function needsOptions(mode) {
    return mode === "qcm" || mode === "eval" || mode === "truefalse" || mode === "timed";
}

function needsPinyin(mode) {
    return mode === "pinyin-qcm" || mode === "pinyin-typed";
}

// Ces exercices n'utilisent ni le sens des questions, ni l'aide du pinyin
function usesDirection(mode) {
    return ["flashcards", "qcm", "truefalse", "timed", "eval"].indexOf(mode) !== -1;
}

function usesShown(mode) {
    return mode === "typed";
}

function usesPinyinHelp(mode) {
    return !needsPinyin(mode);
}

function usesCount(mode) {
    return mode !== "timed";
}

function allWords() {
    const seen = {};
    const list = [];

    state.categories.forEach(category => {
        category.words.forEach(word => {
            if (!word.chinese || !word.translation) return;

            const key = word.chinese + "|" + word.translation;
            if (seen[key]) return;
            seen[key] = true;

            list.push({
                chinese: word.chinese,
                pinyin: word.pinyin || "",
                translation: word.translation,
                hsk: word.hsk || "",
                categoryId: category.id,
                addedAt: word.addedAt || 0,
                order: list.length
            });
        });
    });

    return list;
}

function hasPinyin(word) {
    return word.pinyin.length > 0;
}

// ---------- MOTS RATÉS (mémorisés sur l'appareil et sur le compte) ----------
// Chaque erreur ajoute 1 au compteur du mot, chaque bonne réponse l'enlève.
// Un mot dont le compteur est au-dessus de 0 est « à revoir ».

const STATS_MAX = 5;           // un mot n'a jamais plus de 5 « points d'erreur »

let stats = {};                // { "chinois|traduction": { miss, last } }
let statsLoadedFor = null;
let statsTimer = null;

function statsKey(word) {
    return word.chinese + "|" + word.translation;
}

function statsStorageKey() {
    return "mandarin-erreurs-" + (state.user ? state.user.uid : "");
}

function saveStatsLocal() {
    try {
        localStorage.setItem(statsStorageKey(), JSON.stringify(stats));
    } catch (error) {
        // pas grave : les erreurs seront gardées seulement sur le compte
    }
}

function readStatsLocal() {
    try {
        const saved = JSON.parse(localStorage.getItem(statsStorageKey()));
        return saved && typeof saved === "object" ? saved : {};
    } catch (error) {
        return {};
    }
}

function saveStats() {
    saveStatsLocal();

    if (!state.user) return;

    // Petite pause pour ne pas écrire à chaque réponse
    clearTimeout(statsTimer);
    statsTimer = setTimeout(() => {
        if (!state.user) return;

        const words = Object.keys(stats).map(key => ({ k: key, miss: stats[key].miss, last: stats[key].last }));

        setDoc(userDoc("stats", "revision"), { words: words }).catch(error => {
            console.warn("Erreurs de révision non enregistrées :", error);
        });
    }, 800);
}

export function updateStats(word, correct) {
    const key = statsKey(word);
    const entry = stats[key];

    if (correct) {
        if (!entry) return;

        entry.miss -= 1;
        entry.last = Date.now();
        if (entry.miss <= 0) delete stats[key];
    } else {
        stats[key] = { miss: Math.min(STATS_MAX, (entry ? entry.miss : 0) + 1), last: Date.now() };
    }

    saveStats();
}

async function loadStats() {
    if (!state.user) {
        statsLoadedFor = null;
        stats = {};
        return;
    }

    if (statsLoadedFor === state.user.uid) return;
    statsLoadedFor = state.user.uid;

    // D'abord la copie de l'appareil, puis celle du compte
    stats = readStatsLocal();

    try {
        const snapshot = await getDoc(userDoc("stats", "revision"));

        if (snapshot.exists() && Array.isArray(snapshot.data().words)) {
            const fromAccount = {};

            snapshot.data().words.forEach(entry => {
                if (entry && typeof entry.k === "string" && entry.miss > 0) {
                    fromAccount[entry.k] = { miss: Math.min(STATS_MAX, entry.miss), last: entry.last || 0 };
                }
            });

            stats = fromAccount;
            saveStatsLocal();
        }
    } catch (error) {
        console.warn("Erreurs de révision du compte indisponibles :", error);
    }

    if (view === "setup") renderSetup();
}

// Les mots à revoir (les plus récemment ratés d'abord)
function reviewWords(all) {
    return all
        .filter(word => stats[statsKey(word)] && stats[statsKey(word)].miss > 0)
        .sort((a, b) => stats[statsKey(b)].last - stats[statsKey(a)].last);
}

// Les N derniers mots ajoutés (ceux sans date d'ajout suivent l'ordre du vocabulaire)
function recentWords(all, count) {
    return all
        .slice()
        .sort((a, b) => (b.addedAt - a.addedAt) || (b.order - a.order))
        .slice(0, count);
}

// Vocabulaire choisi : tout, une catégorie ("id"), un niveau HSK ("hsk:HSK 1", "hsk:none"),
// les mots ratés ("review") ou les derniers ajoutés ("recent:10")
function poolFor(source, all) {
    if (source === "all") return all;
    if (source === "review") return reviewWords(all);
    if (source.indexOf("recent:") === 0) return recentWords(all, parseInt(source.slice(7), 10));

    if (source.indexOf("hsk:") === 0) {
        const level = source.slice(4);
        return all.filter(word => level === "none" ? !word.hsk : word.hsk === level);
    }

    return all.filter(word => word.categoryId === source);
}

function optionText(word, direction) {
    if (direction === "zh-fr") return word.translation;
    if (direction === "zh-pinyin") return word.pinyin;
    return word.chinese;
}

function optionLabel(word, direction, showPinyin) {
    if (direction === "zh-fr") return word.translation;
    if (direction === "zh-pinyin") return word.pinyin;
    return showPinyin && word.pinyin ? word.chinese + "   " + word.pinyin : word.chinese;
}

function buildOptions(word, all, direction, showPinyin) {
    const correctText = optionText(word, direction);
    const seen = {};
    seen[correctText] = true;

    const options = [{ text: correctText, label: optionLabel(word, direction, showPinyin), correct: true }];

    shuffle(all).forEach(other => {
        const text = optionText(other, direction);
        if (options.length >= 4 || seen[text] || !text) return;

        seen[text] = true;
        options.push({ text: text, label: optionLabel(other, direction, showPinyin), correct: false });
    });

    return shuffle(options);
}

// Vrai ou faux : la bonne traduction, ou une fausse prise sur un autre mot
function buildProposal(word, all, direction) {
    const correctText = optionText(word, direction);

    if (Math.random() < 0.5) {
        const others = shuffle(all.filter(other => optionText(other, direction) !== correctText));

        if (others.length > 0) {
            return { proposed: optionText(others[0], direction), isTrue: false };
        }
    }

    return { proposed: correctText, isTrue: true };
}

function pickDirection() {
    return settings.direction === "mixed"
        ? (Math.random() < 0.5 ? "zh-fr" : "fr-zh")
        : settings.direction;
}

function makeQuestion(word, all) {
    const mode = settings.mode;

    // Sinogrammes seuls : le caractère, sans aucune aide, puis la réponse
    if (mode === "characters") {
        return { word: word, direction: "zh-fr", type: "flashcards", options: null, charactersOnly: true };
    }

    // Pinyin : QCM ou réponse écrite
    if (mode === "pinyin-qcm") {
        return { word: word, direction: "zh-pinyin", type: "qcm", options: buildOptions(word, all, "zh-pinyin", false) };
    }

    if (mode === "pinyin-typed") {
        return { word: word, direction: "zh-pinyin", type: "pinyin-typed", options: null };
    }

    // Réponse écrite : le mot en chinois ou en pinyin, on tape la traduction
    if (mode === "typed") {
        const showPinyin = settings.shown === "pinyin" || (settings.shown === "mixed" && Math.random() < 0.5);
        return { word: word, direction: showPinyin && word.pinyin ? "pinyin-fr" : "zh-fr", type: "typed", options: null };
    }

    const direction = pickDirection();

    if (mode === "truefalse") {
        const proposal = buildProposal(word, all, direction);
        return { word: word, direction: direction, type: "truefalse", proposed: proposal.proposed, isTrue: proposal.isTrue };
    }

    // Évaluation : un mélange de QCM et de réponses écrites (français seulement)
    let type = mode === "eval" || mode === "timed" ? "qcm" : mode;

    if (mode === "eval") {
        type = direction === "zh-fr" && Math.random() < 0.5 ? "typed" : "qcm";
    }

    return {
        word: word,
        direction: direction,
        type: type,
        options: type === "qcm" ? buildOptions(word, all, direction, settings.pinyin) : null
    };
}

function buildQuestions(pool, all, wantedCount) {
    const picked = shuffle(pool);
    const count = wantedCount > 0 ? Math.min(wantedCount, picked.length) : picked.length;

    return picked.slice(0, count).map(word => makeQuestion(word, all));
}

// ---------- ÉTAT ----------

let container = null;
let view = "setup";
let session = null;
let timer = null;
let timeLabel = null;
let timeFill = null;

const settings = { source: "all", mode: "qcm", direction: "zh-fr", shown: "zh", count: 10, pinyin: true };

function clearTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// ---------- ÉLÉMENTS D'INTERFACE ----------

function field(labelText, control) {
    const wrapper = el("div", "writing-field");
    wrapper.style.minWidth = "0";
    wrapper.appendChild(el("label", "", labelText));
    wrapper.appendChild(control);
    return wrapper;
}

function selectOf(options, current, onChange) {
    const select = document.createElement("select");

    options.forEach(option => select.appendChild(new Option(option.label, option.value)));
    select.value = String(current);
    select.addEventListener("change", () => onChange(select.value));

    return select;
}

function primaryButton(text, onClick) {
    const button = el("button", "add-category-btn", text);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
}

function secondaryButton(text, onClick) {
    const button = el("button", "secondary-btn", text);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
}

function heading(text) {
    const title = el("h2", "", text);
    title.style.cssText = "margin: 0 0 18px; color: var(--dark-red); font-size: 22px;";
    return title;
}

function askText(question) {
    if (question.type === "truefalse") return REVISIONS.askTrueFalse;
    if (question.direction === "pinyin-fr") return REVISIONS.askPinyinFr;
    if (question.direction === "zh-fr") return REVISIONS.askZhFr;
    if (question.direction === "zh-pinyin") return REVISIONS.askZhPinyin;
    return REVISIONS.askFrZh;
}

function promptBlock(question) {
    const block = el("div");
    block.style.cssText = "margin: 18px 0;";

    if (question.charactersOnly) {
        const only = el("p", "", question.word.chinese);
        only.style.cssText = "margin: 0; font-size: 72px; font-weight: 600; color: var(--dark-red);";
        block.appendChild(only);
        return block;
    }

    const ask = el("p", "", askText(question));
    ask.style.cssText = "margin: 0 0 10px; font-size: 13px; color: #82766F;";
    block.appendChild(ask);

    let mainText = question.word.chinese;
    let mainSize = "48px";

    if (question.direction === "fr-zh") {
        mainText = question.word.translation;
        mainSize = "26px";
    } else if (question.direction === "pinyin-fr") {
        mainText = question.word.pinyin;
        mainSize = "38px";
    }

    const main = el("p", "", mainText);
    main.style.cssText = "margin: 0; font-size: " + mainSize + "; font-weight: 600; color: var(--dark-red);";
    block.appendChild(main);

    if (settings.pinyin && question.direction === "zh-fr" && question.word.pinyin) {
        const hint = el("p", "", question.word.pinyin);
        hint.style.cssText = "margin: 6px 0 0; font-size: 16px; color: #82766F;";
        block.appendChild(hint);
    }

    return block;
}

function answerText(question) {
    if (question.direction === "pinyin-fr") return question.word.translation + " (" + question.word.chinese + ")";
    if (question.direction === "zh-fr") return question.word.translation;
    if (question.direction === "zh-pinyin") return question.word.pinyin;
    return question.word.chinese + (question.word.pinyin ? " (" + question.word.pinyin + ")" : "");
}

function promptText(question) {
    if (question.direction === "fr-zh") return question.word.translation;
    if (question.direction === "pinyin-fr") return question.word.pinyin + " (" + question.word.chinese + ")";
    return question.word.chinese + (question.direction === "zh-fr" && question.word.pinyin ? " (" + question.word.pinyin + ")" : "");
}

// ---------- ÉCRAN 1 : RÉGLAGES ----------

function sourceOptions(words) {
    const options = [{ value: "all", label: REVISIONS.allVocabulary + " (" + REVISIONS.bigReviewCount(words.length) + ")" }];

    options.push({ value: "review", label: REVISIONS.reviewSource(reviewWords(words).length) });

    REVISIONS.recentCounts.forEach(count => {
        if (words.length > count) options.push({ value: "recent:" + count, label: REVISIONS.recentSource(count) });
    });

    state.categories.forEach(category => {
        if (category.words.length > 0) {
            options.push({ value: category.id, label: category.icon + " " + category.name });
        }
    });

    // Par niveau HSK (seulement les niveaux où il y a des mots)
    const levels = {};
    let withoutLevel = 0;

    words.forEach(word => {
        if (word.hsk) levels[word.hsk] = (levels[word.hsk] || 0) + 1;
        else withoutLevel++;
    });

    Object.keys(levels).sort().forEach(level => {
        options.push({ value: "hsk:" + level, label: "📊 " + level + " (" + REVISIONS.bigReviewCount(levels[level]) + ")" });
    });

    if (withoutLevel > 0 && Object.keys(levels).length > 0) {
        options.push({ value: "hsk:none", label: "📊 Sans niveau HSK (" + REVISIONS.bigReviewCount(withoutLevel) + ")" });
    }

    return options;
}

// Message d'erreur si l'exercice est impossible avec ces mots (sinon "")
function validateSetup(pool, all, emptyMessage) {
    const mode = settings.mode;

    if (pool.length === 0) {
        return emptyMessage || (settings.source === "review" ? REVISIONS.noReview : REVISIONS.noWords);
    }

    if (needsPinyin(mode)) {
        if (pool.filter(hasPinyin).length === 0) return REVISIONS.noPinyin;
        if (mode === "pinyin-qcm" && all.filter(hasPinyin).length < 4) return REVISIONS.needFour;
    } else if (needsOptions(mode) && all.length < 4) {
        return REVISIONS.needFour;
    }

    if (mode === "match" && pool.length < 2) return REVISIONS.needTwo;

    return "";
}

function renderSetup() {
    clearTimer();
    view = "setup";
    container.innerHTML = "";
    container.appendChild(heading(REVISIONS.setupTitle));

    const words = allWords();

    const sources = sourceOptions(words);
    if (!sources.some(option => option.value === settings.source)) settings.source = "all";

    const message = el("p", "hanzi-status", "");

    // Lancer tout de suite une révision sur une liste de mots précise
    function launch(pool, emptyMessage) {
        const all = allWords();
        const problem = validateSetup(pool, all, emptyMessage);

        if (problem) {
            message.textContent = problem;
            return;
        }

        startSession(pool, all, 0);
    }

    // Suggestions rapides : mots ratés et derniers mots ajoutés
    const review = reviewWords(words);
    const recentCount = REVISIONS.recentCounts[0];

    const suggestions = el("div");
    suggestions.style.cssText = "margin-bottom: 20px; padding: 14px; background: #F8F5F0; border-radius: 12px;";

    const suggestionsTitle = el("p", "", REVISIONS.suggestionsTitle);
    suggestionsTitle.style.cssText = "margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #453B37;";
    suggestions.appendChild(suggestionsTitle);

    const suggestionButtons = el("div");
    suggestionButtons.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap;";
    suggestionButtons.appendChild(secondaryButton(REVISIONS.reviewButton(review.length), () => launch(review, REVISIONS.noReview)));
    suggestionButtons.appendChild(secondaryButton(REVISIONS.recentButton(recentCount), () => launch(recentWords(words, recentCount), REVISIONS.noWords)));
    suggestions.appendChild(suggestionButtons);

    container.appendChild(suggestions);

    const grid = el("div");
    grid.style.cssText = "display: grid; gap: 14px; margin-bottom: 20px;";

    grid.appendChild(field(REVISIONS.sourceLabel, selectOf(sources, settings.source, value => { settings.source = value; })));

    // Type d'exercice (avec son explication)
    const modeBox = el("div");
    modeBox.appendChild(field(REVISIONS.modeLabel, selectOf(
        REVISIONS.modes.map(mode => ({ value: mode.id, label: mode.label })),
        settings.mode,
        value => { settings.mode = value; renderSetup(); }
    )));

    const currentMode = REVISIONS.modes.filter(mode => mode.id === settings.mode)[0];
    if (currentMode) {
        const help = el("p", "", currentMode.help);
        help.style.cssText = "margin: 6px 0 0; font-size: 13px; color: #82766F;";
        modeBox.appendChild(help);
    }
    grid.appendChild(modeBox);

    if (usesShown(settings.mode)) {
        grid.appendChild(field(REVISIONS.shownLabel, selectOf(
            REVISIONS.shownOptions.map(option => ({ value: option.id, label: option.label })),
            settings.shown,
            value => { settings.shown = value; }
        )));
    }

    if (usesDirection(settings.mode)) {
        grid.appendChild(field(REVISIONS.directionLabel, selectOf(
            REVISIONS.directions.map(direction => ({ value: direction.id, label: direction.label })),
            settings.direction,
            value => { settings.direction = value; }
        )));
    }

    if (usesCount(settings.mode)) {
        grid.appendChild(field(REVISIONS.countLabel, selectOf(
            REVISIONS.counts.map(count => ({ value: count, label: count === 0 ? REVISIONS.countAll : String(count) })),
            settings.count,
            value => { settings.count = parseInt(value, 10); }
        )));
    }

    // Case à cocher : pinyin en aide
    if (usesPinyinHelp(settings.mode)) {
        const pinyinLabel = el("label");
        pinyinLabel.style.cssText = "display: flex; align-items: center; gap: 10px; font-size: 14px; color: #453B37; cursor: pointer;";
        const pinyinBox = document.createElement("input");
        pinyinBox.type = "checkbox";
        pinyinBox.checked = settings.pinyin;
        pinyinBox.style.cssText = "width: 20px; height: 20px;";
        pinyinBox.addEventListener("change", () => { settings.pinyin = pinyinBox.checked; });
        pinyinLabel.appendChild(pinyinBox);
        pinyinLabel.appendChild(document.createTextNode(REVISIONS.pinyinLabel));
        grid.appendChild(pinyinLabel);
    }

    container.appendChild(grid);

    message.textContent = words.length === 0 ? REVISIONS.noWords : "";
    message.style.cssText = "max-width: none; text-align: left; margin: 0 0 12px;";
    container.appendChild(message);

    container.appendChild(primaryButton(REVISIONS.start, () => {
        const all = allWords();
        const pool = poolFor(settings.source, all);
        const problem = validateSetup(pool, all);

        if (problem) {
            message.textContent = problem;
            return;
        }

        startSession(pool, all, settings.count);
    }));

    // Grande révision : tous les mots, depuis le début
    const big = el("div");
    big.style.cssText = "margin-top: 22px; padding-top: 18px; border-top: 1px solid #EEE7E0;";

    const bigHelp = el("p", "", REVISIONS.bigReviewHelp);
    bigHelp.style.cssText = "margin: 0 0 10px; font-size: 13px; color: #82766F;";
    big.appendChild(bigHelp);

    big.appendChild(secondaryButton(
        REVISIONS.bigReview + " (" + REVISIONS.bigReviewCount(words.length) + ")",
        () => {
            const all = allWords();
            const problem = validateSetup(all, all);

            if (problem) {
                message.textContent = problem;
                return;
            }

            startSession(all, all, 0);
        }
    ));

    container.appendChild(big);
}

// ---------- SESSION ----------

function startSession(pool, all, wantedCount) {
    clearTimer();

    // Les exercices de pinyin ne gardent que les mots qui ont un pinyin
    const usedPool = needsPinyin(settings.mode) ? pool.filter(hasPinyin) : pool;
    const usedAll = needsPinyin(settings.mode) ? all.filter(hasPinyin) : all;

    session = {
        all: usedAll,
        sourcePool: usedPool,
        count: wantedCount,
        questions: [],
        index: 0,
        correct: 0,
        missed: [],
        mode: settings.mode
    };

    if (settings.mode === "match") {
        startMatch(wantedCount);
    } else if (settings.mode === "timed") {
        startTimed();
    } else {
        session.questions = buildQuestions(usedPool, usedAll, wantedCount);
        renderQuestion();
    }
}

function record(question, isCorrect, given) {
    updateStats(question.word, isCorrect);

    if (isCorrect) {
        session.correct++;
    } else {
        session.missed.push({ question: question, given: given || "" });
    }
}

function goNext() {
    session.index++;

    if (session.index >= session.questions.length) renderResult();
    else renderQuestion();
}

function progressBar(percent) {
    const track = el("div");
    track.style.cssText = "height: 8px; background: #F0EAE3; border-radius: 4px; overflow: hidden;";

    const fill = el("div");
    fill.style.cssText = "height: 100%; background: var(--primary-red); width: " + percent + "%;";
    track.appendChild(fill);

    return track;
}

function header() {
    const total = session.questions.length;
    const wrapper = el("div");

    const label = el("p", "", REVISIONS.questionWord + " " + (session.index + 1) + " / " + total);
    label.style.cssText = "margin: 0 0 8px; font-size: 13px; color: #82766F;";

    wrapper.appendChild(label);
    wrapper.appendChild(progressBar(session.index / total * 100));
    return wrapper;
}

function nextButton() {
    const last = session.index + 1 >= session.questions.length;
    const button = primaryButton(last ? REVISIONS.seeResult : REVISIONS.next, goNext);
    button.style.marginTop = "16px";
    return button;
}

// ---------- ÉCRAN 2 : QUESTION ----------

function renderQuestion() {
    view = "question";
    container.innerHTML = "";
    container.appendChild(header());

    const question = session.questions[session.index];
    container.appendChild(promptBlock(question));

    if (question.type === "flashcards") renderFlashcard(question);
    else if (question.type === "typed") renderTyped(question, false);
    else if (question.type === "pinyin-typed") renderTyped(question, true);
    else if (question.type === "truefalse") renderTrueFalse(question);
    else renderChoices(question, false);
}

function renderFlashcard(question) {
    const zone = el("div");
    container.appendChild(zone);

    zone.appendChild(primaryButton(REVISIONS.flip, () => {
        zone.innerHTML = "";

        if (question.direction === "zh-fr" && question.word.pinyin) {
            const pinyin = el("p", "", question.word.pinyin);
            pinyin.style.cssText = "margin: 0 0 6px; font-size: 22px; color: #82766F;";
            zone.appendChild(pinyin);
        }

        const answer = el("p", "", answerText(question));
        answer.style.cssText = "margin: 0 0 18px; font-size: 24px; font-weight: 600; color: #292525;";
        zone.appendChild(answer);

        const buttons = el("div");
        buttons.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap;";

        buttons.appendChild(secondaryButton(REVISIONS.didntKnow, () => { record(question, false, ""); goNext(); }));
        buttons.appendChild(primaryButton(REVISIONS.knew, () => { record(question, true, ""); goNext(); }));

        zone.appendChild(buttons);
    }));
}

// QCM : onAnswered(correct) est appelé après la réponse (utilisé par le défi chrono)
function renderChoices(question, isTimed, onAnswered) {
    const list = el("div");
    list.style.cssText = "display: grid; gap: 10px;";
    container.appendChild(list);

    const feedback = el("p", "");
    feedback.style.cssText = "margin: 16px 0 0; font-weight: 600;";
    container.appendChild(feedback);

    const buttons = [];
    let answered = false;

    question.options.forEach(option => {
        const button = el("button", "secondary-btn", option.label);
        button.type = "button";
        button.style.cssText = "width: 100%; text-align: left; padding: 14px 16px; font-size: 16px;";
        buttons.push({ button: button, option: option });
        list.appendChild(button);

        button.addEventListener("click", () => {
            if (answered) return;
            answered = true;

            buttons.forEach(entry => {
                entry.button.disabled = true;

                if (entry.option.correct) {
                    entry.button.style.background = "#DFF0E5";
                    entry.button.style.color = "#1E6B3E";
                }
            });

            if (!option.correct) {
                button.style.background = "#F8D3D6";
                button.style.color = "#8B1E2B";
            }

            record(question, option.correct, option.text);

            if (isTimed) {
                onAnswered(option.correct);
                return;
            }

            feedback.textContent = option.correct ? REVISIONS.good : REVISIONS.bad + answerText(question);
            feedback.style.color = option.correct ? "#1E6B3E" : "#8B1E2B";

            container.appendChild(nextButton());
        });
    });
}

// Réponse écrite : traduction en français, ou pinyin
function renderTyped(question, isPinyin) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "note-title-input";
    input.placeholder = isPinyin ? REVISIONS.typePinyinPlaceholder : REVISIONS.typePlaceholder;
    input.autocomplete = "off";
    input.setAttribute("autocapitalize", "none");
    input.style.cssText = "font-size: 17px; font-weight: 400; margin-bottom: 12px;";
    container.appendChild(input);

    const feedback = el("p", "");
    feedback.style.cssText = "margin: 4px 0 0; font-weight: 600;";

    let validated = false;

    const validate = primaryButton(REVISIONS.validate, () => {
        if (validated) return;
        validated = true;

        let correct;
        let message;

        if (isPinyin) {
            const result = checkPinyin(input.value, question.word.pinyin);
            correct = result.correct;
            message = result.correct
                ? (result.perfect ? REVISIONS.good : REVISIONS.goodNoTones + question.word.pinyin)
                : REVISIONS.bad + answerText(question);
        } else {
            correct = isCorrectAnswer(input.value, question.word.translation);
            message = correct ? REVISIONS.good : REVISIONS.bad + answerText(question);
        }

        record(question, correct, input.value.trim());

        input.disabled = true;
        validate.style.display = "none";

        feedback.textContent = message;
        feedback.style.color = correct ? "#1E6B3E" : "#8B1E2B";

        container.appendChild(feedback);
        container.appendChild(nextButton());
    });

    container.appendChild(validate);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") validate.click();
    });

    input.focus();
}

// Vrai ou faux
function renderTrueFalse(question) {
    const statement = el("p", "", "= " + question.proposed);
    statement.style.cssText =
        "margin: 0 0 18px; padding: 14px 16px; background: #F8F5F0; border-radius: 10px; " +
        "font-size: " + (question.direction === "zh-fr" ? "22px" : "34px") + "; font-weight: 600; color: #292525;";
    container.appendChild(statement);

    const buttons = el("div");
    buttons.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap;";
    container.appendChild(buttons);

    const feedback = el("p", "");
    feedback.style.cssText = "margin: 16px 0 0; font-weight: 600;";
    container.appendChild(feedback);

    let answered = false;

    function answer(choice) {
        if (answered) return;
        answered = true;

        const correct = choice === question.isTrue;
        record(question, correct, choice ? "Vrai" : "Faux");

        feedback.textContent = correct ? REVISIONS.good : REVISIONS.bad + answerText(question);
        feedback.style.color = correct ? "#1E6B3E" : "#8B1E2B";

        container.appendChild(nextButton());
    }

    buttons.appendChild(primaryButton(REVISIONS.trueLabel, () => answer(true)));
    buttons.appendChild(secondaryButton(REVISIONS.falseLabel, () => answer(false)));
}

// ---------- DÉFI CHRONO ----------

function startTimed() {
    session.pool = shuffle(session.sourcePool);
    session.poolIndex = 0;
    session.endTime = Date.now() + REVISIONS.timedSeconds * 1000;

    renderTimedQuestion();

    timer = setInterval(() => {
        const left = Math.max(0, Math.ceil((session.endTime - Date.now()) / 1000));
        if (timeLabel) timeLabel.textContent = REVISIONS.timeLeft(left);
        if (timeFill) timeFill.style.width = timePercent() + "%";

        if (left <= 0) finishTimed();
    }, 250);
}

function nextTimedWord() {
    if (session.poolIndex >= session.pool.length) {
        session.pool = shuffle(session.sourcePool);
        session.poolIndex = 0;
    }

    const word = session.pool[session.poolIndex];
    session.poolIndex++;
    return word;
}

// Part de temps restant (en %)
function timePercent() {
    return Math.max(0, Math.min(100, (session.endTime - Date.now()) / (REVISIONS.timedSeconds * 1000) * 100));
}

function renderTimedQuestion() {
    view = "timed";
    container.innerHTML = "";

    const left = Math.max(0, Math.ceil((session.endTime - Date.now()) / 1000));
    timeLabel = el("p", "", REVISIONS.timeLeft(left));
    timeLabel.style.cssText = "margin: 0 0 8px; font-size: 22px; font-weight: 700; color: var(--primary-red);";
    container.appendChild(timeLabel);

    const bar = progressBar(timePercent());
    timeFill = bar.children[0];
    container.appendChild(bar);

    const question = makeQuestion(nextTimedWord(), session.all);
    question.type = "qcm";
    if (!question.options) question.options = buildOptions(question.word, session.all, question.direction, settings.pinyin);

    container.appendChild(promptBlock(question));

    renderChoices(question, true, () => {
        session.questions.push(question);

        setTimeout(() => {
            if (view === "timed") renderTimedQuestion();
        }, 600);
    });
}

function finishTimed() {
    clearTimer();
    timeLabel = null;
    timeFill = null;
    renderResult();
}

// ---------- ASSOCIATION DE PAIRES ----------

function startMatch(wantedCount) {
    const picked = shuffle(session.sourcePool);
    const total = wantedCount > 0 ? Math.min(wantedCount, picked.length) : picked.length;
    const words = picked.slice(0, total);

    session.questions = words.map(word => ({ word: word, direction: "zh-fr", type: "match" }));
    session.rounds = [];
    session.roundIndex = 0;
    session.errors = {};

    for (let i = 0; i < session.questions.length; i += REVISIONS.matchPairsPerRound) {
        session.rounds.push(session.questions.slice(i, i + REVISIONS.matchPairsPerRound));
    }

    renderMatchRound();
}

function renderMatchRound() {
    view = "match";
    container.innerHTML = "";

    const round = session.rounds[session.roundIndex];
    const roundCount = session.rounds.length;

    const label = el("p", "", REVISIONS.matchRound(session.roundIndex + 1, roundCount));
    label.style.cssText = "margin: 0 0 8px; font-size: 13px; color: #82766F;";
    container.appendChild(label);
    container.appendChild(progressBar(session.roundIndex / roundCount * 100));

    const help = el("p", "", REVISIONS.matchHelp);
    help.style.cssText = "margin: 16px 0; font-size: 14px; color: #453B37;";
    container.appendChild(help);

    const grid = el("div");
    grid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 10px;";
    container.appendChild(grid);

    const leftColumn = el("div");
    const rightColumn = el("div");
    leftColumn.style.cssText = "display: grid; gap: 10px; align-content: start;";
    rightColumn.style.cssText = "display: grid; gap: 10px; align-content: start;";
    grid.appendChild(leftColumn);
    grid.appendChild(rightColumn);

    const tileStyle = "width: 100%; padding: 14px 10px; font-size: 16px; text-align: center; min-height: 58px;";

    let selected = null;     // { button, question }
    let matched = 0;
    const lefts = [];

    function key(question) {
        return question.word.chinese + "|" + question.word.translation;
    }

    round.forEach(question => {
        const text = settings.pinyin && question.word.pinyin
            ? question.word.chinese + "  " + question.word.pinyin
            : question.word.chinese;

        const button = el("button", "secondary-btn", text);
        button.type = "button";
        button.style.cssText = tileStyle + " font-size: 20px;";
        lefts.push({ button: button, question: question });
        leftColumn.appendChild(button);

        button.addEventListener("click", () => {
            if (button.disabled) return;

            lefts.forEach(entry => {
                if (!entry.button.disabled) {
                    entry.button.style.background = "";
                    entry.button.style.outline = "";
                }
            });

            selected = { button: button, question: question };
            button.style.outline = "3px solid var(--primary-red)";
        });
    });

    shuffle(round).forEach(question => {
        const button = el("button", "secondary-btn", question.word.translation);
        button.type = "button";
        button.style.cssText = tileStyle;
        rightColumn.appendChild(button);

        button.addEventListener("click", () => {
            if (button.disabled || !selected) return;

            const choice = selected;

            if (choice.question === question) {
                // Bonne paire
                [choice.button, button].forEach(tile => {
                    tile.disabled = true;
                    tile.style.outline = "";
                    tile.style.background = "#DFF0E5";
                    tile.style.color = "#1E6B3E";
                });

                updateStats(question.word, !session.errors[key(question)]);

                if (session.errors[key(question)]) session.missed.push({ question: question, given: "" });
                else session.correct++;

                selected = null;
                matched++;

                if (matched === round.length) {
                    const last = session.roundIndex + 1 >= roundCount;
                    const next = primaryButton(last ? REVISIONS.seeResult : REVISIONS.nextRound, () => {
                        session.roundIndex++;
                        if (last) renderResult();
                        else renderMatchRound();
                    });
                    next.style.marginTop = "18px";
                    container.appendChild(next);
                }
            } else {
                // Mauvaise paire : l'erreur est comptée, la sélection est effacée
                session.errors[key(choice.question)] = true;

                choice.button.style.outline = "";
                button.style.background = "#F8D3D6";
                button.style.color = "#8B1E2B";

                setTimeout(() => {
                    if (!button.disabled) {
                        button.style.background = "";
                        button.style.color = "";
                    }
                }, 500);

                selected = null;
            }
        });
    });
}

// ---------- ÉCRAN 3 : RÉSULTAT ----------

function renderResult() {
    clearTimer();
    view = "result";
    container.innerHTML = "";
    container.appendChild(heading(REVISIONS.resultTitle));

    const total = session.questions.length;
    const percent = total > 0 ? session.correct / total * 100 : 0;

    let scoreText = session.correct + " / " + total;

    if (session.mode === "eval" && total > 0) {
        const note = Math.round(session.correct / total * 20 * 10) / 10;
        scoreText = REVISIONS.noteWord + String(note).replace(".", ",") + " / 20";
    }

    if (session.mode === "timed") {
        scoreText = REVISIONS.timedScore(session.correct, total);
    }

    const score = el("p", "", scoreText);
    score.style.cssText = "margin: 0 0 6px; font-size: 40px; font-weight: 700; color: var(--primary-red);";
    container.appendChild(score);

    const comment = REVISIONS.comments.filter(item => percent >= item.min)[0];
    const commentLine = el("p", "", comment ? comment.text : "");
    commentLine.style.cssText = "margin: 0 0 22px; font-size: 16px; color: #453B37;";
    container.appendChild(commentLine);

    // Mots ratés
    if (session.missed.length > 0) {
        const title = el("h3", "", REVISIONS.missedTitle);
        title.style.cssText = "margin: 0 0 10px; font-size: 17px; color: var(--dark-red);";
        container.appendChild(title);

        const list = el("div");
        list.style.cssText = "display: grid; gap: 8px; margin-bottom: 22px;";

        session.missed.forEach(item => {
            const row = el("div");
            row.style.cssText = "padding: 12px 14px; background: #F8F5F0; border-radius: 10px; font-size: 15px;";

            row.appendChild(el("div", "", promptText(item.question) + "  →  " + answerText(item.question)));

            if (item.given) {
                const given = el("div", "", REVISIONS.yourAnswer + item.given);
                given.style.cssText = "margin-top: 4px; font-size: 13px; color: #82766F;";
                row.appendChild(given);
            }

            list.appendChild(row);
        });

        container.appendChild(list);
    }

    // Boutons
    const buttons = el("div");
    buttons.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap;";

    buttons.appendChild(primaryButton(REVISIONS.again, () => {
        startSession(session.sourcePool, session.all, session.count);
    }));

    if (session.missed.length > 0) {
        buttons.appendChild(secondaryButton(REVISIONS.retryMissed, () => {
            const pool = session.missed.map(item => item.question.word);
            startSession(pool, session.all, 0);
        }));
    }

    buttons.appendChild(secondaryButton(REVISIONS.changeSettings, renderSetup));

    container.appendChild(buttons);
}

// ---------- INITIALISATION ----------

// Réglages par défaut choisis dans la page Paramètres
let lastDefaults = "";

function applyDefaults(saved) {
    if (!saved) return false;

    const signature = JSON.stringify(saved);
    if (signature === lastDefaults) return false;
    lastDefaults = signature;

    if (REVISIONS.modes.some(mode => mode.id === saved.mode)) settings.mode = saved.mode;
    if (REVISIONS.directions.some(direction => direction.id === saved.direction)) settings.direction = saved.direction;
    if (REVISIONS.counts.indexOf(saved.count) !== -1) settings.count = saved.count;
    if (typeof saved.pinyin === "boolean") settings.pinyin = saved.pinyin;

    return true;
}

export function initRevisions() {
    container = document.getElementById("revisions-container");
    if (!container) return;

    applyDefaults(window.MANDARIN_SETTINGS && window.MANDARIN_SETTINGS.revisions);

    window.addEventListener("mandarin-settings", event => {
        const changed = applyDefaults(event.detail && event.detail.revisions);
        if (changed && view === "setup") renderSetup();
    });

    // Remplace la zone vide par un panneau (même style que l'éditeur de notes)
    container.className = "note-editor";
    container.style.cssText = "text-align: left;";

    renderSetup();

    // Si le vocabulaire change pendant les réglages, on met la liste à jour
    onStateChange(() => {
        loadStats();
        if (view === "setup") renderSetup();
    });
}
