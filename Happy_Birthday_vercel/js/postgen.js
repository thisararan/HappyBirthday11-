/* =========================================================
   postgen.js — Birthday Post Image (PNG) & Animated GIF generator
   Pure canvas + built-in GIF encoder (no external libraries, works offline)
   ========================================================= */
(function () {
    'use strict';

    const PALETTES = {
        'theme-golden':  { bg1: '#1a1408', bg2: '#050506', accent: '#ffd700', accent2: '#ff9900', text: '#ffffff', balloons: ['#ffd700', '#ff9900', '#ffffff', '#e5b800'] },
        'theme-rose':    { bg1: '#3a0d24', bg2: '#12040c', accent: '#ff3366', accent2: '#ff8fab', text: '#ffffff', balloons: ['#ff3366', '#ff758c', '#ffb3c6', '#ffffff'] },
        'theme-cyber':   { bg1: '#1b0b3a', bg2: '#04050f', accent: '#00f5d4', accent2: '#f72585', text: '#ffffff', balloons: ['#00f5d4', '#f72585', '#7b2cbf', '#4cc9f0'] },
        'theme-pastel':  { bg1: '#3b2a5c', bg2: '#17122a', accent: '#ff99c8', accent2: '#c7a6ff', text: '#ffffff', balloons: ['#ff99c8', '#ffcbf2', '#e7c6ff', '#a0e7e5'] },
        'theme-galaxy':  { bg1: '#2a1266', bg2: '#03030d', accent: '#a855f7', accent2: '#6366f1', text: '#ffffff', balloons: ['#a855f7', '#6366f1', '#c084fc', '#f0abfc'] },
        'theme-emerald': { bg1: '#0b3b2e', bg2: '#03110c', accent: '#34d399', accent2: '#f59e0b', text: '#ffffff', balloons: ['#10b981', '#f59e0b', '#34d399', '#ffffff'] },
        'theme-sunset':  { bg1: '#4a1230', bg2: '#12050f', accent: '#ff8a4c', accent2: '#ff5e62', text: '#ffffff', balloons: ['#ff8a4c', '#ffb347', '#ff5e62', '#c2185b'] },
        'theme-candy':   { bg1: '#4a1f7a', bg2: '#140726', accent: '#ff79c6', accent2: '#8be9fd', text: '#ffffff', balloons: ['#ff79c6', '#8be9fd', '#f1fa8c', '#ffb86c'] },
        'theme-ocean':   { bg1: '#08405f', bg2: '#020b12', accent: '#22d3ee', accent2: '#0ea5e9', text: '#ffffff', balloons: ['#22d3ee', '#0ea5e9', '#67e8f9', '#e0f7ff'] },
        'theme-ice':     { bg1: '#1e2f52', bg2: '#060b14', accent: '#bcd7ff', accent2: '#93c5fd', text: '#ffffff', balloons: ['#bcd7ff', '#93c5fd', '#ffffff', '#cfe0ff'] },
        'theme-sakura':  { bg1: '#4a2048', bg2: '#150a16', accent: '#ffb7d5', accent2: '#f48fb1', text: '#ffffff', balloons: ['#ffb7d5', '#ffd6e8', '#f48fb1', '#fff0f6'] },
        'theme-retro':   { bg1: '#2a0a5c', bg2: '#070113', accent: '#ff2a6d', accent2: '#05d9e8', text: '#ffffff', balloons: ['#ff2a6d', '#05d9e8', '#ffd300', '#ffffff'] }
    };

    const FORMATS = {
        square:   { w: 1080, h: 1080, label: 'Square 1:1',    gifW: 480 },
        portrait: { w: 1080, h: 1350, label: 'Portrait 4:5',  gifW: 432 },
        story:    { w: 1080, h: 1920, label: 'Story 9:16',    gifW: 324 }
    };

    const TAU = Math.PI * 2;

    // ---------- helpers ----------
    function rng(seed) {
        let s = seed >>> 0;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function loadImage(src) {
        // A relative file path taints the canvas when the page is opened from disk (file://),
        // which blocks PNG/GIF export. Use the inline (data URL) avatar instead.
        if (src === 'assets/avatar-sample.svg' && typeof DEFAULT_AVATAR_DATA !== 'undefined') {
            src = DEFAULT_AVATAR_DATA;
        }
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    async function ensureFonts() {
        if (!document.fonts || !document.fonts.load) return;
        try {
            await Promise.all([
                document.fonts.load('800 100px "Playfair Display"'),
                document.fonts.load('italic 400 40px "Playfair Display"'),
                document.fonts.load('700 40px "Outfit"'),
                document.fonts.load('700 40px "Caveat"')
            ]);
        } catch (e) { /* fall back to system fonts */ }
    }

    function roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function star4(ctx, x, y, r) {
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.quadraticCurveTo(x, y, x, y + r);
        ctx.quadraticCurveTo(x, y, x - r, y);
        ctx.quadraticCurveTo(x, y, x, y - r);
        ctx.closePath();
    }

    function wrapLines(ctx, text, maxWidth, maxLines) {
        const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
        const lines = [];
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const test = line ? line + ' ' + words[i] : words[i];
            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line);
                line = words[i];
                if (lines.length === maxLines) break;
            } else {
                line = test;
            }
        }
        if (lines.length < maxLines && line) lines.push(line);
        const consumed = lines.join(' ').length;
        const full = words.join(' ');
        PostGenerator.textTruncated = consumed < full.length - 1 && lines.length > 0;
        if (consumed < full.length - 1 && lines.length) {
            let last = lines[lines.length - 1];
            while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
            lines[lines.length - 1] = last.replace(/[\s,.;:!-]+$/, '') + '…';
        }
        return lines;
    }

    function drawCover(ctx, img, x, y, w, h, zoom) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const scale = Math.max(w / iw, h / ih) * (zoom || 1);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }

    function formatDate(str) {
        if (!str) return '';
        const p = str.split('-');
        if (p.length !== 3) return '';
        const d = new Date(+p[0], +p[1] - 1, +p[2]);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // Text shown on the post: the custom "post description" if the user wrote one,
    // otherwise the normal birthday wish message. "Name" is swapped for the real name.
    function postMessage(data) {
        const own = String(data.postText || '').trim();
        return window.resolveNameInMessage(own ? data.postText : data.message, data.name);
    }

    // ---------- frame renderer ----------
    // Draws one frame in a 1080 x H "design space". t is loop position 0..1.
    function drawBackdrop(ctx, W, H, t, pal) {
        // Background
        const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
        bg.addColorStop(0, pal.bg1);
        bg.addColorStop(1, pal.bg2);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Drifting glow orbs
        const glow = [
            { x: 0.18, y: 0.22, r: 420, c: pal.accent, a: 0.22, p: 0.0 },
            { x: 0.85, y: 0.48, r: 480, c: pal.accent2, a: 0.18, p: 0.33 },
            { x: 0.30, y: 0.86, r: 440, c: pal.accent, a: 0.16, p: 0.66 }
        ];
        glow.forEach((g) => {
            const gx = g.x * W + Math.sin(TAU * (t + g.p)) * 40;
            const gy = g.y * H + Math.cos(TAU * (t + g.p)) * 40;
            const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.r);
            rg.addColorStop(0, hexA(g.c, g.a));
            rg.addColorStop(1, hexA(g.c, 0));
            ctx.fillStyle = rg;
            ctx.fillRect(0, 0, W, H);
        });

        // Falling confetti (seamless loop: integer cycles per loop)
        const rand = rng(1234);
        const confettiColors = pal.balloons.concat([pal.accent, '#ffffff']);
        for (let i = 0; i < 46; i++) {
            const x0 = rand() * W;
            const y0 = rand();
            const size = 8 + rand() * 12;
            const cycles = 1 + Math.floor(rand() * 2);
            const col = confettiColors[Math.floor(rand() * confettiColors.length)];
            const rot0 = rand() * TAU;
            const sway = 20 + rand() * 30;
            const py = ((y0 + t * cycles) % 1) * (H + 80) - 40;
            const px = x0 + Math.sin(TAU * (t * cycles * 2 + y0)) * sway;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(rot0 + TAU * t * (1 + (i % 3)));
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = col;
            ctx.fillRect(-size / 2, -size / 4, size, size / 2);
            ctx.restore();
        }

        // Rising balloons at the sides
        const bl = [
            { x: 0.09, ph: 0.00, s: 1.0, ci: 0 }, { x: 0.93, ph: 0.35, s: 0.9, ci: 1 },
            { x: 0.05, ph: 0.55, s: 0.7, ci: 2 }, { x: 0.90, ph: 0.80, s: 1.1, ci: 3 }
        ];
        bl.forEach((b) => {
            const by = H + 160 - (((t + b.ph) % 1) * (H + 420));
            const bx = b.x * W + Math.sin(TAU * (t * 2 + b.ph)) * 18;
            drawBalloon(ctx, bx, by, 46 * b.s, pal.balloons[b.ci % pal.balloons.length]);
        });

        // Twinkling stars
        const r2 = rng(99);
        for (let i = 0; i < 18; i++) {
            const sx = r2() * W, sy = r2() * H, ph = r2();
            const tw = 0.5 + 0.5 * Math.sin(TAU * (t * (1 + (i % 2)) + ph));
            ctx.fillStyle = hexA(i % 2 ? pal.accent : '#ffffff', 0.25 + 0.7 * tw);
            star4(ctx, sx, sy, 8 + 14 * tw);
            ctx.fill();
        }
    }

    // ===== Template 1: "Polaroid" — centered name + tilted polaroid photo card =====
    function drawPolaroidTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2;
        drawBackdrop(ctx, W, H, t, pal);

        // ----- Header -----
        const topY = H * 0.055;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        ctx.font = '700 40px "Outfit", "Segoe UI", sans-serif';
        const label = 'HAPPY  BIRTHDAY';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
        ctx.fillStyle = pal.accent;
        ctx.fillText(label, cx + 5, topY + 50);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        const lw = ctx.measureText(label).width * 0.5 + 40;
        ctx.fillStyle = pal.accent;
        star4(ctx, cx - lw - 34, topY + 38, 14); ctx.fill();
        star4(ctx, cx + lw + 34, topY + 38, 14); ctx.fill();

        // Name (auto-fit, gradient)
        const name = String(data.name || 'Name');
        let fs = 168;
        ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif';
        while (ctx.measureText(name).width > W - 160 && fs > 60) {
            fs -= 4;
            ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif';
        }
        const nameY = topY + 60 + fs * 0.95;
        const nw = ctx.measureText(name).width;
        const ng = ctx.createLinearGradient(cx - nw / 2, 0, cx + nw / 2, 0);
        const shift = (Math.sin(TAU * t) + 1) / 2 * 0.3;
        ng.addColorStop(0, '#ffffff');
        ng.addColorStop(0.4 + shift * 0.3, pal.accent);
        ng.addColorStop(1, pal.accent2);
        ctx.save();
        ctx.shadowColor = hexA(pal.accent, 0.55);
        ctx.shadowBlur = 36;
        ctx.fillStyle = ng;
        ctx.fillText(name, cx, nameY);
        ctx.restore();

        // ----- Photo polaroid -----
        const ps = Math.min(W * 0.52, H * 0.33);
        const pad = 22;
        const frameW = ps + pad * 2;
        const frameH = ps + pad + 78;
        const frameCy = Math.max(H * 0.52, nameY + 60 + frameH / 2);
        const tilt = -0.035 + 0.014 * Math.sin(TAU * t);

        // glow behind frame
        const fg = ctx.createRadialGradient(cx, frameCy, 0, cx, frameCy, frameW * 0.9);
        fg.addColorStop(0, hexA(pal.accent, 0.35));
        fg.addColorStop(1, hexA(pal.accent, 0));
        ctx.fillStyle = fg;
        ctx.fillRect(0, frameCy - frameW, W, frameW * 2);

        ctx.save();
        ctx.translate(cx, frameCy);
        ctx.rotate(tilt);
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetY = 22;
        ctx.fillStyle = '#ffffff';
        roundRectPath(ctx, -frameW / 2, -ps / 2 - pad, frameW, frameH, 18);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // photo (cross-fade between photos)
        const px = -ps / 2, py = -ps / 2;
        ctx.save();
        roundRectPath(ctx, px, py, ps, ps, 10);
        ctx.clip();
        ctx.fillStyle = '#f1f2f6';
        ctx.fillRect(px, py, ps, ps);
        const k = imgs.length;
        if (k > 0) {
            const pos = t * k;
            const i = Math.min(k - 1, Math.floor(pos));
            const f = pos - i;
            const zoomA = 1.03 + 0.07 * f;
            if (imgs[i]) drawCover(ctx, imgs[i], px, py, ps, ps, zoomA);
            if (k > 1 && f > 0.78) {
                const a = (f - 0.78) / 0.22;
                ctx.globalAlpha = a;
                const nxt = imgs[(i + 1) % k];
                if (nxt) drawCover(ctx, nxt, px, py, ps, ps, 1.03);
                ctx.globalAlpha = 1;
            }
        }
        // soft shine sweep
        const sweep = ((t * 1) % 1) * (ps * 2.4) - ps * 0.7;
        const sg = ctx.createLinearGradient(px + sweep, py, px + sweep + ps * 0.35, py + ps);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.22)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(px, py, ps, ps);
        ctx.restore();

        // caption on polaroid
        const dateTxt = formatDate(data.date);
        ctx.fillStyle = '#2f3542';
        ctx.font = '700 46px "Caveat", "Segoe Script", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(dateTxt || 'Best Day Ever', 0, py + ps + 58);

        // age badge
        const age = parseInt(data.age, 10);
        if (age > 0) {
            const bx = frameW / 2 - 18, by = -ps / 2 - pad + 8;
            const pulse = 1 + 0.05 * Math.sin(TAU * t * 2);
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(-tilt + 0.18);
            ctx.scale(pulse, pulse);
            const bgd = ctx.createLinearGradient(-70, -70, 70, 70);
            bgd.addColorStop(0, pal.accent);
            bgd.addColorStop(1, pal.accent2);
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 22;
            ctx.fillStyle = bgd;
            ctx.beginPath(); ctx.arc(0, 0, 76, 0, TAU); ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath(); ctx.arc(0, 0, 66, 0, TAU); ctx.stroke();
            ctx.fillStyle = '#111';
            ctx.font = '800 62px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(age), 0, 16);
            ctx.font = '700 17px "Outfit", sans-serif';
            if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
            ctx.fillText('YEARS', 1, 42);
            if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
            ctx.restore();
        }
        ctx.restore();

        // ----- Message + sender -----
        const msgTop = frameCy + frameH / 2 + Math.max(50, H * 0.035);
        const msgSize = H > 1300 ? 44 : 38;
        const maxLines = H > 1700 ? 6 : (H > 1300 ? 4 : 3);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = 'italic 400 ' + msgSize + 'px "Playfair Display", Georgia, serif';
        const lines = wrapLines(ctx, postMessage(data), W - 220, maxLines);
        const lh = msgSize * 1.42;
        lines.forEach((ln, idx) => ctx.fillText(ln, cx, msgTop + msgSize + idx * lh));

        const sender = String(data.sender || '').trim();
        if (sender) {
            ctx.fillStyle = pal.accent;
            ctx.font = '700 58px "Caveat", "Segoe Script", cursive';
            ctx.fillText('— With love, ' + sender + ' ❤', cx, Math.min(H - 50, msgTop + msgSize + lines.length * lh + 62));
        }
    }

    // Shared: crossfading "cover" photo draw for a given clip shape (already clipped by caller)
    function drawCrossfadePhoto(ctx, imgs, x, y, w, h, t, zoomBase) {
        const k = imgs.length;
        if (!k) return;
        const pos = t * k;
        const i = Math.min(k - 1, Math.floor(pos));
        const f = pos - i;
        if (imgs[i]) drawCover(ctx, imgs[i], x, y, w, h, zoomBase + 0.07 * f);
        if (k > 1 && f > 0.78) {
            const a = (f - 0.78) / 0.22;
            ctx.globalAlpha = a;
            const nxt = imgs[(i + 1) % k];
            if (nxt) drawCover(ctx, nxt, x, y, w, h, zoomBase);
            ctx.globalAlpha = 1;
        }
    }

    // ===== Template 2: "Elegant Circle" — round photo medallion, refined centered type =====
    function drawCircleTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2;
        drawBackdrop(ctx, W, H, t, pal);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        const topY = H * 0.09;
        ctx.font = '700 34px "Outfit", sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
        ctx.fillStyle = pal.accent;
        ctx.fillText('WISHING YOU A VERY', cx + 6, topY);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

        let fs = 150;
        ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif';
        while (ctx.measureText('HAPPY BIRTHDAY').width > W - 140 && fs > 60) {
            fs -= 4; ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif';
        }
        const hbY = topY + 34 + fs * 0.86;
        ctx.save();
        ctx.shadowColor = hexA(pal.accent, 0.5); ctx.shadowBlur = 30;
        ctx.fillStyle = pal.text;
        ctx.fillText('HAPPY BIRTHDAY', cx, hbY);
        ctx.restore();

        // Circular photo medallion
        const r = Math.min(W, H) * 0.28;
        const cyMed = Math.max(hbY + r + 60, H * 0.5);
        const spin = t * TAU * 0.15;

        // rotating dashed ring + glow
        const glow = ctx.createRadialGradient(cx, cyMed, 0, cx, cyMed, r * 1.6);
        glow.addColorStop(0, hexA(pal.accent, 0.35));
        glow.addColorStop(1, hexA(pal.accent, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, cyMed - r * 1.7, W, r * 3.4);

        ctx.save();
        ctx.translate(cx, cyMed);
        ctx.rotate(spin);
        ctx.setLineDash([2, 16]);
        ctx.lineCap = 'round';
        ctx.lineWidth = 5;
        ctx.strokeStyle = pal.accent;
        ctx.beginPath(); ctx.arc(0, 0, r + 26, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cyMed);
        ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, TAU);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
        drawCrossfadePhoto(ctx, imgs, -r, -r, r * 2, r * 2, t, 1.05);
        ctx.restore();
        ctx.restore();

        // Age badge bottom-right of medallion
        const age = parseInt(data.age, 10);
        if (age > 0) {
            const ax = cx + r * 0.68, ay = cyMed + r * 0.68;
            ctx.save();
            ctx.translate(ax, ay);
            const bgd = ctx.createLinearGradient(-60, -60, 60, 60);
            bgd.addColorStop(0, pal.accent); bgd.addColorStop(1, pal.accent2);
            ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 18;
            ctx.fillStyle = bgd;
            ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 54, 0, TAU); ctx.stroke();
            ctx.fillStyle = '#111';
            ctx.font = '800 50px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(age), 0, 15);
            ctx.font = '700 14px "Outfit", sans-serif';
            ctx.fillText('YEARS', 0, 34);
            ctx.restore();
        }

        // Name
        const name = String(data.name || 'Name');
        let nfs = 96;
        ctx.font = '700 ' + nfs + 'px "Caveat", cursive';
        while (ctx.measureText(name).width > W - 160 && nfs > 40) { nfs -= 4; ctx.font = '700 ' + nfs + 'px "Caveat", cursive'; }
        const nameY = cyMed + r + 90;
        ctx.fillStyle = pal.accent;
        ctx.font = '700 ' + nfs + 'px "Caveat", cursive';
        ctx.fillText(name, cx, nameY);

        // Message + sender
        const msgSize = H > 1300 ? 40 : 34;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'italic 400 ' + msgSize + 'px "Playfair Display", Georgia, serif';
        const maxLines = H > 1700 ? 6 : (H > 1300 ? 4 : 3);
        const lines = wrapLines(ctx, postMessage(data), W - 220, maxLines);
        const lh = msgSize * 1.4;
        const msgTop = nameY + 50;
        lines.forEach((ln, idx) => ctx.fillText(ln, cx, msgTop + idx * lh));

        const sender = String(data.sender || '').trim();
        if (sender) {
            ctx.fillStyle = pal.accent;
            ctx.font = '700 44px "Caveat", cursive';
            ctx.fillText('— ' + sender, cx, Math.min(H - 46, msgTop + lines.length * lh + 50));
        }
    }

    // ===== Template 3: "Bottom Sheet" — full photo up top, rounded card slides up with the text =====
    function drawSheetTemplate(ctx, W, H, data, imgs, t, pal) {
        drawBackdrop(ctx, W, H, t, pal);
        const cx = W / 2;
        const photoH = H * 0.52;

        // Full-width photo strip with soft rounded bottom corners fading into backdrop
        ctx.save();
        roundRectPath(ctx, 0, 0, W, photoH + 40, 0);
        ctx.clip();
        drawCrossfadePhoto(ctx, imgs, 0, 0, W, photoH + 40, t, 1.08);
        const fade = ctx.createLinearGradient(0, photoH - 140, 0, photoH + 40);
        fade.addColorStop(0, 'rgba(0,0,0,0)');
        fade.addColorStop(1, pal.bg2);
        ctx.fillStyle = fade;
        ctx.fillRect(0, photoH - 140, W, 180);
        const topShade = ctx.createLinearGradient(0, 0, 0, 200);
        topShade.addColorStop(0, 'rgba(0,0,0,0.45)');
        topShade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topShade;
        ctx.fillRect(0, 0, W, 200);
        ctx.restore();

        // "HAPPY BIRTHDAY" ribbon over photo
        ctx.textAlign = 'center';
        ctx.font = '700 30px "Outfit", sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12;
        ctx.fillText('HAPPY BIRTHDAY', cx + 4, 80);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.shadowColor = 'transparent';

        // age badge top-right corner of photo
        const age = parseInt(data.age, 10);
        if (age > 0) {
            const ax = W - 100, ay = 110;
            ctx.save();
            ctx.translate(ax, ay);
            const bgd = ctx.createLinearGradient(-58, -58, 58, 58);
            bgd.addColorStop(0, pal.accent); bgd.addColorStop(1, pal.accent2);
            ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 16;
            ctx.fillStyle = bgd;
            ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#111';
            ctx.font = '800 46px "Outfit", sans-serif';
            ctx.fillText(String(age), 0, 14);
            ctx.font = '700 13px "Outfit", sans-serif';
            ctx.fillText('YEARS', 0, 32);
            ctx.restore();
        }

        // Card content below the photo
        let fs = 108;
        ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif';
        const name = String(data.name || 'Name');
        while (ctx.measureText(name).width > W - 140 && fs > 48) { fs -= 4; ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif'; }
        const nameY = photoH + fs * 0.55;
        const nw = ctx.measureText(name).width;
        const ng = ctx.createLinearGradient(cx - nw / 2, 0, cx + nw / 2, 0);
        ng.addColorStop(0, '#ffffff'); ng.addColorStop(0.5, pal.accent); ng.addColorStop(1, pal.accent2);
        ctx.fillStyle = ng;
        ctx.fillText(name, cx, nameY);

        const dateTxt = formatDate(data.date);
        if (dateTxt) {
            ctx.font = '700 34px "Caveat", cursive';
            ctx.fillStyle = hexA(pal.accent, 0.9);
            ctx.fillText(dateTxt, cx, nameY + 46);
        }

        const msgSize = H > 1300 ? 40 : 34;
        const maxLines = H > 1700 ? 5 : (H > 1300 ? 4 : 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'italic 400 ' + msgSize + 'px "Playfair Display", Georgia, serif';
        const lines = wrapLines(ctx, postMessage(data), W - 180, maxLines);
        const lh = msgSize * 1.4;
        const msgTop = nameY + 100;
        lines.forEach((ln, idx) => ctx.fillText(ln, cx, msgTop + idx * lh));

        const sender = String(data.sender || '').trim();
        if (sender) {
            ctx.fillStyle = pal.accent;
            ctx.font = '700 46px "Caveat", cursive';
            ctx.fillText('— With love, ' + sender + ' ❤', cx, Math.min(H - 44, msgTop + lines.length * lh + 56));
        }
    }

    // ===== Template 4: "Full Photo Banner" — bold edge-to-edge photo with overlay type =====
    function drawBannerTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2;
        // Full bleed photo as base
        ctx.save();
        drawCrossfadePhoto(ctx, imgs, 0, 0, W, H, t, 1.1);
        ctx.restore();

        // Dark gradient overlays top & bottom for legibility, tinted with theme colour
        const topG = ctx.createLinearGradient(0, 0, 0, H * 0.42);
        topG.addColorStop(0, hexA(pal.bg2, 0.92));
        topG.addColorStop(1, hexA(pal.bg2, 0));
        ctx.fillStyle = topG;
        ctx.fillRect(0, 0, W, H * 0.42);

        const botG = ctx.createLinearGradient(0, H * 0.52, 0, H);
        botG.addColorStop(0, hexA(pal.bg2, 0));
        botG.addColorStop(1, hexA(pal.bg2, 0.96));
        ctx.fillStyle = botG;
        ctx.fillRect(0, H * 0.52, W, H * 0.48);

        // subtle confetti overlay only (skip balloons/orbs to keep photo readable)
        const rand = rng(4321);
        const confettiColors = pal.balloons.concat([pal.accent, '#ffffff']);
        for (let i = 0; i < 26; i++) {
            const x0 = rand() * W, y0 = rand(), size = 7 + rand() * 10;
            const col = confettiColors[Math.floor(rand() * confettiColors.length)];
            const rot0 = rand() * TAU;
            const py = ((y0 + t) % 1) * (H + 80) - 40;
            const px = x0 + Math.sin(TAU * (t * 2 + y0)) * 24;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(rot0 + TAU * t * 2);
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = col;
            ctx.fillRect(-size / 2, -size / 4, size, size / 2);
            ctx.restore();
        }

        ctx.textAlign = 'center';
        ctx.font = '700 30px "Outfit", sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '9px';
        ctx.fillStyle = pal.accent;
        ctx.fillText('HAPPY BIRTHDAY', cx + 5, 76);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

        const name = String(data.name || 'Name');
        let fs = 128;
        ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif';
        while (ctx.measureText(name).width > W - 130 && fs > 56) { fs -= 4; ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif'; }
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, cx, 76 + fs * 0.95);
        ctx.restore();

        // Age badge top-right
        const age = parseInt(data.age, 10);
        if (age > 0) {
            ctx.save();
            ctx.translate(W - 96, 96);
            const bgd = ctx.createLinearGradient(-56, -56, 56, 56);
            bgd.addColorStop(0, pal.accent); bgd.addColorStop(1, pal.accent2);
            ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 16;
            ctx.fillStyle = bgd;
            ctx.beginPath(); ctx.arc(0, 0, 56, 0, TAU); ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#111';
            ctx.font = '800 44px "Outfit", sans-serif';
            ctx.fillText(String(age), 0, 13);
            ctx.font = '700 12px "Outfit", sans-serif';
            ctx.fillText('YEARS', 0, 30);
            ctx.restore();
        }

        // Bottom message + sender
        const msgSize = H > 1300 ? 42 : 36;
        const maxLines = H > 1700 ? 5 : (H > 1300 ? 4 : 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = 'italic 400 ' + msgSize + 'px "Playfair Display", Georgia, serif';
        const lines = wrapLines(ctx, postMessage(data), W - 160, maxLines);
        const lh = msgSize * 1.4;
        const blockH = lines.length * lh;
        const msgTop = H - 60 - blockH - (String(data.sender || '').trim() ? 60 : 0);
        lines.forEach((ln, idx) => ctx.fillText(ln, cx, msgTop + idx * lh));

        const sender = String(data.sender || '').trim();
        if (sender) {
            ctx.fillStyle = pal.accent;
            ctx.font = '700 46px "Caveat", cursive';
            ctx.fillText('— With love, ' + sender + ' ❤', cx, H - 46);
        }
    }

    function drawBalloon(ctx, x, y, r, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, r * 1.25);
        ctx.quadraticCurveTo(-14, r * 2.2, 6, r * 3.2);
        ctx.stroke();
        const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.3);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.25, color);
        g.addColorStop(1, shade(color, -0.35));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 1.22, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, r * 1.22);
        ctx.lineTo(-8, r * 1.22 + 12);
        ctx.lineTo(8, r * 1.22 + 12);
        ctx.closePath();
        ctx.fillStyle = shade(color, -0.3);
        ctx.fill();
        ctx.restore();
    }

    function parseHex(h) {
        h = h.replace('#', '');
        if (h.length === 3) h = h.split('').map((c) => c + c).join('');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    function hexA(h, a) { const c = parseHex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function shade(h, amt) {
        const c = parseHex(h).map((v) => Math.max(0, Math.min(255, Math.round(v + v * amt))));
        return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }

    // ---------- GIF encoder ----------
    function buildPalette(samples) {
        // samples: Uint32Array histogram of 15-bit colours (32768 bins)
        const cols = [];
        for (let i = 0; i < 32768; i++) if (samples[i]) cols.push(i);
        const R = (c) => (c >> 10) & 31, G = (c) => (c >> 5) & 31, B = (c) => c & 31;
        function box(list) {
            let rmin = 31, rmax = 0, gmin = 31, gmax = 0, bmin = 31, bmax = 0, n = 0;
            for (const c of list) {
                const r = R(c), g = G(c), b = B(c);
                if (r < rmin) rmin = r; if (r > rmax) rmax = r;
                if (g < gmin) gmin = g; if (g > gmax) gmax = g;
                if (b < bmin) bmin = b; if (b > bmax) bmax = b;
                n += samples[c];
            }
            const rr = rmax - rmin, gr = gmax - gmin, br = bmax - bmin;
            const range = Math.max(rr, gr, br);
            const ch = range === rr ? 0 : (range === gr ? 1 : 2);
            return { list, n, range, ch };
        }
        let boxes = [box(cols)];
        while (boxes.length < 256) {
            let bi = -1, best = 0;
            for (let i = 0; i < boxes.length; i++) {
                const b = boxes[i];
                if (b.list.length < 2) continue;
                const score = b.range * Math.sqrt(b.n);
                if (score > best) { best = score; bi = i; }
            }
            if (bi < 0) break;
            const b = boxes[bi];
            const get = b.ch === 0 ? R : (b.ch === 1 ? G : B);
            b.list.sort((x, y) => get(x) - get(y));
            let half = b.n / 2, acc = 0, cut = 1;
            for (let i = 0; i < b.list.length - 1; i++) {
                acc += samples[b.list[i]];
                cut = i + 1;
                if (acc >= half) break;
            }
            boxes.splice(bi, 1, box(b.list.slice(0, cut)), box(b.list.slice(cut)));
        }
        const pal = new Uint8Array(256 * 3);
        boxes.forEach((b, i) => {
            let r = 0, g = 0, bl = 0, n = 0;
            for (const c of b.list) { const w = samples[c]; r += R(c) * w; g += G(c) * w; bl += B(c) * w; n += w; }
            n = n || 1;
            pal[i * 3] = Math.min(255, Math.round((r / n) * 8.225));
            pal[i * 3 + 1] = Math.min(255, Math.round((g / n) * 8.225));
            pal[i * 3 + 2] = Math.min(255, Math.round((bl / n) * 8.225));
        });
        return pal;
    }

    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

    function quantize(rgba, w, h, pal, cache, out) {
        let p = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++, p++) {
                const d = (BAYER[((y & 3) << 2) | (x & 3)] - 7.5) * 0.9;
                const i4 = p * 4;
                let r = rgba[i4] + d, g = rgba[i4 + 1] + d, b = rgba[i4 + 2] + d;
                r = r < 0 ? 0 : (r > 255 ? 255 : r);
                g = g < 0 ? 0 : (g > 255 ? 255 : g);
                b = b < 0 ? 0 : (b > 255 ? 255 : b);
                const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
                let idx = cache[key];
                if (idx < 0) {
                    const cr = ((key >> 10) & 31) * 8.225, cg = ((key >> 5) & 31) * 8.225, cb = (key & 31) * 8.225;
                    let bestD = 1e9; idx = 0;
                    for (let j = 0; j < 256; j++) {
                        const dr = pal[j * 3] - cr, dg = pal[j * 3 + 1] - cg, db = pal[j * 3 + 2] - cb;
                        const dist = dr * dr * 2 + dg * dg * 4 + db * db * 3;
                        if (dist < bestD) { bestD = dist; idx = j; }
                    }
                    cache[key] = idx;
                }
                out[p] = idx;
            }
        }
    }

    function lzwEncode(pixels, minCode, bytes) {
        const clear = 1 << minCode, eoi = clear + 1;
        let next = eoi + 1, size = minCode + 1;
        let buf = 0, bits = 0;
        const HS = 16384, mask = HS - 1;
        const keys = new Int32Array(HS), vals = new Int32Array(HS);
        const block = [];
        function flushBlock(force) {
            while (block.length >= 255 || (force && block.length)) {
                const n = Math.min(255, block.length);
                bytes.push(n);
                for (let i = 0; i < n; i++) bytes.push(block[i]);
                block.splice(0, n);
            }
        }
        function emit(code) {
            buf |= code << bits; bits += size;
            while (bits >= 8) { block.push(buf & 255); buf >>>= 8; bits -= 8; }
            if (block.length >= 255) flushBlock(false);
        }
        emit(clear);
        let prefix = pixels[0];
        for (let i = 1; i < pixels.length; i++) {
            const c = pixels[i];
            const key = (prefix << 8) | c;
            let h = ((key * 2654435761) >>> 18) & mask;
            let found = -1;
            while (keys[h] !== 0) {
                if (keys[h] === key + 1) { found = vals[h]; break; }
                h = (h + 1) & mask;
            }
            if (found >= 0) { prefix = found; continue; }
            emit(prefix);
            if (next === 4096) {
                emit(clear);
                next = eoi + 1; size = minCode + 1;
                keys.fill(0);
            } else {
                if (next >= (1 << size)) size++;
                keys[h] = key + 1; vals[h] = next++;
            }
            prefix = c;
        }
        emit(prefix);
        emit(eoi);
        if (bits > 0) { block.push(buf & 255); }
        flushBlock(true);
        bytes.push(0);
    }

    function gifHeader(w, h, pal) {
        const b = [71, 73, 70, 56, 57, 97, w & 255, w >> 8, h & 255, h >> 8, 0xF7, 0, 0];
        for (let i = 0; i < 768; i++) b.push(pal[i]);
        // Netscape loop forever
        b.push(0x21, 0xFF, 0x0B, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0);
        return b;
    }

    // ---------- shared bits for the extra templates ----------
    function heartPath(ctx, cx, cy, s) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.9);
        ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.9, cy - s * 1.1, cx, cy - s * 0.4);
        ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.1, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
        ctx.closePath();
    }
    function archPath(ctx, x, y, w, h) {
        ctx.beginPath();
        ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2);
        ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
        ctx.lineTo(x + w, y + h); ctx.closePath();
    }
    function fitName(ctx, name, maxW, size, min, font) {
        let fs = size;
        ctx.font = font(fs);
        while (ctx.measureText(name).width > maxW && fs > min) { fs -= 4; ctx.font = font(fs); }
        return fs;
    }
    function kicker(ctx, text, x, y, size, color, spacing) {
        ctx.textAlign = 'center'; ctx.fillStyle = color;
        ctx.font = '700 ' + size + 'px "Outfit", sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
        ctx.fillText(text, x + spacing / 2, y);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    function messageBlock(ctx, W, H, data, pal, topY, o) {
        o = o || {};
        const cx = o.cx || W / 2, size = o.size || (H > 1300 ? 40 : 34);
        ctx.textAlign = 'center';
        ctx.fillStyle = o.color || 'rgba(255,255,255,0.93)';
        ctx.font = 'italic 400 ' + size + 'px "Playfair Display", Georgia, serif';
        const lines = wrapLines(ctx, postMessage(data), o.maxW || W - 190, H > 1700 ? 5 : (H > 1300 ? 4 : 2));
        const lh = size * 1.42;
        lines.forEach((ln, i) => ctx.fillText(ln, cx, topY + i * lh));
        const sender = String(data.sender || '').trim();
        if (sender) {
            ctx.fillStyle = o.senderColor || pal.accent;
            ctx.font = '700 ' + Math.round(size * 1.3) + 'px "Caveat", cursive';
            ctx.fillText('— With love, ' + sender + ' ❤', cx, topY + lines.length * lh + size * 0.9);
        }
    }
    function sparkles(ctx, W, H, t, pal, seed, n) {
        const r = rng(seed);
        for (let i = 0; i < n; i++) {
            const x = r() * W, y = r() * H, ph = r(), sz = 8 + r() * 14;
            ctx.save();
            ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(TAU * (t * 2 + ph)));
            ctx.fillStyle = i % 2 ? pal.accent : '#ffffff';
            star4(ctx, x, y, sz); ctx.fill();
            ctx.restore();
        }
    }
    function nameText(ctx, data, cx, y, maxW, size, font, glow) {
        const name = String(data.name || 'Name');
        const fs = fitName(ctx, name, maxW, size, 56, font);
        ctx.textAlign = 'center';
        ctx.save();
        if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 34; }
        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, cx, y + fs * 0.35);
        ctx.restore();
        return fs;
    }

    // ===== Template 5: "Neon Frame" — glowing pulsing double neon border =====
    function drawNeonTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2;
        drawBackdrop(ctx, W, H, t, pal);
        const ph = Math.min(H * 0.44, W * 0.62), pw = ph * 0.9, px = cx - pw / 2, py = H * 0.13;
        const pulse = 0.5 + 0.5 * Math.sin(TAU * t * 2);
        ctx.save(); roundRectPath(ctx, px, py, pw, ph, 34); ctx.clip();
        drawCrossfadePhoto(ctx, imgs, px, py, pw, ph, t, 1.08); ctx.restore();
        [[10, pal.accent], [32, pal.accent2]].forEach(([pad, col]) => {
            ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 22 + 26 * pulse;
            ctx.strokeStyle = col; ctx.lineWidth = 6;
            roundRectPath(ctx, px - pad, py - pad, pw + pad * 2, ph + pad * 2, 34 + pad); ctx.stroke(); ctx.restore();
        });
        sparkles(ctx, W, H, t, pal, 55, 12);
        const ky = py + ph + 100;
        kicker(ctx, 'HAPPY BIRTHDAY', cx, ky, 28, pal.accent, 9);
        const fs = nameText(ctx, data, cx, ky + 74, W - 140, 124, (s) => '800 ' + s + 'px "Playfair Display", Georgia, serif', pal.accent);
        messageBlock(ctx, W, H, data, pal, ky + 74 + fs * 0.35 + 70);
    }

    // ===== Template 6: "Film Strip" — photo in a scrolling cinema film frame =====
    function drawFilmTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2;
        const g = ctx.createRadialGradient(cx, H * 0.3, 60, cx, H * 0.3, W);
        g.addColorStop(0, hexA(pal.bg1, 1)); g.addColorStop(1, hexA(pal.bg2, 1));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const sw = W * 0.78, sx = cx - sw / 2, sy = H * 0.07, sh = Math.min(H * 0.5, sw * 0.82);
        ctx.save();
        ctx.translate(cx, sy + sh / 2); ctx.rotate(-0.035); ctx.translate(-cx, -(sy + sh / 2));
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
        ctx.fillStyle = '#121214'; roundRectPath(ctx, sx, sy, sw, sh, 18); ctx.fill();
        ctx.shadowColor = 'transparent';
        const gap = 52, off = (t * gap * 3) % gap;
        ctx.fillStyle = '#e9e3d2';
        for (let x = sx - gap + off; x < sx + sw; x += gap) {
            if (x < sx + 10 || x + 30 > sx + sw - 10) continue;
            roundRectPath(ctx, x, sy + 14, 30, 20, 5); ctx.fill();
            roundRectPath(ctx, x, sy + sh - 34, 30, 20, 5); ctx.fill();
        }
        const fx = sx + 22, fy = sy + 58, fw = sw - 44, fh = sh - 116;
        ctx.save(); roundRectPath(ctx, fx, fy, fw, fh, 8); ctx.clip();
        drawCrossfadePhoto(ctx, imgs, fx, fy, fw, fh, t, 1.1); ctx.restore();
        const age = parseInt(data.age, 10);
        ctx.fillStyle = pal.accent; ctx.textAlign = 'left'; ctx.font = '700 20px "Outfit", sans-serif';
        ctx.fillText('▶  ' + (age > 0 ? String(age).padStart(2, '0') : 'HB'), fx, sy + 52);
        ctx.restore();
        const ky = sy + sh + 100;
        kicker(ctx, 'NOW SHOWING · HAPPY BIRTHDAY', cx, ky, 26, pal.accent, 7);
        const fs = nameText(ctx, data, cx, ky + 74, W - 140, 120, (s) => '800 ' + s + 'px "Playfair Display", Georgia, serif');
        messageBlock(ctx, W, H, data, pal, ky + 74 + fs * 0.35 + 66);
    }

    // ===== Template 7: "Heart Frame" — photo inside a beating heart, floating hearts =====
    function drawHeartTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2;
        drawBackdrop(ctx, W, H, t, pal);
        const r = rng(777);
        for (let i = 0; i < 16; i++) {
            const x = r() * W, y0 = r(), s = 14 + r() * 24, a = 0.3 + 0.4 * r();
            const y = H - ((y0 + t) % 1) * (H + 80) + 40;
            ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = i % 2 ? pal.accent : pal.accent2;
            heartPath(ctx, x + Math.sin(TAU * (t * 2 + y0)) * 20, y, s); ctx.fill(); ctx.restore();
        }
        const s = Math.min(W * 0.34, H * 0.24) * (1 + 0.025 * Math.sin(TAU * t * 2));
        const cy = H * 0.1 + s * 0.8;
        ctx.save(); heartPath(ctx, cx, cy, s); ctx.clip();
        drawCrossfadePhoto(ctx, imgs, cx - s, cy - s * 0.8, s * 2, s * 1.7, t, 1.15); ctx.restore();
        ctx.save(); ctx.shadowColor = pal.accent; ctx.shadowBlur = 36;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; heartPath(ctx, cx, cy, s); ctx.stroke();
        ctx.strokeStyle = pal.accent; ctx.lineWidth = 4; heartPath(ctx, cx, cy, s * 1.07); ctx.stroke(); ctx.restore();
        const ky = cy + s * 0.9 + 90;
        kicker(ctx, 'HAPPY BIRTHDAY', cx, ky, 28, pal.accent, 9);
        const fs = nameText(ctx, data, cx, ky + 50 + 75, W - 150, 150, (s2) => '700 ' + s2 + 'px "Caveat", cursive', pal.accent2);
        messageBlock(ctx, W, H, data, pal, ky + 125 + fs * 0.35 + 70);
    }

    // ===== Template 8: "Arch Window" — photo in an elegant arch with glowing outlines =====
    function drawArchTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2;
        drawBackdrop(ctx, W, H, t, pal);
        sparkles(ctx, W, H, t, pal, 99, 14);
        const aw = Math.min(W * 0.58, H * 0.34), ah = Math.min(H * 0.5, aw * 1.45), ax = cx - aw / 2, ay = H * 0.09;
        [[46, pal.accent2, 0.4], [24, pal.accent, 0.65]].forEach(([pad, col, al]) => {
            ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = 3;
            archPath(ctx, ax - pad, ay - pad, aw + pad * 2, ah + pad); ctx.stroke(); ctx.restore();
        });
        ctx.save(); archPath(ctx, ax, ay, aw, ah); ctx.clip();
        drawCrossfadePhoto(ctx, imgs, ax, ay, aw, ah, t, 1.08); ctx.restore();
        ctx.save(); ctx.shadowColor = pal.accent; ctx.shadowBlur = 24;
        ctx.strokeStyle = pal.accent; ctx.lineWidth = 8; archPath(ctx, ax, ay, aw, ah); ctx.stroke(); ctx.restore();
        const ky = ay + ah + 90;
        kicker(ctx, 'HAPPY BIRTHDAY', cx, ky, 28, pal.accent, 9);
        const fs = nameText(ctx, data, cx, ky + 74, W - 140, 122, (s) => 'italic 800 ' + s + 'px "Playfair Display", Georgia, serif');
        messageBlock(ctx, W, H, data, pal, ky + 74 + fs * 0.35 + 64);
    }

    // ===== Template 9: "Party Ticket" — a bright admit-one ticket with notches and a perforation =====
    function drawTicketTemplate(ctx, W, H, data, imgs, t, pal) {
        const cx = W / 2, ink = '#16101f';
        drawBackdrop(ctx, W, H, t, pal);
        const tw = W * 0.84, th = Math.min(H * 0.74, tw * 1.05), tx = cx - tw / 2, ty = (H - th) / 2 + Math.sin(TAU * t * 2) * 6;
        const px = tx + 40, py = ty + 92, pw = tw - 80, ph = th * 0.42, divY = py + ph + 56;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
        ctx.fillStyle = pal.accent; roundRectPath(ctx, tx, ty, tw, th, 36); ctx.fill(); ctx.restore();
        ctx.save(); roundRectPath(ctx, tx, ty, tw, th, 36); ctx.clip();
        const tg = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
        tg.addColorStop(0, pal.accent); tg.addColorStop(1, pal.accent2);
        ctx.beginPath(); ctx.rect(0, 0, W, H);
        [tx, tx + tw].forEach((nx) => { ctx.moveTo(nx + 32, divY); ctx.arc(nx, divY, 32, 0, TAU); });
        ctx.fillStyle = tg; ctx.fill('evenodd'); ctx.restore();
        kicker(ctx, 'ADMIT ONE · BIRTHDAY PARTY', cx, ty + 62, 24, ink, 6);
        ctx.save(); roundRectPath(ctx, px, py, pw, ph, 22); ctx.clip();
        drawCrossfadePhoto(ctx, imgs, px, py, pw, ph, t, 1.08); ctx.restore();
        const age = parseInt(data.age, 10);
        if (age > 0) {
            ctx.save(); ctx.translate(px + pw - 70, py + 70); ctx.rotate(-0.22);
            ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.fill();
            ctx.fillStyle = pal.accent; ctx.textAlign = 'center';
            ctx.font = '800 46px "Outfit", sans-serif'; ctx.fillText(String(age), 0, 14);
            ctx.font = '700 12px "Outfit", sans-serif'; ctx.fillText('YEARS', 0, 32); ctx.restore();
        }
        ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(22,16,31,0.45)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tx + 50, divY); ctx.lineTo(tx + tw - 50, divY); ctx.stroke(); ctx.restore();
        const name = String(data.name || 'Name');
        const fs = fitName(ctx, name, tw - 120, 104, 52, (s) => '800 ' + s + 'px "Playfair Display", Georgia, serif');
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText(name, cx, divY + 28 + fs * 0.8);
        messageBlock(ctx, W, H, data, pal, divY + 28 + fs * 0.8 + 56, { color: 'rgba(22,16,31,0.85)', senderColor: ink, maxW: tw - 120, size: H > 1300 ? 34 : 30 });
    }

    const TEMPLATES = {
        polaroid: { label: '🖼️ Polaroid Card', draw: drawPolaroidTemplate },
        circle:   { label: '⭕ Elegant Circle', draw: drawCircleTemplate },
        sheet:    { label: '📱 Bottom Sheet', draw: drawSheetTemplate },
        banner:   { label: '🎇 Full Photo Banner', draw: drawBannerTemplate },
        neon:     { label: '💡 Neon Frame', draw: drawNeonTemplate },
        film:     { label: '🎞️ Film Strip', draw: drawFilmTemplate },
        heart:    { label: '💖 Heart Frame', draw: drawHeartTemplate },
        arch:     { label: '🏛️ Arch Window', draw: drawArchTemplate },
        ticket:   { label: '🎟️ Party Ticket', draw: drawTicketTemplate }
    };


    // ---------- Theme Studio support (custom colours + fonts) ----------
    function hexRgb(h) { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    function mixHex(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
    function customPalette(base, cu) {
        if (!cu || !cu.c) return base;
        const k = cu.c, p = Object.assign({}, base);
        if (k.accent) p.accent = k.accent;
        if (k.accent2) p.accent2 = k.accent2; else if (k.accent) p.accent2 = k.accent;
        if (k.text) p.text = k.text;
        if (k.bg) { p.bg2 = k.bg; p.bg1 = (cu.grad && cu.bg2) ? cu.bg2 : mixHex(k.bg, p.accent, 0.22); }
        else if (cu.grad && cu.bg2) { p.bg1 = cu.bg2; }
        if (k.accent || k.accent2 || k.ribbon || k.gift) p.balloons = [p.accent, p.accent2, k.ribbon || p.text, k.gift || p.accent];
        return p;
    }
    const FONT_DESC = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    function patchFonts(ctx, f) {
        ctx.__cxf = f || null;
        if (ctx.__cxp || !FONT_DESC) return;
        ctx.__cxp = true;
        Object.defineProperty(ctx, 'font', {
            configurable: true,
            get() { return FONT_DESC.get.call(ctx); },
            set(v) {
                const m = ctx.__cxf;
                if (m && typeof v === 'string') {
                    if (m.p) v = v.replace(/"Outfit"/g, '"' + m.p + '"');
                    if (m.s) v = v.replace(/"Playfair Display"/g, '"' + m.s + '"');
                    if (m.h) v = v.replace(/"Caveat"/g, '"' + m.h + '"');
                }
                FONT_DESC.set.call(ctx, v);
            }
        });
    }
    function wrapTemplates() {
        Object.keys(TEMPLATES).forEach((key) => {
            const t = TEMPLATES[key], d = t.draw;
            if (t.__cx) return; t.__cx = true;
            t.draw = function (ctx, W, H, data) {
                patchFonts(ctx, data && data.custom && data.custom.f);
                return d.apply(this, arguments);
            };
        });
    }

    // ---------- public API ----------
    const PostGenerator = {
        FORMATS,
        TEMPLATES,

        async prepare(data) {
            await ensureFonts();
            const cf = data.custom && data.custom.f;
            if (cf && document.fonts && document.fonts.load) {
                try { await Promise.all(Object.values(cf).map((n) => document.fonts.load('700 40px "' + n + '"'))); } catch (e) { /* fallback fonts */ }
            }
            wrapTemplates();
            const photos = (data.photos && data.photos.length ? data.photos : [data.photo]).filter(Boolean);
            const imgs = (await Promise.all(photos.map(loadImage))).filter(Boolean);
            const pal = customPalette(PALETTES[data.theme] || PALETTES['theme-golden'], data.custom);
            return { imgs, pal };
        },

        async makePNG(data, formatKey, templateKey) {
            const f = FORMATS[formatKey] || FORMATS.square;
            const draw = (TEMPLATES[templateKey] || TEMPLATES.polaroid).draw;
            const { imgs, pal } = await this.prepare(data);
            const c = document.createElement('canvas');
            c.width = f.w; c.height = f.h;
            const ctx = c.getContext('2d');
            // t chosen so first photo is fully visible and sparkles look nice
            draw(ctx, f.w, f.h, data, imgs.length > 1 ? imgs.slice(0, 1) : imgs, 0.2, pal);
            return new Promise((res) => c.toBlob(res, 'image/png'));
        },

        async makeGIF(data, formatKey, templateKey, onProgress) {
            const f = FORMATS[formatKey] || FORMATS.square;
            const draw = (TEMPLATES[templateKey] || TEMPLATES.polaroid).draw;
            const { imgs, pal } = await this.prepare(data);
            const gw = f.gifW, gh = Math.round(f.gifW * f.h / f.w);
            const scale = gw / f.w;
            const k = Math.max(1, imgs.length);
            const fps = 10;
            const framesPerPhoto = 16;
            const total = k === 1 ? 32 : k * framesPerPhoto;

            const c = document.createElement('canvas');
            c.width = gw; c.height = gh;
            const ctx = c.getContext('2d', { willReadFrequently: true });

            const render = (n) => {
                ctx.setTransform(scale, 0, 0, scale, 0, 0);
                draw(ctx, f.w, f.h, data, imgs, n / total, pal);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                return ctx.getImageData(0, 0, gw, gh).data;
            };
            const tick = () => new Promise((r) => setTimeout(r, 0));

            // pass 1: colour histogram from sampled frames
            const hist = new Uint32Array(32768);
            const step = Math.max(1, Math.floor(total / 24));
            for (let n = 0; n < total; n += step) {
                const px = render(n);
                for (let i = 0; i < px.length; i += 4 * 5) {
                    hist[((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3)]++;
                }
                if (onProgress) onProgress(0.15 * (n / total));
                await tick();
            }
            const gpal = buildPalette(hist);
            const cache = new Int16Array(32768).fill(-1);

            // pass 2: encode
            const bytes = gifHeader(gw, gh, gpal);
            const idx = new Uint8Array(gw * gh);
            const delay = Math.round(100 / fps);
            for (let n = 0; n < total; n++) {
                const px = render(n);
                quantize(px, gw, gh, gpal, cache, idx);
                bytes.push(0x21, 0xF9, 4, 0x04, delay & 255, delay >> 8, 0, 0);
                bytes.push(0x2C, 0, 0, 0, 0, gw & 255, gw >> 8, gh & 255, gh >> 8, 0);
                bytes.push(8);
                lzwEncode(idx, 8, bytes);
                if (onProgress) onProgress(0.15 + 0.85 * ((n + 1) / total));
                if (n % 2 === 1) await tick();
            }
            bytes.push(0x3B);
            return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
        },

        download(blob, filename) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        },

        safeName(data) {
            return String(data.name || 'Name').replace(/[^a-zA-Z0-9_-]/g, '_');
        }
    };

    window.PostGenerator = PostGenerator;
})();
