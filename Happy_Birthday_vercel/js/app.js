/* =========================================================
   MAIN APP CONTROLLER
   Coordinates Studio Creator, Multi-Photo Gallery, Melodies & Celebration
   ========================================================= */

const PRESET_MESSAGES = {
    bestie: "Happy Birthday Name! 🍕🎉 May your day be packed with endless laughs, great food, unforgettable memories, and all the happiness you bring into everyone else's life! Stay awesome!",
    romantic: "Happy Birthday my dearest Name! ❤️ Every single moment with you is a treasure. On your special day, I wish you a year filled with as much wonder, love, and joy as you've brought into my heart. Forever and always!",
    sweet: "Wishing dearest Name the happiest of birthdays! 🎂✨ May this new year of life bless you with good health, boundless peace, laughter, and grand success in every dream you chase.",
    fun: "Happy Birthday Name! 🎈 Another year older, wiser, and still totally hilarious! Let's eat way too much cake and celebrate the magnificent legend that you are!",
    sinhala: "ඔබට ජන්මදිනය සුභ වේවා! 🎉🎂 ජීවිතය ජය ගනිමින් ජය ජය ජය! ඔබේ ජිවිතයේ සෑම ආශාවක්ම ඉටු වේවා. ඔබව ආදරයෙන් සිහිකරන සියළු දෙනාගෙන් ජන්මදිනය සුභ වේවා! 💛",
    formal: "Dear Name, on the occasion of your birthday, please accept my warmest congratulations and heartfelt wishes. May this year be a milestone of great achievements, robust health, and lasting fulfillment. Wishing you continued success and happiness in all your endeavours.",
    poet: "🌸 Another year of stories told,\nAnother page of memories gold.\nWith every breath and every smile,\nYou make this world more worthwhile.\nHappy Birthday, Name! 🌸",
    motivate: "Happy Birthday Name! 🚀 This year, dream bigger, shine brighter, and conquer everything that once seemed impossible. You've got this! The best chapter of your life starts today!"
};

