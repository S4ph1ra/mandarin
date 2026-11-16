// =====================================================
// PARTICULES.JS : PARTICULES FLOTTANTES DÉCORATIVES
// =====================================================
// Fichier autonome : il crée tout seul son canevas, derrière le
// contenu du site. Pour tout désactiver : enabled: false.

const PARTICLES = {
    enabled: true,

    count: 36,                 // nombre de petites particules lumineuses
    characterCount: 7,         // nombre de caractères flottants (0 = aucun)
    characters: ["中", "文", "学", "书", "水", "茶", "心", "福", "家", "爱"],

    // Couleurs en RGB : rouge du site, rouge foncé, doré
    colors: ["169, 39, 50", "116, 30, 41", "201, 162, 92"],

    minSize: 2,                // taille des particules (pixels)
    maxSize: 5,
    characterSize: [26, 44],   // taille des caractères [min, max]

    speed: 0.25,               // vitesse générale (0.1 = très lent, 0.5 = rapide)
    opacity: 0.5               // opacité maximale (0 à 1)
};

(function startParticles() {
    if (!PARTICLES.enabled) return;

    // Respecte le réglage "réduire les animations" de l'appareil
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
        "position: fixed; inset: 0; width: 100%; height: 100%; " +
        "pointer-events: none; z-index: -1;";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let particles = [];

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function createParticle(isCharacter) {
        return {
            isCharacter: isCharacter,
            char: isCharacter ? pick(PARTICLES.characters) : "",
            color: pick(PARTICLES.colors),
            x: random(0, width),
            y: random(0, height),
            size: isCharacter
                ? random(PARTICLES.characterSize[0], PARTICLES.characterSize[1])
                : random(PARTICLES.minSize, PARTICLES.maxSize),
            rise: random(0.3, 1) * PARTICLES.speed * (isCharacter ? 0.6 : 1),   // montée
            sway: random(8, 28),                                                // amplitude de balancement
            swaySpeed: random(0.0003, 0.0009),
            phase: random(0, Math.PI * 2),
            alpha: random(0.35, 1) * PARTICLES.opacity,
            angle: random(-0.4, 0.4),
            spin: random(-0.0004, 0.0004)
        };
    }

    function init() {
        resize();
        particles = [];

        for (let i = 0; i < PARTICLES.count; i++) {
            particles.push(createParticle(false));
        }

        if (PARTICLES.characters.length > 0) {
            for (let i = 0; i < PARTICLES.characterCount; i++) {
                particles.push(createParticle(true));
            }
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            // Mouvement : montée lente + balancement doux
            p.y -= p.rise;
            p.angle += p.spin;

            const x = p.x + Math.sin(time * p.swaySpeed + p.phase) * p.sway;

            // Réapparition en bas quand la particule sort par le haut
            if (p.y < -p.size * 2) {
                p.y = height + p.size * 2;
                p.x = random(0, width);
            }

            // Apparition et disparition en douceur
            const fade = 0.6 + 0.4 * Math.sin(time * 0.0008 + p.phase);
            const alpha = p.alpha * fade;

            if (p.isCharacter) {
                ctx.save();
                ctx.translate(x, p.y);
                ctx.rotate(p.angle);
                ctx.font = p.size + 'px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", serif';
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "rgba(" + p.color + ", " + (alpha * 0.28) + ")";
                ctx.fillText(p.char, 0, 0);
                ctx.restore();
            } else {
                // Petit point avec un halo doux
                ctx.beginPath();
                ctx.arc(x, p.y, p.size * 2.6, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(" + p.color + ", " + (alpha * 0.14) + ")";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(" + p.color + ", " + alpha + ")";
                ctx.fill();
            }
        });

        requestAnimationFrame(draw);
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(init, 200);
    });

    init();
    requestAnimationFrame(draw);
})();
