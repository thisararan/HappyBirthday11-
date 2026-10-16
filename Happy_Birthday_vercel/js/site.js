/* Website behaviours: nav state, active link, section reveal, animated stats */
(function () {
    const studio = document.getElementById('studio-view');
    if (!studio) return;
    const nav = document.getElementById('site-nav');

    // Nav gets a solid look after scrolling
    const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Highlight the nav link of the section in view
    const links = [...document.querySelectorAll('.nav-links a')];
    if ('IntersectionObserver' in window) {
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        ['create', 'how', 'features', 'faq'].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

        // Staggered reveal for section content
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
        }, { threshold: 0.15 });
        studio.querySelectorAll('.site-section').forEach((sec) => {
            sec.querySelectorAll('.eyebrow, h2, .site-card, details').forEach((el, i) => {
                el.style.transitionDelay = Math.min(i * 90, 450) + 'ms';
                io.observe(el);
            });
        });
    } else {
        studio.querySelectorAll('.site-section *').forEach((el) => el.classList.add('in'));
    }

    // Count-up for hero stats
    const stats = studio.querySelectorAll('.hero-stats b[data-count]');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) stats.forEach((el) => {
        const target = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
        if (!target) return;
        const t0 = performance.now(), dur = 1400;
        const tick = (t) => {
            const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
            el.textContent = pre + Math.round(target * e) + suf;
            if (p < 1) requestAnimationFrame(tick);
        };
        el.textContent = pre + '0' + suf;
        requestAnimationFrame(tick);
    });
})();

/* ---------- Custom dropdowns (glass menu, keyboard accessible, stays in sync with the native <select>) ---------- */
(function () {
    const selects = [...document.querySelectorAll('#studio-view select.form-control')];
    if (!selects.length) return;
    const valDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    const emojiRe = /^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u;
    let openInst = null;

    function closeOpen() { if (openInst) openInst.close(); }
    document.addEventListener('pointerdown', (e) => {
        if (openInst && !openInst.wrap.contains(e.target) && !openInst.list.contains(e.target)) closeOpen();
    });
    window.addEventListener('resize', closeOpen);
    window.addEventListener('scroll', (e) => { if (openInst && !openInst.list.contains(e.target)) closeOpen(); }, true);

    selects.forEach((sel) => {
        const wrap = document.createElement('div'); wrap.className = 'cs';
        sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
        sel.classList.add('cs-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');

        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'cs-btn';
        btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', sel.getAttribute('aria-label') || 'Select');
        btn.innerHTML = '<span class="cs-label"></span><svg class="cs-caret" viewBox="0 0 20 20" width="18" height="18"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        wrap.appendChild(btn);
        const label = btn.querySelector('.cs-label');
        const list = document.createElement('div');
        list.className = 'cs-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
        document.body.appendChild(list);

        let items = [], active = -1;
        const inst = { wrap, list, close };

        function cell(text) {
            const m = emojiRe.exec(text);
            return m ? '<span class="cs-emoji">' + m[1] + '</span><span class="cs-text">' + esc(m[2]) + '</span>' : '<span class="cs-text">' + esc(text) + '</span>';
        }
        function esc(s) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

        function build() {
            list.innerHTML = ''; items = [];
            [...sel.children].forEach((node) => {
                if (node.tagName === 'OPTGROUP') {
                    const g = document.createElement('div'); g.className = 'cs-group'; g.textContent = node.label; list.appendChild(g);
                    [...node.children].forEach(addOpt);
                } else addOpt(node);
            });
            sync();
        }
        function addOpt(o) {
            const d = document.createElement('div');
            d.className = 'cs-opt'; d.setAttribute('role', 'option'); d.innerHTML = cell(o.textContent.trim());
            d.dataset.value = o.value; d.id = (sel.id || 'cs') + '-opt-' + items.length;
            d.addEventListener('click', () => { choose(d.dataset.value); close(); btn.focus(); });
            d.addEventListener('pointermove', () => setActive(items.indexOf(d), false));
            list.appendChild(d); items.push(d);
        }
        function sync() {
            const cur = valDesc.get.call(sel);
            items.forEach((d) => { const on = d.dataset.value === cur; d.classList.toggle('selected', on); d.setAttribute('aria-selected', on); });
            const o = sel.options[sel.selectedIndex];
            label.innerHTML = o ? cell(o.textContent.trim()) : '';
        }
        function choose(v) {
            if (valDesc.get.call(sel) === v) return;
            valDesc.set.call(sel, v); sync();
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        function setActive(i, scroll) {
            if (i < 0 || i >= items.length) return;
            if (items[active]) items[active].classList.remove('active');
            active = i; items[i].classList.add('active');
            btn.setAttribute('aria-activedescendant', items[i].id);
            if (scroll !== false) items[i].scrollIntoView({ block: 'nearest' });
        }
        function place() {
            const r = btn.getBoundingClientRect(), w = Math.max(r.width, 250);
            const below = innerHeight - r.bottom - 14, above = r.top - 14, up = below < 220 && above > below;
            list.classList.toggle('up', up);
            list.style.width = w + 'px';
            list.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
            list.style.maxHeight = Math.min(360, up ? above : below) + 'px';
            if (up) { list.style.top = 'auto'; list.style.bottom = (innerHeight - r.top + 8) + 'px'; }
            else { list.style.bottom = 'auto'; list.style.top = (r.bottom + 8) + 'px'; }
        }
        function open() {
            closeOpen(); place(); list.hidden = false; wrap.classList.add('open');
            btn.setAttribute('aria-expanded', 'true'); openInst = inst;
            setActive(Math.max(0, items.findIndex((d) => d.classList.contains('selected'))));
        }
        function close() {
            list.hidden = true; wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
            if (openInst === inst) openInst = null;
        }
        btn.addEventListener('click', () => (list.hidden ? open() : close()));
        btn.addEventListener('keydown', (e) => {
            const k = e.key;
            if (list.hidden) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); open(); } return; }
            if (k === 'ArrowDown') { e.preventDefault(); setActive(Math.min(items.length - 1, active + 1)); }
            else if (k === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
            else if (k === 'Home') { e.preventDefault(); setActive(0); }
            else if (k === 'End') { e.preventDefault(); setActive(items.length - 1); }
            else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (items[active]) choose(items[active].dataset.value); close(); }
            else if (k === 'Escape' || k === 'Tab') close();
            else if (k.length === 1) {
                const i = items.findIndex((d) => d.textContent.replace(/^\P{L}+/u, '').toLowerCase().startsWith(k.toLowerCase()));
                if (i > -1) setActive(i);
            }
        });
        // keep the custom UI in sync when app code sets select.value or swaps options
        Object.defineProperty(sel, 'value', { configurable: true, get() { return valDesc.get.call(sel); }, set(v) { valDesc.set.call(sel, v); sync(); } });
        new MutationObserver(build).observe(sel, { childList: true, subtree: true });
        sel.addEventListener('change', sync);
        build();
    });
})();
