// =====================================================
// PARTICULES.JS : PARTICULES FLOTTANTES DÉCORATIVES
// =====================================================
// Fichier autonome : il crée tout seul son canevas, derrière le
// contenu du site. Les réglages de la page Paramètres (activer, nombre,
// vitesse, couleur du site) sont appliqués automatiquement.
// Pour tout désactiver ici : enabled: false.

const PARTICLES = {
    enabled: true,
    respectReducedMotion: true,   // false = toujours afficher, même si l'appareil réduit les animations

    count: 36,                 // nombre de petites particules lumineuses
    characterCount: 7,         // nombre de caractères flottants (0 = aucun)
    characters: ["中", "文", "学", "书", "水", "茶", "心", "福", "家", "爱"],

    gold: "201, 162, 92",      // 3e couleur (RGB) ; les deux autres suivent la couleur du site

    minSize: 3,                // taille des particules (pixels)
    maxSize: 7,
    characterSize: [26, 44],   // taille des caractères [min, max]

    speed: 0.25,               // vitesse générale (0.1 = très lent, 0.5 = rapide)
    opacity: 0.85              // opacité maximale (0 à 1)
};

(function startParticles() {
    if (!PARTICLES.enabled) return;

    // Respecte le réglage "réduire les animations" de l'appareil
    if (PARTICLES.respectReducedMotion && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; " +
        "pointer-events: none; z-index: -1;";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let particles = [];
    let running = false;
    let frame = null;
    let colors = ["169, 39, 50", "116, 30, 41", PARTICLES.gold];

    // Réglages venant de la page Paramètres
    let control = { enabled: true, amount: 1, speed: 1 };
    let signature = "";

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    // "#A92732" → "169, 39, 50"
    function hexToRgb(hex) {
        const match = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
        if (!match) return null;

        const value = parseInt(match[1], 16);
        return ((value >> 16) & 255) + ", " + ((value >> 8) & 255) + ", " + (value & 255);
    }

    // Les couleurs suivent la couleur du site choisie dans les paramètres
    function themeColors() {
        const style = window.getComputedStyle(document.documentElement);
        const main = hexToRgb(style.getPropertyValue("--primary-red")) || "169, 39, 50";
        const dark = hexToRgb(style.getPropertyValue("--dark-red")) || "116, 30, 41";
        return [main, dark, PARTICLES.gold];
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
            color: pick(colors),
            x: random(0, width),
            y: random(0, height),
            size: isCharacter
                ? random(PARTICLES.characterSize[0], PARTICLES.characterSize[1])
                : random(PARTICLES.minSize, PARTICLES.maxSize),
            rise: random(0.3, 1) * PARTICLES.speed * control.speed * (isCharacter ? 0.6 : 1),
            sway: random(8, 28),
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

        const dots = Math.round(PARTICLES.count * control.amount);
        for (let i = 0; i < dots; i++) {
            particles.push(createParticle(false));
        }

        if (PARTICLES.characters.length > 0) {
            const letters = Math.round(PARTICLES.characterCount * control.amount);
            for (let i = 0; i < letters; i++) {
                particles.push(createParticle(true));
            }
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.y -= p.rise;
            p.angle += p.spin;

            const x = p.x + Math.sin(time * p.swaySpeed + p.phase) * p.sway;

            if (p.y < -p.size * 2) {
                p.y = height + p.size * 2;
                p.x = random(0, width);
            }

            const fade = 0.6 + 0.4 * Math.sin(time * 0.0008 + p.phase);
            const alpha = p.alpha * fade;

            if (p.isCharacter) {
                ctx.save();
                ctx.translate(x, p.y);
                ctx.rotate(p.angle);
                ctx.font = p.size + 'px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", serif';
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "rgba(" + p.color + ", " + (alpha * 0.4) + ")";
                ctx.fillText(p.char, 0, 0);
                ctx.restore();
            } else {
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
    }

    function loop(time) {
        if (!running) return;
        draw(time);
        frame = requestAnimationFrame(loop);
    }

    function setRunning(on) {
        if (on && !running) {
            running = true;
            canvas.style.display = "";
            init();
            frame = requestAnimationFrame(loop);
        } else if (!on && running) {
            running = false;
            cancelAnimationFrame(frame);
            ctx.clearRect(0, 0, width, height);
            canvas.style.display = "none";
        }
    }

    // Appliquer les réglages de la page Paramètres
    function applySettings(settings) {
        const particles = settings && settings.particles;
        if (!particles) return;

        const next = {
            enabled: particles.enabled !== false,
            amount: Number(particles.amount) || 1,
            speed: Number(particles.speed) || 1
        };

        const newSignature = JSON.stringify(next) + "|" + (settings.palette || "");
        if (newSignature === signature) return;
        signature = newSignature;

        control = next;
        colors = themeColors();

        if (running) init();   // nouvelles couleurs, nombre et vitesse
        setRunning(control.enabled);
    }

    window.addEventListener("mandarin-settings", event => {
        applySettings(event.detail || window.MANDARIN_SETTINGS);
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (running) init(); }, 200);
    });

    // Démarrage (les réglages éventuels arrivent juste après)
    colors = themeColors();
    setRunning(true);
    if (window.MANDARIN_SETTINGS) applySettings(window.MANDARIN_SETTINGS);
})();
