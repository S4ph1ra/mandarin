// =====================================================
// CONFIG.JS : TOUT CE QUI SE CHANGE FACILEMENT EST ICI
// (textes, icônes, noms des sections, noms Firebase...)
// =====================================================

// ---------- FIREBASE ----------
export const firebaseConfig = {
    apiKey: "AIzaSyCTKWhFX61FQKNcfbCYtJgv0O2HBWnUN1g",
    authDomain: "mandarin-notebook.firebaseapp.com",
    projectId: "mandarin-notebook",
    storageBucket: "mandarin-notebook.firebasestorage.app",
    messagingSenderId: "602498064025",
    appId: "1:602498064025:web:f2181f0540ea36c9c6a208",
    measurementId: "G-JSPZ15XM97"
};

// Nom de la collection Firestore des catégories de vocabulaire
// (chemin complet : users/{id}/categories)
export const CATEGORIES_COLLECTION = "categories";

// ---------- NIVEAUX HSK (liste déroulante du vocabulaire) ----------
// Modifie, ajoute ou retire des niveaux ici.
export const HSK_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSK 7-9"];

// ---------- ICÔNES DES CATÉGORIES ----------
// Ajoute ou retire des emojis ici, le sélecteur se met à jour tout seul.
export const CATEGORY_ICONS = ["📚", "👨‍👩‍👧", "🔢", "🏠", "🍜", "🕒", "🌍", "💬"];

// ---------- SECTIONS "NOTES LIBRES" (titre + texte) ----------
// Pour ajouter une nouvelle section de notes :
//   1. copie un bloc ci-dessous et change la clé (ex : "culture")
//   2. ajoute <section id="page-culture" class="page"></section> dans index.html
//   3. ajoute un lien data-page="culture" dans le menu
// Le contenu de la page est créé automatiquement.
export const NOTES_SECTIONS = {
    cours: {
        pageId: "page-cours",
        collection: "courses",            // nom de la collection Firestore
        richText: true,                   // true = mise en forme (gras, couleurs...), false = texte simple
        title: "Mes cours",
        description: "Retrouve ici tes leçons personnelles.",
        addButton: "+ Nouvelle leçon",
        emptyMessage: "Aucune leçon pour l'instant. Crée ta première leçon !",
        titlePlaceholder: "Titre de la leçon",
        contentPlaceholder: "Écris tes notes ici...",
        deleteConfirm: "Supprimer cette leçon ?"
    },

    grammaire: {
        pageId: "page-grammaire",
        collection: "grammar",
        richText: true,
        title: "Grammaire",
        description: "Retrouve ici tes notes de grammaire.",
        addButton: "+ Nouvelle note",
        emptyMessage: "Aucune note pour l'instant. Écris ta première règle !",
        titlePlaceholder: "Titre de la règle",
        contentPlaceholder: "Explique la règle, ajoute des exemples...",
        deleteConfirm: "Supprimer cette note ?"
    }
};

// ---------- TEXTES GÉNÉRAUX ----------
export const TEXTS = {
    wordSingular: "mot",
    wordPlural: "mots",

    untitledNote: "Sans titre",
    saveNote: "Enregistrer",
    deleteNote: "Supprimer",
    backToList: "← Retour à la liste",

    emptyCategories: "Aucune catégorie pour l'instant. Crée ta première catégorie !",
    emptyWords: "Aucun mot dans cette catégorie.",
    emptyExample: "—",

    categoryModalCreateTitle: "Nouvelle catégorie",
    categoryModalCreateButton: "Créer",
    categoryModalEditTitle: "Modifier la catégorie",
    categoryModalEditButton: "Enregistrer",

    wordModalCreateTitle: "Ajouter un mot",
    wordModalCreateButton: "Ajouter",
    wordModalEditTitle: "Modifier le mot",
    wordModalEditButton: "Enregistrer",

    confirmDeleteCategory: "Supprimer cette catégorie et tous ses mots ?",
    confirmDeleteWord: "Supprimer ce mot ?",

    requiredWordFields: "Remplis au moins le chinois, le pinyin et la traduction.",
    saveError: "Impossible d'enregistrer. Vérifie ta connexion et réessaie.",
    deleteError: "Impossible de supprimer. Réessaie.",
    logoutError: "Impossible de se déconnecter.",

    offlineBanner: "Mode hors ligne : tes modifications seront envoyées à la reconnexion.",

    hskNone: "Non défini"
};

