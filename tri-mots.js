// =====================================================
// TRI-MOTS.JS : TRIER, FILTRER ET CHERCHER DANS UNE CATÉGORIE
// =====================================================
// Fichier autonome : il ajoute une barre d'outils au-dessus du tableau
// de vocabulaire (tri, niveau HSK, recherche, mélange).
// Il réorganise seulement l'affichage : tes mots ne sont pas modifiés.

// ---------- RÉGLAGES ET TEXTES (modifie ici) ----------
const TRI = {
    storageKey: "mandarin-tri-mots",     // mémorise ton dernier choix de tri

    // Niveaux proposés dans le filtre (mets les mêmes que dans config.js)
    hskLevels: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSK 7-9"],

    sortLabel: "Trier par",
    hskLabel: "Niveau HSK",
    searchLabel: "Rechercher",
    searchPlaceholder: "Chinois, pinyin ou traduction...",
    allLevels: "Tous les niveaux",
    noLevel: "Sans niveau",
    shuffleTitle: "Mélanger",
    countText: (shown, total) => shown + " / " + total + " mots affichés",

    // Modes de tri : id (ne pas changer) et texte affiché (modifiable)
    sorts: [
        { id: "order", label: "Ordre d'ajout (anciens d'abord)" },
        { id: "recent", label: "Plus récents d'abord" },
        { id: "pinyin", label: "Pinyin (A → Z)" },
        { id: "pinyin-desc", label: "Pinyin (Z → A)" },
        { id: "translation", label: "Traduction (A → Z)" },
        { id: "translation-desc", label: "Traduction (Z → A)" },
        { id: "hsk", label: "Niveau HSK (croissant)" },
        { id: "hsk-desc", label: "Niveau HSK (décroissant)" },
        { id: "random", label: "Aléatoire" }
    ]
};

// Colonnes du tableau
const COLUMN = { chinese: 0, pinyin: 1, translation: 2, hsk: 3 };

// ---------- OUTILS ----------

