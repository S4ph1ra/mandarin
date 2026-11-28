// =====================================================
// FENETRE-FLOTTANTE.JS : FENÊTRES ÉTROITES + RÉVISION ÉCLAIR FLOTTANTE
// =====================================================
// Fichier autonome, deux ajouts :
//   1. le site s'adapte aux fenêtres étroites (Slide Over, écran partagé,
//      téléphone) : marges réduites, boutons plus grands
//   2. un bouton flottant ⚡ qui ouvre une révision éclair PAR-DESSUS
//      n'importe quelle page du site (elle reste ouverte quand tu changes de page)
// Les textes et réglages sont juste en dessous.

import { state, onStateChange } from "./state.js";

// revisions.js est chargé à part : si ce fichier n'est pas à jour, le bouton
// apparaît quand même et la fenêtre t'explique quoi faire.
let revisionsModule = null;

import("./revisions.js")
    .then(module => { revisionsModule = module; })
    .catch(error => console.warn("revisions.js indisponible :", error));

// ---------- RÉGLAGES ET TEXTES (modifie ici) ----------
const FLOTTANT = {
    narrowLayout: true,          // adapter le site aux fenêtres étroites
    breakpoint: 600,             // largeur (pixels) en dessous de laquelle on adapte

    quickButton: true,           // bouton flottant (réglable aussi dans Paramètres)
    icon: "⚡",
    buttonLabel: "Révision éclair",
    title: "⚡ Révision éclair",

    questions: 5,                // nombre de questions
    direction: "mixed",          // "zh-fr", "fr-zh" ou "mixed"
    showPinyin: true,            // pinyin en aide

    askZhFr: "Que veut dire ce mot ?",
    askFrZh: "Quel est le mot chinois ?",
    questionWord: "Question",
    next: "Suivant →",
    seeResult: "Voir le résultat",
    good: "✅ Bonne réponse !",
    bad: "❌ Raté. Bonne réponse : ",
    noWords: "Ajoute au moins 4 mots à ton vocabulaire pour utiliser la révision éclair.",
    outdated: "La révision éclair a besoin de la dernière version du fichier revisions.js. Remplace-le sur GitHub, puis recharge le site.",
    resultTitle: "Résultat",
    missedTitle: "À revoir",
    again: "⚡ Encore",
    close: "Fermer",
    closeLabel: "Fermer la révision éclair"
};

// ---------- 1. FENÊTRES ÉTROITES ----------

function narrowStyles() {
    const bp = FLOTTANT.breakpoint;

    return (
        "@media (max-width: " + bp + "px) {" +
        "  html body #app { padding: 76px 12px 24px; }" +
        "  .page-header { padding: 18px 16px; margin-bottom: 18px; }" +
        "  .header-decoration { display: none; }" +
        "  .page-header h1, .header-text h1 { font-size: 24px; }" +
        "  .section-heading h2 { font-size: 19px; }" +
        "  .dashboard-card { min-height: 0; padding: 18px; }" +
        "  .progress-card { padding: 18px; }" +
        "  .add-category-btn, .secondary-btn, .danger-btn { min-height: 46px; }" +
        "  .nav-item { padding: 15px; }" +
        "  .icon-option { padding: 14px 8px; }" +
        "  .modal-overlay { align-items: flex-start; overflow-y: auto; padding: 10px; }" +
        "  .modal-box { margin: auto; padding: 18px; }" +
        "  .note-editor { padding: 16px; }" +
        "  .note-content-input, .rich-editor { min-height: 260px; }" +
        "  .rich-btn { min-width: 42px; height: 42px; }" +
        "  .writing-controls { gap: 10px; }" +
        "  .category-detail-header h2 { font-size: 20px; }" +
        // Évite que l'iPad ou le téléphone zoome tout seul quand on touche un champ
        "  input, select, textarea { font-size: 16px !important; }" +
        "}" +
        "@media (max-width: 380px) {" +
        "  html body #app { padding: 72px 8px 20px; }" +
        "  .hanzi-card { padding: 12px; }" +
        "  .dashboard-card { padding: 14px; }" +
        "  .login-box { padding: 24px 18px; }" +
        "}"
    );
}

// ---------- 2. RÉVISION ÉCLAIR FLOTTANTE ----------

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

function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function optionText(word, direction) {
    return direction === "zh-fr" ? word.translation : word.chinese;
}

function optionLabel(word, direction) {
    if (direction === "zh-fr") return word.translation;
    return FLOTTANT.showPinyin && word.pinyin ? word.chinese + "   " + word.pinyin : word.chinese;
}

// Une question à choix multiples (4 réponses)
export function buildQuestion(word, all) {
    const direction = FLOTTANT.direction === "mixed"
        ? (Math.random() < 0.5 ? "zh-fr" : "fr-zh")
        : FLOTTANT.direction;

    const correctText = optionText(word, direction);
    const seen = {};
    seen[correctText] = true;

    const options = [{ text: correctText, label: optionLabel(word, direction), correct: true }];

    shuffle(all).forEach(other => {
        const text = optionText(other, direction);
        if (options.length >= 4 || seen[text] || !text) return;

        seen[text] = true;
        options.push({ text: text, label: optionLabel(other, direction), correct: false });
    });

    return { word: word, direction: direction, options: shuffle(options) };
}

