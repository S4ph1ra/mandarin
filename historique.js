// =====================================================
// HISTORIQUE.JS : PAGE « PROGRÈS » (HISTORIQUE DE TES RÉVISIONS)
// =====================================================
// Fichier autonome, chargé automatiquement par revisions.js. Il ajoute une
// page 📈 Progrès dans le menu avec :
//   - tes chiffres clés (révisions faites, réussite, mots maîtrisés...)
//   - la courbe de tes scores
//   - les mots ajoutés chaque semaine
//   - tes mots les plus ratés
//   - ta moyenne par type d'exercice
// L'historique est gardé sur ton appareil ET sur ton compte.
// Les textes et réglages sont juste en dessous.

import { getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { userDoc } from "./firebase.js";
import { state, onStateChange } from "./state.js";
import { showPage } from "./navigation.js";

// ---------- TEXTES ET RÉGLAGES (modifie ici) ----------
const HISTORIQUE = {
    pageName: "progres",
    menuIcon: "📈",
    menuLabel: "Progrès",

    title: "Mes progrès",
    description: "L'historique de tes révisions : scores, mots ajoutés, mots les plus ratés.",

    empty: "Pas encore de révision enregistrée. Fais un exercice dans la page Révisions (ou avec le bouton ⚡) : tes progrès apparaîtront ici.",

    cards: {
        sessions: "Révisions faites",
        answers: "Réponses données",
        success: "Réussite",
        words: "Mots dans ton vocabulaire",
        mastered: "Mots maîtrisés"
    },
    masteredHelp: "Maîtrisé = au moins 3 essais et 80 % de réussite.",

    scoresTitle: "Tes scores",
    scoresHelp: (count) => "Pourcentage de bonnes réponses pour tes " + count + " dernières révisions.",
    wordsTitle: "Mots ajoutés par semaine",
    wordsHelp: (undated) => undated > 0
        ? undated + " mot(s) ajouté(s) avant le suivi n'ont pas de date et ne sont pas comptés ici."
        : "",
    missedTitle: "Mots les plus ratés",
    missedHelp: "Les mots sur lesquels tu te trompes le plus souvent.",
    missedLine: (misses, tries) => misses + " erreur(s) sur " + tries + " essai(s)",
    modesTitle: "Moyenne par type d'exercice",
    modeLine: (percent, sessions) => percent + " % · " + sessions + " révision(s)",

    reset: "🗑 Effacer l'historique",
    confirmReset: "Effacer tout l'historique de tes révisions ? (Tes mots et tes notes ne sont pas touchés.)",

    maxSessions: 400,         // nombre de révisions gardées
    scoresShown: 30,          // points sur la courbe
    weeksShown: 8,            // semaines sur le diagramme
    missedShown: 10,          // mots dans la liste des plus ratés
    masteredTries: 3,
    masteredRate: 0.8,

    modeNames: {
        flashcards: "Flashcards",
        characters: "Sinogrammes seuls",
        qcm: "QCM",
        typed: "Réponse écrite",
        "pinyin-qcm": "QCM du pinyin",
        "pinyin-typed": "Écrire le pinyin",
        truefalse: "Vrai ou faux",
        match: "Association de paires",
        timed: "Défi chrono",
        eval: "Évaluation notée",
        eclair: "Révision éclair ⚡"
    }
};

// ---------- DONNÉES ----------
// { sessions: [{ t, mode, correct, total }], words: { "chinois|traduction": { n, m, last } } }
//   n = essais, m = erreurs, last = dernière réponse

let data = { sessions: [], words: {} };
let loadedFor = null;
let saveTimer = null;
let render = null;

export function getData() {
    return data;
}

function wordKey(word) {
    return word.chinese + "|" + word.translation;
}

function storageKey() {
    return "mandarin-historique-" + (state.user ? state.user.uid : "");
}

function saveLocal() {
    try {
        localStorage.setItem(storageKey(), JSON.stringify(data));
    } catch (error) {
        // pas grave : l'historique reste sur le compte
    }
}

function readLocal() {
    try {
        return normalize(JSON.parse(localStorage.getItem(storageKey())));
    } catch (error) {
        return { sessions: [], words: {} };
    }
}

// Remet les données au bon format (au cas où elles seraient abîmées)
export function normalize(raw) {
    const clean = { sessions: [], words: {} };
    if (!raw || typeof raw !== "object") return clean;

    (Array.isArray(raw.sessions) ? raw.sessions : []).forEach(item => {
        if (item && Number(item.t) > 0 && Number(item.total) > 0 && Number(item.correct) >= 0) {
            clean.sessions.push({
                t: Number(item.t),
                mode: String(item.mode || ""),
                correct: Math.min(Number(item.correct), Number(item.total)),
                total: Number(item.total)
            });
        }
    });

    // Les mots peuvent venir sous forme d'objet (appareil) ou de liste (compte)
    const entries = Array.isArray(raw.words)
        ? raw.words
        : Object.keys(raw.words || {}).map(key => Object.assign({ k: key }, raw.words[key]));

    entries.forEach(item => {
        if (item && typeof item.k === "string" && Number(item.n) > 0) {
            clean.words[item.k] = {
                n: Number(item.n),
                m: Math.min(Number(item.m) || 0, Number(item.n)),
                last: Number(item.last) || 0
            };
        }
    });

    clean.sessions.sort((a, b) => a.t - b.t);
    clean.sessions = clean.sessions.slice(-HISTORIQUE.maxSessions);

    return clean;
}

// Fusionne deux historiques (appareil + compte) sans rien perdre
export function mergeData(a, b) {
    const sessions = {};
    a.sessions.concat(b.sessions).forEach(item => { sessions[item.t] = item; });

    const merged = { sessions: Object.keys(sessions).map(key => sessions[key]), words: {} };
    merged.sessions.sort((x, y) => x.t - y.t);
    merged.sessions = merged.sessions.slice(-HISTORIQUE.maxSessions);

    [a.words, b.words].forEach(words => {
        Object.keys(words).forEach(key => {
            const current = merged.words[key];
            if (!current || words[key].n > current.n) merged.words[key] = words[key];
        });
    });

    return merged;
}

function save() {
    saveLocal();

    if (!state.user) return;

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        if (!state.user) return;

        const words = Object.keys(data.words).map(key => ({
            k: key, n: data.words[key].n, m: data.words[key].m, last: data.words[key].last
        }));

        setDoc(userDoc("stats", "history"), { sessions: data.sessions, words: words }).catch(error => {
            console.warn("Historique non enregistré sur le compte :", error);
        });
    }, 1500);
}