// Birthday quotes for the quote-of-the-day widget
const BIRTHDAY_QUOTES = [
    { text: "The more you celebrate life, the more there is to celebrate.", author: "Oprah Winfrey" },
    { text: "Today you are you, that is truer than true. There is no one alive who is youer than you.", author: "Dr. Seuss" },
    { text: "Count your age by friends, not years. Count your life by smiles, not tears.", author: "John Lennon" },
    { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
    { text: "Keep your eyes on the stars, and your feet on the ground.", author: "Theodore Roosevelt" },
    { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
    { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" }
];

// Replaces the placeholder word "Name" in a message with the real birthday person's name
window.resolveNameInMessage = function (message, name) {
    const msg = message || '';
    const realName = (name || '').trim();
    if (!realName || realName === 'Name') return msg;
    return msg.replace(/\bName\b/g, realName);
};

const MAX_PHOTOS = 10;
const MAX_AUDIO_MB = 12;
const AUDIO_MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', weba: 'audio/webm' };
const DEFAULT_AVATAR_DATA = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23ffd700'/><stop offset='100%25' stop-color='%23ff9900'/></linearGradient><linearGradient id='sk' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23ffdbac'/><stop offset='100%25' stop-color='%23f1c27d'/></linearGradient></defs><circle cx='100' cy='100' r='95' fill='url(%23bg)'/><polygon points='100,18 78,72 122,72' fill='%23ff4757'/><circle cx='100' cy='16' r='7' fill='%23ffd700'/><polygon points='100,28 85,60 115,60' fill='%232ed573' opacity='0.8'/><polygon points='100,38 92,50 108,50' fill='%231e90ff' opacity='0.9'/><circle cx='100' cy='108' r='42' fill='url(%23sk)'/><path d='M 84 100 Q 89 94 94 100' stroke='%23333' stroke-width='3.5' fill='none' stroke-linecap='round'/><path d='M 106 100 Q 111 94 116 100' stroke='%23333' stroke-width='3.5' fill='none' stroke-linecap='round'/><circle cx='82' cy='112' r='6' fill='%23ff7675' opacity='0.6'/><circle cx='118' cy='112' r='6' fill='%23ff7675' opacity='0.6'/><path d='M 90 118 Q 100 132 110 118' stroke='%23333' stroke-width='3.5' fill='%23d63031' stroke-linecap='round'/></svg>";

// Default celebration data
const DEFAULT_DATA = {
    name: "Name",
    sender: "",
    date: new Date().toISOString().split('T')[0],
    age: 24,
    photos: [DEFAULT_AVATAR_DATA], // Array supporting up to 5 photos
    tune: "classic",               // see BirthdayAudio.TUNES in js/audio.js
    message: "Happy Birthday Name! 🎂 May this year bring you endless success, joyful smiles, and unforgettable adventures. Keep shining bright!",
    postText: "",                  // optional separate caption for the post image / GIF ("" = use message)
    audio: null,                   // optional uploaded track: { name, data (data URL) } -> used when tune === "custom"
    theme: "theme-golden",
    layout: "template-magazine"
};

class BirthdayApp {
    constructor() {
        this.currentData = { ...DEFAULT_DATA, photos: [...DEFAULT_DATA.photos] };
        this.isRecipientMode = false;
        this.candlesBlown = false;
        this.countdownTimer = null;
        this.currentPhotoIndex = 0;
        this.photoSlideshowTimer = null;
    }

    init() {
        window.celebrationEngine.init('confetti-canvas', 'balloon-container');

        // Check if opened via share link
        const hash = window.location.hash;
        if (hash && (hash.includes('data=') || hash.length > 5)) {
            const decoded = window.birthdayExporter.decodeData(hash);
            if (decoded) {
                // Ensure photos is an array
                if (decoded.photo && (!decoded.photos || !decoded.photos.length)) {
                    decoded.photos = [decoded.photo];
                }
                this.currentData = { ...DEFAULT_DATA, ...decoded };
                this.isRecipientMode = true;
            }
        }

        this.bindEvents();
        this.syncCustomAudio();
        this.applyTheme(this.currentData.theme);

        if (this.isRecipientMode) {
            this.showRecipientView();
        } else {
            this.populateStudioForm();
            this.showStudioView();
        }
    }

    bindEvents() {
        // Keyboard shortcut: Space = more confetti, Escape = back to studio
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && this.isRecipientMode) {
                e.preventDefault();
                window.birthdayAudio.playPartyPopper();
                window.celebrationEngine.burstConfetti(
                    window.innerWidth * (0.2 + Math.random() * 0.6),
                    window.innerHeight * 0.3,
                    60
                );
            }
            if (e.key === 'Escape') {
                // Close lightbox or modal first
                const lightbox = document.getElementById('photo-lightbox');
                const shareModal = document.getElementById('share-modal');
                const wishModal = document.getElementById('wish-modal');
                if (lightbox && !lightbox.classList.contains('hidden')) {
                    lightbox.classList.add('hidden'); return;
                }
                if (wishModal && !wishModal.classList.contains('hidden')) {
                    wishModal.classList.add('hidden'); return;
                }
                if (shareModal && !shareModal.classList.contains('hidden')) {
                    shareModal.classList.add('hidden'); return;
                }
            }
        });

        // Name, Sender, Date, Age, Message inputs
        const nameInput = document.getElementById('input-name');
        const senderInput = document.getElementById('input-sender');
        const dateInput = document.getElementById('input-date');
        const ageInput = document.getElementById('input-age');
        const messageInput = document.getElementById('input-message');
        const photoInput = document.getElementById('input-photos');

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.currentData.name = e.target.value.trim() || 'Name';
            });
        }

        if (senderInput) {
            senderInput.addEventListener('input', (e) => {
                this.currentData.sender = e.target.value.trim();
            });
        }

        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.currentData.date = e.target.value;
                this.calculateAgeFromDate(e.target.value);
            });
        }

        if (ageInput) {
            ageInput.addEventListener('input', (e) => {
                this.currentData.age = parseInt(e.target.value, 10) || '';
            });
        }

        if (messageInput) {
            messageInput.addEventListener('input', (e) => {
                this.currentData.message = e.target.value;
                this.schedulePostPreview();
            });
        }

        // Multi-Photo Upload (up to 5 photos)
        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    this.processUploadedPhotos(files);
                }
            });
        }

        // Preset Message Buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-preset');
                if (PRESET_MESSAGES[type]) {
                    this.currentData.message = PRESET_MESSAGES[type];
                    if (messageInput) messageInput.value = PRESET_MESSAGES[type];
                    this.schedulePostPreview();
                }
            });
        });

        // Theme & Layout Selection
        document.querySelectorAll('.theme-option').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.theme-option').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const themeClass = card.getAttribute('data-theme');
                const layoutClass = card.getAttribute('data-layout') || 'template-classic';
                this.currentData.theme = themeClass;
                this.currentData.layout = layoutClass;
                this.applyTheme(themeClass, layoutClass);
                this.schedulePostPreview();   // keep live post preview + style tiles in sync with the chosen theme
            });
        });

        // Post description (separate caption for the post image / GIF)
        const postTextInput = document.getElementById('input-post-text');
        if (postTextInput) {
            postTextInput.addEventListener('input', (e) => {
                this.currentData.postText = e.target.value;
                this.schedulePostPreview();
            });
            const copyBtn = document.getElementById('btn-post-copy-msg');
            const clearBtn = document.getElementById('btn-post-clear');
            const setPostText = (v) => {
                postTextInput.value = v;
                postTextInput.dispatchEvent(new Event('input', { bubbles: true }));
                postTextInput.focus();
            };
            if (copyBtn) copyBtn.addEventListener('click', () => setPostText(this.currentData.message || ''));
            if (clearBtn) clearBtn.addEventListener('click', () => setPostText(''));
        }

        // Custom audio track upload
        const audioInput = document.getElementById('input-audio');
        const audioUploadBtn = document.getElementById('btn-upload-audio');
        const audioRemoveBtn = document.getElementById('btn-remove-audio');
        if (audioUploadBtn && audioInput) audioUploadBtn.addEventListener('click', () => audioInput.click());
        if (audioInput) {
            audioInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.handleAudioFile(file);
                audioInput.value = '';
            });
        }
        if (audioRemoveBtn) audioRemoveBtn.addEventListener('click', () => this.removeCustomAudio());

        // Tone / Melody Selection
        const tuneSelect = document.getElementById('select-tune');
        const previewTuneBtn = document.getElementById('btn-preview-tune');

        if (tuneSelect) {
            tuneSelect.addEventListener('change', (e) => {
                this.currentData.tune = e.target.value;
                if (window.birthdayAudio) window.birthdayAudio.stopMelody();
                if (previewTuneBtn) previewTuneBtn.innerHTML = '<span>▶ Listen / Test Tone</span>';
            });
        }

        if (previewTuneBtn) {
            previewTuneBtn.addEventListener('click', () => {
                const tune = this.currentData.tune || 'classic';
                const isPlaying = window.birthdayAudio.previewTune(tune, () => {
                    previewTuneBtn.innerHTML = '<span>▶ Listen / Test Tone</span>';
                });
                if (isPlaying) {
                    previewTuneBtn.innerHTML = '<span>⏹ Stop Music</span>';
                } else {
                    previewTuneBtn.innerHTML = '<span>▶ Listen / Test Tone</span>';
                }
            });
        }

        // Studio Actions
        const previewBtn = document.getElementById('btn-preview-celebration');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                window.birthdayAudio.stopMelody();
                if (previewTuneBtn) previewTuneBtn.innerHTML = '<span>▶ Listen / Test Tone</span>';
                this.showRecipientView();
            });
        }

        const shareLinkBtn = document.getElementById('btn-copy-share-link');
        if (shareLinkBtn) {
            shareLinkBtn.addEventListener('click', () => this.handleCopyShareLink());
        }

        const downloadHtmlBtn = document.getElementById('btn-download-standalone');
        if (downloadHtmlBtn) {
            downloadHtmlBtn.addEventListener('click', () => {
                this.showToast(this.currentData.audio ? 'Preparing standalone HTML with your audio... \u23F3' : 'Preparing standalone HTML file... ⏳');
                window.birthdayExporter.downloadHTML(this.currentData);
            });
        }

        // Post Image (PNG) & Animated GIF export
        const postFormat = document.getElementById('select-post-format');
        const postTemplate = document.getElementById('select-post-template');
        const pngBtn = document.getElementById('btn-download-post-png');
        const gifBtn = document.getElementById('btn-download-post-gif');
        const runExport = async (kind, btn) => {
            if (!window.PostGenerator || btn.dataset.busy) return;
            btn.dataset.busy = '1';
            const label = btn.innerHTML;
            const fmt = postFormat ? postFormat.value : 'square';
            const tpl = postTemplate ? postTemplate.value : 'polaroid';
            const name = window.PostGenerator.safeName(this.currentData);
            try {
                if (kind === 'png') {
                    this.showToast('\uD83D\uDDBC\uFE0F Creating post image...');
                    const blob = await window.PostGenerator.makePNG(this.currentData, fmt, tpl);
                    window.PostGenerator.download(blob, `Birthday_${name}_${tpl}_${fmt}.png`);
                    this.showToast('\u2705 Post image downloaded!');
                } else {
                    this.showToast('\uD83C\uDF9E\uFE0F Creating GIF... please wait');
                    const blob = await window.PostGenerator.makeGIF(this.currentData, fmt, tpl, (p) => {
                        btn.innerHTML = `<span>\u23F3 ${Math.round(p * 100)}%</span>`;
                    });
                    window.PostGenerator.download(blob, `Birthday_${name}_${tpl}_${fmt}.gif`);
                    this.showToast('\u2705 GIF downloaded!');
                }
            } catch (err) {
                console.error(err);
                this.showToast('\u26A0\uFE0F Could not create the file. Try fewer/smaller photos.');
            } finally {
                btn.innerHTML = label;
                delete btn.dataset.busy;
            }
        };
        if (pngBtn) pngBtn.addEventListener('click', () => runExport('png', pngBtn));
        if (gifBtn) gifBtn.addEventListener('click', () => runExport('gif', gifBtn));
        if (postFormat) postFormat.addEventListener('change', () => this.schedulePostPreview());
        if (postTemplate) postTemplate.addEventListener('change', () => this.schedulePostPreview());
        this.schedulePostPreview();

        // Back to Studio
        const backToStudioBtn = document.getElementById('btn-back-to-studio');
        if (backToStudioBtn) {
            backToStudioBtn.addEventListener('click', () => {
                this.showStudioView();
            });
        }

        // Sound Toggle
        const soundBtn = document.getElementById('sound-toggle-btn');
        const soundIcon = document.getElementById('sound-icon');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const isMuted = window.birthdayAudio.toggleMute();
                soundIcon.textContent = isMuted ? '🔇' : '🔊';
            });
        }

        // Gift Box Unwrap
        const giftTrigger = document.getElementById('gift-box-trigger');
        if (giftTrigger) {
            giftTrigger.addEventListener('click', () => this.handleUnwrapGift());
        }

        // Candles Click / Blow
        const blowBtn = document.getElementById('blow-candles-btn');
        if (blowBtn) {
            blowBtn.addEventListener('click', () => this.blowCandles());
        }

        document.querySelectorAll('.candle').forEach(c => {
            c.addEventListener('click', () => this.blowCandles());
        });

        // More Confetti / Replay Song
        const burstMoreBtn = document.getElementById('btn-burst-more');
        if (burstMoreBtn) {
            burstMoreBtn.addEventListener('click', () => {
                window.birthdayAudio.playPartyPopper();
                window.celebrationEngine.burstConfetti(window.innerWidth / 2, window.innerHeight / 2, 100);
            });
        }

        const replaySongBtn = document.getElementById('btn-replay-tune');
        if (replaySongBtn) {
            replaySongBtn.addEventListener('click', () => {
                window.birthdayAudio.playTune(this.currentData.tune || 'classic');
            });
        }

        // Auto-Slideshow Toggle
        const slideshowBtn = document.getElementById('btn-toggle-slideshow');
        if (slideshowBtn) {
            slideshowBtn.addEventListener('click', () => {
                if (this.photoSlideshowTimer) {
                    this.stopPhotoSlideshow();
                    this.showToast('⏸ Slideshow paused');
                } else {
                    this.startPhotoSlideshow();
                    this.showToast('▶ Slideshow started!');
                }
            });
        }

        // Photo Lightbox on click
        const displayPhoto = document.getElementById('display-photo');
        if (displayPhoto) {
            displayPhoto.addEventListener('click', () => this.openPhotoLightbox());
        }

        // Lightbox close
        const lightbox = document.getElementById('photo-lightbox');
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox || e.target.id === 'lightbox-close') {
                    lightbox.classList.add('hidden');
                }
            });
        }

        // Wish modal close
        const wishModal = document.getElementById('wish-modal');
        const wishModalClose = document.getElementById('wish-modal-close');
        if (wishModalClose && wishModal) {
            wishModalClose.addEventListener('click', () => wishModal.classList.add('hidden'));
            wishModal.addEventListener('click', (e) => {
                if (e.target === wishModal) wishModal.classList.add('hidden');
            });
        }

        // Gift box hover shake
        const giftBox = document.getElementById('gift-box-trigger');
        if (giftBox) {
            giftBox.addEventListener('mouseenter', () => {
                if (!giftBox.classList.contains('unwrapping')) {
                    giftBox.classList.add('gift-shake');
                    setTimeout(() => giftBox.classList.remove('gift-shake'), 600);
                }
            });
        }

        // Quote widget refresh
        const refreshQuoteBtn = document.getElementById('btn-refresh-quote');
        if (refreshQuoteBtn) {
            refreshQuoteBtn.addEventListener('click', () => this.renderRandomQuote());
        }

        // Countdown Peek
        const peekBtn = document.getElementById('btn-peek-surprise');
        if (peekBtn) {
            peekBtn.addEventListener('click', () => {
                document.getElementById('countdown-section').classList.add('hidden');
                document.getElementById('celebration-section').classList.remove('hidden');
            });
        }

        // Polaroid Photo Gallery Navigation (Next / Prev)
        const prevPhotoBtn = document.getElementById('btn-prev-photo');
        const nextPhotoBtn = document.getElementById('btn-next-photo');
        if (prevPhotoBtn) {
            prevPhotoBtn.addEventListener('click', () => this.changePhoto(-1));
        }
        if (nextPhotoBtn) {
            nextPhotoBtn.addEventListener('click', () => this.changePhoto(1));
        }

        // Share Modal Buttons
        const closeShareModalBtn = document.getElementById('btn-close-share-modal');
        const shareModal = document.getElementById('share-modal');
        if (closeShareModalBtn && shareModal) {
            closeShareModalBtn.addEventListener('click', () => shareModal.classList.add('hidden'));
            shareModal.addEventListener('click', (e) => {
                if (e.target === shareModal) shareModal.classList.add('hidden');
            });
        }

        const modalDownloadBtn = document.getElementById('modal-btn-download-html');
        if (modalDownloadBtn) {
            modalDownloadBtn.addEventListener('click', () => {
                this.showToast('Preparing standalone HTML file... ⏳');
                window.birthdayExporter.downloadHTML(this.currentData);
            });
        }

        const copyWifiBtn = document.getElementById('btn-copy-wifi-link');
        const wifiInput = document.getElementById('wifi-share-input');
        if (copyWifiBtn && wifiInput) {
            copyWifiBtn.addEventListener('click', () => {
                this.fallbackCopyText(wifiInput.value);
            });
        }
    }

    processUploadedPhotos(files) {
        // If current photos has only default sample, reset it
        if (this.currentData.photos.length === 1 && (this.currentData.photos[0] === "assets/avatar-sample.svg" || this.currentData.photos[0] === DEFAULT_AVATAR_DATA)) {
            this.currentData.photos = [];
        }

        const availableSlots = MAX_PHOTOS - this.currentData.photos.length;
        if (availableSlots <= 0) {
            this.showToast(`⚠️ Maximum ${MAX_PHOTOS} photos allowed. Please remove one first.`);
            return;
        }

        const toProcess = files.slice(0, availableSlots);
        let processedCount = 0;

        toProcess.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 450;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressed = canvas.toDataURL('image/jpeg', 0.75);
                    this.currentData.photos.push(compressed);
                    processedCount++;

                    if (processedCount === toProcess.length) {
                        this.renderStudioPhotosList();
                        this.showToast(`📸 ${processedCount} photo(s) added successfully!`);
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    removePhoto(index) {
        this.currentData.photos.splice(index, 1);
        if (this.currentData.photos.length === 0) {
            this.currentData.photos = [DEFAULT_AVATAR_DATA];
        }
        this.renderStudioPhotosList();
    }

    renderStudioPhotosList() {
        const listWrap = document.getElementById('studio-photos-grid');
        const countBadge = document.getElementById('photos-count-badge');
        if (!listWrap) return;

        listWrap.innerHTML = '';
        const photos = this.currentData.photos || [];
        const isDefaultOnly = photos.length === 1 && (photos[0] === "assets/avatar-sample.svg" || photos[0] === DEFAULT_AVATAR_DATA);
        const realCount = isDefaultOnly ? 0 : photos.length;

        if (countBadge) {
            countBadge.textContent = `${realCount} / ${MAX_PHOTOS} Photos`;
        }

        photos.forEach((src, idx) => {
            const item = document.createElement('div');
            item.className = 'studio-photo-thumb';

            const img = document.createElement('img');
            img.src = src;
            item.appendChild(img);

            if (!isDefaultOnly) {
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'remove-thumb-btn';
                removeBtn.innerHTML = '✕';
                removeBtn.title = 'Remove this photo';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removePhoto(idx);
                });
                item.appendChild(removeBtn);
            }

            listWrap.appendChild(item);
        });

        // Toggle upload button visibility if full
        const uploadBtn = document.getElementById('btn-add-photos-trigger');
        if (uploadBtn) {
            uploadBtn.style.display = realCount >= MAX_PHOTOS ? 'none' : 'inline-flex';
        }

        this.schedulePostPreview();
    }

    schedulePostPreview() {
        clearTimeout(this._postPreviewTimer);
        this._postPreviewTimer = setTimeout(() => this.renderPostPreview(), 250);
    }

    async renderPostPreview() {
        const box = document.getElementById('post-template-preview');
        if (!box || !window.PostGenerator) return;
        const templateSel = document.getElementById('select-post-template');
        const formatSel = document.getElementById('select-post-format');
        const templateKey = templateSel ? templateSel.value : 'polaroid';
        const formatKey = formatSel ? formatSel.value : 'square';
        const myToken = (this._previewToken = (this._previewToken || 0) + 1);

        try {
            const f = window.PostGenerator.FORMATS[formatKey] || window.PostGenerator.FORMATS.square;
            const draw = (window.PostGenerator.TEMPLATES[templateKey] || window.PostGenerator.TEMPLATES.polaroid).draw;
            const { imgs, pal } = await window.PostGenerator.prepare(this.currentData);
            if (myToken !== this._previewToken) return; // a newer preview was requested meanwhile

            const previewW = 360;
            const previewH = Math.round(previewW * f.h / f.w);
            let canvas = box.querySelector('canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                box.innerHTML = '';
                box.appendChild(canvas);
            }
            canvas.width = previewW;
            canvas.height = previewH;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(previewW / f.w, 0, 0, previewW / f.w, 0, 0);
            draw(ctx, f.w, f.h, this.currentData, imgs.length > 1 ? imgs.slice(0, 1) : imgs, 0.2, pal);
            this.updatePostTextHint(!!window.PostGenerator.textTruncated);
        } catch (e) {
            // preview is best-effort; download buttons still work even if this fails
        }
    }

    // ---------- Post description hint ----------
    updatePostTextHint(truncated) {
        const hint = document.getElementById('post-text-hint');
        if (!hint) return;
        const spans = hint.querySelectorAll('span');
        const own = (this.currentData.postText || '').trim();
        const n = (own || this.currentData.message || '').length;
        if (spans[1]) spans[1].textContent = n + ' chars';
        hint.classList.toggle('warn', truncated);
        if (spans[0]) {
            spans[0].textContent = truncated
                ? '\u26A0\uFE0F Too long for this post layout \u2014 it gets shortened with \u201C\u2026\u201D. Shorten it, or pick Portrait / Story size.'
                : '\uD83D\uDCA1 Only the post uses this \u2014 the celebration page keeps the wish message';
        }
    }

    // ---------- Custom audio track ----------
    syncCustomAudio() {
        const a = this.currentData.audio;
        window.birthdayAudio.setCustomAudio(a && a.data ? a.data : null);
        if (this.currentData.tune === 'custom' && !(a && a.data)) this.currentData.tune = 'classic';
    }

    refreshAudioUI() {
        const sel = document.getElementById('select-tune');
        const nameEl = document.getElementById('audio-file-name');
        const rmBtn = document.getElementById('btn-remove-audio');
        const upBtn = document.getElementById('btn-upload-audio');
        const a = this.currentData.audio;
        const has = !!(a && a.data);

        if (sel) {
            let grp = document.getElementById('tune-group-custom');
            if (has) {
                if (!grp) {
                    grp = document.createElement('optgroup');
                    grp.id = 'tune-group-custom';
                    grp.label = 'Your Own Music';
                    const opt = document.createElement('option');
                    opt.value = 'custom';
                    grp.appendChild(opt);
                    sel.insertBefore(grp, sel.firstChild);
                }
                grp.firstChild.textContent = '\uD83C\uDFB6 ' + a.name;
            } else if (grp) {
                grp.remove();
            }
        }
        if (nameEl) {
            nameEl.textContent = has ? ('\u2705 ' + a.name + (a.duration ? ' \u00B7 ' + a.duration : '')) : '';
            nameEl.classList.toggle('hidden', !has);
        }
        if (rmBtn) rmBtn.classList.toggle('hidden', !has);
        if (upBtn) upBtn.innerHTML = has ? '<span>\uD83D\uDD04 Change audio track</span>' : '<span>\uD83C\uDFB6 Add your own audio track</span>';
    }

    handleAudioFile(file) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const isAudio = (file.type && file.type.startsWith('audio/')) || AUDIO_MIME[ext];
        if (!isAudio) {
            this.showToast('\u26A0\uFE0F Please choose an audio file (MP3, WAV, M4A, OGG...)');
            return;
        }
        if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
            this.showToast('\u26A0\uFE0F That file is over ' + MAX_AUDIO_MB + ' MB. Try a shorter / smaller track.');
            return;
        }
        this.showToast('\uD83C\uDFB6 Loading audio... \u23F3');
        const reader = new FileReader();
        reader.onerror = () => this.showToast('\u26A0\uFE0F Could not read that file.');
        reader.onload = () => {
            let data = String(reader.result || '');
            // Some systems report no MIME type; make sure the data URL says it is audio so it can play.
            if (!/^data:audio\//.test(data) && AUDIO_MIME[ext]) {
                data = 'data:' + AUDIO_MIME[ext] + ';base64,' + data.split(',')[1];
            }
            const probe = new Audio();
            probe.preload = 'metadata';
            probe.onerror = () => this.showToast('\u26A0\uFE0F This browser cannot play that audio file. Try an MP3.');
            probe.onloadedmetadata = () => {
                const secs = isFinite(probe.duration) ? Math.round(probe.duration) : 0;
                const duration = secs ? Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') : '';
                this.currentData.audio = { name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'My track', data, duration };
                this.currentData.tune = 'custom';
                window.birthdayAudio.stopMelody();
                this.syncCustomAudio();
                this.refreshAudioUI();
                const sel = document.getElementById('select-tune');
                if (sel) sel.value = 'custom';
                const prev = document.getElementById('btn-preview-tune');
                if (prev) prev.innerHTML = '<span>\u25B6 Listen / Test Tone</span>';
                this.showToast('\u2705 Audio added! Press \u25B6 to test it.');
            };
            probe.src = data;
        };
        reader.readAsDataURL(file);
    }

    removeCustomAudio() {
        window.birthdayAudio.stopMelody();
        this.currentData.audio = null;
        if (this.currentData.tune === 'custom') this.currentData.tune = 'classic';
        this.syncCustomAudio();
        this.refreshAudioUI();
        const sel = document.getElementById('select-tune');
        if (sel) sel.value = this.currentData.tune || 'classic';
        const prev = document.getElementById('btn-preview-tune');
        if (prev) prev.innerHTML = '<span>\u25B6 Listen / Test Tone</span>';
        this.showToast('\uD83D\uDDD1\uFE0F Audio track removed');
    }

    calculateAgeFromDate(dateStr) {
        if (!dateStr) return;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const birthYear = parseInt(parts[0], 10);
            const nowYear = new Date().getFullYear();
            if (birthYear && birthYear < nowYear && birthYear > 1900) {
                const calculatedAge = nowYear - birthYear;
                this.currentData.age = calculatedAge;
                const ageInput = document.getElementById('input-age');
                if (ageInput) ageInput.value = calculatedAge;
            }
        }
    }

    populateStudioForm() {
        const nameInput = document.getElementById('input-name');
        const senderInput = document.getElementById('input-sender');
        const dateInput = document.getElementById('input-date');
        const ageInput = document.getElementById('input-age');
        const messageInput = document.getElementById('input-message');
        const tuneSelect = document.getElementById('select-tune');

        if (nameInput) nameInput.value = (this.currentData.name && this.currentData.name !== 'Name') ? this.currentData.name : '';
        if (senderInput) senderInput.value = this.currentData.sender || '';
        if (dateInput) dateInput.value = this.currentData.date || '';
        if (ageInput) ageInput.value = this.currentData.age || 24;
        if (messageInput) messageInput.value = this.currentData.message || '';
        const postTextInput = document.getElementById('input-post-text');
        if (postTextInput) postTextInput.value = this.currentData.postText || '';
        this.refreshAudioUI();
        if (tuneSelect) tuneSelect.value = this.currentData.tune || 'classic';

        // Select theme
        document.querySelectorAll('.theme-option').forEach(card => {
            if (card.getAttribute('data-theme') === this.currentData.theme) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        this.renderStudioPhotosList();
    }

    applyTheme(themeName, layoutName) {
        // Preserve classes that are not theme/layout related
        const classesToKeep = Array.from(document.body.classList).filter(
            c => !c.startsWith('theme-') && !c.startsWith('template-')
        );
        document.body.className = classesToKeep.join(' ');
        document.body.classList.add(themeName || 'theme-golden');
        document.body.classList.add(layoutName || this.currentData.layout || 'template-magazine');
    }

    showStudioView() {
        window.celebrationEngine.clear();
        window.birthdayAudio.stopMelody();
        this.stopPhotoSlideshow();

        const studioView = document.getElementById('studio-view');
        const recipientView = document.getElementById('recipient-view');
        const backBtn = document.getElementById('btn-back-to-studio');
        const kbHint = document.getElementById('keyboard-hint');

        if (studioView) studioView.classList.remove('hidden');
        if (recipientView) recipientView.classList.add('hidden');
        if (backBtn) backBtn.classList.add('hidden');
        if (kbHint) kbHint.classList.add('hidden');

        this.isRecipientMode = false;
        this.resetCelebrationState();
    }

    showRecipientView() {
        const studioView = document.getElementById('studio-view');
        const recipientView = document.getElementById('recipient-view');
        const backBtn = document.getElementById('btn-back-to-studio');
        const kbHint = document.getElementById('keyboard-hint');

        if (studioView) studioView.classList.add('hidden');
        if (recipientView) recipientView.classList.remove('hidden');
        if (backBtn && !this.isRecipientMode) backBtn.classList.remove('hidden');
        if (kbHint) {
            setTimeout(() => kbHint.classList.remove('hidden'), 3000);
        }

        this.isRecipientMode = true;
        this.applyTheme(this.currentData.theme);
        this.populateRecipientView();
        this.checkDateAndCountdown();
    }


    populateRecipientView() {
        const name = this.currentData.name || 'Name';
        const sender = (this.currentData.sender || '').trim();

        document.querySelectorAll('.dynamic-name').forEach(el => el.textContent = name);

        // Gift tag "From: <sender>" line (only shown when a sender name is provided)
        const giftFromEl = document.getElementById('gift-tag-from');
        const giftFromNameEl = document.getElementById('display-sender-tag');
        if (giftFromEl && giftFromNameEl) {
            if (sender) {
                giftFromNameEl.textContent = sender;
                giftFromEl.classList.remove('hidden');
            } else {
                giftFromEl.classList.add('hidden');
            }
        }

        // Signature line under the message ("— With Lots of Love, <sender> ❤️")
        const signatureEl = document.getElementById('display-signature');
        if (signatureEl) {
            signatureEl.textContent = sender
                ? `— With Lots of Love, ${sender} ❤️`
                : '— With Lots of Love ❤️';
        }

        const agePill = document.getElementById('display-age-pill');
        if (agePill) {
            agePill.textContent = this.currentData.age 
                ? `Level ${this.currentData.age} Unlocked! 🌟` 
                : 'Special Birthday Celebration ✨';
        }

        // Typewriter animation for message
        const msgEl = document.getElementById('display-message');
        if (msgEl) {
            const msg = window.resolveNameInMessage(this.currentData.message, this.currentData.name).replace(/\n/g, '<br>');
            msgEl.innerHTML = '';
            this._typewriteMessage(msgEl, msg);
        }

        const dateEl = document.getElementById('display-birthdate');
        if (dateEl) {
            // Format date nicely
            if (this.currentData.date) {
                const d = new Date(this.currentData.date + 'T00:00:00');
                dateEl.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            } else {
                dateEl.textContent = 'Special Day';
            }
        }

        // Render random birthday quote
        this.renderRandomQuote();

        // Setup photo gallery
        this.currentPhotoIndex = 0;
        this.renderRecipientGallery();
        this.updateSlideshowButton();
    }

    renderRecipientGallery() {
        const photos = this.currentData.photos || ["assets/avatar-sample.svg"];
        const photoImg = document.getElementById('display-photo');
        const counterEl = document.getElementById('gallery-photo-counter');
        const dotsWrap = document.getElementById('gallery-dots');
        const prevBtn = document.getElementById('btn-prev-photo');
        const nextBtn = document.getElementById('btn-next-photo');

        if (photoImg) {
            const nextSrc = photos[this.currentPhotoIndex] || photos[0];
            // Smooth crossfade + Ken Burns zoom effect on every photo change
            photoImg.classList.add('photo-fading');
            photoImg.classList.remove('kb-pan-a', 'kb-pan-b');
            window.setTimeout(() => {
                photoImg.src = nextSrc;
                photoImg.classList.remove('hidden', 'photo-fading');
                // Alternate two different Ken Burns directions so it never feels repetitive
                photoImg.classList.add(this.currentPhotoIndex % 2 === 0 ? 'kb-pan-a' : 'kb-pan-b');
            }, 220);
        }

        if (counterEl) {
            counterEl.textContent = `${this.currentPhotoIndex + 1} / ${photos.length}`;
            counterEl.style.display = photos.length > 1 ? 'inline-block' : 'none';
        }

        if (prevBtn && nextBtn) {
            const showControls = photos.length > 1;
            prevBtn.style.display = showControls ? 'flex' : 'none';
            nextBtn.style.display = showControls ? 'flex' : 'none';
        }

        if (dotsWrap) {
            dotsWrap.innerHTML = '';
            if (photos.length > 1) {
                photos.forEach((_, idx) => {
                    const dot = document.createElement('span');
                    dot.className = `gallery-dot ${idx === this.currentPhotoIndex ? 'active' : ''}`;
                    dot.addEventListener('click', () => {
                        this.currentPhotoIndex = idx;
                        this.renderRecipientGallery();
                    });
                    dotsWrap.appendChild(dot);
                });
            }
        }
    }

    changePhoto(direction) {
        const photos = this.currentData.photos || [];
        if (photos.length <= 1) return;

        this.currentPhotoIndex = (this.currentPhotoIndex + direction + photos.length) % photos.length;
        this.renderRecipientGallery();
    }

    startPhotoSlideshow() {
        this.stopPhotoSlideshow();
        const photos = this.currentData.photos || [];
        if (photos.length > 1) {
            this.photoSlideshowTimer = setInterval(() => {
                this.changePhoto(1);
            }, 4000);
        }
        this.updateSlideshowButton();
    }

    stopPhotoSlideshow() {
        if (this.photoSlideshowTimer) {
            clearInterval(this.photoSlideshowTimer);
            this.photoSlideshowTimer = null;
        }
        this.updateSlideshowButton();
    }

    // The button always mirrors the real state; it is hidden when there is only one photo (nothing to slide).
    updateSlideshowButton() {
        const btn = document.getElementById('btn-toggle-slideshow');
        if (!btn) return;
        const multi = (this.currentData.photos || []).length > 1;
        btn.classList.toggle('hidden', !multi);
        btn.innerHTML = this.photoSlideshowTimer ? '<span>⏸ Pause Slideshow</span>' : '<span>▶ Play Slideshow</span>';
    }

    checkDateAndCountdown() {
        const countdownSec = document.getElementById('countdown-section');
        const celebrationSec = document.getElementById('celebration-section');
        
        if (!this.currentData.date) {
            if (countdownSec) countdownSec.classList.add('hidden');
            if (celebrationSec) celebrationSec.classList.remove('hidden');
            return;
        }

        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const parts = this.currentData.date.split('-');

        let isFuture = false;
        let targetTimestamp = 0;

        if (parts.length === 3) {
            const bMonth = parseInt(parts[1], 10) - 1;
            const bDay = parseInt(parts[2], 10);
            targetTimestamp = new Date(now.getFullYear(), bMonth, bDay).getTime();

            if (targetTimestamp > todayMidnight) {
                isFuture = true;
            }
        }

        if (isFuture) {
            if (countdownSec) countdownSec.classList.remove('hidden');
            if (celebrationSec) celebrationSec.classList.add('hidden');
            this.startCountdown(targetTimestamp);
        } else {
            if (countdownSec) countdownSec.classList.add('hidden');
            if (celebrationSec) celebrationSec.classList.remove('hidden');
        }
    }

    startCountdown(targetTimestamp) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);

        const update = () => {
            const now = new Date().getTime();
            const diff = targetTimestamp - now;

            if (diff <= 0) {
                clearInterval(this.countdownTimer);
                document.getElementById('countdown-section').classList.add('hidden');
                document.getElementById('celebration-section').classList.remove('hidden');
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            const cdD = document.getElementById('cd-days');
            const cdH = document.getElementById('cd-hours');
            const cdM = document.getElementById('cd-minutes');
            const cdS = document.getElementById('cd-seconds');
            if (cdD) cdD.textContent = String(d).padStart(2, '0');
            if (cdH) cdH.textContent = String(h).padStart(2, '0');
            if (cdM) cdM.textContent = String(m).padStart(2, '0');
            if (cdS) cdS.textContent = String(s).padStart(2, '0');
        };

        update();
        this.countdownTimer = setInterval(update, 1000);
    }

    handleUnwrapGift() {
        const giftTrigger = document.getElementById('gift-box-trigger');
        const unwrapStep = document.getElementById('unwrap-step');
        const cardRevealStep = document.getElementById('card-reveal-step');

        if (!giftTrigger || giftTrigger.classList.contains('unwrapping')) return;

        giftTrigger.classList.add('unwrapping');
        window.birthdayAudio.playUnwrapSound();

        setTimeout(() => {
            window.celebrationEngine.burstConfetti(window.innerWidth / 2, window.innerHeight / 2, 180);
            window.celebrationEngine.startShower();
            window.celebrationEngine.spawnBalloons(16);
            
            // Play user-selected birthday tune!
            window.birthdayAudio.playTune(this.currentData.tune || 'classic');
            this.startPhotoSlideshow();

            if (unwrapStep) unwrapStep.classList.add('hidden');
            if (cardRevealStep) {
                cardRevealStep.classList.remove('hidden');
                cardRevealStep.classList.add('revealed');
            }
        }, 750);
    }

    blowCandles() {
        if (this.candlesBlown) return;
        this.candlesBlown = true;

        window.birthdayAudio.playCandleBlow();

        document.querySelectorAll('.candle').forEach(c => {
            c.setAttribute('data-lit', 'false');
            c.classList.add('blown-out');
        });

        window.celebrationEngine.burstConfetti(window.innerWidth / 2, window.innerHeight * 0.4, 90);

        const blowBtn = document.getElementById('blow-candles-btn');
        if (blowBtn) {
            blowBtn.innerHTML = '<span>✨ Wish Sent to the Stars! 🌟</span>';
            blowBtn.classList.add('btn-success');
        }

        // Show Make-a-Wish magic modal after 1.2s
        setTimeout(() => this.showWishModal(), 1200);
    }

    showWishModal() {
        const modal = document.getElementById('wish-modal');
        if (!modal) return;
        const name = this.currentData.name || 'you';
        const msgEl = modal.querySelector('#wish-modal-text');
        if (msgEl) {
            const wishes = [
                `Close your eyes, ${name}… your wish is travelling to the stars! ✨🌟`,
                `The universe heard you, ${name}! May every dream come true! 🌈💫`,
                `Your candles are out, your wish is on its way! Believe in magic, ${name}! 🪄✨`,
                `A wish made from the heart never goes unheard. Happy Birthday, ${name}! 💛🎉`
            ];
            msgEl.textContent = wishes[Math.floor(Math.random() * wishes.length)];
        }
        modal.classList.remove('hidden');
        // Auto-close after 5 seconds
        setTimeout(() => modal.classList.add('hidden'), 5500);
    }

    openPhotoLightbox() {
        const lightbox = document.getElementById('photo-lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const photos = this.currentData.photos || [];
        if (!lightbox || !lightboxImg || !photos.length) return;
        lightboxImg.src = photos[this.currentPhotoIndex] || photos[0];
        lightbox.classList.remove('hidden');
    }

    renderRandomQuote() {
        const quoteText = document.getElementById('birthday-quote-text');
        const quoteAuthor = document.getElementById('birthday-quote-author');
        if (!quoteText || !BIRTHDAY_QUOTES.length) return;
        const q = BIRTHDAY_QUOTES[Math.floor(Math.random() * BIRTHDAY_QUOTES.length)];
        quoteText.textContent = `"${q.text}"`;
        if (quoteAuthor) quoteAuthor.textContent = `— ${q.author}`;
    }

    _typewriteMessage(el, html) {
        // Strip HTML for typewriter, then restore
        const plain = html.replace(/<br>/g, '\n');
        let i = 0;
        const speed = Math.max(18, Math.min(45, Math.floor(2800 / plain.length)));
        el.innerHTML = '';
        const interval = setInterval(() => {
            if (i >= plain.length) { clearInterval(interval); el.innerHTML = html; return; }
            const ch = plain[i];
            if (ch === '\n') { el.innerHTML += '<br>'; }
            else { el.innerHTML += ch; }
            i++;
        }, speed);
    }

    resetCelebrationState() {
        this.candlesBlown = false;
        this.stopPhotoSlideshow();

        const unwrapStep = document.getElementById('unwrap-step');
        const cardRevealStep = document.getElementById('card-reveal-step');
        const giftTrigger = document.getElementById('gift-box-trigger');
        const blowBtn = document.getElementById('blow-candles-btn');

        if (giftTrigger) giftTrigger.classList.remove('unwrapping');
        if (unwrapStep) unwrapStep.classList.remove('hidden');
        if (cardRevealStep) {
            cardRevealStep.classList.add('hidden');
            cardRevealStep.classList.remove('revealed');
        }

        document.querySelectorAll('.candle').forEach(c => {
            c.setAttribute('data-lit', 'true');
            c.classList.remove('blown-out');
        });

        if (blowBtn) {
            blowBtn.innerHTML = '<span>💨 Blow / Extinguish Candles</span>';
            blowBtn.classList.remove('btn-success');
        }
    }

    handleCopyShareLink() {
        const shareModal = document.getElementById('share-modal');
        const wifiInput = document.getElementById('wifi-share-input');
        const wifiLink = window.birthdayExporter.getShareableLink(this.currentData);
        if (this.currentData.audio) {
            this.showToast('\u2139\uFE0F Your uploaded audio is not in the link \u2014 use Download Single HTML to include it.');
        }

        if (wifiInput) {
            wifiInput.value = wifiLink;
        }

        if (shareModal) {
            shareModal.classList.remove('hidden');
        } else {
            // Fallback direct copy
            this.fallbackCopyText(wifiLink);
        }
    }

    fallbackCopyText(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            this.showToast('✅ Shareable link copied to clipboard!');
        } catch (e) {
            this.showToast('⚠️ Please copy the URL from the browser address bar');
        }
        document.body.removeChild(textarea);
    }

    showToast(message) {
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.birthdayApp = new BirthdayApp();
    window.birthdayApp.init();
});