function answerText(question) {
    return question.direction === "zh-fr"
        ? question.word.translation
        : question.word.chinese + (question.word.pinyin ? " (" + question.word.pinyin + ")" : "");
}

function promptText(question) {
    return question.direction === "zh-fr"
        ? question.word.chinese + (question.word.pinyin ? " (" + question.word.pinyin + ")" : "")
        : question.word.translation;
}

function start() {
    // La page Paramètres lit cet état pour t'expliquer ce qui se passe
    window.MANDARIN_QUICK_STATE = "starting";

    // Styles du fichier
    const style = document.createElement("style");
    style.textContent =
        (FLOTTANT.narrowLayout ? narrowStyles() : "") +
        "#quick-fab { display: none; position: fixed; right: 20px; bottom: 20px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); " +
        "width: 56px; height: 56px; border: none; border-radius: 50%; background: var(--primary-red); color: #FFFFFF; " +
        "font-size: 26px; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); z-index: 1300; }" +
        "#quick-fab.show { display: block; }" +
        "#quick-panel { display: none; position: fixed; right: 20px; bottom: 88px; bottom: calc(88px + env(safe-area-inset-bottom, 0px)); " +
        "width: 360px; max-width: calc(100vw - 24px); max-height: 72vh; overflow-y: auto; background: #FFFFFF; " +
        "border: 1px solid #DED5CE; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25); padding: 16px; z-index: 1300; }" +
        "#quick-panel.show { display: block; }" +
        "@media (max-width: 480px) { #quick-fab { width: 50px; height: 50px; right: 14px; } " +
        "#quick-panel { right: 12px; left: 12px; width: auto; max-width: none; bottom: 80px; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); } }";
    document.head.appendChild(style);

    if (!FLOTTANT.quickButton) {
        window.MANDARIN_QUICK_STATE = "disabled-in-file";
        return;
    }

    // Bouton flottant et fenêtre
    const fab = create("button", "", FLOTTANT.icon);
    fab.id = "quick-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", FLOTTANT.buttonLabel);
    document.body.appendChild(fab);

    const panel = create("div");
    panel.id = "quick-panel";
    document.body.appendChild(panel);

    let enabledInSettings = true;   // réglage de la page Paramètres
    let quick = null;               // révision en cours

    function isOpen() {
        return panel.classList.contains("show");
    }

    function openPanel() {
        panel.classList.add("show");
        if (!quick) startQuick();
        else render();
    }

    function closePanel() {
        panel.classList.remove("show");
    }

    function updateVisibility() {
        const visible = enabledInSettings && !!state.user;
        fab.classList.toggle("show", visible);
        if (!visible) closePanel();
    }

    // ----- contenu de la fenêtre -----

    function header() {
        const top = create("div");
        top.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px;";

        top.appendChild(create("strong", "", FLOTTANT.title));

        const close = create("button", "", "✕");
        close.type = "button";
        close.setAttribute("aria-label", FLOTTANT.closeLabel);
        close.style.cssText = "background: none; border: none; font-size: 20px; color: #82766F; cursor: pointer; padding: 4px 8px;";
        close.addEventListener("click", closePanel);
        top.appendChild(close);

        return top;
    }

    function button(label, className, onClick) {
        const element = create("button", className, label);
        element.type = "button";
        element.addEventListener("click", onClick);
        return element;
    }

    function startQuick() {
        if (!revisionsModule || typeof revisionsModule.quickSession !== "function") {
            quick = { error: FLOTTANT.outdated };
            render();
            return;
        }

        const data = revisionsModule.quickSession(FLOTTANT.questions);

        if (data.all.length < 4) {
            quick = { error: FLOTTANT.noWords };
            render();
            return;
        }

        quick = {
            all: data.all,
            questions: data.pool.map(word => buildQuestion(word, data.all)),
            index: 0,
            correct: 0,
            missed: []
        };

        render();
    }

    function render() {
        panel.innerHTML = "";
        panel.appendChild(header());

        if (quick.error) {
            const message = create("p", "", quick.error);
            message.style.cssText = "margin: 0; font-size: 14px; color: #82766F;";
            panel.appendChild(message);
            quick = null;     // on réessaiera à la prochaine ouverture
            return;
        }

        if (quick.index >= quick.questions.length) {
            renderResult();
            return;
        }

        renderQuestion();
    }

    function renderQuestion() {
        const question = quick.questions[quick.index];
        const total = quick.questions.length;

        const progress = create("p", "", FLOTTANT.questionWord + " " + (quick.index + 1) + " / " + total);
        progress.style.cssText = "margin: 0 0 10px; font-size: 12px; color: #82766F;";
        panel.appendChild(progress);

        const ask = create("p", "", question.direction === "zh-fr" ? FLOTTANT.askZhFr : FLOTTANT.askFrZh);
        ask.style.cssText = "margin: 0 0 6px; font-size: 12px; color: #82766F;";
        panel.appendChild(ask);

        const main = create("p", "", question.direction === "zh-fr" ? question.word.chinese : question.word.translation);
        main.style.cssText = "margin: 0; font-weight: 600; color: var(--dark-red); font-size: " +
            (question.direction === "zh-fr" ? "40px" : "24px") + ";";
        panel.appendChild(main);

        if (FLOTTANT.showPinyin && question.direction === "zh-fr" && question.word.pinyin) {
            const hint = create("p", "", question.word.pinyin);
            hint.style.cssText = "margin: 4px 0 0; font-size: 14px; color: #82766F;";
            panel.appendChild(hint);
        }

        const list = create("div");
        list.style.cssText = "display: grid; gap: 8px; margin-top: 14px;";
        panel.appendChild(list);

        const feedback = create("p", "");
        feedback.style.cssText = "margin: 12px 0 0; font-weight: 600; font-size: 14px;";
        panel.appendChild(feedback);

        const entries = [];
        let answered = false;

        question.options.forEach(option => {
            const choice = create("button", "secondary-btn", option.label);
            choice.type = "button";
            choice.style.cssText = "width: 100%; text-align: left; padding: 12px 14px; font-size: 15px;";
            entries.push({ button: choice, option: option });
            list.appendChild(choice);

            choice.addEventListener("click", () => {
                if (answered) return;
                answered = true;

                entries.forEach(entry => {
                    entry.button.disabled = true;

                    if (entry.option.correct) {
                        entry.button.style.background = "#DFF0E5";
                        entry.button.style.color = "#1E6B3E";
                    }
                });

                if (!option.correct) {
                    choice.style.background = "#F8D3D6";
                    choice.style.color = "#8B1E2B";
                    quick.missed.push({ question: question, given: option.text });
                } else {
                    quick.correct++;
                }

                // Les erreurs sont retenues, comme dans la page Révisions
                if (revisionsModule && typeof revisionsModule.updateStats === "function") {
                    revisionsModule.updateStats(question.word, option.correct);
                }

                feedback.textContent = option.correct ? FLOTTANT.good : FLOTTANT.bad + answerText(question);
                feedback.style.color = option.correct ? "#1E6B3E" : "#8B1E2B";

                const last = quick.index + 1 >= total;
                const next = button(last ? FLOTTANT.seeResult : FLOTTANT.next, "add-category-btn", () => {
                    quick.index++;
                    render();
                });
                next.style.marginTop = "12px";
                panel.appendChild(next);
            });
        });
    }

    function renderResult() {
        const total = quick.questions.length;

        // Une seule fois par série : on l'ajoute à l'historique (page « Progrès »)
        if (!quick.logged) {
            quick.logged = true;

            if (revisionsModule && typeof revisionsModule.logSession === "function") {
                revisionsModule.logSession({ mode: "eclair", correct: quick.correct, total: total });
            }
        }

        const title = create("p", "", FLOTTANT.resultTitle);
        title.style.cssText = "margin: 0 0 4px; font-size: 12px; color: #82766F;";
        panel.appendChild(title);

        const score = create("p", "", quick.correct + " / " + total);
        score.style.cssText = "margin: 0 0 12px; font-size: 36px; font-weight: 700; color: var(--primary-red);";
        panel.appendChild(score);

        if (quick.missed.length > 0) {
            const missedTitle = create("p", "", FLOTTANT.missedTitle);
            missedTitle.style.cssText = "margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--dark-red);";
            panel.appendChild(missedTitle);

            quick.missed.forEach(item => {
                const row = create("div", "", promptText(item.question) + "  →  " + answerText(item.question));
                row.style.cssText = "padding: 8px 10px; margin-bottom: 6px; background: #F8F5F0; border-radius: 8px; font-size: 14px;";
                panel.appendChild(row);
            });
        }

        const actions = create("div");
        actions.style.cssText = "display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;";
        actions.appendChild(button(FLOTTANT.again, "add-category-btn", startQuick));
        actions.appendChild(button(FLOTTANT.close, "secondary-btn", () => { quick = null; closePanel(); }));
        panel.appendChild(actions);
    }

    // ----- branchements -----

    fab.addEventListener("click", () => {
        if (isOpen()) closePanel(); else openPanel();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && isOpen()) closePanel();
    });

    // Le bouton n'apparaît qu'une fois connecté
    onStateChange(updateVisibility);

    // Réglage « Bouton de révision éclair » de la page Paramètres
    function applySettings(settings) {
        if (!settings) return;
        enabledInSettings = settings.quickButton !== false;
        updateVisibility();
    }

    window.addEventListener("mandarin-settings", event => applySettings(event.detail));

    // Ouverture à la demande (bouton « Essayer maintenant » de la page Paramètres)
    window.addEventListener("mandarin-open-quick", () => openPanel());

    applySettings(window.MANDARIN_SETTINGS);
    updateVisibility();
    window.MANDARIN_QUICK_STATE = "ready";
}

if (typeof document !== "undefined") start();
