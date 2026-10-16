/* Modern editor behaviours: template gallery with live thumbnails, scroll progress, mobile action bar */
(function () {
    function init() {
        // scroll progress + mobile proxy buttons (no dependency on the app instance)
        const bar = document.getElementById('scroll-progress');
        if (bar) {
            const upd = () => {
                const h = document.documentElement.scrollHeight - innerHeight;
                bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
            };
            addEventListener('scroll', upd, { passive: true }); upd();
        }
        document.querySelectorAll('[data-proxy]').forEach((b) =>
            b.addEventListener('click', () => {
                if (b.dataset.scroll) { const t = document.getElementById(b.dataset.scroll); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
                const t = document.getElementById(b.dataset.proxy); if (t) t.click();
            }));


        // light / dark mode toggle (remembered)
        const tog = document.getElementById('ui-toggle');
        if (tog) {
            const apply = (mode) => {
                document.documentElement.setAttribute('data-ui', mode);
                tog.textContent = mode === 'light' ? '\uD83C\uDF19' : '\u2600\uFE0F';
                try { localStorage.setItem('ws-ui', mode); } catch (e) { /* storage unavailable */ }
            };
            apply(document.documentElement.getAttribute('data-ui') === 'light' ? 'light' : 'dark');
            tog.addEventListener('click', () => apply(document.documentElement.getAttribute('data-ui') === 'light' ? 'dark' : 'light'));
        }

        // drag & drop photos onto the upload button / area
        const input = document.getElementById('input-photos');
        const zone = document.getElementById('btn-add-photos-trigger');
        if (input && zone) {
            const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
            ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { stop(e); zone.classList.add('dragging'); }));
            ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { stop(e); zone.classList.remove('dragging'); }));
            zone.addEventListener('drop', (e) => {
                const files = [...(e.dataTransfer.files || [])].filter((f) => f.type.startsWith('image/'));
                if (!files.length) return;
                const dt = new DataTransfer();
                files.forEach((f) => dt.items.add(f));
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }

        // template gallery
        const app = window.birthdayApp, PG = window.PostGenerator;
        const gal = document.getElementById('tpl-gallery'), sel = document.getElementById('select-post-template');
        if (!app || !PG || !gal || !sel) return;

        // ===== Photo crop tool =====
        const grid = document.getElementById('studio-photos-grid');
        let ov = null, st = null;
        const RATIOS = [['1 : 1', 1], ['4 : 5', 4 / 5], ['3 : 4', 3 / 4], ['16 : 9', 16 / 9], ['9 : 16', 9 / 16]];

        function build() {
            ov = document.createElement('div');
            ov.className = 'crop-overlay'; ov.hidden = true;
            ov.innerHTML = '<div class="crop-dialog" role="dialog" aria-modal="true" aria-label="Crop photo">' +
                '<div class="crop-head"><b>\u2702\uFE0F Crop photo</b><button type="button" class="crop-x" aria-label="Close">\u2715</button></div>' +
                '<div class="crop-stage"><div class="crop-frame"><canvas></canvas></div></div>' +
                '<p class="crop-hint">Drag to move \u00B7 scroll, pinch or use the slider to zoom</p>' +
                '<div class="crop-ratios"></div>' +
                '<label class="crop-zoom"><span>\uD83D\uDD0D</span><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom"></label>' +
                '<div class="crop-actions"><button type="button" class="btn btn-secondary crop-cancel">Cancel</button><button type="button" class="btn btn-primary crop-apply">\u2713 Apply crop</button></div></div>';
            document.body.appendChild(ov);
            const rb = ov.querySelector('.crop-ratios');
            RATIOS.forEach(([label, r], i) => {
                const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
                b.addEventListener('click', () => setRatio(r, b)); rb.appendChild(b);
                if (i === 0) b.classList.add('on');
            });
            ov.querySelector('.crop-x').addEventListener('click', closeCrop);
            ov.querySelector('.crop-cancel').addEventListener('click', closeCrop);
            ov.addEventListener('pointerdown', (e) => { if (e.target === ov) closeCrop(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov && !ov.hidden) { e.stopImmediatePropagation(); closeCrop(); } }, true);
            ov.querySelector('.crop-apply').addEventListener('click', applyCrop);
            ov.querySelector('input[type=range]').addEventListener('input', (e) => setZoom(+e.target.value));
            const fr = ov.querySelector('.crop-frame'), pts = new Map();
            let pinch = 0;
            fr.addEventListener('pointerdown', (e) => { fr.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); pinch = 0; });
            fr.addEventListener('pointermove', (e) => {
                if (!pts.has(e.pointerId) || !st) return;
                const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
                if (pts.size === 1) { st.ox += e.clientX - prev[0]; st.oy += e.clientY - prev[1]; draw(); }
                else if (pts.size === 2) {
                    const [a, c] = [...pts.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]);
                    if (pinch) setZoom(st.zoom * d / pinch); pinch = d;
                }
            });
            const up = (e) => { pts.delete(e.pointerId); pinch = 0; };
            fr.addEventListener('pointerup', up); fr.addEventListener('pointercancel', up);
            fr.addEventListener('wheel', (e) => { if (!st) return; e.preventDefault(); setZoom(st.zoom * (e.deltaY < 0 ? 1.08 : 0.92)); }, { passive: false });
        }
        function layout() {
            const maxW = Math.min(440, innerWidth - 90), maxH = Math.min(360, innerHeight - 380);
            let w = Math.min(maxW, maxH * st.ratio), h = w / st.ratio;
            if (h > maxH) { h = maxH; w = h * st.ratio; }
            st.cw = Math.round(w); st.ch = Math.round(h);
            st.cv.width = st.cw; st.cv.height = st.ch;
            st.s0 = Math.max(st.cw / st.img.naturalWidth, st.ch / st.img.naturalHeight);
            st.zoom = 1; st.ox = (st.cw - st.img.naturalWidth * st.s0) / 2; st.oy = (st.ch - st.img.naturalHeight * st.s0) / 2;
            ov.querySelector('input[type=range]').value = 1;
            draw();
        }
        function draw() {
            const s = st.s0 * st.zoom, iw = st.img.naturalWidth * s, ih = st.img.naturalHeight * s;
            st.ox = Math.min(0, Math.max(st.cw - iw, st.ox)); st.oy = Math.min(0, Math.max(st.ch - ih, st.oy));
            const c = st.cv.getContext('2d'); c.clearRect(0, 0, st.cw, st.ch);
            c.drawImage(st.img, st.ox, st.oy, iw, ih);
        }
        function setZoom(z) {
            z = Math.min(4, Math.max(1, z));
            const old = st.s0 * st.zoom, nw = st.s0 * z;
            const cx = (st.cw / 2 - st.ox) / old, cy = (st.ch / 2 - st.oy) / old;
            st.zoom = z; st.ox = st.cw / 2 - cx * nw; st.oy = st.ch / 2 - cy * nw;
            ov.querySelector('input[type=range]').value = z; draw();
        }
        function setRatio(r, btn) {
            ov.querySelectorAll('.crop-ratios button').forEach((b) => b.classList.toggle('on', b === btn));
            st.ratio = r; layout();
        }
        function openCrop(idx) {
            const src = app.currentData.photos[idx];
            if (!src) return;
            if (!ov) build();
            const img = new Image();
            img.onload = () => {
                st = { idx, img, ratio: 1, cv: ov.querySelector('canvas') };
                ov.querySelectorAll('.crop-ratios button').forEach((b, i) => b.classList.toggle('on', i === 0));
                ov.hidden = false; layout();
                ov.querySelector('.crop-apply').focus();
            };
            img.src = src;
        }
        function closeCrop() { if (ov) ov.hidden = true; st = null; }
        function applyCrop() {
            if (!st) return;
            const s = st.s0 * st.zoom, sx = -st.ox / s, sy = -st.oy / s, sw = st.cw / s, sh = st.ch / s;
            const ow = Math.max(1, Math.min(900, Math.round(sw))), oh = Math.max(1, Math.round(ow * st.ch / st.cw));
            const out = document.createElement('canvas'); out.width = ow; out.height = oh;
            const c = out.getContext('2d'); c.imageSmoothingQuality = 'high';
            c.drawImage(st.img, sx, sy, sw, sh, 0, 0, ow, oh);
            app.currentData.photos[st.idx] = out.toDataURL('image/jpeg', 0.85);
            closeCrop(); app.renderStudioPhotosList();
            if (app.showToast) app.showToast('\u2702\uFE0F Photo cropped!');
        }
        function decorate() {
            if (!grid) return;
            [...grid.children].forEach((thumb, i) => {
                if (thumb.querySelector('.crop-thumb-btn') || !thumb.querySelector('.remove-thumb-btn')) return;
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'crop-thumb-btn'; b.title = 'Crop this photo'; b.setAttribute('aria-label', 'Crop photo'); b.textContent = '\u2702';
                b.addEventListener('click', (e) => { e.stopPropagation(); openCrop([...grid.children].indexOf(thumb)); });
                thumb.appendChild(b);
            });
        }
        if (grid) { new MutationObserver(decorate).observe(grid, { childList: true }); decorate(); }
        const keys = Object.keys(PG.TEMPLATES), tiles = {};
        keys.forEach((k) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'tpl-tile'; b.dataset.key = k; b.setAttribute('role', 'option');
            const c = document.createElement('canvas'); c.width = 184; c.height = 184;
            const l = document.createElement('span'); l.textContent = PG.TEMPLATES[k].label.replace(/^\S+\s*/, '');
            b.append(c, l); gal.appendChild(b); tiles[k] = b;
            b.addEventListener('click', () => { sel.value = k; sel.dispatchEvent(new Event('change', { bubbles: true })); mark(); });
        });
        function mark() {
            keys.forEach((k) => { const on = sel.value === k; tiles[k].classList.toggle('on', on); tiles[k].setAttribute('aria-selected', on); });
            const n = document.getElementById('live-tpl-name');
            if (n && PG.TEMPLATES[sel.value]) n.textContent = PG.TEMPLATES[sel.value].label;
            const t = tiles[sel.value];
            if (t) gal.scrollTo({ left: t.offsetLeft - gal.clientWidth / 2 + t.offsetWidth / 2, behavior: 'smooth' });
        }
        let token = 0, timer;
        async function paint() {
            const my = ++token;
            try {
                const { imgs, pal } = await PG.prepare(app.currentData);
                if (my !== token) return;
                keys.forEach((k) => {
                    const c = tiles[k].querySelector('canvas'), ctx = c.getContext('2d');
                    ctx.setTransform(c.width / 1080, 0, 0, c.width / 1080, 0, 0);
                    ctx.clearRect(0, 0, 1080, 1080);
                    PG.TEMPLATES[k].draw(ctx, 1080, 1080, app.currentData, imgs.length > 1 ? imgs.slice(0, 1) : imgs, 0.2, pal);
                });
            } catch (e) { /* thumbnails are best-effort */ }
        }
        const later = () => { clearTimeout(timer); timer = setTimeout(paint, 450); };
        const orig = app.schedulePostPreview.bind(app);
        app.schedulePostPreview = function () { orig(); later(); mark(); };
        sel.addEventListener('change', mark);
        mark(); paint();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
