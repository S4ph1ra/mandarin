// =====================================================
// NAVIGATION.JS : CHANGEMENT DE PAGE
// =====================================================

// Afficher une page par son nom (ex : "vocabulaire")
export function showPage(name) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("active", page.id === "page-" + name);
    });

    document.querySelectorAll(".nav-item[data-page]").forEach(item => {
        item.classList.toggle("active", item.dataset.page === name);
    });
}

// Tout élément avec data-page="..." devient un lien vers cette page
// (menu à gauche + cartes de l'accueil)
export function initNavigation() {
    document.querySelectorAll("[data-page]").forEach(item => {
        item.addEventListener("click", (event) => {
            event.preventDefault();
            showPage(item.dataset.page);
        });
    });
}
