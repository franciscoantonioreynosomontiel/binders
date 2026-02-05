/* docs/js/test.js */

document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".card-wrapper");

    // Inicializar ztext.js
    const z = new Ztextify(".z-text", {
        depth: "10px",
        layers: 10,
        fade: true,
        direction: "both",
        event: "none", // Desactivamos el manejo de eventos interno para usar nuestro LERP
        perspective: "500px"
    });

    let targetMX = 0.5;
    let targetMY = 0.5;
    let targetRX = 0;
    let targetRY = 0;

    let currentMX = 0.5;
    let currentMY = 0.5;
    let currentRX = 0;
    let currentRY = 0;

    const LERP_FACTOR = 0.1;

    function update() {
        // Suavizado
        currentMX += (targetMX - currentMX) * LERP_FACTOR;
        currentMY += (targetMY - currentMY) * LERP_FACTOR;
        currentRX += (targetRX - currentRX) * LERP_FACTOR;
        currentRY += (targetRY - currentRY) * LERP_FACTOR;

        const angle = Math.atan2(currentMY - 0.5, currentMX - 0.5) * (180 / Math.PI);

        cards.forEach(card => {
            card.style.setProperty("--mx", currentMX.toFixed(3));
            card.style.setProperty("--my", currentMY.toFixed(3));
            card.style.setProperty("--rx", currentRX.toFixed(2));
            card.style.setProperty("--ry", currentRY.toFixed(2));
            card.style.setProperty("--abs-rx", Math.abs(currentRX).toFixed(2));
            card.style.setProperty("--abs-ry", Math.abs(currentRY).toFixed(2));
            card.style.setProperty("--angle", `${angle}deg`);
            card.style.setProperty("--sparkle-opacity", (Math.random() * 0.5 + 0.5).toFixed(2));

            // Aplicar rotación a las capas de ztext
            const zLayers = card.querySelector(".z-layers");
            if (zLayers) {
                zLayers.style.transform = `rotateX(${currentRX}deg) rotateY(${currentRY}deg)`;
            }
        });

        requestAnimationFrame(update);
    }

    update();

    // Mouse
    window.addEventListener("mousemove", (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        targetMX = x;
        targetMY = y;
        targetRY = (x - 0.5) * 60;
        targetRX = (y - 0.5) * -60;
    });

    // Touch
    window.addEventListener("touchmove", (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const x = touch.clientX / window.innerWidth;
            const y = touch.clientY / window.innerHeight;

            targetMX = x;
            targetMY = y;
            targetRY = (x - 0.5) * 70;
            targetRX = (y - 0.5) * -70;

            // Añadir clase active para forzar opacidad en móviles
            cards.forEach(c => c.classList.add('active'));

            // Evitar scroll mientras se interactúa con la carta
            if (e.target.closest('.card-wrapper')) {
                e.preventDefault();
            }
        }
    }, { passive: false });

    window.addEventListener("touchend", () => {
        cards.forEach(c => c.classList.remove('active'));
    });

    // Gyroscope
    window.addEventListener("deviceorientation", (e) => {
        if (e.beta !== null && e.gamma !== null) {
            // Normalizar valores para mx/my basados en inclinación
            // Beta: -180 a 180 (usualmente 0 a 90 para uso normal)
            // Gamma: -90 a 90

            targetRX = (e.beta - 45) * 1.5;
            targetRY = e.gamma * 1.5;

            targetRX = Math.max(-40, Math.min(40, targetRX));
            targetRY = Math.max(-40, Math.min(40, targetRY));

            // Mapear a 0-1 para mx/my
            targetMX = (targetRY / 80) + 0.5;
            targetMY = (targetRX / 80) + 0.5;
        }
    });

    // Permission for iOS
    window.addEventListener('click', () => {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().catch(console.error);
        }
    }, { once: true });
});
