// =====================================================
// REVISIONS.JS : RÉVISIONS GÉNÉRÉES À PARTIR DE TON VOCABULAIRE
// =====================================================
// Trois types d'exercices, créés tout seuls :
//   - Flashcards : carte à retourner, tu dis si tu savais
//   - QCM : 4 choix possibles
//   - Évaluation notée : QCM + réponses écrites, note sur 20
// Les textes et réglages sont juste en dessous.

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

    modes: [
        { id: "flashcards", label: "Flashcards (carte à retourner)" },
        { id: "characters", label: "Sinogrammes seuls (sans pinyin ni traduction)" },
        { id: "qcm", label: "QCM (choix multiples)" },
        { id: "eval", label: "Évaluation notée (sur 20)" }
    ],

    directions: [
        { id: "zh-fr", label: "Chinois → Français" },
        { id: "fr-zh", label: "Français → Chinois" },
        { id: "mixed", label: "Mixte" }
    ],

    counts: [5, 10, 20, 0],          // 0 = tous les mots

    noWords: "Ajoute d'abord des mots dans ton vocabulaire pour pouvoir réviser.",
    needFour: "Il faut au moins 4 mots dans ton vocabulaire pour faire un QCM ou une évaluation.",

    questionWord: "Question",
    askZhFr: "Que veut dire ce mot ?",
    askFrZh: "Quel est le mot chinois ?",
    flip: "Retourner la carte",
    knew: "✅ Je savais",
    didntKnow: "❌ À revoir",
    typePlaceholder: "Écris la traduction en français...",
    validate: "Valider",
    next: "Suivant →",
    seeResult: "Voir le résultat",
    good: "✅ Bonne réponse !",
    bad: "❌ Raté. Bonne réponse : ",

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

// ---------- DONNÉES ----------

// Les QCM et l'évaluation ont besoin de mauvaises réponses à proposer
function needsOptions(mode) {
    return mode === "qcm" || mode === "eval";
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
                categoryId: category.id
            });
        });
    });

    return list;
}

function optionText(word, direction) {
    return direction === "zh-fr" ? word.translation : word.chinese;
}

function optionLabel(word, direction, showPinyin) {
    if (direction === "zh-fr") return word.translation;
    return showPinyin && word.pinyin ? word.chinese + "   " + word.pinyin : word.chinese;
}

function buildOptions(word, all, direction, showPinyin) {
    const correctText = optionText(word, direction);
    const seen = {};
    seen[correctText] = true;

    const options = [{ text: correctText, label: optionLabel(word, direction, showPinyin), correct: true }];

    shuffle(all).forEach(other => {
        const text = optionText(other, direction);
        if (options.length >= 4 || seen[text]) return;

        seen[text] = true;
        options.push({ text: text, label: optionLabel(other, direction, showPinyin), correct: false });
    });

    return shuffle(options);
}

function buildQuestions(pool, all, settings, wantedCount) {
    const picked = shuffle(pool);
    const count = wantedCount > 0 ? Math.min(wantedCount, picked.length) : picked.length;

    return picked.slice(0, count).map(word => {
        // Sinogrammes seuls : le caractère, sans aucune aide, puis la réponse
        if (settings.mode === "characters") {
            return { word: word, direction: "zh-fr", type: "flashcards", options: null, charactersOnly: true };
        }

        const direction = settings.direction === "mixed"
            ? (Math.random() < 0.5 ? "zh-fr" : "fr-zh")
            : settings.direction;

        let type = settings.mode;

        // Évaluation : un mélange de QCM et de réponses écrites (français seulement)
        if (settings.mode === "eval") {
            type = direction === "zh-fr" && Math.random() < 0.5 ? "typed" : "qcm";
        }

        return {
            word: word,
            direction: direction,
            type: type,
            options: type === "qcm" ? buildOptions(word, all, direction, settings.pinyin) : null
        };
    });
}

// ---------- ÉTAT ----------

let container = null;
let view = "setup";
let session = null;

