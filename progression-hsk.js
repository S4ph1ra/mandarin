// =====================================================
// PROGRESSION-HSK.JS : PROGRESSION PAR NIVEAU HSK (ACCUEIL)
// =====================================================
// Fichier autonome : il ajoute tout seul une carte sous "Ma progression"
// sur la page d'accueil, à partir du niveau HSK choisi pour chaque mot.
// La liste des niveaux vient de config.js (HSK_LEVELS).

import { state, onStateChange } from "./state.js";
import { HSK_LEVELS } from "./config.js";

// ---------- RÉGLAGES ET TEXTES (modifie ici) ----------
const PROGRESSION_HSK = {
    title: "Progression HSK",
    description: "Le nombre de mots que tu connais pour chaque niveau.",

    wordSingular: "mot",
    wordPlural: "mots",
    noLevel: "Mots sans niveau HSK : ",
    total: "Total : ",

    // Objectif de mots par niveau (nombre de mots NOUVEAUX de chaque niveau,
    // d'après l'ancien HSK : 150, 150, 300, 600, 1300, 2500).
    // Change les nombres selon ton programme, ou retire une ligne pour
    // afficher seulement le nombre de mots, sans objectif.
    targets: {
        "HSK 1": 150,
        "HSK 2": 150,
        "HSK 3": 300,
        "HSK 4": 600,
        "HSK 5": 1300,
        "HSK 6": 2500
    }
};

// ---------- CALCUL ----------

function countByLevel() {
    const counts = {};
    HSK_LEVELS.forEach(level => { counts[level] = 0; });

    let withoutLevel = 0;
    let total = 0;

    state.categories.forEach(category => {
        category.words.forEach(word => {
            total++;

            if (word.hsk && counts[word.hsk] !== undefined) counts[word.hsk]++;
            else withoutLevel++;
        });
    });

    return { counts, withoutLevel, total };
}

function plural(count) {
    return count + " " + (count > 1 ? PROGRESSION_HSK.wordPlural : PROGRESSION_HSK.wordSingular);
}

// ---------- AFFICHAGE ----------

function buildSection() {
    const anchor = document.querySelector("#page-accueil .progress-section");
    if (!anchor) return null;

    const section = document.createElement("section");
    section.className = "progress-section";

    section.innerHTML = `
        <div class="section-heading">
            <h2></h2>
            <p></p>
        </div>

        <div class="hsk-card" style="background: #FFFFFF; border: 1px solid #EEE7E0; border-radius: 14px; padding: 22px;">
            <div class="hsk-rows" style="display: grid; gap: 14px;"></div>
            <p class="hsk-summary" style="margin: 18px 0 0; font-size: 13px; color: #817873;"></p>
        </div>
    `;

    section.querySelector("h2").textContent = PROGRESSION_HSK.title;
    section.querySelector(".section-heading p").textContent = PROGRESSION_HSK.description;

    anchor.after(section);
    return section;
}

function render(section) {
    const { counts, withoutLevel, total } = countByLevel();
    const rows = section.querySelector(".hsk-rows");
    const summary = section.querySelector(".hsk-summary");

    // Sans objectif, la barre se compare au niveau qui a le plus de mots
    const biggest = Math.max(1, ...HSK_LEVELS.map(level => counts[level]));

    rows.innerHTML = "";

    HSK_LEVELS.forEach(level => {
        const count = counts[level];
        const target = PROGRESSION_HSK.targets[level];

        const percent = target
            ? Math.min(100, (count / target) * 100)
            : (count / biggest) * 100;

        const row = document.createElement("div");
        row.style.cssText = "display: grid; grid-template-columns: 70px 1fr 95px; gap: 12px; align-items: center;";

        const label = document.createElement("span");
        label.textContent = level;
        label.style.cssText = "font-weight: 600; font-size: 14px; color: #453B37;";

        const track = document.createElement("div");
        track.style.cssText = "height: 12px; background: #F0EAE3; border-radius: 6px; overflow: hidden;";

        const fill = document.createElement("div");
        fill.style.cssText =
            "height: 100%; width: " + percent + "%; background: var(--primary-red); " +
            "border-radius: 6px; transition: width 0.4s;";
        track.appendChild(fill);

        const value = document.createElement("span");
        value.textContent = target ? count + " / " + target : plural(count);
        value.style.cssText = "font-size: 13px; color: #817873; text-align: right; white-space: nowrap;";

        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(value);
        rows.appendChild(row);
    });

    summary.textContent =
        PROGRESSION_HSK.total + plural(total) +
        (withoutLevel > 0 ? " · " + PROGRESSION_HSK.noLevel + withoutLevel : "");
}

function start() {
    const section = buildSection();
    if (!section) return;

    onStateChange(() => render(section));
    render(section);
}

start();
