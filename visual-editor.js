/**
 * GOSU VISUAL LIVE EDITOR V2 (Full Rich-Text Bar, Pinned Frame Buttons, Video Replacer, All-DOM Editable)
 */
(function () {
  const STORAGE_KEY = 'gosu_visual_editor_overrides_v1';
  const GH_TOKEN_KEY = 'gosu_visual_editor_gh_token';
  const ADMIN_UNLOCK_KEY = 'gosu_visual_editor_admin_v2';
  const ADMIN_PIN_SHA256 = '110209820ed294dbd46c55eb4de674a18c39fefac7b6f5de480213eaf757ed34';
  const LOCAL_SYNC_URL = 'http://127.0.0.1:8765/api/publish';

  function isAdminUnlocked() {
    return localStorage.getItem(ADMIN_UNLOCK_KEY) === ADMIN_PIN_SHA256;
  }

  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hashBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const GOOGLE_FONT_PRESETS = [
    { label: 'Mặc định (FZ OptiRadiant / Cormorant)', value: '', google: '' },
    { label: 'Cormorant Garamond (Cổ trang thanh lịch)', value: "'Cormorant Garamond', Georgia, serif", google: 'Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400' },
    { label: 'Spectral (Tiểu thuyết cổ điển)', value: "'Spectral', Georgia, serif", google: 'Spectral:ital,wght@0,300;0,400;0,600;1,400' },
    { label: 'Cormorant SC (Chữ hoa cổ điển)', value: "'Cormorant SC', serif", google: 'Cormorant+SC:wght@500;600;700' },
    { label: 'Playfair Display (Điện ảnh sang trọng)', value: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400' },
    { label: 'Cinzel (Hoàng cung uy nghi)', value: "'Cinzel', Georgia, serif", google: 'Cinzel:wght@400;600;700' },
    { label: 'Prata (Sắc nét cổ phong)', value: "'Prata', Georgia, serif", google: 'Prata' },
    { label: 'Lora (Mềm mại truyền thống)', value: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,600;1,400' },
    { label: 'EB Garamond (Sử ký cổ đại)', value: "'EB Garamond', Georgia, serif", google: 'EB+Garamond:ital,wght@0,400;0,600;1,400' },
    { label: 'Noto Serif Display (Hiện đại sắc sảo)', value: "'Noto Serif Display', Georgia, serif", google: 'Noto+Serif+Display:ital,wght@0,400;0,600;1,400' },
    { label: 'Merriweather (Dễ đọc, đầm nét)', value: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,400' },
    { label: 'Be Vietnam Pro (Sans-serif hiện đại)', value: "'Be Vietnam Pro', sans-serif", google: 'Be+Vietnam+Pro:wght@300;400;600;700' },
    { label: 'Montserrat (Hiện đại gọn gàng)', value: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;600;700' }
  ];

  let overrides = {
    version: 2,
    updatedAt: null,
    fonts: {
      display: '',
      body: '',
      serifAlt: '',
      sc: '',
      scale: 100,
      goldColor: '',
      crimsonColor: '',
      customFaces: []
    },
    texts: {},
    elementStyles: {},
    images: {},
    imageStyles: {},
    videos: {
      trailerUrl: '',
      openingUrl: ''
    },
    chars: null,
    places: null,
    relNodes: null
  };

  let isEditMode = false;
  let activeImgTarget = null;
  let activeTextTarget = null;
  let activeVideoSlot = 'trailerUrl'; // 'trailerUrl' or 'openingUrl'
  let pendingAssets = [];

  function showToast(msg, duration = 3200) {
    let toast = document.getElementById('ve-Toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 've-Toast';
      toast.className = 've-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-shown');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('is-shown'), duration);
  }

  function saveLocalDraft() {
    overrides.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch (err) {
      console.warn('LocalStorage quota warning:', err);
    }
  }

  // 1. Index every single nook & cranny across the DOM
  function indexDomElements() {
    const textSelectors = [
      'header .brand > span',
      'header nav > a',
      'header .nav-drop-trigger',
      'header .nav-drop-menu small',
      'header .nav-drop-menu strong',
      'header .menu-toggle',
      '#film-menu .eyebrow',
      '#film-menu a small',
      '.hero-meta > span',
      '.hero-kicker',
      '.hero h1 > span',
      '.hero h1 sup',
      '.hero-sub',
      '.hero-trailer-btn .trailer-btn-label',
      '.round-link',
      '.hero-bottom > span',
      '.hero-bottom > a',
      '.ticker > div',
      '.eyebrow',
      '.chapter-mark',
      'h2',
      'h3',
      'h4',
      '.story-talisman span',
      '.story p',
      'figcaption',
      '.script-tab-btn small',
      '.script-tab-btn strong',
      '.script-dossier p',
      '.script-dossier li',
      '.script-dossier blockquote',
      '.script-stat-card small',
      '.script-stat-card strong',
      '.script-stat-card span',
      '.video-badge-bar span',
      '.rel-board-header p',
      '.rel-legend span',
      '.rel-node small',
      '.rel-node strong',
      '.rel-node em',
      '.faction-card h4',
      '.faction-card p',
      '.faction-card li',
      '.fc-badge',
      '.fc-wire-note',
      '.faction-middle-connector strong',
      '.faction-middle-connector span',
      '.act-card small',
      '.act-card h4',
      '.act-card p',
      '.act-card li',
      '.section-title p',
      '.char-view-links button',
      '#world .place > span',
      '.principles .principle-item span',
      '.principles .principle-item small',
      '.relic-filter',
      '.relic-img-badge',
      '.relic-dossier span',
      '.relic-dossier h3',
      '.relic-dossier p',
      '.relic-dossier li',
      '.relic-dossier .relic-Inspect-btn',
      '.relic-more-head p',
      '.relic-more-chip small',
      '.relic-more-chip strong',
      '.relic-more-chip span',
      '#gallery .gallery-sub',
      '#gallery .gallery-actions button',
      '#gallery .frame-meta span',
      '#gallery .frame-meta strong',
      '#gallery .frame-meta small',
      '#gallery > .caption',
      '#project .fact-logo-item > span',
      '#project .facts > div',
      '#project > .button',
      'footer .brand > span',
      'footer > p',
      'footer > span',
      '.footer-word',
      '#trailer-placeholder h3',
      '#trailer-placeholder p'
    ];

    const allTexts = document.querySelectorAll(textSelectors.join(','));
    allTexts.forEach((el, idx) => {
      if (
        el.closest('#character-info') ||
        el.closest('#ve-Toolbar') ||
        el.closest('#ve-FormatBar') ||
        el.closest('.ve-modal') ||
        el.closest('.ve-pinned-bar') ||
        el.id === 'place-title' ||
        el.id === 'place-description' ||
        el.id === 'rel-detail-tag' ||
        el.id === 'rel-detail-name' ||
        el.id === 'rel-detail-desc'
      ) {
        return;
      }
      if (el.querySelector('img')) return;
      if (!el.dataset.veId) {
        const tag = el.tagName.toLowerCase();
        const sec = el.closest('section, header, footer, aside, dialog')?.id || el.closest('section')?.className.split(' ')[0] || 'root';
        el.dataset.veId = `${sec}.${tag}.${idx}`;
      }
    });

    const allImgs = document.querySelectorAll('img:not(.hero-title-art)');
    allImgs.forEach((img, idx) => {
      if (img.closest('.ve-modal') || img.closest('#lightbox')) return;
      if (img.id === 'portrait') {
        img.dataset.veImgId = 'char-portrait-dynamic';
      } else if (img.classList.contains('heroart')) {
        img.dataset.veImgId = 'hero-bg-main';
      } else if (!img.dataset.veImgId) {
        const sec = img.closest('section, header, footer')?.id || img.closest('section')?.className.split(' ')[0] || 'root';
        img.dataset.veImgId = `${sec}.img.${idx}`;
      }
    });
  }

  // 2. Apply overrides (Fonts, Texts, Element Styles, Images, Videos, Dynamic Arrays)
  function ensureGoogleFontLoaded(googleSpec) {
    if (!googleSpec) return;
    const id = 've-gfont-' + googleSpec.replace(/[^a-z0-9]/gi, '');
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${googleSpec}&display=swap`;
    document.head.appendChild(link);
  }

  function applyFontAndThemeOverrides() {
    const f = overrides.fonts || {};
    const root = document.documentElement;

    let styleEl = document.getElementById('ve-custom-font-faces');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 've-custom-font-faces';
      document.head.appendChild(styleEl);
    }
    if (Array.isArray(f.customFaces) && f.customFaces.length > 0) {
      styleEl.textContent = f.customFaces
        .map(
          cf => `
        @font-face {
          font-family: '${cf.name}';
          src: url('${cf.url}');
          font-weight: normal;
          font-style: normal;
          font-display: block;
        }
      `
        )
        .join('\n');
    } else {
      styleEl.textContent = '';
    }

    [f.display, f.subhead, f.body, f.serifAlt, f.sc].forEach(val => {
      if (!val) return;
      const preset = GOOGLE_FONT_PRESETS.find(p => p.value === val);
      if (preset && preset.google) ensureGoogleFontLoaded(preset.google);
    });

    if (f.display) root.style.setProperty('--font-display', f.display);
    else root.style.removeProperty('--font-display');

    if (f.subhead) root.style.setProperty('--font-subhead', f.subhead);
    else root.style.removeProperty('--font-subhead');

    if (f.body) {
      root.style.setProperty('--font-body', f.body);
      root.style.setProperty('--font-serif-alt', f.body);
    } else {
      root.style.removeProperty('--font-body');
      root.style.removeProperty('--font-serif-alt');
    }

    if (f.sc) root.style.setProperty('--font-sc', f.sc);
    else root.style.removeProperty('--font-sc');

    if (f.scale && Number(f.scale) !== 100) {
      document.body.style.fontSize = `${(16 * Number(f.scale)) / 100}px`;
    } else {
      document.body.style.fontSize = '';
    }

    if (f.goldColor) {
      root.style.setProperty('--gold', f.goldColor);
      root.style.setProperty('--gold-bright', f.goldColor);
    } else {
      root.style.removeProperty('--gold');
      root.style.removeProperty('--gold-bright');
    }

    if (f.crimsonColor) {
      root.style.setProperty('--crimson', f.crimsonColor);
      root.style.setProperty('--blood', f.crimsonColor);
    } else {
      root.style.removeProperty('--crimson');
      root.style.removeProperty('--blood');
    }
  }

  function applyElementStyleObject(el, st) {
    if (!el || !st) return;
    const props = ['fontWeight', 'fontStyle', 'textDecoration', 'textTransform', 'fontSize', 'letterSpacing', 'color', 'textAlign'];
    props.forEach(p => {
      if (st[p] !== undefined && st[p] !== '') el.style[p] = st[p];
      else el.style.removeProperty(p.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
    });
  }

  function rebuildCharacterTabs() {
    const state = window.GOSU_STATE;
    const tabsEl = document.querySelector('.tabs');
    if (!state || !tabsEl) return;
    tabsEl.innerHTML = '';
    state.chars.forEach((c, i) => {
      const b = document.createElement('button');
      b.textContent = c[0];
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === state.getCurrentCharIndex()));
      b.onclick = () => state.selectChar(i);
      tabsEl.append(b);
    });
  }

  function applyAllOverrides() {
    indexDomElements();
    applyFontAndThemeOverrides();

    const state = window.GOSU_STATE;
    if (state) {
      if (Array.isArray(overrides.chars) && overrides.chars.length > 0) {
        state.chars.length = 0;
        overrides.chars.forEach(c => state.chars.push([...c]));
        rebuildCharacterTabs();
        state.selectChar(Math.min(state.getCurrentCharIndex(), state.chars.length - 1));
      }
      if (Array.isArray(overrides.places) && overrides.places.length === state.places.length) {
        overrides.places.forEach((p, idx) => {
          state.places[idx] = [...p];
        });
        const activePlaceBtn = document.querySelector('[data-place].active');
        const pIdx = activePlaceBtn ? Number(activePlaceBtn.dataset.place) : 0;
        const pTitle = document.querySelector('#place-title');
        const pDesc = document.querySelector('#place-description');
        if (pTitle && state.places[pIdx]) pTitle.textContent = state.places[pIdx][0];
        if (pDesc && state.places[pIdx]) pDesc.textContent = state.places[pIdx][1];
      }
      if (overrides.relNodes && state.relNodesData) {
        Object.entries(overrides.relNodes).forEach(([nodeId, data]) => {
          if (state.relNodesData[nodeId]) {
            state.relNodesData[nodeId] = { ...state.relNodesData[nodeId], ...data };
          }
        });
      }
    }

    // Apply videos
    if (overrides.videos) {
      if (overrides.videos.trailerUrl !== undefined) {
        window.GOSU_TRAILER_URL = overrides.videos.trailerUrl;
      }
      if (overrides.videos.openingUrl) {
        const opVideo = document.querySelector('#tab-opening video');
        const opSource = opVideo?.querySelector('source');
        if (opVideo && opSource) {
          opSource.src = overrides.videos.openingUrl;
          opVideo.load();
        }
      }
    }

    // Apply static text overrides
    Object.entries(overrides.texts || {}).forEach(([veId, html]) => {
      const el = document.querySelector(`[data-ve-id="${veId}"]`);
      if (el) {
        el.innerHTML = html;
        syncGalleryMetaIfInsideCard(el);
      }
    });

    // Apply custom per-element styles (bold, italic, uppercase, fontSize, color, align)
    Object.entries(overrides.elementStyles || {}).forEach(([veId, st]) => {
      const el = document.querySelector(`[data-ve-id="${veId}"]`);
      if (el) applyElementStyleObject(el, st);
    });

    // Apply image src overrides
    Object.entries(overrides.images || {}).forEach(([imgId, src]) => {
      const img = document.querySelector(`img[data-ve-img-id="${imgId}"]`);
      if (img) {
        img.src = src;
        const galleryBtn = img.closest('#still-gallery [data-image]');
        if (galleryBtn) galleryBtn.dataset.image = src;
        const relicCard = img.closest('.relic-card[data-relic-index]');
        if (relicCard && state && state.relicData) {
          const rIdx = Number(relicCard.dataset.relicIndex) - 1;
          if (state.relicData[rIdx]) state.relicData[rIdx].src = src;
        }
      }
    });

    // Apply image style overrides
    Object.entries(overrides.imageStyles || {}).forEach(([imgId, st]) => {
      const img = document.querySelector(`img[data-ve-img-id="${imgId}"]`);
      if (img && st) {
        if (st.height) img.style.height = st.height;
        if (st.width) img.style.width = st.width;
        if (st.objectFit) img.style.objectFit = st.objectFit;
        if (st.objectPosition) img.style.objectPosition = st.objectPosition;
      }
    });
  }

  function syncGalleryMetaIfInsideCard(el) {
    const galleryBtn = el.closest?.('#still-gallery [data-image]');
    if (!galleryBtn) return;
    const titleEl = galleryBtn.querySelector('.frame-meta strong');
    const capEl = galleryBtn.querySelector('.frame-meta small');
    if (titleEl) galleryBtn.dataset.title = titleEl.textContent.trim();
    if (capEl) galleryBtn.dataset.caption = capEl.textContent.trim();
  }

  // 3. Bind dynamic character, place & relationship web inline edits
  function bindDynamicCharEdits() {
    const charInfo = document.getElementById('character-info');
    const state = window.GOSU_STATE;
    if (!charInfo || !state) return;

    const subEl = charInfo.querySelector('.small');
    const nameEl = charInfo.querySelector('h3');
    const bioEl = charInfo.querySelector('p');
    const quoteEl = charInfo.querySelector('blockquote');

    const fields = [
      { el: nameEl, idx: 0, isTabName: true },
      { el: subEl, idx: 1 },
      { el: bioEl, idx: 3 },
      { el: quoteEl, idx: 4 }
    ];

    fields.forEach(({ el, idx, isTabName }) => {
      if (!el) return;
      el.dataset.veEditable = isEditMode ? 'true' : 'false';
      el.contentEditable = isEditMode ? 'true' : 'false';
      el.onfocus = () => setActiveTextTarget(el);
      el.oninput = () => {
        const cIdx = state.getCurrentCharIndex();
        state.chars[cIdx][idx] = el.innerHTML.trim();
        if (isTabName) {
          state.chars[cIdx][0] = el.textContent.trim();
          state.refreshTabs();
        }
        overrides.chars = state.chars.map(row => [...row]);
        saveLocalDraft();
      };
    });

    const portraitSeal = document.getElementById('portrait-seal');
    if (portraitSeal) {
      portraitSeal.dataset.veEditable = isEditMode ? 'true' : 'false';
      portraitSeal.contentEditable = isEditMode ? 'true' : 'false';
      portraitSeal.onfocus = () => setActiveTextTarget(portraitSeal);
      portraitSeal.oninput = () => {
        const cIdx = state.getCurrentCharIndex();
        state.chars[cIdx][5] = portraitSeal.textContent.trim();
        overrides.chars = state.chars.map(row => [...row]);
        saveLocalDraft();
      };
    }
  }

  window.addEventListener('gosu:char-updated', () => {
    bindDynamicCharEdits();
  });

  function enableInlineEditing(enable) {
    indexDomElements();
    document.querySelectorAll('[data-ve-id]').forEach(el => {
      el.dataset.veEditable = enable ? 'true' : 'false';
      el.contentEditable = enable ? 'true' : 'false';
      if (enable && !el._veBound) {
        el._veBound = true;
        el.addEventListener('focus', () => setActiveTextTarget(el));
        el.addEventListener('input', () => {
          overrides.texts[el.dataset.veId] = el.innerHTML;
          syncGalleryMetaIfInsideCard(el);
          saveLocalDraft();
        });
        el.addEventListener(
          'click',
          e => {
            if (!isEditMode) return;
            // Allow normal tab switching on script tabs, place buttons, char view buttons
            if (
              el.closest('.script-tab-btn') ||
              el.closest('.char-view-btn') ||
              el.closest('[data-place]') ||
              el.closest('.rel-node') ||
              el.closest('.relic-filter')
            ) {
              return;
            }
            if (el.tagName === 'A' || el.closest('a') || el.closest('button')) {
              e.preventDefault();
              e.stopPropagation();
              el.focus();
            }
          },
          true
        );
      }
    });

    // World Place Title & Description
    const pTitle = document.getElementById('place-title');
    const pDesc = document.getElementById('place-description');
    [
      { el: pTitle, idx: 0 },
      { el: pDesc, idx: 1 }
    ].forEach(({ el, idx }) => {
      if (!el) return;
      el.dataset.veEditable = enable ? 'true' : 'false';
      el.contentEditable = enable ? 'true' : 'false';
      if (enable && !el._vePlaceBound) {
        el._vePlaceBound = true;
        el.addEventListener('focus', () => setActiveTextTarget(el));
        el.addEventListener('input', () => {
          const state = window.GOSU_STATE;
          if (!state) return;
          const activeBtn = document.querySelector('[data-place].active');
          const pIdx = activeBtn ? Number(activeBtn.dataset.place) : 0;
          if (state.places[pIdx]) {
            state.places[pIdx][idx] = el.textContent.trim();
            overrides.places = state.places.map(r => [...r]);
            saveLocalDraft();
          }
        });
      }
    });

    // Relationship Web Detail Panel (#rel-detail-tag, #rel-detail-name, #rel-detail-desc)
    const relTagEl = document.getElementById('rel-detail-tag');
    const relNameEl = document.getElementById('rel-detail-name');
    const relDescEl = document.getElementById('rel-detail-desc');
    [
      { el: relTagEl, key: 'tag' },
      { el: relNameEl, key: 'name' },
      { el: relDescEl, key: 'desc' }
    ].forEach(({ el, key }) => {
      if (!el) return;
      el.dataset.veEditable = enable ? 'true' : 'false';
      el.contentEditable = enable ? 'true' : 'false';
      if (enable && !el._veRelBound) {
        el._veRelBound = true;
        el.addEventListener('focus', () => setActiveTextTarget(el));
        el.addEventListener('input', () => {
          const state = window.GOSU_STATE;
          const selectedBtn = document.querySelector('.rel-node.is-selected') || document.querySelector('.rel-node.active');
          const nodeId = selectedBtn ? selectedBtn.dataset.node : 'mot';
          if (state && state.relNodesData && state.relNodesData[nodeId]) {
            state.relNodesData[nodeId][key] = el.textContent.trim();
            overrides.relNodes = overrides.relNodes || {};
            overrides.relNodes[nodeId] = { ...state.relNodesData[nodeId] };
            saveLocalDraft();
          }
        });
      }
    });

    bindDynamicCharEdits();

    if (!enable) {
      const fmtBar = document.getElementById('ve-FormatBar');
      if (fmtBar) fmtBar.classList.remove('is-visible');
    }
  }

  // 4. Rich-Text Formatting Bar Logic
  function setActiveTextTarget(el) {
    if (!isEditMode || !el) return;
    activeTextTarget = el;
    const fmtBar = document.getElementById('ve-FormatBar');
    if (!fmtBar) return;
    fmtBar.classList.add('is-visible');

    const comp = window.getComputedStyle(el);
    const sizePx = Math.round(parseFloat(comp.fontSize) || 16);
    const sizeInput = document.getElementById('ve-FmtSizeInput');
    if (sizeInput) sizeInput.value = sizePx;

    document.getElementById('ve-FmtBoldBtn')?.classList.toggle('is-active', parseInt(comp.fontWeight, 10) >= 600 || comp.fontWeight === 'bold');
    document.getElementById('ve-FmtItalicBtn')?.classList.toggle('is-active', comp.fontStyle === 'italic');
    document.getElementById('ve-FmtUpperBtn')?.classList.toggle('is-active', comp.textTransform === 'uppercase');
    document.getElementById('ve-FmtLowerBtn')?.classList.toggle('is-active', comp.textTransform === 'lowercase');
    document.getElementById('ve-FmtCapBtn')?.classList.toggle('is-active', comp.textTransform === 'capitalize');
  }

  function hasNonEmptySelectionInside(el) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    return el.contains(sel.anchorNode);
  }

  function saveElementStyleAndText(el) {
    if (!el) return;
    const veId = el.dataset.veId;
    if (veId) {
      overrides.texts[veId] = el.innerHTML;
      overrides.elementStyles = overrides.elementStyles || {};
      overrides.elementStyles[veId] = {
        fontWeight: el.style.fontWeight || '',
        fontStyle: el.style.fontStyle || '',
        textDecoration: el.style.textDecoration || '',
        textTransform: el.style.textTransform || '',
        fontSize: el.style.fontSize || '',
        letterSpacing: el.style.letterSpacing || '',
        color: el.style.color || '',
        textAlign: el.style.textAlign || ''
      };
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    saveLocalDraft();
    setActiveTextTarget(el);
  }

  function applyRichFormat(action, value) {
    const el = activeTextTarget;
    if (!el) {
      showToast('Hãy bấm chuột vào dòng chữ cần định dạng trước!');
      return;
    }
    el.focus();
    const hasSel = hasNonEmptySelectionInside(el);
    const comp = window.getComputedStyle(el);

    if (action === 'bold') {
      if (hasSel) {
        document.execCommand('bold', false, null);
      } else {
        const isBold = parseInt(comp.fontWeight, 10) >= 600 || comp.fontWeight === 'bold';
        el.style.fontWeight = isBold ? '400' : '700';
      }
    } else if (action === 'italic') {
      if (hasSel) {
        document.execCommand('italic', false, null);
      } else {
        el.style.fontStyle = comp.fontStyle === 'italic' ? 'normal' : 'italic';
      }
    } else if (action === 'underline') {
      if (hasSel) {
        document.execCommand('underline', false, null);
      } else {
        el.style.textDecoration = comp.textDecorationLine.includes('underline') ? 'none' : 'underline';
      }
    } else if (action === 'uppercase') {
      if (hasSel) {
        const sel = window.getSelection();
        document.execCommand('insertText', false, sel.toString().toUpperCase());
      } else {
        el.style.textTransform = comp.textTransform === 'uppercase' ? 'none' : 'uppercase';
      }
    } else if (action === 'lowercase') {
      if (hasSel) {
        const sel = window.getSelection();
        document.execCommand('insertText', false, sel.toString().toLowerCase());
      } else {
        el.style.textTransform = comp.textTransform === 'lowercase' ? 'none' : 'lowercase';
      }
    } else if (action === 'capitalize') {
      if (hasSel) {
        const sel = window.getSelection();
        const cap = sel
          .toString()
          .toLowerCase()
          .replace(/(^|\s)\S/g, m => m.toUpperCase());
        document.execCommand('insertText', false, cap);
      } else {
        el.style.textTransform = comp.textTransform === 'capitalize' ? 'none' : 'capitalize';
      }
    } else if (action === 'fontSizeDelta') {
      const cur = Math.round(parseFloat(comp.fontSize) || 16);
      const next = Math.max(9, Math.min(220, cur + Number(value)));
      el.style.fontSize = `${next}px`;
    } else if (action === 'fontSizeExact') {
      const next = Math.max(9, Math.min(220, Number(value) || 16));
      el.style.fontSize = `${next}px`;
    } else if (action === 'letterSpacingDelta') {
      const cur = parseFloat(comp.letterSpacing) || 0;
      const next = Math.max(-2, Math.min(24, Math.round((cur + Number(value)) * 2) / 2));
      el.style.letterSpacing = `${next}px`;
    } else if (action === 'color') {
      if (hasSel) {
        document.execCommand('foreColor', false, value);
      } else {
        el.style.color = value;
      }
    } else if (action === 'align') {
      el.style.textAlign = value;
    } else if (action === 'clear') {
      ['fontWeight', 'fontStyle', 'textDecoration', 'textTransform', 'fontSize', 'letterSpacing', 'color', 'textAlign'].forEach(p =>
        el.style.removeProperty(p.replace(/[A-Z]/g, m => '-' + m.toLowerCase()))
      );
      if (hasSel) document.execCommand('removeFormat', false, null);
    }

    saveElementStyleAndText(el);
  }

  // 5. Pinned Frame Buttons & Deep Image Detection (Fixes Hero Frame 1 & Overlays)
  function injectPinnedFrameButtons() {
    // 1. Hero Frame 1
    const heroSec = document.querySelector('.hero');
    const heroImg = document.querySelector('.hero .heroart');
    if (heroSec && heroImg && !heroSec.querySelector('.ve-pinned-bar')) {
      const bar = document.createElement('div');
      bar.className = 've-pinned-bar';
      bar.innerHTML = `
        <button type="button" class="ve-pin-btn" id="ve-PinHeroBgBtn">🖼 ĐỔI ẢNH NỀN FRAME ĐẦU (HERO)</button>
        <button type="button" class="ve-pin-btn" id="ve-PinTrailerVidBtn">🎬 ĐỔI VIDEO TRAILER / MOODBOARD</button>
      `;
      heroSec.appendChild(bar);
      document.getElementById('ve-PinHeroBgBtn').onclick = e => {
        e.stopPropagation();
        openImageModal(heroImg);
      };
      document.getElementById('ve-PinTrailerVidBtn').onclick = e => {
        e.stopPropagation();
        openVideoModal('trailerUrl');
      };
    }

    // 2. Story Image
    const storyFig = document.querySelector('.story-image');
    const storyImg = storyFig?.querySelector('img');
    if (storyFig && storyImg && !storyFig.querySelector('.ve-pinned-bar')) {
      storyFig.style.position = 'relative';
      const bar = document.createElement('div');
      bar.className = 've-pinned-bar';
      bar.innerHTML = `<button type="button" class="ve-pin-btn">🖼 ĐỔI ẢNH CHƯƠNG I</button>`;
      bar.querySelector('button').onclick = e => {
        e.stopPropagation();
        openImageModal(storyImg);
      };
      storyFig.appendChild(bar);
    }

    // 3. Script Opening Video
    const vidShell = document.querySelector('.video-frame-shell');
    if (vidShell && !vidShell.querySelector('.ve-pinned-bar')) {
      const bar = document.createElement('div');
      bar.className = 've-pinned-bar';
      bar.innerHTML = `<button type="button" class="ve-pin-btn">🎬 ĐỔI VIDEO MỞ ĐẦU (HỒI I)</button>`;
      bar.querySelector('button').onclick = e => {
        e.stopPropagation();
        openVideoModal('openingUrl');
      };
      vidShell.appendChild(bar);
    }

    // 4. Wide Image Banner
    const wideSec = document.querySelector('.wide-image');
    const wideImg = wideSec?.querySelector('img');
    if (wideSec && wideImg && !wideSec.querySelector('.ve-pinned-bar')) {
      const bar = document.createElement('div');
      bar.className = 've-pinned-bar';
      bar.innerHTML = `<button type="button" class="ve-pin-btn">🖼 ĐỔI ẢNH BANNER NGANG</button>`;
      bar.querySelector('button').onclick = e => {
        e.stopPropagation();
        openImageModal(wideImg);
      };
      wideSec.appendChild(bar);
    }

    // 5. Character Portrait Box
    const portBox = document.getElementById('portrait-box');
    const portImg = document.getElementById('portrait');
    if (portBox && portImg && !portBox.querySelector('.ve-pinned-bar')) {
      const bar = document.createElement('div');
      bar.className = 've-pinned-bar';
      bar.innerHTML = `<button type="button" class="ve-pin-btn">🖼 ĐỔI ẢNH NHÂN VẬT NÀY</button>`;
      bar.querySelector('button').onclick = e => {
        e.stopPropagation();
        openImageModal(portImg);
      };
      portBox.appendChild(bar);
    }

    // 6. Add/Delete Character buttons under .tabs
    const tabsEl = document.querySelector('#characters .tabs');
    if (tabsEl && !document.getElementById('ve-CharAdminBar')) {
      const adminBar = document.createElement('div');
      adminBar.id = 've-CharAdminBar';
      adminBar.className = 've-char-admin-bar';
      adminBar.innerHTML = `
        <button type="button" class="ve-btn" id="ve-AddCharBtn">+ THÊM NHÂN VẬT</button>
        <button type="button" class="ve-btn" id="ve-DelCharBtn">🗑 XÓA NHÂN VẬT</button>
      `;
      tabsEl.parentNode.insertBefore(adminBar, tabsEl.nextSibling);

      document.getElementById('ve-AddCharBtn').onclick = () => {
        const state = window.GOSU_STATE;
        if (!state) return;
        const newChar = [
          'Nhân Vật Mới',
          'PHÚ XUÂN 1836 · HỒ SƠ MỚI',
          'assets/159.jpg',
          'Nhập tiểu sử và thân thế của nhân vật tại đây...',
          '“Nhập câu thoại đặc trưng của nhân vật...”',
          '新角',
          'assets/characters/mot-3view.webp',
          'assets/characters/mot-sheet.webp'
        ];
        state.chars.push(newChar);
        overrides.chars = state.chars.map(r => [...r]);
        rebuildCharacterTabs();
        state.selectChar(state.chars.length - 1);
        enableInlineEditing(isEditMode);
        saveLocalDraft();
        showToast('Đã thêm nhân vật mới! Hãy bấm vào tên và tiểu sử để sửa.');
      };

      document.getElementById('ve-DelCharBtn').onclick = () => {
        const state = window.GOSU_STATE;
        if (!state || state.chars.length <= 1) return;
        const idx = state.getCurrentCharIndex();
        if (!confirm(`Bạn có chắc muốn xóa nhân vật "${state.chars[idx][0]}"?`)) return;
        state.chars.splice(idx, 1);
        overrides.chars = state.chars.map(r => [...r]);
        rebuildCharacterTabs();
        state.selectChar(Math.max(0, idx - 1));
        enableInlineEditing(isEditMode);
        saveLocalDraft();
        showToast('Đã xóa nhân vật.');
      };
    }
  }

  function findImgAtPoint(clientX, clientY, target) {
    if (target && target.tagName === 'IMG' && target.dataset.veImgId) return target;
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      if (
        el.id === 've-Toolbar' ||
        el.id === 've-FormatBar' ||
        el.classList?.contains('ve-modal-backdrop') ||
        el.classList?.contains('ve-pinned-bar')
      ) {
        return null;
      }
      if (el.tagName === 'IMG' && el.dataset.veImgId) {
        return el;
      }
    }
    return null;
  }

  function setupImageEditor() {
    const badge = document.createElement('button');
    badge.id = 've-ImgHoverBadge';
    badge.type = 'button';
    badge.innerHTML = '🖼 ĐỔI ẢNH / CỠ ẢNH';
    document.body.appendChild(badge);

    let hoveredImg = null;

    document.addEventListener('pointermove', e => {
      if (!isEditMode) {
        badge.style.display = 'none';
        return;
      }
      if (e.target === badge || badge.contains(e.target)) return;
      const foundImg = findImgAtPoint(e.clientX, e.clientY, e.target);
      if (foundImg) {
        hoveredImg = foundImg;
        const rect = foundImg.getBoundingClientRect();
        badge.style.display = 'block';
        badge.style.top = `${Math.max(70, Math.min(window.innerHeight - 60, rect.top + 12))}px`;
        badge.style.left = `${Math.max(12, Math.min(window.innerWidth - 180, rect.left + 12))}px`;
      } else {
        badge.style.display = 'none';
        hoveredImg = null;
      }
    });

    badge.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      if (hoveredImg) openImageModal(hoveredImg);
    };

    document.addEventListener(
      'click',
      e => {
        if (!isEditMode) return;
        if (
          e.target.closest('#ve-Toolbar') ||
          e.target.closest('#ve-FormatBar') ||
          e.target.closest('.ve-modal') ||
          e.target.closest('.ve-pinned-bar') ||
          e.target.closest('[data-ve-editable="true"]')
        ) {
          return;
        }
        const img = findImgAtPoint(e.clientX, e.clientY, e.target);
        if (img && img.dataset.veImgId) {
          e.preventDefault();
          e.stopPropagation();
          openImageModal(img);
        }
      },
      true
    );
  }

  function compressOrReadImage(file, callback) {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      if (file.type === 'image/png' || file.type === 'image/svg+xml' || file.size < 900 * 1024) {
        callback(dataUrl, file.name);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 2200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const r = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const webpUrl = canvas.toDataURL('image/webp', 0.89);
        const safeName = file.name.replace(/\.[^.]+$/, '') + '.webp';
        callback(webpUrl, safeName);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function openImageModal(imgEl) {
    activeImgTarget = imgEl;
    const modal = document.getElementById('ve-ImageModal');
    const urlInput = document.getElementById('ve-ImgUrlInput');
    const previewImg = document.getElementById('ve-ImgPreview');
    const heightInput = document.getElementById('ve-ImgHeightInput');
    const fitSelect = document.getElementById('ve-ImgFitSelect');
    const targetInfo = document.getElementById('ve-ImgTargetInfo');

    const imgId = imgEl.dataset.veImgId;
    const state = window.GOSU_STATE;
    if (imgId === 'char-portrait-dynamic' && state) {
      const c = state.chars[state.getCurrentCharIndex()];
      const mode = state.getCharViewMode();
      const modeName = mode === 'avatar' ? 'Chân dung (Avatar)' : mode === 'turnaround' ? 'Full 3 Mặt' : 'Bảng Thiết Kế';
      targetInfo.textContent = `Đang thay ảnh nhân vật: ${c[0]} — Góc nhìn: ${modeName}`;
    } else if (imgId === 'hero-bg-main') {
      targetInfo.textContent = 'Đang thay Ảnh Nền Frame Đầu Tiên (Hero Background)';
    } else {
      targetInfo.textContent = `Vị trí ảnh: ${imgId} (${imgEl.alt || 'Hình ảnh trên trang'})`;
    }

    urlInput.value = imgEl.getAttribute('src') || '';
    previewImg.src = imgEl.src;

    const currentHeight = imgEl.style.height ? parseInt(imgEl.style.height, 10) : '';
    heightInput.value = currentHeight || '';
    fitSelect.value = imgEl.style.objectFit || '';

    modal.classList.add('is-open');
  }

  function applyImageModalChange() {
    if (!activeImgTarget) return;
    const urlInput = document.getElementById('ve-ImgUrlInput');
    const heightInput = document.getElementById('ve-ImgHeightInput');
    const fitSelect = document.getElementById('ve-ImgFitSelect');
    const newSrc = urlInput.value.trim();
    const imgId = activeImgTarget.dataset.veImgId;
    const state = window.GOSU_STATE;

    if (newSrc) {
      activeImgTarget.src = newSrc;
      if (imgId === 'char-portrait-dynamic' && state) {
        const cIdx = state.getCurrentCharIndex();
        const mode = state.getCharViewMode();
        const slot = mode === 'turnaround' ? 6 : mode === 'sheet' ? 7 : 2;
        state.chars[cIdx][slot] = newSrc;
        overrides.chars = state.chars.map(r => [...r]);
      } else {
        overrides.images[imgId] = newSrc;
        const galleryBtn = activeImgTarget.closest('#still-gallery [data-image]');
        if (galleryBtn) galleryBtn.dataset.image = newSrc;
        const relicCard = activeImgTarget.closest('.relic-card[data-relic-index]');
        if (relicCard && state && state.relicData) {
          const rIdx = Number(relicCard.dataset.relicIndex) - 1;
          if (state.relicData[rIdx]) state.relicData[rIdx].src = newSrc;
        }
      }
    }

    const st = {};
    if (heightInput.value.trim()) {
      st.height = `${parseInt(heightInput.value.trim(), 10)}px`;
      st.width = 'auto';
      activeImgTarget.style.height = st.height;
      activeImgTarget.style.width = 'auto';
    } else {
      activeImgTarget.style.removeProperty('height');
    }

    if (fitSelect.value) {
      st.objectFit = fitSelect.value;
      activeImgTarget.style.objectFit = fitSelect.value;
    } else {
      activeImgTarget.style.removeProperty('objectFit');
    }

    if (Object.keys(st).length > 0) {
      overrides.imageStyles[imgId] = st;
    } else {
      delete overrides.imageStyles[imgId];
    }

    saveLocalDraft();
    document.getElementById('ve-ImageModal').classList.remove('is-open');
    showToast('Đã cập nhật hình ảnh! Bấm "Lưu Lên Web" để xuất bản.');
  }

  // 6. Video Replacer Modal (Trailer Moodboard & Opening Video)
  function openVideoModal(slot) {
    activeVideoSlot = slot || 'trailerUrl';
    const modal = document.getElementById('ve-VideoModal');
    const urlInput = document.getElementById('ve-VidUrlInput');
    const titleEl = document.getElementById('ve-VidModalTitle');
    overrides.videos = overrides.videos || {};
    if (activeVideoSlot === 'trailerUrl') {
      titleEl.textContent = 'Đổi Video Trailer · Moodboard Dự Án (Frame Đầu)';
      urlInput.value = overrides.videos.trailerUrl || window.GOSU_TRAILER_URL || '';
    } else {
      titleEl.textContent = 'Đổi Video Mở Đầu Kịch Bản (Chương I)';
      urlInput.value = overrides.videos.openingUrl || 'assets/video/opening-1836.mp4';
    }
    modal.classList.add('is-open');
  }

  function applyVideoModalChange() {
    const urlInput = document.getElementById('ve-VidUrlInput');
    const val = urlInput.value.trim();
    overrides.videos = overrides.videos || {};
    overrides.videos[activeVideoSlot] = val;
    applyAllOverrides();
    saveLocalDraft();
    document.getElementById('ve-VideoModal').classList.remove('is-open');
    showToast('✅ Đã cập nhật đường dẫn Video! Bấm "Lưu Lên Web" để xuất bản.');
  }

  // 7. Font & Theme Modal
  function openFontModal() {
    const modal = document.getElementById('ve-FontModal');
    const f = overrides.fonts || {};
    renderCustomFontOptions();
    document.getElementById('ve-FontDisplaySelect').value = f.display || '';
    const subSel = document.getElementById('ve-FontSubheadSelect');
    if (subSel) subSel.value = f.subhead || '';
    document.getElementById('ve-FontBodySelect').value = f.body || '';
    document.getElementById('ve-FontScSelect').value = f.sc || '';
    document.getElementById('ve-FontScaleInput').value = f.scale || 100;
    document.getElementById('ve-FontScaleVal').textContent = `${f.scale || 100}%`;
    document.getElementById('ve-GoldColorInput').value = f.goldColor || '#dfc08a';
    document.getElementById('ve-CrimsonColorInput').value = f.crimsonColor || '#c93026';
    modal.classList.add('is-open');
  }

  function renderCustomFontOptions() {
    const f = overrides.fonts || {};
    const selects = [
      document.getElementById('ve-FontDisplaySelect'),
      document.getElementById('ve-FontSubheadSelect'),
      document.getElementById('ve-FontBodySelect'),
      document.getElementById('ve-FontScSelect')
    ];
    selects.forEach(sel => {
      if (!sel) return;
      const prevVal = sel.value;
      sel.querySelectorAll('option[data-custom-font="true"]').forEach(o => o.remove());
      (f.customFaces || []).forEach(cf => {
        const opt = document.createElement('option');
        opt.dataset.customFont = 'true';
        opt.value = `'${cf.name}', serif`;
        opt.textContent = `★ Font tải lên: ${cf.name}`;
        sel.appendChild(opt);
      });
      sel.value = prevVal;
    });
  }

  // 8. Publish to Web (Local Sync Server OR GitHub API)
  async function publishToWeb() {
    const btn = document.getElementById('ve-PublishBtn');
    const origText = btn.innerHTML;
    btn.innerHTML = '⏳ ĐANG LƯU LÊN WEB...';
    btn.disabled = true;

    saveLocalDraft();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(LOCAL_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrides,
          pendingAssets
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.overrides) {
          overrides = data.overrides;
          pendingAssets = [];
          saveLocalDraft();
          applyAllOverrides();
        }
        btn.innerHTML = origText;
        btn.disabled = false;
        showToast('✅ Đã lưu & đẩy thẳng lên gosucinema.web.id thành công!', 4500);
        return;
      }
    } catch (_) {}

    let ghToken = localStorage.getItem(GH_TOKEN_KEY) || '';
    if (!ghToken) {
      btn.innerHTML = origText;
      btn.disabled = false;
      document.getElementById('ve-PublishModal').classList.add('is-open');
      return;
    }

    await publishViaGitHubApi(ghToken);
    btn.innerHTML = origText;
    btn.disabled = false;
  }

  async function publishViaGitHubApi(token) {
    try {
      const repo = 'monkaka26910/gosucinema';
      const path = 'site-overrides.json';
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      };

      for (const asset of pendingAssets) {
        const commaIdx = asset.dataUrl.indexOf(',');
        if (commaIdx === -1) continue;
        const b64 = asset.dataUrl.slice(commaIdx + 1);
        const assetPath = `assets/uploads/${asset.filename}`;
        let sha = undefined;
        const getAsset = await fetch(`https://api.github.com/repos/${repo}/contents/${assetPath}`, { headers });
        if (getAsset.ok) {
          const info = await getAsset.json();
          sha = info.sha;
        }
        const putAsset = await fetch(`https://api.github.com/repos/${repo}/contents/${assetPath}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `asset: upload ${asset.filename} via Visual Editor`,
            content: b64,
            ...(sha ? { sha } : {})
          })
        });
        if (putAsset.ok) {
          const jsonStr = JSON.stringify(overrides).split(JSON.stringify(asset.dataUrl)).join(JSON.stringify(assetPath));
          overrides = JSON.parse(jsonStr);
        }
      }

      let currentSha = undefined;
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers });
      if (getRes.ok) {
        const info = await getRes.json();
        currentSha = info.sha;
      }

      const contentBytes = new TextEncoder().encode(JSON.stringify(overrides, null, 2));
      let binary = '';
      for (let i = 0; i < contentBytes.length; i++) binary += String.fromCharCode(contentBytes[i]);
      const contentB64 = btoa(binary);

      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: 'content: update site-overrides.json via GOSU Visual Editor',
          content: contentB64,
          ...(currentSha ? { sha: currentSha } : {})
        })
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        throw new Error(errText);
      }

      pendingAssets = [];
      saveLocalDraft();
      applyAllOverrides();
      document.getElementById('ve-PublishModal').classList.remove('is-open');
      showToast('✅ Đã xuất bản trực tiếp lên gosucinema.web.id (GitHub Pages)!', 4500);
    } catch (err) {
      console.error(err);
      showToast('❌ Lỗi xác thực GitHub Token. Vui lòng kiểm tra lại Token hoặc dùng nút Tải Cấu Hình.', 4500);
      localStorage.removeItem(GH_TOKEN_KEY);
      document.getElementById('ve-PublishModal').classList.add('is-open');
    }
  }

  // 9. Build Visual Editor UI
  function buildEditorUI() {
    const launcher = document.createElement('button');
    launcher.id = 've-Launcher';
    launcher.type = 'button';
    launcher.title = 'Bật chế độ chỉnh sửa trực tiếp (Phím tắt: Ctrl + Shift + E)';
    launcher.innerHTML = '✎ SỬA WEB';
    if (!isAdminUnlocked()) {
      launcher.style.display = 'none';
    }
    document.body.appendChild(launcher);

    // Top Rich-Text Formatting Bar
    const fmtBar = document.createElement('div');
    fmtBar.id = 've-FormatBar';
    fmtBar.innerHTML = `
      <div class="ve-fmt-group">
        <button type="button" class="ve-fmt-btn" id="ve-FmtBoldBtn" title="In đậm (Bold)"><b>B</b></button>
        <button type="button" class="ve-fmt-btn" id="ve-FmtItalicBtn" title="In nghiêng (Italic)"><i>I</i></button>
        <button type="button" class="ve-fmt-btn" id="ve-FmtUnderBtn" title="Gạch chân (Underline)"><u>U</u></button>
      </div>
      <div class="ve-fmt-group">
        <button type="button" class="ve-fmt-btn" id="ve-FmtUpperBtn" title="CHỮ IN HOA (UPPERCASE)">HOA</button>
        <button type="button" class="ve-fmt-btn" id="ve-FmtLowerBtn" title="chữ thường (lowercase)">thường</button>
        <button type="button" class="ve-fmt-btn" id="ve-FmtCapBtn" title="Viết Hoa Đầu Từ (Capitalize)">Hoa Đầu</button>
      </div>
      <div class="ve-fmt-group">
        <button type="button" class="ve-fmt-btn" id="ve-FmtSizeDecBtn" title="Giảm cỡ chữ">A-</button>
        <input type="number" class="ve-fmt-input" id="ve-FmtSizeInput" title="Cỡ chữ (px)" min="9" max="220" value="16">
        <button type="button" class="ve-fmt-btn" id="ve-FmtSizeIncBtn" title="Tăng cỡ chữ">A+</button>
      </div>
      <div class="ve-fmt-group">
        <button type="button" class="ve-fmt-btn" id="ve-FmtTrackDecBtn" title="Thu hẹp khoảng cách chữ">↔-</button>
        <button type="button" class="ve-fmt-btn" id="ve-FmtTrackIncBtn" title="Giãn khoảng cách chữ">↔+</button>
      </div>
      <div class="ve-fmt-group">
        <input type="color" class="ve-fmt-color" id="ve-FmtColorInput" value="#dfc08a" title="Đổi màu chữ đang chọn">
        <button type="button" class="ve-fmt-btn" id="ve-FmtAlignLeftBtn" title="Căn trái">⬅</button>
        <button type="button" class="ve-fmt-btn" id="ve-FmtAlignCenterBtn" title="Căn giữa">⬌</button>
        <button type="button" class="ve-fmt-btn" id="ve-FmtAlignRightBtn" title="Căn phải">➡</button>
      </div>
      <div class="ve-fmt-group">
        <button type="button" class="ve-fmt-btn" id="ve-FmtClearBtn" title="Khôi phục định dạng gốc của dòng này">↺ GỐC</button>
      </div>
    `;
    document.body.appendChild(fmtBar);

    // Prevent format bar buttons from stealing text selection focus
    fmtBar.querySelectorAll('button').forEach(b => {
      b.addEventListener('mousedown', e => e.preventDefault());
    });

    document.getElementById('ve-FmtBoldBtn').onclick = () => applyRichFormat('bold');
    document.getElementById('ve-FmtItalicBtn').onclick = () => applyRichFormat('italic');
    document.getElementById('ve-FmtUnderBtn').onclick = () => applyRichFormat('underline');
    document.getElementById('ve-FmtUpperBtn').onclick = () => applyRichFormat('uppercase');
    document.getElementById('ve-FmtLowerBtn').onclick = () => applyRichFormat('lowercase');
    document.getElementById('ve-FmtCapBtn').onclick = () => applyRichFormat('capitalize');
    document.getElementById('ve-FmtSizeDecBtn').onclick = () => applyRichFormat('fontSizeDelta', -2);
    document.getElementById('ve-FmtSizeIncBtn').onclick = () => applyRichFormat('fontSizeDelta', 2);
    document.getElementById('ve-FmtSizeInput').onchange = e => applyRichFormat('fontSizeExact', e.target.value);
    document.getElementById('ve-FmtTrackDecBtn').onclick = () => applyRichFormat('letterSpacingDelta', -0.5);
    document.getElementById('ve-FmtTrackIncBtn').onclick = () => applyRichFormat('letterSpacingDelta', 0.5);
    document.getElementById('ve-FmtColorInput').oninput = e => applyRichFormat('color', e.target.value);
    document.getElementById('ve-FmtAlignLeftBtn').onclick = () => applyRichFormat('align', 'left');
    document.getElementById('ve-FmtAlignCenterBtn').onclick = () => applyRichFormat('align', 'center');
    document.getElementById('ve-FmtAlignRightBtn').onclick = () => applyRichFormat('align', 'right');
    document.getElementById('ve-FmtClearBtn').onclick = () => applyRichFormat('clear');

    // Bottom Floating Main Toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 've-Toolbar';
    toolbar.innerHTML = `
      <span class="ve-brand-badge"><i class="ve-status-dot"></i>ADMIN STUDIO</span>
      <button type="button" class="ve-btn" id="ve-HeroBgQuickBtn">🖼 ẢNH FRAME ĐẦU</button>
      <button type="button" class="ve-btn" id="ve-TrailerQuickBtn">🎬 VIDEO TRAILER</button>
      <button type="button" class="ve-btn" id="ve-OpenFontBtn">🔤 ĐỔI FONT &amp; MÀU</button>
      <button type="button" class="ve-btn" id="ve-ExportBtn">⬇ TẢI GÓI</button>
      <button type="button" class="ve-btn" id="ve-ImportBtn">⬆ NHẬP GÓI</button>
      <button type="button" class="ve-btn" id="ve-ResetBtn">↺ MẶC ĐỊNH</button>
      <button type="button" class="ve-btn ve-btn-primary" id="ve-PublishBtn">☁ LƯU LÊN WEB</button>
      <button type="button" class="ve-btn" id="ve-LockAdminBtn" title="Khóa quyền Admin">🔒 KHÓA</button>
      <button type="button" class="ve-btn ve-btn-Exit" id="ve-ExitBtn">✕ ĐÓNG</button>
      <input type="file" id="ve-ImportFileInput" accept=".json" hidden>
    `;
    document.body.appendChild(toolbar);

    // Image Replacer Modal
    const imgModal = document.createElement('div');
    imgModal.id = 've-ImageModal';
    imgModal.className = 've-modal-backdrop';
    imgModal.innerHTML = `
      <div class="ve-modal" role="dialog" aria-label="Thay ảnh & Chỉnh kích thước">
        <div class="ve-modal-head">
          <h4>Thay Ảnh &amp; Chỉnh Kích Thước</h4>
          <button type="button" class="ve-close-btn" data-ve-close="ve-ImageModal">✕</button>
        </div>
        <p id="ve-ImgTargetInfo" style="margin:0 0 14px;font-size:13.5px;color:#bd955b"></p>
        <div class="ve-field">
          <label>1. CHỌN ẢNH TỪ MÁY TÍNH (.PNG, .JPG, .WEBP, .SVG)</label>
          <label class="ve-file-drop" for="ve-ImgFileInput">
            <strong>📁 Bấm để chọn file ảnh từ máy tính</strong>
            <span style="font-size:13px;color:#9a9180">Tự động tối ưu dung lượng &amp; giữ nguyên nền trong suốt cho Logo</span>
          </label>
          <input type="file" id="ve-ImgFileInput" accept="image/*" hidden>
        </div>
        <div class="ve-field">
          <label>2. HOẶC DÁN ĐƯỜNG DẪN ẢNH / URL</label>
          <input type="text" class="ve-input" id="ve-ImgUrlInput" placeholder="assets/... hoặc https://...">
        </div>
        <div class="ve-row-2">
          <div class="ve-field">
            <label>CHIỀU CAO ẢNH / LOGO (PX - ĐỂ TRỐNG NẾU TỰ ĐỘNG)</label>
            <input type="number" class="ve-input" id="ve-ImgHeightInput" placeholder="Ví dụ: 36 (cho logo) hoặc 590">
          </div>
          <div class="ve-field">
            <label>CHẾ ĐỘ KHUNG HÌNH (OBJECT-FIT)</label>
            <select class="ve-select" id="ve-ImgFitSelect">
              <option value="">Mặc định theo trang</option>
              <option value="contain">Contain (Hiện trọn vẹn, không cắt)</option>
              <option value="cover">Cover (Lấp đầy khung hình)</option>
            </select>
          </div>
        </div>
        <div class="ve-img-preview-box">
          <img id="ve-ImgPreview" alt="Xem trước ảnh">
        </div>
        <div class="ve-modal-actions">
          <button type="button" class="ve-btn" data-ve-close="ve-ImageModal">HỦY</button>
          <button type="button" class="ve-btn ve-btn-primary" id="ve-ApplyImgBtn">ÁP DỤNG ẢNH NÀY</button>
        </div>
      </div>
    `;
    document.body.appendChild(imgModal);

    // Video Replacer Modal (For Trailer Moodboard & Opening Video)
    const vidModal = document.createElement('div');
    vidModal.id = 've-VideoModal';
    vidModal.className = 've-modal-backdrop';
    vidModal.innerHTML = `
      <div class="ve-modal" role="dialog" aria-label="Cập nhật Video">
        <div class="ve-modal-head">
          <h4 id="ve-VidModalTitle">Cập Nhật Video Trailer · Moodboard</h4>
          <button type="button" class="ve-close-btn" data-ve-close="ve-VideoModal">✕</button>
        </div>
        <div class="ve-field">
          <label>1. CHỌN FILE VIDEO TỪ MÁY TÍNH (.MP4, .WEBM)</label>
          <label class="ve-file-drop" for="ve-VidFileInput">
            <strong>🎬 Bấm để chọn file Video (.mp4 / .webm) từ máy tính</strong>
            <span style="font-size:13px;color:#9a9180">Khi bấm Lưu Lên Web qua cầu nối máy tính, file video sẽ tự động chép vào assets/uploads/</span>
          </label>
          <input type="file" id="ve-VidFileInput" accept="video/mp4,video/webm" hidden>
        </div>
        <div class="ve-field">
          <label>2. HOẶC DÁN LINK YOUTUBE / GOOGLE DRIVE / ĐƯỜNG DẪN .MP4</label>
          <input type="text" class="ve-input" id="ve-VidUrlInput" placeholder="https://www.youtube.com/watch?v=... hoặc assets/video/...">
        </div>
        <div class="ve-modal-actions">
          <button type="button" class="ve-btn" id="ve-PreviewTrailerModalBtn">▶ XEM THỬ POPUP TRAILER</button>
          <button type="button" class="ve-btn" data-ve-close="ve-VideoModal">HỦY</button>
          <button type="button" class="ve-btn ve-btn-primary" id="ve-ApplyVidBtn">LƯU VIDEO NÀY</button>
        </div>
      </div>
    `;
    document.body.appendChild(vidModal);

    // Font & Theme Studio Modal
    const fontOptionsHtml = GOOGLE_FONT_PRESETS.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    const fontModal = document.createElement('div');
    fontModal.id = 've-FontModal';
    fontModal.className = 've-modal-backdrop';
    fontModal.innerHTML = `
      <div class="ve-modal" role="dialog" aria-label="Đổi Font Chữ & Giao Diện">
        <div class="ve-modal-head">
          <h4>Đổi Font Chữ &amp; Giao Diện</h4>
          <button type="button" class="ve-close-btn" data-ve-close="ve-FontModal">✕</button>
        </div>
        <div class="ve-field">
          <label>TẢI FILE FONT TỪ MÁY TÍNH (.TTF, .OTF, .WOFF, .WOFF2)</label>
          <label class="ve-file-drop" for="ve-FontFileInput" style="padding:14px">
            <strong>🔤 Bấm để tải file Font riêng từ máy tính (.ttf / .otf / .woff2)</strong>
            <span style="font-size:12.5px;color:#9a9180">Font tải lên sẽ tự động xuất hiện trong 3 danh sách bên dưới</span>
          </label>
          <input type="file" id="ve-FontFileInput" accept=".ttf,.otf,.woff,.woff2" hidden>
        </div>
        <div class="ve-field">
          <label>1. FONT TIÊU ĐỀ CHÍNH / POSTER LỚN (--font-display)</label>
          <select class="ve-select" id="ve-FontDisplaySelect">${fontOptionsHtml}</select>
        </div>
        <div class="ve-field">
          <label>2. FONT TIÊU ĐỀ PHỤ / THẺ CHI TIẾT (CÁC HỒI, TAB, SƠ ĐỒ — RÕ NÉT DỄ ĐỌC)</label>
          <select class="ve-select" id="ve-FontSubheadSelect">${fontOptionsHtml}</select>
        </div>
        <div class="ve-field">
          <label>3. FONT NỘI DUNG ĐOẠN VĂN (--font-body)</label>
          <select class="ve-select" id="ve-FontBodySelect">${fontOptionsHtml}</select>
        </div>
        <div class="ve-field">
          <label>4. FONT NHÃN &amp; ĐIỀU HƯỚNG (--font-sc)</label>
          <select class="ve-select" id="ve-FontScSelect">${fontOptionsHtml}</select>
        </div>
        <div class="ve-row-2">
          <div class="ve-field">
            <label>TỶ LỆ CỠ CHỮ TOÀN TRANG: <span id="ve-FontScaleVal">100%</span></label>
            <input type="range" id="ve-FontScaleInput" min="85" max="125" step="1" value="100" style="width:100%">
          </div>
          <div class="ve-field">
            <label>MÀU CHỦ ĐẠO (VÀNG KIM &amp; ĐỎ CHU SA)</label>
            <div style="display:flex;gap:10px;align-items:center">
              <input type="color" id="ve-GoldColorInput" value="#dfc08a" title="Màu vàng kim">
              <input type="color" id="ve-CrimsonColorInput" value="#c93026" title="Màu đỏ chu sa">
              <button type="button" class="ve-btn" id="ve-ResetColorBtn" style="padding:5px 10px">Màu gốc</button>
            </div>
          </div>
        </div>
        <div class="ve-modal-actions">
          <button type="button" class="ve-btn" data-ve-close="ve-FontModal">ĐÓNG</button>
          <button type="button" class="ve-btn ve-btn-primary" id="ve-ApplyFontBtn">LƯU FONT &amp; MÀU SẮC</button>
        </div>
      </div>
    `;
    document.body.appendChild(fontModal);

    // Cloud Publish Fallback Modal
    const pubModal = document.createElement('div');
    pubModal.id = 've-PublishModal';
    pubModal.className = 've-modal-backdrop';
    pubModal.innerHTML = `
      <div class="ve-modal" role="dialog" aria-label="Xuất bản lên gosucinema.web.id">
        <div class="ve-modal-head">
          <h4>Lưu Thẳng Lên Web (gosucinema.web.id)</h4>
          <button type="button" class="ve-close-btn" data-ve-close="ve-PublishModal">✕</button>
        </div>
        <p style="font-size:14.5px;line-height:1.65;color:#cfc4b0;margin-top:0">
          Các thay đổi của bạn đã được <strong>lưu ngay trên trình duyệt này</strong>.<br>
          Để đẩy thẳng lên <strong>gosucinema.web.id</strong> cho mọi người cùng thấy, bạn có thể:
        </p>
        <div class="ve-field" style="background:rgba(18,24,24,0.8);padding:14px;border:1px solid rgba(189,149,91,0.3)">
          <label>CÁCH 1 (KHUYÊN DÙNG TRÊN MÁY NÀY): CHẠY FILE "MO_TRINH_SUA_WEB.bat"</label>
          <p style="margin:4px 0 0;font-size:13.5px;color:#9a9180">
            Mở file <code>MO_TRINH_SUA_WEB.bat</code> trong thư mục dự án <code>H:\\GEN NEW MOI NGAY\\THIEN HA DI LUC</code>, sau đó bấm <strong>☁ LƯU LÊN WEB</strong> — hệ thống sẽ tự động lưu file và <code>git push</code> lên web không cần mật khẩu.
          </p>
        </div>
        <div class="ve-field">
          <label>CÁCH 2 (TỪ BẤT KỲ MÁY NÀO): NHẬP GITHUB TOKEN 1 LẦN DUY NHẤT</label>
          <input type="password" class="ve-input" id="ve-GhTokenInput" placeholder="Dán GitHub Personal Access Token (ghp_... hoặc github_pat_...)">
        </div>
        <div class="ve-modal-actions">
          <button type="button" class="ve-btn" id="ve-ModalDownloadBtn">⬇ TẢI FILE CẤU HÌNH (.JSON)</button>
          <button type="button" class="ve-btn ve-btn-primary" id="ve-ConfirmGhPublishBtn">☁ ĐẨY LÊN GITHUB PAGES</button>
        </div>
      </div>
    `;
    document.body.appendChild(pubModal);

    // Wire up Events
    async function requestAdminPin() {
      if (isAdminUnlocked()) return true;
      const pin = prompt('Chỉ Admin mới có quyền chỉnh sửa. Nhập mật mã Admin:');
      if (!pin) return false;
      const digest = await sha256Hex(pin.trim());
      if (digest === ADMIN_PIN_SHA256) {
        localStorage.setItem(ADMIN_UNLOCK_KEY, ADMIN_PIN_SHA256);
        launcher.style.display = 'flex';
        return true;
      }
      showToast('❌ Mật mã Admin không chính xác!');
      return false;
    }

    async function toggleEditMode(forceState) {
      const targetState = typeof forceState === 'boolean' ? forceState : !isEditMode;
      if (targetState && !(await requestAdminPin())) return;
      isEditMode = targetState;
      document.body.classList.toggle('ve-editing', isEditMode);
      launcher.style.display = isEditMode ? 'none' : isAdminUnlocked() ? 'flex' : 'none';
      enableInlineEditing(isEditMode);
      if (isEditMode) {
        showToast('Đã bật Chế độ Sửa Web (Admin)! Bấm vào chữ để sửa/in đậm/in nghiêng, hoặc bấm vào ảnh để thay ảnh.');
      } else {
        document.getElementById('ve-ImgHoverBadge').style.display = 'none';
        showToast('Đã thoát chế độ chỉnh sửa.');
      }
    }

    launcher.onclick = () => toggleEditMode(true);
    document.getElementById('ve-ExitBtn').onclick = () => toggleEditMode(false);
    document.getElementById('ve-LockAdminBtn').onclick = () => {
      localStorage.removeItem(ADMIN_UNLOCK_KEY);
      isEditMode = false;
      document.body.classList.remove('ve-editing');
      enableInlineEditing(false);
      launcher.style.display = 'none';
      document.getElementById('ve-ImgHoverBadge').style.display = 'none';
      showToast('🔒 Đã khóa chế độ Admin trên trình duyệt này.');
    };
    document.getElementById('ve-HeroBgQuickBtn').onclick = () => {
      const heroImg = document.querySelector('.hero .heroart');
      if (heroImg) openImageModal(heroImg);
    };
    document.getElementById('ve-TrailerQuickBtn').onclick = () => openVideoModal('trailerUrl');
    document.getElementById('ve-OpenFontBtn').onclick = () => openFontModal();
    document.getElementById('ve-PublishBtn').onclick = () => publishToWeb();

    // Secret Keyboard shortcut Ctrl+Shift+E (or Ctrl+E when already unlocked)
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleEditMode();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e' && isAdminUnlocked()) {
        e.preventDefault();
        toggleEditMode();
      }
    });

    // Close modals
    document.querySelectorAll('[data-ve-close]').forEach(btn => {
      btn.onclick = () => document.getElementById(btn.dataset.veClose).classList.remove('is-open');
    });

    // Image Upload Input
    const imgFileInput = document.getElementById('ve-ImgFileInput');
    imgFileInput.onchange = e => {
      const file = e.target.files?.[0];
      if (!file) return;
      compressOrReadImage(file, (dataUrl, safeName) => {
        const cleanName = `${Date.now()}-${safeName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        pendingAssets.push({ filename: cleanName, dataUrl });
        document.getElementById('ve-ImgUrlInput').value = dataUrl;
        document.getElementById('ve-ImgPreview').src = dataUrl;
      });
      imgFileInput.value = '';
    };

    document.getElementById('ve-ImgUrlInput').oninput = e => {
      document.getElementById('ve-ImgPreview').src = e.target.value.trim();
    };

    document.getElementById('ve-ApplyImgBtn').onclick = () => applyImageModalChange();

    // Video Upload Input
    const vidFileInput = document.getElementById('ve-VidFileInput');
    vidFileInput.onchange = e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        const cleanName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        pendingAssets.push({ filename: cleanName, dataUrl });
        document.getElementById('ve-VidUrlInput').value = dataUrl;
        showToast(`Đã nạp video "${file.name}"! Bấm Lưu Video Này rồi bấm Lưu Lên Web.`);
      };
      reader.readAsDataURL(file);
      vidFileInput.value = '';
    };

    document.getElementById('ve-ApplyVidBtn').onclick = () => applyVideoModalChange();
    document.getElementById('ve-PreviewTrailerModalBtn').onclick = () => {
      const urlVal = document.getElementById('ve-VidUrlInput').value.trim();
      document.getElementById('ve-VideoModal').classList.remove('is-open');
      if (window.GOSU_STATE && window.GOSU_STATE.openTrailerModal) {
        window.GOSU_STATE.openTrailerModal(urlVal);
      }
    };

    // Font Upload Input
    const fontFileInput = document.getElementById('ve-FontFileInput');
    fontFileInput.onchange = e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        const fontName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9 _-]/g, '');
        const cleanFile = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        pendingAssets.push({ filename: cleanFile, dataUrl });
        overrides.fonts.customFaces = overrides.fonts.customFaces || [];
        overrides.fonts.customFaces.push({ name: fontName, url: dataUrl });
        applyFontAndThemeOverrides();
        renderCustomFontOptions();
        const fontVal = `'${fontName}', serif`;
        document.getElementById('ve-FontDisplaySelect').value = fontVal;
        overrides.fonts.display = fontVal;
        applyFontAndThemeOverrides();
        saveLocalDraft();
        showToast(`Đã nạp font "${fontName}" thành công!`);
      };
      reader.readAsDataURL(file);
      fontFileInput.value = '';
    };

    const livePreviewFonts = () => {
      overrides.fonts.display = document.getElementById('ve-FontDisplaySelect').value;
      const subSel = document.getElementById('ve-FontSubheadSelect');
      if (subSel) overrides.fonts.subhead = subSel.value;
      overrides.fonts.body = document.getElementById('ve-FontBodySelect').value;
      overrides.fonts.sc = document.getElementById('ve-FontScSelect').value;
      overrides.fonts.scale = Number(document.getElementById('ve-FontScaleInput').value);
      document.getElementById('ve-FontScaleVal').textContent = `${overrides.fonts.scale}%`;
      applyFontAndThemeOverrides();
      saveLocalDraft();
    };

    ['ve-FontDisplaySelect', 've-FontSubheadSelect', 've-FontBodySelect', 've-FontScSelect', 've-FontScaleInput'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', livePreviewFonts);
      el.addEventListener('change', livePreviewFonts);
    });

    document.getElementById('ve-GoldColorInput').addEventListener('input', e => {
      overrides.fonts.goldColor = e.target.value;
      applyFontAndThemeOverrides();
      saveLocalDraft();
    });

    document.getElementById('ve-CrimsonColorInput').addEventListener('input', e => {
      overrides.fonts.crimsonColor = e.target.value;
      applyFontAndThemeOverrides();
      saveLocalDraft();
    });

    document.getElementById('ve-ResetColorBtn').onclick = () => {
      overrides.fonts.goldColor = '';
      overrides.fonts.crimsonColor = '';
      document.getElementById('ve-GoldColorInput').value = '#dfc08a';
      document.getElementById('ve-CrimsonColorInput').value = '#c93026';
      applyFontAndThemeOverrides();
      saveLocalDraft();
    };

    document.getElementById('ve-ApplyFontBtn').onclick = () => {
      livePreviewFonts();
      document.getElementById('ve-FontModal').classList.remove('is-open');
      showToast('Đã áp dụng Font & Giao diện!');
    };

    const downloadOverridesJson = () => {
      const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'site-overrides.json';
      a.click();
      URL.revokeObjectURL(a.href);
    };

    document.getElementById('ve-ExportBtn').onclick = downloadOverridesJson;
    document.getElementById('ve-ModalDownloadBtn').onclick = downloadOverridesJson;

    const importInput = document.getElementById('ve-ImportFileInput');
    document.getElementById('ve-ImportBtn').onclick = () => importInput.click();
    importInput.onchange = e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          overrides = parsed;
          saveLocalDraft();
          applyAllOverrides();
          showToast('Đã nhập gói cấu hình thành công!');
        } catch (_) {
          showToast('File JSON không hợp lệ!');
        }
      };
      reader.readAsText(file);
      importInput.value = '';
    };

    document.getElementById('ve-ResetBtn').onclick = () => {
      if (!confirm('Bạn có chắc muốn khôi phục toàn bộ nội dung, ảnh và font về mặc định ban đầu?')) return;
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    };

    document.getElementById('ve-ConfirmGhPublishBtn').onclick = () => {
      const tok = document.getElementById('ve-GhTokenInput').value.trim();
      if (!tok) {
        showToast('Vui lòng dán GitHub Personal Access Token!');
        return;
      }
      localStorage.setItem(GH_TOKEN_KEY, tok);
      publishViaGitHubApi(tok);
    };

    if (new URLSearchParams(location.search).get('edit') === '1') {
      toggleEditMode(true);
    }
  }

  // 10. Initialize
  async function initVisualEditor() {
    indexDomElements();
    injectPinnedFrameButtons();
    try {
      const res = await fetch(`site-overrides.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteData = await res.json();
        if (remoteData && typeof remoteData === 'object') {
          overrides = {
            ...overrides,
            ...remoteData,
            fonts: { ...overrides.fonts, ...(remoteData.fonts || {}) },
            videos: { ...overrides.videos, ...(remoteData.videos || {}) }
          };
        }
      }
    } catch (_) {}

    try {
      const localRaw = localStorage.getItem(STORAGE_KEY);
      if (localRaw) {
        const localData = JSON.parse(localRaw);
        const remoteTime = overrides.updatedAt ? Date.parse(overrides.updatedAt) : 0;
        const localTime = localData.updatedAt ? Date.parse(localData.updatedAt) : 0;
        if (localTime >= remoteTime) {
          overrides = {
            ...overrides,
            ...localData,
            fonts: { ...overrides.fonts, ...(localData.fonts || {}) },
            videos: { ...overrides.videos, ...(localData.videos || {}) }
          };
        }
      }
    } catch (_) {}

    applyAllOverrides();
    buildEditorUI();
    setupImageEditor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisualEditor);
  } else {
    initVisualEditor();
  }
})();