// Appelé à chaque réponse donnée dans un exercice
export function recordAnswer(word, correct) {
    if (!state.user) return;

    const key = wordKey(word);
    const entry = data.words[key] || { n: 0, m: 0, last: 0 };

    entry.n += 1;
    if (!correct) entry.m += 1;
    entry.last = Date.now();

    data.words[key] = entry;
    save();
}

// Appelé à la fin d'un exercice
export function logSession(summary) {
    if (!state.user || !summary || !(summary.total > 0)) return;

    data.sessions.push({
        t: Date.now(),
        mode: String(summary.mode || ""),
        correct: Math.min(summary.correct, summary.total),
        total: summary.total
    });

    data.sessions = data.sessions.slice(-HISTORIQUE.maxSessions);
    save();
}

async function loadHistory() {
    if (!state.user) {
        loadedFor = null;
        data = { sessions: [], words: {} };
        return;
    }

    if (loadedFor === state.user.uid) return;
    loadedFor = state.user.uid;

    // D'abord la copie de l'appareil, puis celle du compte
    data = mergeData(readLocal(), data.sessions.length || Object.keys(data.words).length ? data : { sessions: [], words: {} });

    try {
        const snapshot = await getDoc(userDoc("stats", "history"));

        if (snapshot.exists()) {
            data = mergeData(data, normalize(snapshot.data()));
            saveLocal();
        }
    } catch (error) {
        console.warn("Historique du compte indisponible :", error);
    }

    if (render) render();
}

// ---------- CALCULS ----------

function vocabularyMap(categories) {
    const map = {};

    categories.forEach(category => {
        category.words.forEach(word => { map[wordKey(word)] = word; });
    });

    return map;
}

