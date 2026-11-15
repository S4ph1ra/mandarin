// =====================================================
// UI.JS : PETITES FONCTIONS UTILES POUR L'INTERFACE
// =====================================================

// Créer un élément HTML rapidement
export function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

// Fenêtres (modales)
export function openModal(modal) {
    modal.classList.add("active");
}

export function closeModal(modal) {
    modal.classList.remove("active");
}

// Fermer une fenêtre en cliquant à l'extérieur
export function closeOnOutsideClick(modal, onClose) {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) onClose();
    });
}

// "1 mot" / "3 mots"
export function countLabel(count, singular, plural) {
    return count + " " + (count > 1 ? plural : singular);
}
