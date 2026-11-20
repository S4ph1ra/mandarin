// =====================================================
// ENTRAINEMENT-TRACE.JS : TRACÉ GUIDÉ EN 3 ÉTAPES
// =====================================================
// Fichier autonome : il ajoute une page « Tracé guidé » dans le menu.
// Pour chaque caractère de ton vocabulaire :
//   1. tu regardes l'animation
//   2. tu traces par-dessus le modèle
//   3. tu traces sans modèle
// puis on te demande si tu le connais. Si tu réponds « Non », on
// recommence depuis le début jusqu'à ce que tu répondes « Oui ».
//
// Utilise la bibliothèque Hanzi Writer (déjà chargée dans index.html), qui
// vérifie chaque trait. Les textes et réglages sont juste en dessous.

import { state, onStateChange } from "./state.js";
import { showPage } from "./navigation.js";

// ---------- TEXTES ET RÉGLAGES (modifie ici) ----------
const GUIDE = {
    pageName: "trace-guide",
    menuIcon: "🎯",
    menuLabel: "Tracé guidé",

    title: "Tracé guidé",
    description: "Pour chaque caractère : 1. regarde l'animation, 2. trace par-dessus le modèle, 3. trace sans modèle. Tant que tu ne le connais pas, on recommence.",

    sourceLabel: "Vocabulaire",
    allVocabulary: "Tout mon vocabulaire",
    countLabel: "Nombre de caractères",
    countAll: "Tous",
    counts: [5, 10, 20, 0],          // 0 = tous
    start: "Commencer l'entraînement",
    noCharacters: "Ajoute d'abord des mots dans ton vocabulaire pour pouvoir t'entraîner.",
    loadError: "Impossible de charger l'outil de tracé. Vérifie ta connexion.",
    charError: "Ce caractère n'est pas disponible.",
    skipChar: "Passer ce caractère →",

    progress: (index, total) => "Caractère " + index + " / " + total,
    attempt: (number) => "Essai n° " + number,

    steps: [
        { title: "Étape 1 sur 3 : regarde", help: "Observe l'ordre et le sens des traits." },
        { title: "Étape 2 sur 3 : trace par-dessus le modèle", help: "Suis le modèle avec ton doigt, trait par trait." },
        { title: "Étape 3 sur 3 : trace sans modèle", help: "Écris le caractère de mémoire." }
    ],

    replay: "▶ Revoir l'animation",
    goStep2: "J'ai compris, étape 2 →",
    step2Done: "Bien joué ! Passe à l'étape suivante.",
    goStep3: "Étape 3 →",
    step3Done: "Terminé !",

    knowTitle: "Tu connais ce caractère ?",
    yes: "✅ Oui",
    no: "❌ Non, je recommence",

    endTitle: "Entraînement terminé 🎉",
    endText: (count) => count + (count > 1 ? " caractères appris." : " caractère appris."),
    endRetries: (count) => "Caractères à refaire au moins une fois : " + count + ".",
    again: "Recommencer",
    changeSettings: "Changer les réglages",
    quit: "Quitter",

    // Apparence et précision
    size: 250,                      // taille du caractère (pixels)
    strokeColor: "#741E29",
    outlineColor: "#E8DED5",
    drawingColor: "#A92732",
    highlightColor: "#A92732",
    animationSpeed: 1,
    delayBetweenStrokes: 300,
    leniency: 1.3,                  // tolérance du tracé (1 = strict, 1.5 = souple)
    hintAfterMissesStep2: 1,        // aide après N erreurs (étape 2)
    hintAfterMissesStep3: 3         // aide après N erreurs (étape 3)
};

// ---------- OUTILS ----------

function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

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

function hanCharacters(text) {
    return Array.from(text || "").filter(char => /[\u3400-\u9fff]/.test(char));
}