function normalize(text) {
    return (text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function cellText(row, column) {
    return row.children[column] ? row.children[column].textContent : "";
}

// "HSK 3" → 3, "HSK 7-9" → 7, sans niveau → 99
function hskRank(row) {
    const match = cellText(row, COLUMN.hsk).match(/\d+/);
    return match ? parseInt(match[0], 10) : 99;
}

function isDataRow(row) {
    return row.children.length >= 5;
}

function compareText(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
}

function loadSavedSort() {
    try {
        const saved = localStorage.getItem(TRI.storageKey);
        return TRI.sorts.some(sort => sort.id === saved) ? saved : "order";
    } catch (error) {
        return "order";
    }
}

function saveSort(id) {
    try {
        localStorage.setItem(TRI.storageKey, id);
    } catch (error) {
        // pas grave : le choix ne sera pas mémorisé
    }
}

// ---------- AFFICHAGE ----------

function start() {
    const tbody = document.getElementById("vocabulary-table-body");
    const table = document.querySelector(".vocabulary-table-container");
    if (!tbody || !table) return;

    // Barre d'outils
    const bar = document.createElement("div");
    bar.id = "word-tools";
    bar.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 8px;">
            <div class="writing-field" style="min-width: 190px;">
                <label for="tri-sort"></label>
                <select id="tri-sort"></select>
            </div>
            <div class="writing-field" style="min-width: 150px;">
                <label for="tri-hsk"></label>
                <select id="tri-hsk"></select>
            </div>
            <div class="writing-field" style="flex: 2; min-width: 200px;">
                <label for="tri-search"></label>
                <input type="text" id="tri-search" class="note-title-input" style="margin: 0; padding: 12px; font-size: 15px; font-weight: 400;" autocomplete="off">
            </div>
            <button type="button" id="tri-shuffle" class="secondary-btn" style="height: 46px;">🔀</button>
        </div>
        <p id="tri-count" style="margin: 0 0 12px; font-size: 13px; color: #82766F;"></p>
    `;

    bar.querySelector('label[for="tri-sort"]').textContent = TRI.sortLabel;
    bar.querySelector('label[for="tri-hsk"]').textContent = TRI.hskLabel;
    bar.querySelector('label[for="tri-search"]').textContent = TRI.searchLabel;

    const sortSelect = bar.querySelector("#tri-sort");
    const hskSelect = bar.querySelector("#tri-hsk");
    const searchInput = bar.querySelector("#tri-search");
    const shuffleButton = bar.querySelector("#tri-shuffle");
    const countText = bar.querySelector("#tri-count");

    searchInput.placeholder = TRI.searchPlaceholder;
    shuffleButton.title = TRI.shuffleTitle;

    TRI.sorts.forEach(sort => sortSelect.appendChild(new Option(sort.label, sort.id)));
    sortSelect.value = loadSavedSort();

    hskSelect.appendChild(new Option(TRI.allLevels, ""));
    TRI.hskLevels.forEach(level => hskSelect.appendChild(new Option(level, level)));
    hskSelect.appendChild(new Option(TRI.noLevel, "none"));

    table.before(bar);

    // ----- Application du tri et des filtres -----

    function applyView() {
        const rows = Array.prototype.slice.call(tbody.children).filter(isDataRow);

        // Mémoriser l'ordre d'origine (= ordre d'ajout) et un nombre au hasard
        rows.forEach((row, index) => {
            if (row.dataset.order === undefined) row.dataset.order = String(index);
            if (row.dataset.rand === undefined) row.dataset.rand = String(Math.random());
        });

        const mode = sortSelect.value;

        const sorted = rows.slice().sort((a, b) => {
            const orderA = Number(a.dataset.order);
            const orderB = Number(b.dataset.order);

            switch (mode) {
                case "recent": return orderB - orderA;
                case "pinyin": return compareText(normalize(cellText(a, COLUMN.pinyin)), normalize(cellText(b, COLUMN.pinyin)));
                case "pinyin-desc": return compareText(normalize(cellText(b, COLUMN.pinyin)), normalize(cellText(a, COLUMN.pinyin)));
                case "translation": return compareText(normalize(cellText(a, COLUMN.translation)), normalize(cellText(b, COLUMN.translation)));
                case "translation-desc": return compareText(normalize(cellText(b, COLUMN.translation)), normalize(cellText(a, COLUMN.translation)));
                case "hsk": return (hskRank(a) - hskRank(b)) || (orderA - orderB);
                case "hsk-desc": return (hskRank(b) - hskRank(a)) || (orderA - orderB);
                case "random": return Number(a.dataset.rand) - Number(b.dataset.rand);
                default: return orderA - orderB;
            }
        });

        // Ne déplacer les lignes que si l'ordre change (évite les boucles)
        const changed = sorted.some((row, index) => row !== rows[index]);

        if (changed) {
            const fragment = document.createDocumentFragment();
            sorted.forEach(row => fragment.appendChild(row));
            tbody.appendChild(fragment);
        }

        // Filtres : niveau HSK + recherche
        const query = normalize(searchInput.value);
        const level = hskSelect.value;
        let shown = 0;

        rows.forEach(row => {
            const rowLevel = cellText(row, COLUMN.hsk).trim();
            let visible = true;

            if (level === "none") visible = TRI.hskLevels.indexOf(rowLevel) === -1;
            else if (level) visible = rowLevel === level;

            if (visible && query) {
                const text = normalize(
                    cellText(row, COLUMN.chinese) + " " +
                    cellText(row, COLUMN.pinyin) + " " +
                    cellText(row, COLUMN.translation)
                );
                visible = text.indexOf(query) !== -1;
            }

            row.style.display = visible ? "" : "none";
            if (visible) shown++;
        });

        countText.textContent = rows.length > 0 && (query || level)
            ? TRI.countText(shown, rows.length)
            : "";
    }

    sortSelect.addEventListener("change", () => {
        saveSort(sortSelect.value);
        applyView();
    });
    hskSelect.addEventListener("change", applyView);
    searchInput.addEventListener("input", applyView);

    // Bouton "mélanger" : nouveau hasard + tri aléatoire
    shuffleButton.addEventListener("click", () => {
        Array.prototype.slice.call(tbody.children).filter(isDataRow).forEach(row => {
            row.dataset.rand = String(Math.random());
        });

        sortSelect.value = "random";
        saveSort("random");
        applyView();
    });

    // Le tableau est recréé à chaque ouverture ou modification : on réapplique
    let scheduled = false;

    new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;

            try {
                applyView();
            } catch (error) {
                console.error("Tri des mots :", error);
            }
        });
    }).observe(tbody, { childList: true });

    applyView();
}

try {
    start();
} catch (error) {
    console.error("Tri des mots :", error);
}