const settings = { source: "all", mode: "qcm", direction: "zh-fr", count: 10, pinyin: true };

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

function promptBlock(question, showPinyin) {
    const block = el("div");
    block.style.cssText = "margin: 18px 0;";

    if (question.charactersOnly) {
        const only = el("p", "", question.word.chinese);
        only.style.cssText = "margin: 0; font-size: 72px; font-weight: 600; color: var(--dark-red);";
        block.appendChild(only);
        return block;
    }

    const ask = el("p", "", question.direction === "zh-fr" ? REVISIONS.askZhFr : REVISIONS.askFrZh);
    ask.style.cssText = "margin: 0 0 10px; font-size: 13px; color: #82766F;";
    block.appendChild(ask);

    const main = el("p", "", question.direction === "zh-fr" ? question.word.chinese : question.word.translation);
    main.style.cssText = question.direction === "zh-fr"
        ? "margin: 0; font-size: 48px; font-weight: 600; color: var(--dark-red);"
        : "margin: 0; font-size: 26px; font-weight: 600; color: var(--dark-red);";
    block.appendChild(main);

    if (showPinyin && question.direction === "zh-fr" && question.word.pinyin) {
        const hint = el("p", "", question.word.pinyin);
        hint.style.cssText = "margin: 6px 0 0; font-size: 16px; color: #82766F;";
        block.appendChild(hint);
    }

    return block;
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

// ---------- ÉCRAN 1 : RÉGLAGES ----------

function renderSetup() {
    view = "setup";
    container.innerHTML = "";
    container.appendChild(heading(REVISIONS.setupTitle));

    const words = allWords();

    // Catégories qui contiennent des mots
    const sourceOptions = [{ value: "all", label: REVISIONS.allVocabulary }];
    state.categories.forEach(category => {
        if (category.words.length > 0) {
            sourceOptions.push({ value: category.id, label: category.icon + " " + category.name });
        }
    });

    if (!sourceOptions.some(option => option.value === settings.source)) settings.source = "all";

    const grid = el("div");
    grid.style.cssText = "display: grid; gap: 14px; margin-bottom: 20px;";

    grid.appendChild(field(REVISIONS.sourceLabel, selectOf(sourceOptions, settings.source, value => { settings.source = value; })));

    grid.appendChild(field(REVISIONS.modeLabel, selectOf(
        REVISIONS.modes.map(mode => ({ value: mode.id, label: mode.label })),
        settings.mode,
        value => { settings.mode = value; }
    )));

    grid.appendChild(field(REVISIONS.directionLabel, selectOf(
        REVISIONS.directions.map(direction => ({ value: direction.id, label: direction.label })),
        settings.direction,
        value => { settings.direction = value; }
    )));

    grid.appendChild(field(REVISIONS.countLabel, selectOf(
        REVISIONS.counts.map(count => ({ value: count, label: count === 0 ? REVISIONS.countAll : String(count) })),
        settings.count,
        value => { settings.count = parseInt(value, 10); }
    )));

    // Case à cocher : pinyin en aide
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

    container.appendChild(grid);

    const message = el("p", "hanzi-status", words.length === 0 ? REVISIONS.noWords : "");
    message.style.cssText = "max-width: none; text-align: left; margin: 0 0 12px;";
    container.appendChild(message);

    container.appendChild(primaryButton(REVISIONS.start, () => {
        const all = allWords();
        const pool = settings.source === "all" ? all : all.filter(word => word.categoryId === settings.source);

        if (pool.length === 0) {
            message.textContent = REVISIONS.noWords;
            return;
        }

        if (needsOptions(settings.mode) && all.length < 4) {
            message.textContent = REVISIONS.needFour;
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

            if (all.length === 0) {
                message.textContent = REVISIONS.noWords;
                return;
            }

            if (needsOptions(settings.mode) && all.length < 4) {
                message.textContent = REVISIONS.needFour;
                return;
            }

            startSession(all, all, 0);
        }
    ));

    container.appendChild(big);
}

// ---------- SESSION ----------

function startSession(pool, all, wantedCount) {
    session = {
        all: all,
        count: wantedCount,
        questions: buildQuestions(pool, all, settings, wantedCount),
        index: 0,
        correct: 0,
        missed: [],
        mode: settings.mode
    };

    renderQuestion();
}

function record(question, isCorrect, given) {
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

function header() {
    const total = session.questions.length;
    const wrapper = el("div");

    const label = el("p", "", REVISIONS.questionWord + " " + (session.index + 1) + " / " + total);
    label.style.cssText = "margin: 0 0 8px; font-size: 13px; color: #82766F;";

    const track = el("div");
    track.style.cssText = "height: 8px; background: #F0EAE3; border-radius: 4px; overflow: hidden;";

    const fill = el("div");
    fill.style.cssText = "height: 100%; background: var(--primary-red); width: " + (session.index / total * 100) + "%;";
    track.appendChild(fill);

    wrapper.appendChild(label);
    wrapper.appendChild(track);
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
    container.appendChild(promptBlock(question, settings.pinyin));

    if (question.type === "flashcards") renderFlashcard(question);
    else if (question.type === "typed") renderTyped(question);
    else renderChoices(question);
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

function renderChoices(question) {
    const list = el("div");
    list.style.cssText = "display: grid; gap: 10px;";
    container.appendChild(list);

    const feedback = el("p", "");
    feedback.style.cssText = "margin: 16px 0 0; font-weight: 600;";
    container.appendChild(feedback);

    const buttons = [];

    question.options.forEach(option => {
        const button = el("button", "secondary-btn", option.label);
        button.type = "button";
        button.style.cssText = "width: 100%; text-align: left; padding: 14px 16px; font-size: 16px;";
        buttons.push({ button: button, option: option });
        list.appendChild(button);

        button.addEventListener("click", () => {
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

            feedback.textContent = option.correct ? REVISIONS.good : REVISIONS.bad + answerText(question);
            feedback.style.color = option.correct ? "#1E6B3E" : "#8B1E2B";

            container.appendChild(nextButton());
        });
    });
}

function renderTyped(question) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "note-title-input";
    input.placeholder = REVISIONS.typePlaceholder;
    input.autocomplete = "off";
    input.style.cssText = "font-size: 17px; font-weight: 400; margin-bottom: 12px;";
    container.appendChild(input);

    const feedback = el("p", "");
    feedback.style.cssText = "margin: 4px 0 0; font-weight: 600;";

    let validated = false;

    const validate = primaryButton(REVISIONS.validate, () => {
        if (validated) return;
        validated = true;

        const correct = isCorrectAnswer(input.value, question.word.translation);
        record(question, correct, input.value.trim());

        input.disabled = true;
        validate.style.display = "none";

        feedback.textContent = correct ? REVISIONS.good : REVISIONS.bad + answerText(question);
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

// ---------- ÉCRAN 3 : RÉSULTAT ----------

function renderResult() {
    view = "result";
    container.innerHTML = "";
    container.appendChild(heading(REVISIONS.resultTitle));

    const total = session.questions.length;
    const percent = total > 0 ? session.correct / total * 100 : 0;

    let scoreText = session.correct + " / " + total;

    if (session.mode === "eval") {
        const note = Math.round(session.correct / total * 20 * 10) / 10;
        scoreText = REVISIONS.noteWord + String(note).replace(".", ",") + " / 20";
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
        const pool = session.questions.map(question => question.word);
        startSession(pool, session.all, session.count);
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

export function initRevisions() {
    container = document.getElementById("revisions-container");
    if (!container) return;

    // Remplace la zone vide par un panneau (même style que l'éditeur de notes)
    container.className = "note-editor";
    container.style.cssText = "text-align: left;";

    renderSetup();

    // Si le vocabulaire change pendant les réglages, on met la liste à jour
    onStateChange(() => {
        if (view === "setup") renderSetup();
    });
}