export function computeSummary(history, categories) {
    const known = vocabularyMap(categories);
    let correct = 0;
    let total = 0;

    history.sessions.forEach(item => { correct += item.correct; total += item.total; });

    let mastered = 0;

    Object.keys(history.words).forEach(key => {
        const entry = history.words[key];

        if (known[key] && entry.n >= HISTORIQUE.masteredTries && (entry.n - entry.m) / entry.n >= HISTORIQUE.masteredRate) {
            mastered++;
        }
    });

    return {
        sessions: history.sessions.length,
        answers: total,
        success: total > 0 ? Math.round(correct / total * 100) : 0,
        words: Object.keys(known).length,
        mastered: mastered
    };
}

export function topMissed(history, categories, count) {
    const known = vocabularyMap(categories);

    return Object.keys(history.words)
        .filter(key => history.words[key].m > 0)
        .sort((a, b) => (history.words[b].m - history.words[a].m) ||
                        (history.words[b].m / history.words[b].n - history.words[a].m / history.words[a].n))
        .slice(0, count)
        .map(key => ({ key: key, word: known[key] || null, misses: history.words[key].m, tries: history.words[key].n }));
}

export function averageByMode(history) {
    const groups = {};

    history.sessions.forEach(item => {
        const group = groups[item.mode] || { correct: 0, total: 0, sessions: 0 };
        group.correct += item.correct;
        group.total += item.total;
        group.sessions += 1;
        groups[item.mode] = group;
    });

    return Object.keys(groups)
        .map(mode => ({ mode: mode, percent: Math.round(groups[mode].correct / groups[mode].total * 100), sessions: groups[mode].sessions }))
        .sort((a, b) => b.sessions - a.sessions);
}

// Lundi 00:00 de la semaine d'une date
function weekStart(time) {
    const date = new Date(time);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date.getTime();
}

// Nombre de mots ajoutés par semaine (les plus récentes semaines)
export function weeklyAdded(categories, now, weeks) {
    const thisWeek = weekStart(now);
    const starts = [];

    for (let i = weeks - 1; i >= 0; i--) {
        const date = new Date(thisWeek);
        date.setDate(date.getDate() - 7 * i);
        starts.push(date.getTime());
    }

    const counts = starts.map(() => 0);
    let undated = 0;

    categories.forEach(category => {
        category.words.forEach(word => {
            if (!(word.addedAt > 0)) {
                undated++;
                return;
            }

            const start = weekStart(word.addedAt);
            const index = starts.indexOf(start);
            if (index !== -1) counts[index]++;
        });
    });

    return { starts: starts, counts: counts, undated: undated };
}

// ---------- GRAPHIQUES (SVG) ----------

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.keys(attributes || {}).forEach(name => element.setAttribute(name, attributes[name]));
    return element;
}

function svgText(x, y, text, attributes) {
    const element = svgElement("text", Object.assign({ x: x, y: y, "font-size": 11, fill: "#82766F" }, attributes));
    element.textContent = text;
    return element;
}

