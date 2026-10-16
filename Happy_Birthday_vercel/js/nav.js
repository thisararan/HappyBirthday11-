/* Back-button support.
 *
 * The celebration preview, the share / wish modals, the photo lightbox and the avatar / crop dialogs are all
 * "layers" on top of one page. Without history entries the phone's Back gesture leaves the site completely
 * (or restarts it). Here every layer that opens gets one history entry, so:
 *   Back  -> closes the top layer (celebration -> back to the studio, exactly where you were scrolled)
 *   Close buttons / Esc / "Edit Wish" -> close the layer and drop its history entry again
 * Nothing in the other scripts has to know about this: layers are detected from their visibility.
 * A card opened from a share link starts with its celebration view as the base page, so Back leaves normally.
 */
(function () {
    'use strict';

    // close = selector of the layer's own close button (so its normal clean-up runs); fallback = hide it ourselves
    const LAYERS = [
        { id: 'view',     sel: '#recipient-view',        close: null },
        { id: 'share',    sel: '#share-modal',           close: '#btn-close-share-modal' },
        { id: 'lightbox', sel: '#photo-lightbox',        close: '#lightbox-close' },
        { id: 'wish',     sel: '#wish-modal',            close: '#wish-modal-close' },
        { id: 'avatar',   sel: '.avatar-maker-overlay',  close: '.avatar-close' },
        { id: 'crop',     sel: '.crop-overlay',          close: '.crop-cancel' }
    ];

    let stack = [];            // ids of open layers, each owning one history entry
    let baseline = new Set();  // layers already open at load (share-link card): not tracked until closed
    let busy = false;          // waiting for the popstate caused by our own history.go()
    let queued = false;
    let savedScroll = null;    // studio scroll position while the celebration preview is open

    const el = (L) => document.querySelector(L.sel);
    const isOpen = (L) => { const e = el(L); return !!e && e.getClientRects().length > 0; };
    const byId = (id) => LAYERS.find((l) => l.id === id);

    function forceClose(L) {
        const e = el(L);
        if (!e) return;
        if (L.id === 'view') {
            if (window.birthdayApp && window.birthdayApp.showStudioView) window.birthdayApp.showStudioView();
            else e.classList.add('hidden');
            return;
        }
        const btn = L.close && e.querySelector(L.close);
        if (btn) btn.click();
        if (isOpen(L)) { if (e.hasAttribute('hidden') || L.id === 'crop') e.hidden = true; else e.classList.add('hidden'); }
    }

    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; evaluate(); });
    }

    function evaluate() {
        if (busy) return;
        const open = {};
        LAYERS.forEach((L) => { open[L.id] = isOpen(L); });

        // layers that became hidden again: forget the baseline, or drop their history entries
        baseline.forEach((id) => { if (!open[id]) baseline.delete(id); });
        const gone = stack.filter((id) => !open[id]);
        if (gone.length) {
            stack = stack.filter((id) => open[id]);
            busy = true;
            history.go(-gone.length);       // popstate follows; evaluate() runs again after it
            return;
        }
        // layers that just opened: one history entry each
        LAYERS.forEach((L) => {
            if (open[L.id] && !stack.includes(L.id) && !baseline.has(L.id)) {
                history.pushState({ wsDepth: stack.length + 1 }, '');
                stack.push(L.id);
            }
        });
    }

    window.addEventListener('popstate', (e) => {
        if (busy) { busy = false; schedule(); return; }
        const depth = (e.state && e.state.wsDepth) || 0;
        if (depth > stack.length) {          // "forward" into an entry we cannot reopen: step back again
            busy = true;
            history.go(stack.length - depth);
            return;
        }
        while (stack.length > depth) {       // Back: close the top layer(s)
            const L = byId(stack.pop());
            if (L) forceClose(L);
        }
        schedule();
    });

    function start() {
        const app = window.birthdayApp;
        // a reloaded page can inherit a stale state object from the previous session
        if (history.state && history.state.wsDepth) history.replaceState(null, '');
        LAYERS.forEach((L) => { if (isOpen(L)) baseline.add(L.id); });

        if (app) {
            // Remember where the studio was scrolled so Back / "Edit Wish" return to the same place, not the top.
            const show = app.showRecipientView;
            app.showRecipientView = function () {
                if (!this.isRecipientMode) savedScroll = window.scrollY;
                return show.apply(this, arguments);
            };
            const studio = app.showStudioView;
            app.showStudioView = function () {
                const r = studio.apply(this, arguments);
                if (savedScroll !== null) {
                    const y = savedScroll; savedScroll = null;
                    const go = () => window.scrollTo({ top: y, left: 0, behavior: 'instant' });
                    requestAnimationFrame(go); setTimeout(go, 150);
                }
                return r;
            };
        }

        new MutationObserver(schedule).observe(document.body, {
            subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden']
        });
        schedule();
    }

    // run after app.js has initialised (its DOMContentLoaded handler is registered first)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0));
    else setTimeout(start, 0);
})();
