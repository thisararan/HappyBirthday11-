/* Upgrade layer: accessibility, "Surprise me", smart share links, fullscreen. */
(function () {
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
    function init() {
        const app = window.birthdayApp;
        const opts = $$('.theme-option');
        const grid = $('.theme-selector-grid');

        /* 1. keyboard + screen-reader support for the layout picker */
        if (grid) grid.setAttribute('role', 'radiogroup');
        opts.forEach(o => {
            o.setAttribute('role', 'radio'); o.tabIndex = 0;
            o.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.click(); } });
        });
        const sync = () => opts.forEach(o => o.setAttribute('aria-checked', o.classList.contains('active')));

        /* 2. selected-layout label + Surprise me */
        if (grid && !$('.ws-picker-bar')) {
            const bar = document.createElement('div'); bar.className = 'ws-picker-bar';
            bar.innerHTML = '<span class="ws-picked">Selected: <b id="ws-picked-name"></b></span>' +
                '<button type="button" class="ws-surprise" title="Pick a random layout">\uD83C\uDFB2 Surprise me</button>';
            grid.parentNode.insertBefore(bar, grid);
            bar.querySelector('.ws-surprise').addEventListener('click', () => {
                const cur = opts.findIndex(o => o.classList.contains('active'));
                let i; do { i = Math.floor(Math.random() * opts.length); } while (i === cur && opts.length > 1);
                opts[i].click(); opts[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        }
        const label = () => {
            const a = $('.theme-option.active .theme-name'), t = $('#ws-picked-name');
            if (a && t) t.textContent = a.textContent.trim();
            sync();
        };
        opts.forEach(o => o.addEventListener('click', () => setTimeout(label, 0)));
        label();

        /* 3. share modal: real link (no hard-coded IP), WhatsApp / Telegram / native share */
        const input = $('#wifi-share-input');
        const card = input && input.closest('.share-option-card');
        if (card) {
            const h = $('h4', card), p = $('p', card);
            if (h) h.textContent = '2. Share a link';
            if (location.protocol === 'file:') {
                if (p) p.textContent = 'Copy this link and open it in a browser. Because you opened the app as a local file, the link only works on this computer. To share it with anyone, upload the folder to a free host (see option 3) or send the .html file above.';
            } else if (p) p.textContent = 'Anyone who opens this link sees the personalised birthday card.';
            const row = document.createElement('div'); row.className = 'ws-share-row';
            row.innerHTML = '<a class="ws-wa" target="_blank" rel="noopener">WhatsApp</a><a class="ws-tg" target="_blank" rel="noopener">Telegram</a>' +
                (navigator.share ? '<button type="button" class="ws-native">Share\u2026</button>' : '');
            card.appendChild(row);
            const upd = () => {
                const link = input.value, msg = encodeURIComponent('\uD83C\uDF82 A birthday surprise for you! ' + link);
                $('.ws-wa', row).href = 'https://wa.me/?text=' + msg;
                $('.ws-tg', row).href = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('\uD83C\uDF82 A birthday surprise for you!');
            };
            $('#btn-copy-share-link') && $('#btn-copy-share-link').addEventListener('click', () => setTimeout(upd, 50));
            const nb = $('.ws-native', row);
            if (nb) nb.addEventListener('click', () => navigator.share({ title: 'Happy Birthday!', url: input.value }).catch(() => {}));
            if (location.protocol === 'file:') {
                const w = document.createElement('div'); w.className = 'ws-warn';
                w.textContent = '\u26A0\uFE0F Local file: WhatsApp / Telegram links will only open on this PC.';
                card.appendChild(w);
            }
        }

        /* 4. fullscreen toggle for the celebration page */
        const nav = $('.top-nav');
        if (nav && document.fullscreenEnabled && !$('.ws-fs-btn')) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'ws-fs-btn';
            b.title = 'Fullscreen'; b.setAttribute('aria-label', 'Toggle fullscreen'); b.textContent = '\u26F6';
            b.addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
            const snd = $('#sound-toggle-btn'); nav.insertBefore(b, snd);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)); else setTimeout(init, 0);
})();
