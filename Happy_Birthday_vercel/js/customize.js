/* Theme Studio: full colour / font / shape customizer.
   Overrides are stored in app.currentData.custom, so they travel in the share link
   and in the standalone HTML export. Untouched values keep the chosen theme's look. */
(function () {
    const COLORS = [
        ['bg', 'Background', '--bg-color'], ['text', 'Text', '--text-color'],
        ['accent', 'Accent 1', '--accent-color'], ['accent2', 'Accent 2 (gradient)', null],
        ['card', 'Card', '--card-glass-bg'], ['btnText', 'Button text', '--btn-primary-text'],
        ['gift', 'Gift box', null], ['ribbon', 'Ribbon', '--gift-ribbon'],
        ['cake1', 'Cake bottom', '--cake-tier-base'], ['cake2', 'Cake middle', '--cake-tier-mid'],
        ['cake3', 'Cake top', '--cake-tier-top']
    ];
    const FONTS = {
        'Outfit': 'Outfit:wght@300;400;600;800', 'Poppins': 'Poppins:wght@400;600;800', 'Montserrat': 'Montserrat:wght@400;600;800',
        'Inter': 'Inter:wght@400;600;800', 'Nunito': 'Nunito:wght@400;700;900', 'Quicksand': 'Quicksand:wght@400;600;700',
        'Playfair Display': 'Playfair+Display:ital,wght@0,600;0,800;1,400', 'Lora': 'Lora:ital,wght@0,500;0,700;1,500',
        'Cormorant Garamond': 'Cormorant+Garamond:wght@500;700', 'Abril Fatface': 'Abril+Fatface', 'Bebas Neue': 'Bebas+Neue',
        'Oswald': 'Oswald:wght@400;600;700', 'Pacifico': 'Pacifico', 'Caveat': 'Caveat:wght@600;700', 'Dancing Script': 'Dancing+Script:wght@500;700',
        'Great Vibes': 'Great+Vibes', 'Lobster': 'Lobster', 'Permanent Marker': 'Permanent+Marker', 'Orbitron': 'Orbitron:wght@500;800',
        'Press Start 2P': 'Press+Start+2P', 'Noto Sans Sinhala': 'Noto+Sans+Sinhala:wght@400;600;800', 'Noto Serif Sinhala': 'Noto+Serif+Sinhala:wght@400;700'
    };
    const PRESETS = {
        '👑 Gold': { bg: '#0b0c10', text: '#f7f9fa', accent: '#ffd700', accent2: '#ff9900', card: '#161820', btnText: '#0b0c10', gift: '#2d3340', ribbon: '#ffd700', cake1: '#2a2215', cake2: '#42351c', cake3: '#ffd700' },
        '🌹 Rose': { bg: '#160811', text: '#fff0f5', accent: '#ff3366', accent2: '#ff758c', card: '#2d0e20', btnText: '#ffffff', gift: '#ff2e63', ribbon: '#ffffff', cake1: '#800020', cake2: '#c70039', cake3: '#ff758c' },
        '🌿 Mint': { bg: '#061712', text: '#f2fbf7', accent: '#10b981', accent2: '#f59e0b', card: '#08261c', btnText: '#ffffff', gift: '#047857', ribbon: '#fbbf24', cake1: '#064e3b', cake2: '#059669', cake3: '#34d399' },
        '🌊 Ocean': { bg: '#04141f', text: '#eaf9ff', accent: '#22d3ee', accent2: '#0ea5e9', card: '#08283c', btnText: '#04141f', gift: '#0369a1', ribbon: '#e0f7ff', cake1: '#0c4a6e', cake2: '#0ea5e9', cake3: '#e0f7ff' },
        '🍬 Candy': { bg: '#25103f', text: '#ffffff', accent: '#ff79c6', accent2: '#ffb86c', card: '#421c68', btnText: '#2b0f3f', gift: '#8be9fd', ribbon: '#f1fa8c', cake1: '#ff79c6', cake2: '#8be9fd', cake3: '#f1fa8c' },
        '☀️ Light': { bg: '#fff7ed', text: '#2b1d14', accent: '#e11d48', accent2: '#f97316', card: '#ffffff', btnText: '#ffffff', gift: '#e11d48', ribbon: '#fde68a', cake1: '#fbcfe8', cake2: '#fff1f2', cake3: '#fde68a' }
    };
    const NUM = { alpha: [0.2, 1, 0.01, 0.78, 'Card opacity'], radius: [0, 48, 1, 24, 'Card roundness'], title: [0.6, 1.6, 0.05, 1, 'Heading size'], text: [0.8, 1.6, 0.05, 1, 'Message size'] };
    const FONT_ROLES = [['p', 'Main font (headings, text)', '--font-primary', 'sans-serif'], ['s', 'Serif font (quotes, titles)', '--font-serif', 'serif'], ['h', 'Handwriting font (date, signature)', '--font-handwriting', 'cursive']];

    const rgb = h => { h = (h || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const rgba = (h, a) => `rgba(${rgb(h).join(',')},${a})`;
    const shade = (h, k) => '#' + rgb(h).map(v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
    const hex = s => { const m = (s || '').match(/\d+(\.\d+)?/g); return m && m.length >= 3 ? '#' + m.slice(0, 3).map(v => (+v | 0).toString(16).padStart(2, '0')).join('') : '#000000'; };

    function fontHref(c) {
        const f = (c && c.f) || {}, fam = [...new Set(Object.values(f))].filter(n => FONTS[n]);
        return fam.length ? 'https://fonts.googleapis.com/css2?' + fam.map(n => 'family=' + FONTS[n]).join('&') + '&display=swap' : '';
    }

    const lum = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
    /* Colours that the 12 layout templates hard-code (borders, glows, rings) follow the custom colours too */
    function tplCss(k) {
        const B = 'html body:not(#cx)', a1 = k.accent, a2 = k.accent2 || k.accent, r = [];
        const T = (t, rule) => r.push(`${B}.template-${t} ${rule}`);
        if (a1) {
            const A = (x) => rgba(a1, x), A2 = (x) => rgba(a2, x);
            T('magazine', `.celebration-content-grid{border-color:${A(.45)}!important;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 40px ${A(.18)}!important}`);
            T('magazine', `.masthead-tag{color:${a1}!important}`);
            T('magazine', `.masthead-title{background:linear-gradient(135deg,${k.text || '#fff'} 20%,${a1} 80%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important}`);
            T('magazine', `.magazine-masthead{border-bottom-color:${A(.35)}!important}`);
            T('magazine', `.photo-wrapper{border-color:${A(.55)}!important}`);
            T('magazine', `.cake-card{background:${A(.06)}!important;border-color:${A(.22)}!important}`);
            r.push(`${B}.template-magazine .polaroid-caption,${B}.template-magazine .caption-date{color:${a1}!important}`);
            T('stage', `.cake-card{border-color:${a1}!important;box-shadow:0 0 35px ${A(.4)},inset 0 0 25px ${A(.2)}!important}`);
            T('stage', `.stage-spotlight{background:radial-gradient(ellipse at top,${A(.35)} 0%,transparent 70%)!important}`);
            T('cyber', `.celebration-content-grid{border-color:${a1}!important;box-shadow:0 0 30px ${A(.25)},inset 0 0 20px ${A(.08)}!important}`);
            T('cyber', `.celebration-content-grid::before{background:${a1}!important;color:${k.bg || '#050811'}!important}`);
            T('cyber', `.photo-wrapper,${B}.template-cyber .polaroid-frame{border-color:${a1}!important}`);
            T('cyber', `.photo-wrapper{box-shadow:0 0 15px ${A(.4)}!important}`);
            r.push(`${B}.template-cyber .caption-date{color:${a1}!important}${B}.template-cyber .custom-message-text{border-left-color:${a1}!important;color:${k.text || 'inherit'}!important}`);
            T('sunset', `.celebration-content-grid{background:linear-gradient(160deg,${A(.14)},${A2(.18)})!important;border-color:${A(.38)}!important}`);
            T('sunset', `.photo-wrapper{border-color:${a1}!important;box-shadow:0 0 0 8px ${A(.18)},0 18px 40px rgba(0,0,0,.5)!important}`);
            T('candy', `.celebration-content-grid{background:linear-gradient(180deg,${A(.16)},${A2(.12)})!important;box-shadow:0 0 0 8px ${A(.25)},0 30px 70px rgba(0,0,0,.5)!important}`);
            T('candy', `.photo-wrapper{box-shadow:0 0 0 8px ${a1},0 0 0 16px ${a2},0 20px 40px rgba(0,0,0,.45)!important}`);
            r.push(`${B}.template-ocean{background-image:radial-gradient(circle at 12% 18%,${A(.16)} 0 60px,transparent 62px),radial-gradient(circle at 88% 30%,${A2(.16)} 0 90px,transparent 92px),radial-gradient(circle at 70% 85%,${A(.12)} 0 50px,transparent 52px)!important}`);
            T('ocean', `.cake-card,${B}.template-ocean .wish-card{border-color:${A(.42)}!important;box-shadow:0 0 40px ${A2(.22)}!important}`);
            T('ocean', `.photo-wrapper{border-color:${a1}!important;box-shadow:0 0 30px ${A(.45)}!important}`);
            T('ice', `.celebration-content-grid{border-color:${A(.5)}!important;box-shadow:0 30px 80px rgba(0,0,0,.5),inset 0 0 0 10px ${k.bg || '#0a1220'},inset 0 0 0 11px ${A(.3)}!important}`);
            T('ice', `.cake-card{border-left-color:${A(.3)}!important}`);
            T('sakura', `.celebration-content-grid{background:linear-gradient(180deg,${A(.16)},${A(.04)})!important;border-color:${A(.45)}!important;box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 50px ${A(.15)}!important}`);
            T('sakura', `.photo-wrapper{border-color:${a1}!important;box-shadow:0 0 0 7px ${A(.25)},0 18px 40px rgba(0,0,0,.45)!important}`);
            r.push(`${B}.template-retro{background-image:linear-gradient(${A2(.14)} 1px,transparent 1px),linear-gradient(90deg,${A2(.14)} 1px,transparent 1px)!important}`);
            T('retro', `.cake-card,${B}.template-retro .wish-card{border-color:${a2}!important;box-shadow:8px 8px 0 ${a1}!important}`);
            T('retro', `.polaroid-frame{border-color:${k.ribbon || a1}!important;box-shadow:6px 6px 0 ${a2}!important}`);
            r.push(`${B}.template-retro .caption-date{color:${k.ribbon || a1}!important}`);
        }
        if (k.card) {
            const dark = lum(k.card) < 0.55, ink = dark ? '#f4f0ff' : '#2b1d14', mut = dark ? '#c9c2e0' : '#6b5a4c';
            T('scrapbook', `.celebration-content-grid{background:${k.card}!important;color:${ink}!important;--text-color:${ink};--text-muted:${mut}}`);
            T('scrapbook', `.wish-card,${B}.template-scrapbook .custom-message-text,${B}.template-scrapbook .cake-instruction{color:${ink}!important}`);
            if (a1) T('scrapbook', `.celebration-content-grid{border-color:${shade(a1, .55)}!important}`);
            T('magazine', `.celebration-content-grid{background:linear-gradient(180deg,${shade(k.card, 1.15)},${shade(k.card, .8)})!important}`);
        }
        return r.join('\n');
    }
    function css(c) {
        if (!c) return '';
        const k = c.c || {}, n = c.n || {}, f = c.f || {}, v = [], r = [];
        const set = (name, val) => v.push(`${name}:${val}`);
        if (k.bg) { set('--bg-color', k.bg); }
        if (k.text) { set('--text-color', k.text); set('--text-muted', rgba(k.text, .68)); }
        const a1 = k.accent, a2 = k.accent2 || k.accent;
        if (a1) {
            set('--accent-color', a1); set('--accent-glow', a1); set('--accent-focus-ring', rgba(a1, .35)); set('--border-color', rgba(a1, .32));
            set('--accent-gradient', `linear-gradient(135deg,${a1},${a2})`);
            set('--title-gradient', `linear-gradient(135deg,${k.text || '#ffffff'} 15%,${a1} 70%,${a2} 100%)`);
            set('--btn-primary-bg', `linear-gradient(135deg,${a1},${a2})`);
        }
        if (k.btnText) { set('--btn-primary-text', k.btnText); set('--badge-text', k.btnText); }
        if (k.card || n.alpha != null) {
            const cc = k.card || '#161820', al = n.alpha != null ? n.alpha : .78;
            set('--card-glass-bg', rgba(cc, al)); set('--card-glass-hover', rgba(cc, Math.min(1, al + .1)));
        }
        if (k.gift) { set('--gift-box-bg', `linear-gradient(135deg,${k.gift},${shade(k.gift, .72)})`); set('--gift-box-lid', `linear-gradient(135deg,${shade(k.gift, .8)},${shade(k.gift, .6)})`); }
        if (k.ribbon) set('--gift-ribbon', k.ribbon);
        if (k.cake1) set('--cake-tier-base', k.cake1);
        if (k.cake2) set('--cake-tier-mid', k.cake2);
        if (k.cake3) set('--cake-tier-top', k.cake3);
        // Fonts are scoped to the celebration page (+ its modals and the live preview) so the Studio editor UI keeps its own font
        const fv = [];
        FONT_ROLES.forEach(([key, , cssVar, fb]) => { if (f[key]) fv.push(`${cssVar}:'${f[key]}', ${fb}`); });
        if (fv.length) r.push(`html body:not(#cx) #recipient-view,html body:not(#cx) .wish-modal-overlay,html body:not(#cx) .cx-pv{${fv.join(';')};font-family:var(--font-primary)}`);
        r.push(`html body:not(#cx){${v.join(';')}}`);
        if (k.bg) r.push(`html body:not(#cx){background-color:${k.bg}}`);
        if (c.grad && k.bg && c.bg2) r.push(`html body:not(#cx){background:linear-gradient(160deg,${k.bg},${c.bg2}) fixed}`);
        if (f.s) r.push(`html body:not(#cx) .masthead-title,html body:not(#cx) .quote-widget-text{font-family:var(--font-serif)!important}`);
        if (f.h) r.push(`html body:not(#cx).template-scrapbook .custom-message-text,html body:not(#cx) .quote-signature,html body:not(#cx) .caption-date{font-family:var(--font-handwriting)!important}`);
        if (f.p) r.push(`html body:not(#cx).template-scrapbook .custom-message-text{font-family:var(--font-primary)!important}`);
        if (n.radius != null) r.push(`html body:not(#cx) .glass-card,html body:not(#cx) .cake-card,html body:not(#cx) .wish-card{border-radius:${n.radius}px!important}`);
        if (n.title != null) r.push(`html body:not(#cx) .big-birthday-heading{font-size:calc(clamp(1.9rem,8vw,3.2rem)*${n.title})!important}html body:not(#cx) .masthead-title{font-size:calc(clamp(1.7rem,7vw,3.4rem)*${n.title})!important}`);
        if (n.text != null) r.push(`html body:not(#cx) .custom-message-text{font-size:calc(1.15rem*${n.text})!important}`);
        r.push(tplCss(k));
        return r.join('\n');
    }
    function html(c) {
        if (!c) return '';
        const h = fontHref(c), s = css(c);
        return (h ? `<link rel="stylesheet" href="${h}">\n` : '') + (s ? `<style id="cx-style">\n${s}\n</style>` : '');
    }
    window.WishCustom = { css, html, fontHref };

    /* ---------------- Studio UI ---------------- */
    const $ = (s, el) => (el || document).querySelector(s);
    let app, custom, panel;
    const empty = () => ({ c: {}, n: {}, f: {} });

    function apply() {
        let st = $('#cx-style'), lk = $('#cx-fonts');
        if (!st) { st = document.createElement('style'); st.id = 'cx-style'; document.head.appendChild(st); }
        st.textContent = css(custom);
        const h = fontHref(custom);
        if (h) { if (!lk) { lk = document.createElement('link'); lk.id = 'cx-fonts'; lk.rel = 'stylesheet'; document.head.appendChild(lk); } if (lk.href !== h) lk.href = h; }
        else if (lk) lk.remove();
        if (app) app.currentData.custom = isEmpty() ? undefined : custom;
        paintPreview();
        clearTimeout(apply._t); apply._t = setTimeout(() => { if (app && app.schedulePostPreview) { try { app.schedulePostPreview(); } catch (e) {} } }, 250);
    }
    function paintPreview() {
        const pv = $('.cx-pv', panel || document); if (!pv) return;
        const n = custom.n, k = custom.c;
        pv.style.background = (custom.grad && custom.bg2) ? `linear-gradient(160deg,${k.bg || 'var(--bg-color)'},${custom.bg2})` : 'var(--bg-color)';
        pv.style.setProperty('--r', (n.radius != null ? n.radius : 24) + 'px');
        pv.style.setProperty('--hs', n.title != null ? n.title : 1);
        pv.style.setProperty('--ts', n.text != null ? n.text : 1);
        const nm = app && app.currentData && app.currentData.name;
        const el = $('.cx-pv-name', pv); if (el) el.textContent = nm || 'Name';
    }
    function isEmpty() { return !Object.keys(custom.c).length && !Object.keys(custom.n).length && !Object.keys(custom.f).length && !custom.grad; }

    function syncInputs() {
        const cs = getComputedStyle(document.body);
        COLORS.forEach(([key, , cssVar]) => {
            const el = $(`[data-cx-color="${key}"]`, panel); if (!el) return;
            if (custom.c[key]) { el.value = custom.c[key]; return; }
            let val = cssVar ? cs.getPropertyValue(cssVar).trim() : '';
            if (key === 'accent2') { const g = cs.getPropertyValue('--accent-gradient').match(/#[0-9a-f]{3,6}/gi); val = g ? g[g.length - 1] : ''; }
            if (key === 'gift') { const g = cs.getPropertyValue('--gift-box-bg').match(/#[0-9a-f]{3,6}/gi); val = g ? g[0] : ''; }
            if (/^#/.test(val)) el.value = val.length === 4 ? '#' + val.slice(1).replace(/./g, '$&$&') : val; else if (/^rgb/.test(val)) el.value = hex(val);
        });
        Object.keys(NUM).forEach(k => { const el = $(`[data-cx-num="${k}"]`, panel); if (el) { const val = custom.n[k] != null ? custom.n[k] : NUM[k][3]; el.value = val; el.nextElementSibling.textContent = val; } });
        FONT_ROLES.forEach(([key]) => { const el = $(`[data-cx-font="${key}"]`, panel); if (el) el.value = custom.f[key] || ''; });
        const g = $('[data-cx-grad]', panel); if (g) g.checked = !!custom.grad;
        const b2 = $('[data-cx-bg2]', panel); if (b2) b2.value = custom.bg2 || '#2a0f45';
    }
    function setCustom(c) { custom = Object.assign(empty(), c || {}); custom.c = custom.c || {}; custom.n = custom.n || {}; custom.f = custom.f || {}; apply(); syncInputs(); }

    function build() {
        const anchor = $('.theme-selector-grid');
        if (!anchor) return;
        panel = document.createElement('div');
        panel.className = 'form-group full-width cx-panel';
        panel.innerHTML = `
        <details class="cx-details" open>
          <summary>🎛️ Theme Studio <small>— customize every colour, font &amp; shape</small></summary>
          <div class="cx-live"><div class="cx-live-tag">● LIVE PREVIEW</div>
            <div class="cx-pv">
              <span class="cx-pv-pill">Level 24 Unlocked!</span>
              <div class="cx-pv-h">Happy Birthday <span class="cx-pv-name">Name</span></div>
              <div class="cx-pv-row">
                <div class="cx-pv-art">
                  <div class="cx-gift"><i class="cx-lid"></i><i class="cx-body"></i><i class="cx-rv"></i></div>
                  <div class="cx-cake"><i class="t3"></i><i class="t2"></i><i class="t1"></i></div>
                </div>
                <div class="cx-pv-card">
                  <div class="cx-pv-msg">May this year bring you endless joy and unforgettable adventures!</div>
                  <div class="cx-pv-serif">“Another year of being awesome”</div>
                  <div class="cx-pv-hand">— With Lots of Love ❤️</div>
                  <div class="cx-pv-btns"><span class="cx-pv-btn">🎁 Open</span><span class="cx-pv-btn2">Share</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="cx-block"><div class="cx-title">Quick palettes</div><div class="cx-presets">${Object.keys(PRESETS).map(p => `<button type="button" class="preset-btn" data-cx-preset="${p}">${p}</button>`).join('')}</div></div>
          <div class="cx-block"><div class="cx-title">Colours</div><div class="cx-colors">${COLORS.map(([k, l]) => `<label class="cx-color"><input type="color" data-cx-color="${k}" value="#000000"><span>${l}</span></label>`).join('')}</div>
            <div class="cx-grad"><label><input type="checkbox" data-cx-grad> Gradient background</label><input type="color" data-cx-bg2 value="#2a0f45"></div></div>
          <div class="cx-block"><div class="cx-title">Fonts</div>${FONT_ROLES.map(([k, l]) => `<label class="cx-row"><span>${l}</span><select class="form-control cx-select" data-cx-font="${k}"><option value="">Theme default</option>${Object.keys(FONTS).map(f => `<option value="${f}" style="font-family:'${f}'">${f}</option>`).join('')}</select></label>`).join('')}</div>
          <div class="cx-block"><div class="cx-title">Shape &amp; size</div>${Object.entries(NUM).map(([k, [mn, mx, st, df, l]]) => `<label class="cx-row"><span>${l}</span><span class="cx-range"><input type="range" min="${mn}" max="${mx}" step="${st}" value="${df}" data-cx-num="${k}"><b>${df}</b></span></label>`).join('')}</div>
          <button type="button" class="btn btn-secondary cx-reset">↺ Reset to theme</button>
        </details>`;
        anchor.parentElement.after(panel);
        panel.addEventListener('input', e => {
            const t = e.target;
            if (t.dataset.cxColor) custom.c[t.dataset.cxColor] = t.value;
            else if (t.dataset.cxNum) { custom.n[t.dataset.cxNum] = +t.value; t.nextElementSibling.textContent = t.value; }
            else if (t.dataset.cxFont !== undefined) { if (t.value) custom.f[t.dataset.cxFont] = t.value; else delete custom.f[t.dataset.cxFont]; }
            else if (t.hasAttribute('data-cx-grad')) custom.grad = t.checked;
            else if (t.hasAttribute('data-cx-bg2')) { custom.bg2 = t.value; }
            else return;
            if (t.hasAttribute('data-cx-bg2')) custom.grad = true, $('[data-cx-grad]', panel).checked = true;
            apply();
        });
        panel.addEventListener('click', e => {
            const p = e.target.closest('[data-cx-preset]');
            if (p) { custom.c = Object.assign({}, PRESETS[p.dataset.cxPreset]); apply(); syncInputs(); }
            if (e.target.closest('.cx-reset')) { setCustom(empty()); }
        });
        // load every dropdown font once (on first use) so each name shows in its own typeface
        const preload = () => {
            if (document.getElementById('cx-preview-fonts')) return;
            const l = document.createElement('link'); l.id = 'cx-preview-fonts'; l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?' + Object.values(FONTS).map(f => 'family=' + f.split(':')[0]).join('&') + '&display=swap';
            document.head.appendChild(l);
        };
        panel.addEventListener('pointerdown', e => { if (e.target.closest('.cx-select')) preload(); });
        panel.addEventListener('focusin', e => { if (e.target.closest('.cx-select')) preload(); });
        document.addEventListener('click', e => { if (e.target.closest('.theme-option')) setTimeout(() => { syncInputs(); paintPreview(); }, 60); });
        document.addEventListener('input', e => { if (e.target.matches('input[type=text], #input-name')) setTimeout(paintPreview, 0); });
    }

    document.addEventListener('DOMContentLoaded', () => {
        app = window.birthdayApp;
        build();
        setCustom(app && app.currentData && app.currentData.custom);
    });
})();
