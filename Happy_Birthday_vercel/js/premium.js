/* Premium celebration helpers: floating dust, card spotlight, 3D tilt, staggered reveal, cursor sparkles */
(function () {
    const view = document.getElementById('recipient-view');
    if (!view) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Floating light dust (theme-coloured via CSS variables)
    if (!reduce) {
        const dust = document.createElement('div');
        dust.className = 'pm-dust';
        for (let i = 0; i < 22; i++) {
            const p = document.createElement('i');
            p.style.cssText = `left:${Math.random() * 100}%;--s:${2 + Math.random() * 4}px;` +
                `--d:${14 + Math.random() * 16}s;--dl:${-Math.random() * 24}s;--x:${(Math.random() - .5) * 120}px`;
            dust.appendChild(p);
        }
        view.prepend(dust);
    }

    // Spotlight follows the cursor on glass cards
    view.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.glass-card');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });

    // 3D tilt on the polaroid
    const frame = document.getElementById('polaroid-frame');
    if (frame && !reduce) {
        frame.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            const r = frame.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
            frame.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`;
        });
        frame.addEventListener('pointerleave', () => { frame.style.transform = ''; });
    }

    // Staggered entrance whenever a step is revealed (hidden class removed)
    const stagger = (el) => {
        if (!el || el.dataset.pmReady) return;
        el.dataset.pmReady = '1';
        el.classList.add('pm-stagger');
        [...el.children].forEach((c, i) => c.style.setProperty('--i', i));
    };
    const play = (el) => { stagger(el); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('pm-in'))); };
    ['card-reveal-step', 'countdown-section'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        stagger(el);
        if (!el.classList.contains('hidden')) play(el);
        new MutationObserver(() => { if (!el.classList.contains('hidden')) play(el); })
            .observe(el, { attributes: true, attributeFilter: ['class'] });
    });

    // Cursor sparkles (desktop only, throttled)
    if (!reduce && matchMedia('(hover: hover)').matches) {
        let last = 0;
        document.addEventListener('pointermove', (e) => {
            const now = performance.now();
            if (now - last < 45 || view.classList.contains('hidden')) return;
            last = now;
            const s = document.createElement('span');
            s.className = 'pm-spark';
            s.style.cssText = `left:${e.clientX - 4}px;top:${e.clientY - 4}px;` +
                `--dx:${(Math.random() - .5) * 46}px;--dy:${Math.random() * 40 + 8}px`;
            document.body.appendChild(s);
            setTimeout(() => s.remove(), 800);
        });
    }
})();