// ---------- MESSAGES D'ERREUR DE CONNEXION ----------
export const AUTH_ERRORS = {
    "auth/email-already-in-use": "Cette adresse e-mail est déjà utilisée.",
    "auth/invalid-email": "Adresse e-mail invalide.",
    "auth/weak-password": "Mot de passe trop court (6 caractères minimum).",
    "auth/popup-closed-by-user": "Connexion Google annulée.",
    default: "Une erreur est survenue. Réessaie."
};
export const LOGIN_ERROR = "E-mail ou mot de passe incorrect.";
export const REGISTER_EMPTY = "Remplis tous les champs.";
export const REGISTER_MISMATCH = "Les mots de passe ne correspondent pas.";


// ---------- PAGE ÉCRITURE (tracé des caractères) ----------
export const WRITING = {
    pageId: "page-ecriture",

    title: "Écriture",
    description: "Apprends l'ordre des traits et entraîne-toi à tracer chaque caractère.",

    categoryLabel: "Catégorie",
    wordLabel: "Mot",
    chooseCategory: "Choisis une catégorie",
    chooseWord: "Choisis un mot",

    animateButton: "▶ Animation",
    practiceButton: "✍ S'entraîner",
    animateAllButton: "▶ Animer tout le mot",

    practiceHint: "Trace le caractère avec ton doigt, trait par trait.",
    practiceDone: "Bravo, caractère terminé !",
    noWords: "Ajoute d'abord des mots dans ton vocabulaire pour pouvoir t'entraîner.",
    noHanzi: "Ce mot ne contient aucun caractère chinois.",
    loadError: "Impossible de charger l'outil de tracé. Vérifie ta connexion.",
    charError: "Ce caractère n'est pas disponible.",

    // Apparence de la zone de tracé
    size: 160,                      // taille d'un caractère en pixels
    strokeColor: "#741E29",         // couleur du caractère
    outlineColor: "#E8DED5",        // couleur du contour
    drawingColor: "#A92732",        // couleur de ton tracé
    highlightColor: "#A92732",      // couleur du trait suggéré
    animationSpeed: 1,              // 1 = normal, 2 = deux fois plus vite
    delayBetweenStrokes: 300,       // pause entre les traits (ms)
    showHintAfterMisses: 2          // aide après N erreurs
};


// ---------- BARRE D'OUTILS DU TEXTE ENRICHI (cours, grammaire) ----------
// Chaque bouton : label (ce qui s'affiche), title (info-bulle),
// command + value (action), style (apparence du bouton).
// Pour ajouter une couleur : copie une ligne "foreColor" et change la valeur.
// Pour retirer un bouton : supprime sa ligne.
export const RICH_TEXT_TOOLBAR = [
    { label: "G", title: "Gras", command: "bold", style: "font-weight: bold;" },
    { label: "I", title: "Italique", command: "italic", style: "font-style: italic;" },
    { label: "S", title: "Souligné", command: "underline", style: "text-decoration: underline;" },
    { label: "B", title: "Barré", command: "strikeThrough", style: "text-decoration: line-through;" },

    { separator: true },

    { label: "A", title: "Rouge", command: "foreColor", value: "#A92732", style: "color: #A92732; font-weight: bold;" },
    { label: "A", title: "Bleu", command: "foreColor", value: "#2563A8", style: "color: #2563A8; font-weight: bold;" },
    { label: "A", title: "Vert", command: "foreColor", value: "#2E7D4F", style: "color: #2E7D4F; font-weight: bold;" },
    { label: "A", title: "Noir (par défaut)", command: "foreColor", value: "#292525", style: "color: #292525; font-weight: bold;" },

    { separator: true },

    { label: "▮", title: "Surligner en jaune", command: "hiliteColor", value: "#FFE9A8", style: "color: #E0B84C;" },
    { label: "▮", title: "Surligner en rose", command: "hiliteColor", value: "#F8D3D6", style: "color: #E08A93;" },

    { separator: true },

    { label: "Titre", title: "Titre", command: "formatBlock", value: "<h3>" },
    { label: "¶", title: "Texte normal", command: "formatBlock", value: "<div>" },
    { label: "•", title: "Liste à puces", command: "insertUnorderedList" },
    { label: "1.", title: "Liste numérotée", command: "insertOrderedList" },

    { separator: true },

    { label: "✕", title: "Effacer la mise en forme", command: "removeFormat" }
];
