/**
 * GOSU VISUAL LIVE EDITOR (Inline Text, Image Replacer, Font & Theme Studio)
 * Cho phép bấm vào chữ để sửa trực tiếp, bấm vào ảnh để thay ảnh/chỉnh cỡ,
 * đổi Font chữ (Google Fonts hoặc tải file .ttf/.otf/.woff2 từ máy) và Lưu thẳng lên Web.
 */
(function () {
  const STORAGE_KEY = 'gosu_visual_editor_overrides_v1';
  const GH_TOKEN_KEY = 'gosu_visual_editor_gh_token';
  const LOCAL_SYNC_URL = 'http://127.0.0.1:8765/api/publish';

  const GOOGLE_FONT_PRESETS = [
    { label: 'Mặc định (FZ OptiRadiant / Cormorant)', value: '', google: '' },
    { label: 'Cormorant Garamond (Cổ trang thanh lịch)', value: "'Cormorant Garamond', Georgia, serif", google: 'Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400' },
    { label: 'Spectral (Tiểu thuyết cổ điển)', value: "'Spectral', Georgia, serif", google: 'Spectral:ital,wght@0,300;0,400;0,600;1,400' },
    { label: 'Cormorant SC (Chữ hoa cổ điển)', value: "'Cormorant SC', serif", google: 'Cormorant+SC:wght@500;600;700' },
    { label: 'Playfair Display (Điện ảnh sang trọng)', value: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400' },
    { label: 'Cinzel (Hoàng cung uy nghi)', value: "'Cinzel', Georgia, serif", google: 'Cinzel:wght@400;600;700' },
    { label: 'Prata (Sắc nét cổ풍)', value: "'Prata', Georgia, serif", google: 'Prata' },
    { label: 'Lora (Mềm mại truyền thống)', value: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,600;1,400' },
    { label: 'EB Garamond (Sử ký cổ đại)', value: "'EB Garamond', Georgia, serif", google: 'EB+Garamond:ital,wght@0,400;0,600;1,400' },
    { label: 'Noto Serif Display (Hiện đại sắc sảo)', value: "'Noto Serif Display', Georgia, serif", google: 'Noto+Serif+Display:ital,wght@0,400;0,600;1,400' },
    { label: 'Merriweather (Dễ đọc, đầm nét)', value: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,400' },
    { label: 'Be Vietnam Pro (Sans-serif hiện đại)', value: "'Be Vietnam Pro', sans-serif", google: 'Be+Vietnam+Pro:wght@300;400;600;700' },
    { label: 'Montserrat (Hiện đại gọn gàng)', value: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;600;700' }
  ];

  let overrides = {
    version: 1,
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
    images: {},
    imageStyles: {},
    chars: null,
    places: null
  };

  let isEditMode = false;
  let activeImgTarget = null;
  let pendingAssets = []; // [{ filename, dataUrl }] for new image/font uploads

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

  // 1. Assign deterministic IDs to static text & images
  function indexDomElements() {
    const textSelectors = [
      '.hero-meta span',
      '.hero-kicker',
      '.hero h1 span',
      '.hero-sub',
      '.hero-bottom span',
      '.hero-bottom a',
      '.eyebrow',
      'h2',
      '.story-talisman span',
      '.story p',
      '.script-dossier h3',
      '.script-dossier h4',
      '.script-dossier p',
      '.script-dossier li',
      '.script-dossier blockquote',
      '.wide-caption h2',
      '.section-title p',
      '.principles .principle-item small',
      '.relic-dossier span',
      '.relic-dossier h3',
      '.relic-dossier p',
      '.relic-dossier li',
      '.relic-more-head p',
      '.relic-more-chip small',
      '.relic-more-chip strong',
      '.relic-more-chip span',
      '#gallery .gallery-sub',
      '#gallery .frame-meta span',
      '#gallery .frame-meta strong',
      '#gallery .frame-meta small',
      '#gallery > .caption',
      '#project .facts div',
      'footer p',
      'footer > span',
      '.footer-word'
    ];

    const allTexts = document.querySelectorAll(textSelectors.join(','));
    allTexts.forEach((el, idx) => {
      if (el.closest('#character-info') || el.closest('#ve-Toolbar') || el.closest('.ve-modal')) return;
      if (el.querySelector('img')) return; // skip containers that wrap logos directly
      if (!el.dataset.veId) {
        const tag = el.tagName.toLowerCase();
        const sec = el.closest('section, header, footer')?.id || 'root';
        el.dataset.veId = `${sec}.${tag}.${idx}`;
      }
    });

    const allImgs = document.querySelectorAll('img');
    allImgs.forEach((img, idx) => {
      if (img.closest('.ve-modal') || img.closest('#lightbox')) return;
      if (img.id === 'portrait') {
        img.dataset.veImgId = 'char-portrait-dynamic';
      } else if (!img.dataset.veImgId) {
        const sec = img.closest('section, header, footer')?.id || 'root';
        img.dataset.veImgId = `${sec}.img.${idx}`;
      }
    });
  }

  // 2. Apply overrides (Fonts, Texts, Images, Dynamic Arrays)
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

    // Inject custom uploaded @font-face rules
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
          font-display: swap;
        }
      `
        )
        .join('\n');
    } else {
      styleEl.textContent = '';
    }

    // Load Google Font stylesheets if matching preset
    [f.display, f.body, f.serifAlt, f.sc].forEach(val => {
      if (!val) return;
      const preset = GOOGLE_FONT_PRESETS.find(p => p.value === val);
      if (preset && preset.google) ensureGoogleFontLoaded(preset.google);
    });

    if (f.display) root.style.setProperty('--font-display', f.display);
    else root.style.removeProperty('--font-display');

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

  function applyAllOverrides() {
    indexDomElements();
    applyFontAndThemeOverrides();

    const state = window.GOSU_STATE;
    if (state) {
      if (Array.isArray(overrides.chars) && overrides.chars.length === state.chars.length) {
        overrides.chars.forEach((c, idx) => {
          state.chars[idx] = [...c];
        });
        state.refreshTabs();
        state.updateCharStage();
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
    }

    // Apply static text overrides
    Object.entries(overrides.texts || {}).forEach(([veId, html]) => {
      const el = document.querySelector(`[data-ve-id="${veId}"]`);
      if (el) el.innerHTML = html;
    });

    // Apply image src overrides
    Object.entries(overrides.images || {}).forEach(([imgId, src]) => {
      const img = document.querySelector(`img[data-ve-img-id="${imgId}"]`);
      if (img) {
        img.src = src;
        const galleryBtn = img.closest('#still-gallery [data-image]');
        if (galleryBtn) galleryBtn.dataset.image = src;
      }
    });

    // Apply image style overrides (height, objectFit)
    Object.entries(overrides.imageStyles || {}).forEach(([imgId, st]) => {
      const img = document.querySelector(`img[data-ve-img-id="${imgId}"]`);
      if (img && st) {
        if (st.height) img.style.height = st.height;
        if (st.width) img.style.width = st.width;
        if (st.objectFit) img.style.objectFit = st.objectFit;
      }
    });
  }

  // 3. Bind dynamic character & place inline edits
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
      el.dataset.veEditable = 'true';
      el.contentEditable = isEditMode ? 'true' : 'false';
      el.oninput = () => {
        const cIdx = state.getCurrentCharIndex();
        state.chars[cIdx][idx] = el.textContent.trim();
        if (isTabName) state.refreshTabs();
        overrides.chars = state.chars.map(row => [...row]);
        saveLocalDraft();
      };
    });

    if (portraitSeal) {
      portraitSeal.dataset.veEditable = 'true';
      portraitSeal.contentEditable = isEditMode ? 'true' : 'false';
      portraitSeal.oninput = () => {
        const cIdx = state.getCurrentCharIndex();
        state.chars[cIdx][5] = portraitSeal.textContent.trim();
        overrides.chars = state.chars.map(row => [...row]);
        saveLocalDraft();
      };
    }
  }

  const portraitSeal = document.getElementById('portrait-seal');
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
        el.addEventListener('input', () => {
          overrides.texts[el.dataset.veId] = el.innerHTML;
          saveLocalDraft();
        });
        el.addEventListener('click', e => {
          if (isEditMode && (el.tagName === 'A' || el.closest('a'))) {
            e.preventDefault();
          }
        });
      }
    });

    // Bind World Place Title & Description
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

    bindDynamicCharEdits();
  }

  // 4. Image Replacer Modal & Hover Badge
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
      const t = e.target;
      if (t && t.tagName === 'IMG' && t.dataset.veImgId) {
        hoveredImg = t;
        const rect = t.getBoundingClientRect();
        badge.style.display = 'block';
        badge.style.top = `${Math.max(8, rect.top + 8)}px`;
        badge.style.left = `${Math.max(8, rect.left + 8)}px`;
      } else if (t !== badge && ! badge.contains(t)) {
        if (hoveredImg) {
          const r = hoveredImg.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
            badge.style.display = 'none';
            hoveredImg = null;
          }
        }
      }
    });

    badge.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      if (hoveredImg) openImageModal(hoveredImg);
    };

    // Intercept clicks on any image or parent button when in Edit Mode
    document.addEventListener(
      'click',
      e => {
        if (!isEditMode) return;
        const img = e.target.tagName === 'IMG' ? e.target : e.target.querySelector?.('img[data-ve-img-id]');
        if (img && img.dataset.veImgId && !img.closest('.ve-modal')) {
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
      // Keep PNG/SVG/WebP as-is if under 1.8MB or if PNG logo
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
        const webpUrl = canvas.toDataURL('image/webp', 0.88);
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
    } else {
      targetInfo.textContent = `Mã vị trí ảnh: ${imgId} (${imgEl.alt || 'Hình ảnh trên trang'})`;
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

  // 5. Font & Theme Modal
  function openFontModal() {
    const modal = document.getElementById('ve-FontModal');
    const f = overrides.fonts || {};
    document.getElementById('ve-FontDisplaySelect').value = f.display || '';
    document.getElementById('ve-FontBodySelect').value = f.body || '';
    document.getElementById('ve-FontScSelect').value = f.sc || '';
    document.getElementById('ve-FontScaleInput').value = f.scale || 100;
    document.getElementById('ve-FontScaleVal').textContent = `${f.scale || 100}%`;
    document.getElementById('ve-GoldColorInput').value = f.goldColor || '#dfc08a';
    document.getElementById('ve-CrimsonColorInput').value = f.crimsonColor || '#c93026';
    renderCustomFontOptions();
    modal.classList.add('is-open');
  }

  function renderCustomFontOptions() {
    const f = overrides.fonts || {};
    const selects = [
      document.getElementById('ve-FontDisplaySelect'),
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

  // 6. Publish to Web (Local Sync Server OR GitHub API)
  async function publishToWeb() {
    const btn = document.getElementById('ve-PublishBtn');
    const origText = btn.innerHTML;
    btn.innerHTML = '⏳ ĐANG LƯU LÊN WEB...';
    btn.disabled = true;

    saveLocalDraft();

    // Step A: Try Local Sync Bridge (http://127.0.0.1:8765/api/publish)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
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
    } catch (_) {
      // Local sync server not reachable, fallback to GitHub API or Export
    }

    // Step B: Try GitHub Contents API if token is configured
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

      // Upload any pending assets first so overrides use clean paths
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
          // Replace dataUrl reference in overrides with assetPath
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

  // 7. Build Visual Editor UI
  function buildEditorUI() {
    // Launcher button
    const launcher = document.createElement('button');
    launcher.id = 've-Launcher';
    launcher.type = 'button';
    launcher.title = 'Bật chế độ chỉnh sửa trực tiếp (Phím tắt: Ctrl + E)';
    launcher.innerHTML = '✎ SỬA WEB';
    document.body.appendChild(launcher);

    // Floating Toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 've-Toolbar';
    toolbar.innerHTML = `
      <span class="ve-brand-badge"><i class="ve-status-dot"></i>CHẾ ĐỘ SỬA TRỰC TIẾP</span>
      <span class="ve-hint">Bấm vào chữ để gõ · Bấm vào ảnh để thay ảnh</span>
      <button type="button" class="ve-btn" id="ve-OpenFontBtn">🔤 ĐỔI FONT &amp; MÀU</button>
      <button type="button" class="ve-btn" id="ve-ExportBtn">⬇ TẢI GÓI LƯU</button>
      <button type="button" class="ve-btn" id="ve-ImportBtn">⬆ NHẬP GÓI</button>
      <button type="button" class="ve-btn" id="ve-ResetBtn">↺ MẶC ĐỊNH</button>
      <button type="button" class="ve-btn ve-btn-primary" id="ve-PublishBtn">☁ LƯU LÊN WEB</button>
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
          <label>1. FONT TIÊU ĐỀ LỚN (--font-display)</label>
          <select class="ve-select" id="ve-FontDisplaySelect">${fontOptionsHtml}</select>
        </div>
        <div class="ve-field">
          <label>2. FONT NỘI DUNG ĐOẠN VĂN (--font-body)</label>
          <select class="ve-select" id="ve-FontBodySelect">${fontOptionsHtml}</select>
        </div>
        <div class="ve-field">
          <label>3. FONT NHÃN &amp; ĐIỀU HƯỚNG (--font-sc)</label>
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
    function toggleEditMode(forceState) {
      isEditMode = typeof forceState === 'boolean' ? forceState : !isEditMode;
      document.body.classList.toggle('ve-editing', isEditMode);
      enableInlineEditing(isEditMode);
      if (isEditMode) {
        showToast('Đã bật Chế độ Sửa Web! Bấm vào chữ bất kỳ để sửa hoặc bấm vào ảnh để thay ảnh.');
      } else {
        document.getElementById('ve-ImgHoverBadge').style.display = 'none';
        showToast('Đã thoát chế độ chỉnh sửa.');
      }
    }

    launcher.onclick = () => toggleEditMode(true);
    document.getElementById('ve-ExitBtn').onclick = () => toggleEditMode(false);
    document.getElementById('ve-OpenFontBtn').onclick = () => openFontModal();
    document.getElementById('ve-PublishBtn').onclick = () => publishToWeb();

    // Keyboard shortcut Ctrl+E
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
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

    // Live preview in Font modal
    const livePreviewFonts = () => {
      overrides.fonts.display = document.getElementById('ve-FontDisplaySelect').value;
      overrides.fonts.body = document.getElementById('ve-FontBodySelect').value;
      overrides.fonts.sc = document.getElementById('ve-FontScSelect').value;
      overrides.fonts.scale = Number(document.getElementById('ve-FontScaleInput').value);
      document.getElementById('ve-FontScaleVal').textContent = `${overrides.fonts.scale}%`;
      applyFontAndThemeOverrides();
      saveLocalDraft();
    };

    ['ve-FontDisplaySelect', 've-FontBodySelect', 've-FontScSelect', 've-FontScaleInput'].forEach(id => {
      document.getElementById(id).addEventListener('input', livePreviewFonts);
      document.getElementById(id).addEventListener('change', livePreviewFonts);
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

    // Export / Import / Reset
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

    // Auto-open if ?edit=1 in URL
    if (new URLSearchParams(location.search).get('edit') === '1') {
      toggleEditMode(true);
    }
  }

  // 8. Initialize: load remote site-overrides.json + merge local draft
  async function initVisualEditor() {
    indexDomElements();
    try {
      const res = await fetch(`site-overrides.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteData = await res.json();
        if (remoteData && typeof remoteData === 'object') {
          overrides = { ...overrides, ...remoteData, fonts: { ...overrides.fonts, ...(remoteData.fonts || {}) } };
        }
      }
    } catch (_) {
      // Ignore offline/fetch error
    }

    try {
      const localRaw = localStorage.getItem(STORAGE_KEY);
      if (localRaw) {
        const localData = JSON.parse(localRaw);
        const remoteTime = overrides.updatedAt ? Date.parse(overrides.updatedAt) : 0;
        const localTime = localData.updatedAt ? Date.parse(localData.updatedAt) : 0;
        if (localTime >= remoteTime) {
          overrides = { ...overrides, ...localData, fonts: { ...overrides.fonts, ...(localData.fonts || {}) } };
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