function shortDate(time) {
    return new Date(time).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function chartBase(width, height) {
    const svg = svgElement("svg", { viewBox: "0 0 " + width + " " + height, width: "100%" });
    svg.style.cssText = "display: block; max-width: 640px; height: auto;";
    return svg;
}

// Courbe : points = [{ value (0 à 100), label, title }]
export function lineChart(points) {
    const width = 600, height = 220, left = 38, right = 14, top = 12, bottom = 28;
    const svg = chartBase(width, height);
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    // Lignes horizontales : 0, 25, 50, 75, 100 %
    [0, 25, 50, 75, 100].forEach(percent => {
        const y = top + plotHeight - plotHeight * percent / 100;
        svg.appendChild(svgElement("line", { x1: left, y1: y, x2: width - right, y2: y, stroke: "#EEE7E0", "stroke-width": 1 }));
        svg.appendChild(svgText(left - 6, y + 4, percent + "%", { "text-anchor": "end" }));
    });

    const x = index => points.length === 1 ? left + plotWidth / 2 : left + plotWidth * index / (points.length - 1);
    const y = value => top + plotHeight - plotHeight * value / 100;

    if (points.length > 1) {
        svg.appendChild(svgElement("polyline", {
            points: points.map((point, index) => x(index) + "," + y(point.value)).join(" "),
            fill: "none", stroke: "#A92732", "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round"
        }));
    }

    points.forEach((point, index) => {
        const dot = svgElement("circle", { cx: x(index), cy: y(point.value), r: 4, fill: "#A92732" });
        const title = svgElement("title", {});
        title.textContent = point.title;
        dot.appendChild(title);
        svg.appendChild(dot);
    });

    // Dates de la première et de la dernière révision
    svg.appendChild(svgText(left, height - 8, points[0].label, { "text-anchor": "start" }));
    if (points.length > 1) {
        svg.appendChild(svgText(width - right, height - 8, points[points.length - 1].label, { "text-anchor": "end" }));
    }

    return svg;
}

// Barres : bars = [{ value, label }]
export function barChart(bars) {
    const width = 600, height = 200, left = 28, right = 10, top = 22, bottom = 28;
    const svg = chartBase(width, height);
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const max = Math.max(1, ...bars.map(bar => bar.value));
    const slot = plotWidth / bars.length;
    const barWidth = Math.min(48, slot * 0.6);

    svg.appendChild(svgElement("line", { x1: left, y1: top + plotHeight, x2: width - right, y2: top + plotHeight, stroke: "#DED5CE", "stroke-width": 1 }));

    bars.forEach((bar, index) => {
        const barHeight = plotHeight * bar.value / max;
        const x = left + slot * index + (slot - barWidth) / 2;
        const y = top + plotHeight - barHeight;

        if (bar.value > 0) {
            svg.appendChild(svgElement("rect", { x: x, y: y, width: barWidth, height: barHeight, rx: 4, fill: "#A92732" }));
        }

        svg.appendChild(svgText(x + barWidth / 2, y - 5, String(bar.value), { "text-anchor": "middle", fill: "#453B37", "font-weight": 600 }));
        svg.appendChild(svgText(x + barWidth / 2, height - 8, bar.label, { "text-anchor": "middle" }));
    });

    return svg;
}

// ---------- PAGE ----------

function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function start() {
    const nav = document.querySelector(".sidebar-nav");
    const app = document.getElementById("app");
    if (!nav || !app) return;

    // Lien dans le menu (après « Révisions » si possible)
    const link = create("a", "nav-item");
    link.href = "#";
    link.dataset.page = HISTORIQUE.pageName;
    link.appendChild(create("span", "nav-icon", HISTORIQUE.menuIcon));
    link.appendChild(create("span", "", HISTORIQUE.menuLabel));

    const after = nav.querySelector('[data-page="revisions"]');
    if (after) after.after(link); else nav.appendChild(link);

    // Page
    const page = create("section", "page");
    page.id = "page-" + HISTORIQUE.pageName;
    app.appendChild(page);

    function card(title, help) {
        const box = create("div", "note-editor");
        box.style.marginBottom = "20px";

        const heading = create("h2", "", title);
        heading.style.cssText = "margin: 0 0 6px; font-size: 20px; color: var(--dark-red);";
        box.appendChild(heading);

        if (help) {
            const note = create("p", "", help);
            note.style.cssText = "margin: 0 0 14px; font-size: 13px; color: #82766F;";
            box.appendChild(note);
        }

        return box;
    }

    render = function () {
        page.innerHTML = "";

        const header = create("header", "page-header");
        const headerText = create("div", "header-text");
        headerText.appendChild(create("h1", "", HISTORIQUE.title));
        headerText.appendChild(create("p", "header-description", HISTORIQUE.description));
        header.appendChild(headerText);
        page.appendChild(header);

        const summary = computeSummary(data, state.categories);

        // --- Chiffres clés ---
        const grid = create("div");
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 20px;";

        [
            [HISTORIQUE.cards.sessions, summary.sessions],
            [HISTORIQUE.cards.answers, summary.answers],
            [HISTORIQUE.cards.success, summary.success + " %"],
            [HISTORIQUE.cards.words, summary.words],
            [HISTORIQUE.cards.mastered, summary.mastered]
        ].forEach(item => {
            const box = create("div", "progress-card");
            box.appendChild(create("span", "progress-number", String(item[1])));
            box.appendChild(create("span", "progress-label", item[0]));
            grid.appendChild(box);
        });

        page.appendChild(grid);

        const masteredNote = create("p", "", HISTORIQUE.masteredHelp);
        masteredNote.style.cssText = "margin: -8px 0 20px; font-size: 12px; color: #82766F;";
        page.appendChild(masteredNote);

        // --- Mots ajoutés par semaine (même sans révision) ---
        const weekly = weeklyAdded(state.categories, Date.now(), HISTORIQUE.weeksShown);
        const wordsCard = card(HISTORIQUE.wordsTitle, HISTORIQUE.wordsHelp(weekly.undated));
        wordsCard.appendChild(barChart(weekly.starts.map((start, index) => ({ value: weekly.counts[index], label: shortDate(start) }))));

        if (data.sessions.length === 0) {
            const empty = card(HISTORIQUE.scoresTitle);
            empty.appendChild(create("p", "", HISTORIQUE.empty));
            empty.lastChild.style.cssText = "margin: 0; font-size: 14px; color: #82766F;";
            page.appendChild(empty);
            page.appendChild(wordsCard);
            return;
        }

        // --- Courbe des scores ---
        const recent = data.sessions.slice(-HISTORIQUE.scoresShown);
        const scores = card(HISTORIQUE.scoresTitle, HISTORIQUE.scoresHelp(recent.length));
        scores.appendChild(lineChart(recent.map(item => ({
            value: Math.round(item.correct / item.total * 100),
            label: shortDate(item.t),
            title: shortDate(item.t) + " · " + (HISTORIQUE.modeNames[item.mode] || item.mode) + " · " + item.correct + "/" + item.total
        }))));
        page.appendChild(scores);

        page.appendChild(wordsCard);

        // --- Mots les plus ratés ---
        const missed = topMissed(data, state.categories, HISTORIQUE.missedShown);

        if (missed.length > 0) {
            const missedCard = card(HISTORIQUE.missedTitle, HISTORIQUE.missedHelp);

            missed.forEach(item => {
                const line = create("div");
                line.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 12px; margin-bottom: 8px; background: #F8F5F0; border-radius: 10px;";

                const left = create("div");
                const label = item.word
                    ? item.word.chinese + (item.word.pinyin ? "  " + item.word.pinyin : "") + "  ·  " + item.word.translation
                    : item.key.replace("|", "  ·  ");
                left.appendChild(create("span", "", label));
                left.firstChild.style.cssText = "font-size: 16px; font-weight: 600; color: #292525;";

                line.appendChild(left);
                line.appendChild(create("span", "", HISTORIQUE.missedLine(item.misses, item.tries)));
                line.lastChild.style.cssText = "font-size: 13px; color: #82766F;";

                missedCard.appendChild(line);
            });

            page.appendChild(missedCard);
        }

        // --- Moyenne par exercice ---
        const modes = averageByMode(data);
        const modesCard = card(HISTORIQUE.modesTitle);

        modes.forEach(item => {
            const line = create("div");
            line.style.cssText = "display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 8px 0; border-bottom: 1px solid #F0EAE3; font-size: 15px;";
            line.appendChild(create("span", "", HISTORIQUE.modeNames[item.mode] || item.mode || "?"));
            line.appendChild(create("span", "", HISTORIQUE.modeLine(item.percent, item.sessions)));
            line.lastChild.style.color = "#82766F";
            modesCard.appendChild(line);
        });

        page.appendChild(modesCard);

        // --- Effacer ---
        const reset = create("button", "danger-btn", HISTORIQUE.reset);
        reset.type = "button";
        reset.addEventListener("click", () => {
            if (!confirm(HISTORIQUE.confirmReset)) return;

            data = { sessions: [], words: {} };
            save();
            render();
        });
        page.appendChild(reset);
    };

    link.addEventListener("click", event => {
        event.preventDefault();
        render();            // chiffres à jour à chaque ouverture
        showPage(HISTORIQUE.pageName);
    });

    render();

    // Connexion : on charge l'historique de l'appareil et du compte
    onStateChange(() => {
        loadHistory();
        render();
    });
}

if (typeof document !== "undefined") start();
