// =====================================================
// TONS-COULEUR.JS : PINYIN EN COULEUR SELON LE TON
// =====================================================
// Fichier autonome : il colore tout seul le pinyin
//   - dans le tableau de vocabulaire
//   - dans les résultats du traducteur
// Chaque syllabe prend la couleur de son ton.

const TONS = {
    enabled: true,

    // Couleurs des tons (modifie-les comme tu veux)
    colors: {
        1: "#C0392B",     // 1er ton (plat ¯)      : rouge
        2: "#D68910",     // 2e ton (montant ´)    : orange
        3: "#1E8449",     // 3e ton (descendant-montant ˇ) : vert
        4: "#2563A8",     // 4e ton (descendant `) : bleu
        0: "#7F8C8D"      // ton neutre (sans accent) : gris
    },

    showLegend: true,     // petite légende au-dessus du tableau
    legendLabels: {
        1: "1er ton",
        2: "2e ton",
        3: "3e ton",
        4: "4e ton",
        0: "ton neutre"
    }
};

// ---------- DÉCOUPAGE EN SYLLABES ----------

const VOWELS = "aeiouvüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ";
const CONSONANTS = "bcdfghjklmnpqrstwxyz";

// Une syllabe = consonnes + voyelles (+ n / ng / r s'ils ne sont pas suivis d'une voyelle).
// Tout le reste (espaces, parenthèses, "/"...) est laissé tel quel.
const SYLLABLE = new RegExp(
    "[" + CONSONANTS + "]*[" + VOWELS + "]+(?:ng|n|r)?(?![" + VOWELS + "])|[\\s\\S]",
    "giu"
);

const HAS_VOWEL = new RegExp("[" + VOWELS + "]", "iu");

const TONE_MARKS = {
    1: "āēīōūǖ",
    2: "áéíóúǘ",
    3: "ǎěǐǒǔǚ",
    4: "àèìòùǜ"
};

// Renvoie 1-4 (ton marqué), 0 (neutre) ou null (ce n'est pas une syllabe)
function detectTone(syllable) {
    if (!HAS_VOWEL.test(syllable)) return null;

    const lower = syllable.toLowerCase();

    for (const tone of [1, 2, 3, 4]) {
        if ([...TONE_MARKS[tone]].some(mark => lower.includes(mark))) return tone;
    }

    return 0;
}

// "Xuéshēng" → [{ text: "Xué", tone: 2 }, { text: "shēng", tone: 1 }]
export function splitSyllables(pinyin) {
    const parts = [];

    for (const match of pinyin.normalize("NFC").matchAll(SYLLABLE)) {
        parts.push({ text: match[0], tone: detectTone(match[0]) });
    }

    return parts;
}

// ---------- AFFICHAGE ----------

function colorize(element) {
    if (!element || element.dataset.tones) return;

    const text = element.textContent;
    if (!text.trim()) return;

    element.dataset.tones = "done";
    element.textContent = "";

    splitSyllables(text).forEach(part => {
        if (part.tone === null) {
            element.appendChild(document.createTextNode(part.text));
            return;
        }

        const span = document.createElement("span");
        span.textContent = part.text;
        span.style.color = TONS.colors[part.tone];
        element.appendChild(span);
    });
}

function colorizeAll() {
    // Tableau de vocabulaire : le pinyin est dans la 2e colonne
    document.querySelectorAll("#vocabulary-table-body tr").forEach(row => {
        if (row.children.length > 2) colorize(row.children[1]);
    });

    // Résultats du traducteur : le pinyin est le 2e paragraphe de la carte
    document.querySelectorAll("#translator-results .hanzi-card").forEach(card => {
        colorize(card.querySelectorAll("p")[1]);
    });
}

function addLegend() {
    const table = document.querySelector(".vocabulary-table-container");
    if (!table || document.getElementById("tones-legend")) return;

    const legend = document.createElement("div");
    legend.id = "tones-legend";
    legend.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0 0 12px; font-size: 13px;";

    [1, 2, 3, 4, 0].forEach(tone => {
        const item = document.createElement("span");
        item.textContent = "● " + TONS.legendLabels[tone];
        item.style.color = TONS.colors[tone];
        legend.appendChild(item);
    });

    table.before(legend);
}

function start() {
    if (!TONS.enabled) return;

    const app = document.getElementById("app");
    if (!app) return;

    if (TONS.showLegend) addLegend();

    let scheduled = false;

    // Les lignes du tableau sont recréées à chaque modification : on surveille
    new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            colorizeAll();
        });
    }).observe(app, { childList: true, subtree: true });

    colorizeAll();
}

if (typeof document !== "undefined") start();