// Les caractères (sans doublon) des mots choisis, avec le mot d'où ils viennent
export function collectCharacters(categories, source) {
    const seen = {};
    const list = [];

    categories.forEach(category => {
        if (source !== "all" && category.id !== source) return;

        category.words.forEach(word => {
            hanCharacters(word.chinese).forEach(char => {
                if (seen[char]) return;
                seen[char] = true;

                list.push({
                    char: char,
                    chinese: word.chinese,
                    pinyin: word.pinyin || "",
                    translation: word.translation || ""
                });
            });
        });
    });

    return list;
}

// ---------- PAGE ----------

function start() {
    const nav = document.querySelector(".sidebar-nav");
    const app = document.getElementById("app");
    if (!nav || !app) return;

    // Lien dans le menu (après « Tracé libre » ou « Écriture » si possible)
    const link = create("a", "nav-item");
    link.href = "#";
    link.dataset.page = GUIDE.pageName;
    link.appendChild(create("span", "nav-icon", GUIDE.menuIcon));
    link.appendChild(create("span", "", GUIDE.menuLabel));

    const after = nav.querySelector('[data-page="trace-libre"]') || nav.querySelector('[data-page="ecriture"]');
    if (after) after.after(link); else nav.appendChild(link);

    link.addEventListener("click", event => {
        event.preventDefault();
        showPage(GUIDE.pageName);
    });

    // Page
    const page = create("section", "page");
    page.id = "page-" + GUIDE.pageName;
    app.appendChild(page);

    const header = create("header", "page-header");
    const headerText = create("div", "header-text");
    headerText.appendChild(create("h1", "", GUIDE.title));
    headerText.appendChild(create("p", "header-description", GUIDE.description));
    header.appendChild(headerText);
    page.appendChild(header);

    const panel = create("div", "note-editor");
    page.appendChild(panel);

    // ---------- ÉTAT ----------
    const settings = { source: "all", count: 10 };
    let session = null;      // { queue, index, known, attempts, retried }
    let writer = null;
    let view = "setup";

    function stopWriter() {
        if (writer) {
            try { writer.cancelQuiz(); } catch (error) { /* rien à arrêter */ }
        }
        writer = null;
    }

    function button(label, className, onClick) {
        const element = create("button", className, label);
        element.type = "button";
        element.addEventListener("click", onClick);
        return element;
    }

    // ---------- ÉCRAN 1 : RÉGLAGES ----------
    function renderSetup() {
        stopWriter();
        view = "setup";
        panel.innerHTML = "";

        const sourceSelect = create("select");
        sourceSelect.appendChild(new Option(GUIDE.allVocabulary, "all"));

        state.categories
            .filter(category => category.words.length > 0)
            .forEach(category => sourceSelect.appendChild(new Option(category.icon + " " + category.name, category.id)));

        const exists = Array.prototype.slice.call(sourceSelect.options).some(option => option.value === settings.source);
        if (!exists) settings.source = "all";
        sourceSelect.value = settings.source;
        sourceSelect.addEventListener("change", () => { settings.source = sourceSelect.value; });

        const countSelect = create("select");
        GUIDE.counts.forEach(count => countSelect.appendChild(new Option(count === 0 ? GUIDE.countAll : String(count), String(count))));
        countSelect.value = String(settings.count);
        countSelect.addEventListener("change", () => { settings.count = parseInt(countSelect.value, 10); });

        function field(label, select) {
            const wrapper = create("div", "writing-field");
            wrapper.style.marginBottom = "14px";
            wrapper.appendChild(create("label", "", label));
            wrapper.appendChild(select);
            return wrapper;
        }

        panel.appendChild(field(GUIDE.sourceLabel, sourceSelect));
        panel.appendChild(field(GUIDE.countLabel, countSelect));

        const message = create("p", "hanzi-status", "");
        message.style.cssText = "max-width: none; text-align: left; margin: 0 0 12px;";
        panel.appendChild(message);

        panel.appendChild(button(GUIDE.start, "add-category-btn", () => {
            const characters = collectCharacters(state.categories, settings.source);

            if (characters.length === 0) {
                message.textContent = GUIDE.noCharacters;
                return;
            }

            if (!window.HanziWriter) {
                message.textContent = GUIDE.loadError;
                return;
            }

            const queue = shuffle(characters).slice(0, settings.count > 0 ? settings.count : characters.length);
            session = { queue: queue, index: 0, known: 0, attempts: 1, retried: 0, retriedCurrent: false };
            showStep(1);
        }));
    }

    // ---------- ÉCRAN 2 : LES 3 ÉTAPES ----------
    function showStep(step) {
        stopWriter();
        view = "step";
        panel.innerHTML = "";

        const entry = session.queue[session.index];
        const total = session.queue.length;

        // En-tête : progression et essai
        const top = create("p", "", GUIDE.progress(session.index + 1, total) + (session.attempts > 1 ? " · " + GUIDE.attempt(session.attempts) : ""));
        top.style.cssText = "margin: 0 0 6px; font-size: 13px; color: #82766F;";
        panel.appendChild(top);

        const title = create("h2", "", GUIDE.steps[step - 1].title);
        title.style.cssText = "margin: 0 0 4px; font-size: 20px; color: var(--dark-red);";
        panel.appendChild(title);

        const help = create("p", "", GUIDE.steps[step - 1].help);
        help.style.cssText = "margin: 0 0 14px; font-size: 14px; color: #82766F;";
        panel.appendChild(help);

        // Le mot d'où vient le caractère
        const wordLine = create("p", "", entry.chinese + (entry.pinyin ? " · " + entry.pinyin : "") + (entry.translation ? " · " + entry.translation : ""));
        wordLine.style.cssText = "margin: 0 0 14px; font-size: 16px; font-weight: 600; color: #453B37; text-align: center;";
        panel.appendChild(wordLine);

        // Zone du caractère
        const card = create("div", "hanzi-card");
        card.style.cssText = "border: none; padding: 0; align-items: center;";
        const box = create("div", "hanzi-box");
        box.style.width = GUIDE.size + "px";
        box.style.height = GUIDE.size + "px";
        card.appendChild(box);
        panel.appendChild(card);

        const status = create("p", "hanzi-status", "");
        status.style.cssText = "max-width: none; text-align: center; margin: 12px 0 0; min-height: 18px;";
        panel.appendChild(status);

        const actions = create("div");
        actions.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 14px;";
        panel.appendChild(actions);

        const footer = create("div");
        footer.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 20px;";
        footer.appendChild(button(GUIDE.skipChar, "secondary-btn", () => nextCharacter(false)));
        footer.appendChild(button(GUIDE.quit, "secondary-btn", renderSetup));
        panel.appendChild(footer);

        // Le tracé (Hanzi Writer)
        const options = {
            width: GUIDE.size,
            height: GUIDE.size,
            padding: 8,
            showOutline: step !== 3,
            strokeColor: GUIDE.strokeColor,
            outlineColor: GUIDE.outlineColor,
            drawingColor: GUIDE.drawingColor,
            highlightColor: GUIDE.highlightColor,
            strokeAnimationSpeed: GUIDE.animationSpeed,
            delayBetweenStrokes: GUIDE.delayBetweenStrokes,
            leniency: GUIDE.leniency,
            onLoadCharDataError: () => {
                box.innerHTML = "";
                status.textContent = GUIDE.charError;
                actions.innerHTML = "";
            }
        };

        writer = window.HanziWriter.create(box, entry.char, options);

        if (step === 1) {
            // Étape 1 : animation
            const play = () => writer.animateCharacter();
            play();

            actions.appendChild(button(GUIDE.replay, "secondary-btn", play));
            actions.appendChild(button(GUIDE.goStep2, "add-category-btn", () => showStep(2)));
        } else if (step === 2) {
            // Étape 2 : tracé par-dessus le modèle
            writer.quiz({
                showHintAfterMisses: GUIDE.hintAfterMissesStep2,
                leniency: GUIDE.leniency,
                onComplete: () => {
                    status.textContent = GUIDE.step2Done;
                    actions.innerHTML = "";
                    actions.appendChild(button(GUIDE.goStep3, "add-category-btn", () => showStep(3)));
                }
            });
        } else {
            // Étape 3 : tracé sans modèle, puis « tu le connais ? »
            writer.quiz({
                showHintAfterMisses: GUIDE.hintAfterMissesStep3,
                leniency: GUIDE.leniency,
                onComplete: () => {
                    status.textContent = GUIDE.step3Done;
                    askKnow();
                }
            });
        }
    }

    // ---------- « TU LE CONNAIS ? » ----------
    function askKnow() {
        view = "know";

        const entry = session.queue[session.index];

        panel.innerHTML = "";

        const title = create("h2", "", GUIDE.knowTitle);
        title.style.cssText = "margin: 0 0 14px; font-size: 22px; color: var(--dark-red); text-align: center;";
        panel.appendChild(title);

        const big = create("p", "", entry.char);
        big.style.cssText = "margin: 0; font-size: 90px; font-weight: 600; color: var(--dark-red); text-align: center;";
        panel.appendChild(big);

        const info = create("p", "", (entry.pinyin ? entry.pinyin + " · " : "") + entry.translation);
        info.style.cssText = "margin: 0 0 22px; font-size: 16px; color: #453B37; text-align: center;";
        panel.appendChild(info);

        const actions = create("div");
        actions.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;";
        actions.appendChild(button(GUIDE.no, "secondary-btn", () => {
            // On refait tout depuis l'étape 1 pour ce caractère
            if (!session.retriedCurrent) {
                session.retriedCurrent = true;
                session.retried++;
            }
            session.attempts++;
            showStep(1);
        }));
        actions.appendChild(button(GUIDE.yes, "add-category-btn", () => nextCharacter(true)));
        panel.appendChild(actions);
    }

    function nextCharacter(known) {
        if (known) session.known++;

        session.index++;
        session.attempts = 1;
        session.retriedCurrent = false;

        if (session.index >= session.queue.length) renderEnd();
        else showStep(1);
    }

    // ---------- ÉCRAN 3 : FIN ----------
    function renderEnd() {
        stopWriter();
        view = "end";
        panel.innerHTML = "";

        const title = create("h2", "", GUIDE.endTitle);
        title.style.cssText = "margin: 0 0 12px; font-size: 24px; color: var(--dark-red);";
        panel.appendChild(title);

        const text = create("p", "", GUIDE.endText(session.known));
        text.style.cssText = "margin: 0 0 6px; font-size: 20px; font-weight: 600; color: var(--primary-red);";
        panel.appendChild(text);

        if (session.retried > 0) {
            const retries = create("p", "", GUIDE.endRetries(session.retried));
            retries.style.cssText = "margin: 0 0 18px; font-size: 14px; color: #82766F;";
            panel.appendChild(retries);
        }

        const actions = create("div");
        actions.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px;";
        actions.appendChild(button(GUIDE.again, "add-category-btn", () => {
            const characters = collectCharacters(state.categories, settings.source);
            const queue = shuffle(characters).slice(0, settings.count > 0 ? settings.count : characters.length);

            if (queue.length === 0) {
                renderSetup();
                return;
            }

            session = { queue: queue, index: 0, known: 0, attempts: 1, retried: 0, retriedCurrent: false };
            showStep(1);
        }));
        actions.appendChild(button(GUIDE.changeSettings, "secondary-btn", renderSetup));
        panel.appendChild(actions);
    }

    renderSetup();

    // Si le vocabulaire change pendant les réglages, on met la liste à jour
    onStateChange(() => {
        if (view === "setup") renderSetup();
    });
}

if (typeof document !== "undefined") start();
