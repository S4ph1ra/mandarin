// =====================================================
// PRONONCIATION.JS : BOUTONS 🔊 POUR ÉCOUTER LES MOTS
// =====================================================
// Fichier autonome : il ajoute tout seul un bouton 🔊
//   - sur chaque ligne du tableau de vocabulaire
//   - sur chaque résultat du traducteur
// Il utilise la voix chinoise de l'appareil (aucun service externe).

const PRONONCIATION = {
    language: "zh-CN",        // langue de la voix
    rate: 0.8,                // vitesse (1 = normal, 0.7 = lent pour apprendre)
    icon: "🔊",
    tooltip: "Écouter",
    noVoice: "Cet appareil n'a pas de voix chinoise. Installe-en une dans les réglages de la tablette (langue ou synthèse vocale), puis réessaie.",
    notSupported: "La lecture à voix haute n'est pas disponible sur ce navigateur."
};

// ---------- LECTURE À VOIX HAUTE ----------

function findChineseVoice() {
    return speechSynthesis.getVoices().find(voice =>
        voice.lang.replace("_", "-").toLowerCase().startsWith("zh")
    );
}

function speak(text) {
    if (!("speechSynthesis" in window)) {
        alert(PRONONCIATION.notSupported);
        return;
    }

    // Nettoyer : "同学(们)" → "同学们", "忘/记" → "忘，记"
    const clean = text
        .replace(/[()（）]/g, "")
        .replace(/[\/／]/g, "，")
        .trim();

    if (!clean) return;

    const voices = speechSynthesis.getVoices();
    const voice = findChineseVoice();

    // Les voix sont chargées : si aucune n'est chinoise, on prévient
    if (voices.length > 0 && !voice) {
        alert(PRONONCIATION.noVoice);
        return;
    }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = PRONONCIATION.language;
    // La vitesse peut être réglée dans la page Paramètres
    const savedRate = window.MANDARIN_SETTINGS && window.MANDARIN_SETTINGS.speechRate;
    utterance.rate = savedRate || PRONONCIATION.rate;
    if (voice) utterance.voice = voice;

    speechSynthesis.speak(utterance);
}

// ---------- AJOUT DES BOUTONS ----------

function createButton(getText) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "row-btn speak-btn";
    button.textContent = PRONONCIATION.icon;
    button.title = PRONONCIATION.tooltip;

    button.addEventListener("click", event => {
        event.stopPropagation();
        speak(getText());
    });

    return button;
}

function addButtons() {
    // Tableau de vocabulaire : le mot chinois est dans la première colonne
    document.querySelectorAll("#vocabulary-table-body tr").forEach(row => {
        const actions = row.lastElementChild;
        const first = row.firstElementChild;

        if (!actions || !first || row.children.length < 2) return;
        if (actions.querySelector(".speak-btn")) return;

        actions.insertBefore(createButton(() => first.textContent), actions.firstChild);
    });

    // Résultats du traducteur : le chinois est le premier paragraphe
    document.querySelectorAll("#translator-results .hanzi-card").forEach(card => {
        const chinese = card.firstElementChild;

        if (!chinese || card.querySelector(".speak-btn")) return;

        chinese.after(createButton(() => chinese.textContent));
    });
}

// Surveiller la page : les lignes sont recréées à chaque modification
function start() {
    const app = document.getElementById("app");
    if (!app) return;

    let scheduled = false;

    new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            addButtons();
        });
    }).observe(app, { childList: true, subtree: true });

    addButtons();

    // Sur certains navigateurs, la liste des voix arrive après le chargement
    if ("speechSynthesis" in window) {
        speechSynthesis.getVoices();
    }
}

start();
