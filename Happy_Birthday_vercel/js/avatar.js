/* =========================================================
   AVATAR MAKER - for people who don't have a photo.
   Draws a cute character card on a canvas and adds it to the
   photo list like a normal photo (works in shared links, GIF/PNG
   posts and the exported HTML file).
   ========================================================= */
(function () {
    'use strict';

    const EMOJIS = ['🥳','😀','😎','🤩','😊','😇','🥰','😜','🤗','🎅','👸','🤴','🧙','🧚','🦸','🧑‍🚀',
                    '🐶','🐱','🐼','🦁','🐯','🐰','🦊','🐨','🐸','🐵','🦄','🐧'];

    const BACKGROUNDS = [
        ['#ff9a9e', '#fad0c4'], ['#ffd700', '#ff9900'], ['#a18cd1', '#fbc2eb'], ['#84fab0', '#8fd3f4'],
        ['#4facfe', '#00f2fe'], ['#fa709a', '#fee140'], ['#7f00ff', '#e100ff'], ['#0ba360', '#3cba92'],
        ['#ff5e62', '#ff9966'], ['#232526', '#616161']
    ];

    const DECOR = ['🎈', '🎉', '✨', '🎂', '🎁', '⭐'];

    const state = { emoji: '🥳', bg: 0, decor: true, confetti: true, showName: true };
    let overlay = null, canvas = null;

    function seeded(seed) {
        let s = seed;
        return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    }

    function draw(size, name) {
        const ctx = canvas.getContext('2d');
        canvas.width = size; canvas.height = size;
        const [c1, c2] = BACKGROUNDS[state.bg];

        const g = ctx.createLinearGradient(0, 0, size, size);
        g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);

        // soft spotlight behind the character
        const rg = ctx.createRadialGradient(size / 2, size * 0.45, size * 0.05, size / 2, size * 0.45, size * 0.55);
        rg.addColorStop(0, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, size, size);

        if (state.confetti) {
            const rnd = seeded(42);
            const cols = ['#ffffff', '#ffd700', '#ff4d6d', '#4cc9f0', '#80ed99', '#b5179e'];
            for (let i = 0; i < 46; i++) {
                ctx.save();
                ctx.translate(rnd() * size, rnd() * size);
                ctx.rotate(rnd() * Math.PI);
                ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
                ctx.globalAlpha = 0.75;
                ctx.fillRect(-size * 0.012, -size * 0.025, size * 0.024, size * 0.05);
                ctx.restore();
            }
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontStack = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

        if (state.decor) {
            const spots = [[0.16, 0.16, 0.16], [0.84, 0.16, 0.14], [0.14, 0.72, 0.13], [0.86, 0.7, 0.16]];
            spots.forEach((p, i) => {
                ctx.font = `${Math.round(size * p[2])}px ${fontStack}`;
                ctx.fillText(DECOR[(i + state.bg) % DECOR.length], size * p[0], size * p[1]);
            });
        }

        ctx.font = `${Math.round(size * 0.5)}px ${fontStack}`;
        ctx.fillText(state.emoji, size / 2, size * (state.showName ? 0.44 : 0.5));

        if (state.showName) {
            const label = (name || '').trim();
            if (label) {
                const fs = Math.round(size * 0.09);
                ctx.font = `800 ${fs}px Outfit, "Segoe UI", Arial, sans-serif`;
                let text = label.length > 14 ? label.slice(0, 13) + '…' : label;
                const w = ctx.measureText(text).width + size * 0.09;
                const y = size * 0.86;
                ctx.fillStyle = 'rgba(0,0,0,0.38)';
                const r = fs * 0.9, x = size / 2 - w / 2, h = fs * 1.7;
                ctx.beginPath();
                ctx.moveTo(x + r, y - h / 2); ctx.arcTo(x + w, y - h / 2, x + w, y + h / 2, r);
                ctx.arcTo(x + w, y + h / 2, x, y + h / 2, r); ctx.arcTo(x, y + h / 2, x, y - h / 2, r);
                ctx.arcTo(x, y - h / 2, x + w, y - h / 2, r); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.fillText(text, size / 2, y + fs * 0.05);
            }
        }
    }

    function currentName() {
        const el = document.getElementById('input-name');
        return el ? el.value : '';
    }

    function refresh() {
        draw(280, currentName());
        overlay.querySelectorAll('[data-emoji]').forEach(b => b.classList.toggle('active', b.dataset.emoji === state.emoji));
        overlay.querySelectorAll('[data-bg]').forEach(b => b.classList.toggle('active', Number(b.dataset.bg) === state.bg));
    }

    function close() { if (overlay) overlay.classList.add('hidden'); }

    function use() {
        const app = window.birthdayApp;
        if (!app) return;
        const tmp = document.createElement('canvas');
        const keep = canvas;
        canvas = tmp;
        draw(450, currentName());
        canvas = keep;
        const dataUrl = tmp.toDataURL('image/jpeg', 0.88);

        const isDefault = (p) => p === 'assets/avatar-sample.svg' || (typeof DEFAULT_AVATAR_DATA !== 'undefined' && p === DEFAULT_AVATAR_DATA);
        if (app.currentData.photos.length === 1 && isDefault(app.currentData.photos[0])) app.currentData.photos = [];
        if (app.currentData.photos.length >= MAX_PHOTOS) {
            app.showToast(`⚠️ Maximum ${MAX_PHOTOS} photos allowed. Please remove one first.`);
            return;
        }
        app.currentData.photos.push(dataUrl);
        app.renderStudioPhotosList();
        app.showToast('🎨 Avatar added as a photo!');
        close();
    }

    function build() {
        overlay = document.createElement('div');
        overlay.className = 'avatar-maker-overlay hidden';
        overlay.innerHTML = `
            <div class="avatar-maker-card" role="dialog" aria-label="Avatar maker">
                <div class="avatar-maker-head">
                    <strong>🎨 Create an Avatar</strong>
                    <button type="button" class="avatar-close" aria-label="Close">✕</button>
                </div>
                <div class="avatar-maker-body">
                    <canvas class="avatar-preview" width="280" height="280"></canvas>
                    <div class="avatar-controls">
                        <div class="avatar-label">Character</div>
                        <div class="avatar-emoji-grid"></div>
                        <div class="avatar-label">Background</div>
                        <div class="avatar-bg-grid"></div>
                        <div class="avatar-toggles">
                            <label><input type="checkbox" data-tg="decor" checked> Party icons</label>
                            <label><input type="checkbox" data-tg="confetti" checked> Confetti</label>
                            <label><input type="checkbox" data-tg="showName" checked> Show name</label>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-primary avatar-use">✅ Use this as the photo</button>
            </div>`;
        document.body.appendChild(overlay);
        canvas = overlay.querySelector('.avatar-preview');

        const eg = overlay.querySelector('.avatar-emoji-grid');
        EMOJIS.forEach(e => {
            const b = document.createElement('button');
            b.type = 'button'; b.textContent = e; b.dataset.emoji = e;
            b.addEventListener('click', () => { state.emoji = e; refresh(); });
            eg.appendChild(b);
        });
        const bg = overlay.querySelector('.avatar-bg-grid');
        BACKGROUNDS.forEach((c, i) => {
            const b = document.createElement('button');
            b.type = 'button'; b.dataset.bg = i; b.setAttribute('aria-label', 'Background ' + (i + 1));
            b.style.background = `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
            b.addEventListener('click', () => { state.bg = i; refresh(); });
            bg.appendChild(b);
        });
        overlay.querySelectorAll('[data-tg]').forEach(cb => {
            cb.addEventListener('change', () => { state[cb.dataset.tg] = cb.checked; refresh(); });
        });
        overlay.querySelector('.avatar-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.avatar-use').addEventListener('click', use);
    }

    function open() {
        if (!overlay) build();
        overlay.classList.remove('hidden');
        refresh();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('btn-open-avatar-maker');
        if (btn) btn.addEventListener('click', open);
    });
})();
