/* Advanced studio UI helpers: card spotlight, scroll reveal, message counter, tone-playing state */
(function () {
    const studio = document.getElementById('studio-view');
    if (!studio) return;

    // Cursor spotlight on glass cards
    studio.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.glass-card');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });

    // Scroll reveal for form groups
    const groups = studio.querySelectorAll('.form-group');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
        }, { threshold: 0.08 });
        groups.forEach((g, i) => { g.classList.add('reveal'); g.style.transitionDelay = Math.min(i * 40, 240) + 'ms'; io.observe(g); });
    }

    // Live character counter under the message box
    const msg = document.getElementById('input-message');
    if (msg) {
        const max = 280;
        const bar = document.createElement('div');
        bar.className = 'msg-counter';
        bar.innerHTML = '<span>💡 Tip: "Name" is auto-replaced with the birthday person\'s name</span><span class="count"></span>';
        msg.insertAdjacentElement('afterend', bar);
        const update = () => {
            const n = msg.value.length;
            bar.querySelector('.count').textContent = n + ' / ' + max;
            bar.classList.toggle('warn', n > max);
        };
        msg.addEventListener('input', update);
        document.querySelectorAll('.preset-btn').forEach(b => b.addEventListener('click', () => setTimeout(update, 0)));
        update();
    }

    // Tone preview button glows while playing
    const btn = document.getElementById('btn-preview-tune');
    if (btn) {
        setInterval(() => {
            const a = window.birthdayAudio;
            btn.classList.toggle('is-playing', !!(a && a.isPlaying && a.previewingTune));
        }, 250);
    }
})();
