const chars = [
  [
    'Mót',
    'HUYỀN QUANG · 18 TUỔI · MỆNH ÂM',
    'assets/159.jpg',
    'Một thiếu niên mang Mệnh Âm bẩm sinh, có thể nhìn thấu và chạm vào linh thể người khuất. Từ đứa trẻ lăn ra trong chiếc bình gốm vỡ đêm mưa năm 1818 tại Điện Voi Ré, Mót bước vào nhánh mật Khâm Thiên Sứ với cổ phù phong ấn ẩn sâu trên cánh tay.',
    '“Mình đã may mắn được cứu khỏi đêm mưa, thì không thể để người khác phải tuyệt vọng chờ một may mắn tình cờ.”',
    '命陰',
    'assets/characters/mot-3view.webp',
    'assets/characters/mot-sheet.webp'
  ],
  [
    'Đại Sơn',
    'KHÂM THIÊN SỨ · 21 TUỔI · HỎA PHÙ KIẾM',
    'assets/161.jpg',
    'Sư huynh bộc trực, trọng nghĩa khí, người luôn đứng mũi chịu sào che chở cho Mót. Dùng hai ngón tay kẹp linh phù chu sa vuốt dọc sống kiếm, Đại Sơn kích hoạt ngọn lửa dương khí chém tan âm tà giữa lòng chảo Hổ Quyền.',
    '“Kiếm lửa trấn tà. Nghĩa khí giữ người.”',
    '火符',
    'assets/characters/daison-3view.webp',
    'assets/characters/daison-sheet.webp'
  ],
  [
    'Linh',
    'HUYỀN UYÊN · 25 TUỔI · LƯ HƯƠNG KHÓI ĐỎ',
    'assets/186.jpg',
    'Thiếu nữ khoác áo ngũ thân gấm đen như người cầm hương tang lễ, trên vai vắt đòn gánh đầu rồng treo lư hương tỏa khói máu. Sống sót sau đêm thảm sát năm 1818, nàng đội tang cha suốt đời và nắm giữ nửa kia chiếc vòng tín vật của Mót.',
    '“Tám phần nhân tính hóa tro tàn, hai phần máu lạnh giữ mạng nơi hang cọp.”',
    '血香',
    'assets/characters/linh-3view.webp',
    'assets/characters/linh-sheet.webp'
  ],
  [
    'Kim Lan',
    'LONG THỌ · 20 TUỔI · CUNG TIỄN KHUÊ CÁC',
    'assets/188.jpg',
    'Tiểu thư thanh tú xứ Huế vừa tinh thông thơ phú vừa sở hữu tài bắn cung bách phát bách trúng. Nhưng biến cố cha nàng nhúng chàm vào khế ước trăm bộ da hổ đã biến Kim Lan thành bài học trưởng thành đau đớn nhất của Mót về cái giá của công lý.',
    '“Giữa điều đúng và điều thương, có bao nhiêu khoảng cách?”',
    '悲弓',
    'assets/characters/kimlan-3view.webp',
    'assets/characters/kimlan-sheet.webp'
  ],
  [
    'Ông An',
    'LÀNG LONG THỌ · 68 TUỔI · NHÂN CHỨNG SỐNG',
    'assets/characters/ongan-avatar.webp',
    'Bậc cao niên hiền lành gắn bó cả đời với nghề nung ngói lưu ly và ruộng đồng Long Thọ. Ông An là người đầu tiên nhận ra mạch nước sông Hương hóa độc và tận mắt chứng kiến những bóng đen vận chuyển rương gỗ niêm phong vào Điện Voi Ré trong đêm sương.',
    '“Đất có mạch, người có tâm. Tâm người một khi đã mục ruỗng thì lúa ngoài đồng cũng rỉ máu.”',
    '老證',
    'assets/characters/ongan-3view.webp',
    'assets/characters/ongan-sheet.webp'
  ],
  [
    'Lão Phú',
    'QUAN LÀNG LONG THỌ · 45 TUỔI · KHẾ ƯỚC MÁU',
    'assets/characters/laophu-avatar.webp',
    'Viên quan địa phương cai quản làng Long Thọ, cha ruột của Kim Lan. Vì muốn bảo toàn chức vị và tích góp gia sản cho con gái, Lão Phú đã nhắm mắt ký vào khế ước ngầm với Vạn Kim Thương Hội, lén lút giết 100 con hổ tại Hổ Quyền khiến Đại Ma Hổ thức tỉnh.',
    '“Ta làm tất cả cũng chỉ để con bé không bao giờ phải nếm mùi bần hàn!”',
    '貪契',
    'assets/characters/laophu-3view.webp',
    'assets/characters/laophu-sheet.webp'
  ]
];

const tabs = document.querySelector('.tabs');
const charLayout = document.querySelector('#character-layout');
const portraitBox = document.querySelector('#portrait-box');
const portraitImg = document.querySelector('#portrait');
const portraitSeal = document.querySelector('#portrait-seal');
const charZoomBtn = document.querySelector('#char-zoom-btn');
const charInfo = document.querySelector('#character-info');
const charViewBtns = [...document.querySelectorAll('.char-view-btn')];

let currentCharIndex = 0;
let charViewMode = 'avatar'; // 'avatar' | 'turnaround' | 'sheet'

const charViewLabels = {
  avatar: 'CHÂN DUNG (AVATAR)',
  turnaround: 'FULL 3 MẶT (TRƯỚC · SAU · CẬN)',
  sheet: 'BẢNG THIẾT KẾ CHI TIẾT 1836'
};

// Bộ đệm chuyển đổi Base64 nặng -> Blob URL siêu tốc & giữ ảnh đã giải mã trên GPU
const fastCharUrlMap = new Map();
const gpuWarmImgMap = new Map();
let charGpuWarmPoolEl = null;

function ensureGpuWarmPool() {
  if (!charGpuWarmPoolEl && portraitBox) {
    charGpuWarmPoolEl = document.createElement('div');
    charGpuWarmPoolEl.className = 'char-gpu-warm-pool';
    charGpuWarmPoolEl.setAttribute('aria-hidden', 'true');
    portraitBox.appendChild(charGpuWarmPoolEl);
  }
  return charGpuWarmPoolEl;
}

function dataUrlToBlobUrl(dataUrl) {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return dataUrl;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return URL.createObjectURL(new Blob([u8arr], { type: mime }));
  } catch (_) {
    return dataUrl;
  }
}

const KNOWN_PNG_TO_WEBP = {
  'assets/uploads/1793702211074-TRAILER_SHDL_2.00_03_35_08.Still006.png':
    'assets/uploads/1793702211074-TRAILER_SHDL_2.00_03_35_08.Still006.webp',
  'assets/uploads/1793705406456-NHAN_VAT_QUAN_LON.png':
    'assets/uploads/1793705406456-NHAN_VAT_QUAN_LON.webp',
  'assets/uploads/1793705469018-B_ng_thi_t_k__Linh_-_Huy_n_Uy_n_1836.png':
    'assets/uploads/1793705469018-B_ng_thi_t_k__Linh_-_Huy_n_Uy_n_1836.webp'
};

function resolveFastCharImage(rawSrc) {
  if (!rawSrc) return '';
  if (KNOWN_PNG_TO_WEBP[rawSrc]) {
    rawSrc = KNOWN_PNG_TO_WEBP[rawSrc];
  }
  if (fastCharUrlMap.has(rawSrc)) {
    return fastCharUrlMap.get(rawSrc);
  }
  let fastUrl = rawSrc;
  if (rawSrc.startsWith('data:image/')) {
    fastUrl = dataUrlToBlobUrl(rawSrc);
  }
  fastCharUrlMap.set(rawSrc, fastUrl);
  return fastUrl;
}

function lockImageInGpuPool(url) {
  if (!url || gpuWarmImgMap.has(url)) return;
  const pool = ensureGpuWarmPool();
  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = url;
  if (pool) pool.appendChild(img);
  if (typeof img.decode === 'function') {
    img.decode().catch(() => {});
  }
  gpuWarmImgMap.set(url, img);
}

function warmCharacterGpuPool() {
  // 1. Ưu tiên nạp và giải mã sẵn 100% ảnh Chân Dung (Avatar) của tất cả nhân vật ngay lập tức
  chars.forEach(c => {
    if (c && c[2]) {
      lockImageInGpuPool(resolveFastCharImage(c[2]));
    }
  });
  // 2. Nạp tiếp ảnh Full 3 Mặt & Bảng Thiết Kế ngay sau đó để bấm qua tab phụ cũng 0ms delay
  setTimeout(() => {
    chars.forEach(c => {
      if (!c) return;
      if (c[6]) lockImageInGpuPool(resolveFastCharImage(c[6]));
      if (c[7]) lockImageInGpuPool(resolveFastCharImage(c[7]));
    });
  }, 120);
}

function getCharImageByMode(c, viewMode) {
  const raw = viewMode === 'turnaround' ? c[6] : viewMode === 'sheet' ? c[7] : c[2];
  return resolveFastCharImage(raw);
}

// Khởi tạo sẵn 4 phần tử thông tin nhân vật để tránh parse lại innerHTML mỗi lần bấm chuyển
let charSubEl = null;
let charNameEl = null;
let charBioEl = null;
let charQuoteEl = null;

function ensureCharInfoNodes() {
  if (!charInfo) return;
  if (!charSubEl || !charInfo.contains(charSubEl)) {
    charInfo.innerHTML = '<span class="small"></span><h3></h3><p></p><blockquote></blockquote>';
    charSubEl = charInfo.querySelector('.small');
    charNameEl = charInfo.querySelector('h3');
    charBioEl = charInfo.querySelector('p');
    charQuoteEl = charInfo.querySelector('blockquote');
  }
}

function updateCharStage() {
  const c = chars[currentCharIndex];
  if (!c) return;
  const isWide = charViewMode !== 'avatar';
  if (charLayout) charLayout.classList.toggle('is-wide-view', isWide);

  const nextSrc = getCharImageByMode(c, charViewMode);
  lockImageInGpuPool(nextSrc);
  if (portraitImg.getAttribute('src') !== nextSrc) {
    portraitImg.src = nextSrc;
  }
  portraitImg.alt = `${c[0]} — ${charViewLabels[charViewMode]}`;
  if (portraitSeal) portraitSeal.textContent = c[5];

  charViewBtns.forEach(btn => {
    const active = btn.dataset.charView === charViewMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  ensureCharInfoNodes();
  if (charSubEl) charSubEl.innerHTML = c[1];
  if (charNameEl) charNameEl.innerHTML = c[0];
  if (charBioEl) charBioEl.innerHTML = c[3];
  if (charQuoteEl) charQuoteEl.innerHTML = c[4];

  window.dispatchEvent(new CustomEvent('gosu:char-updated', { detail: { index: currentCharIndex, mode: charViewMode } }));
}

function setCharViewMode(viewMode) {
  if (charViewMode === viewMode) return;
  charViewMode = viewMode;
  updateCharStage();
}

charViewBtns.forEach(btn => {
  btn.onclick = () => setCharViewMode(btn.dataset.charView);
});

chars.forEach((c, i) => {
  const b = document.createElement('button');
  b.textContent = c[0];
  b.setAttribute('role', 'tab');
  b.onclick = () => selectChar(i);
  tabs.append(b);
});

function selectChar(i) {
  currentCharIndex = i;
  [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', j === i));
  updateCharStage();
}

warmCharacterGpuPool();
selectChar(0);

tabs.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  let i = [...tabs.children].indexOf(document.activeElement);
  const step = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : chars.length - 1;
  i = (i + step) % chars.length;
  selectChar(i);
  tabs.children[i].focus();
});

// World Locations
const places = [
  [
    'Đấu trường Hổ Quyền',
    'Đấu trường lộ thiên hình vành khăn bằng gạch vồ xây dựng năm Canh Dần (1830). Đằng sau tiếng trống lễ tế uy nghi là năm chuồng hổ tối tăm — nơi những con mãnh hổ bị bẻ nanh, nhổ móng, đâm chết trong đêm tối đã kết tụ thành Đại Ma Hổ khổng lồ bằng khói đen và mắt máu.'
  ],
  [
    'Điện Voi Ré — Long Châu Miếu',
    'Ngôi cổ miếu thờ bốn vị Tượng thần trung nghĩa nằm dưới bóng cổ thụ rợp kín. Trong câu chuyện, đây vừa là nơi Mót được tìm thấy trong chiếc bình vỡ đêm mưa năm 1818, vừa là nơi ẩn giấu mật thất chứa 100 bộ da hổ của Thương hội Vạn Kim.'
  ],
  [
    'Làng Long Thọ — Nguyệt Biều',
    'Vùng đất của lò gạch ngói lưu ly cung đình và những cánh đồng ven sông Hương. Khi Nhân tâm loạn bởi tham quan và khế ước máu, mạch Địa lập tức nghẽn tắc: lúa vàng hóa đen, dân lành ho ra máu và tiếng khóc xé màn sương trước cổng đình.'
  ]
];

const placeBtns = document.querySelectorAll('[data-place]');
placeBtns.forEach(b => {
  b.onclick = () => {
    placeBtns.forEach(btn => btn.classList.toggle('active', btn === b));
    const p = places[b.dataset.place];
    document.querySelector('#place-title').textContent = p[0];
    document.querySelector('#place-description').textContent = p[1];
  };
});

// Relics Torchlight & Filtering
const relicCards = [...document.querySelectorAll('.relic-card')];
relicCards.forEach(card => {
  card.addEventListener('pointermove', e => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mx', `${x.toFixed(1)}%`);
    card.style.setProperty('--my', `${y.toFixed(1)}%`);
  });
});

const filterBtns = document.querySelectorAll('.relic-filter');
filterBtns.forEach(btn => {
  btn.onclick = () => {
    filterBtns.forEach(b => b.classList.toggle('active', b === btn));
    const target = btn.dataset.filter;
    relicCards.forEach(card => {
      card.hidden = target !== 'all' && card.dataset.relicIndex !== target;
    });
  };
});

// Gallery View Toggle (Cinema Strip vs 12-Image Grid)
const galleryEl = document.querySelector('#still-gallery');
const toggleViewBtn = document.querySelector('#toggle-gallery-view');
if (toggleViewBtn && galleryEl) {
  toggleViewBtn.onclick = () => {
    const isGrid = galleryEl.classList.toggle('grid-mode');
    toggleViewBtn.setAttribute('aria-pressed', String(isGrid));
    toggleViewBtn.textContent = isGrid ? 'XEM DẠNG CUỘN PHIM NGANG ↔' : 'XEM DẠNG LƯỚI 12 ẢNH ⊞';
  };
}

// Lightbox for Still Frames & Relics
const dialog = document.querySelector('#lightbox');
const dialogImg = dialog.querySelector('.lightbox-figure img');
const dialogTitle = document.querySelector('#lightbox-title');
const dialogCaption = document.querySelector('#lightbox-caption');
const dialogTag = document.querySelector('#lightbox-tag');
const slideCount = document.querySelector('.slide-count');
const thumbStrip = document.querySelector('#lightbox-thumbs');
const playBtn = document.querySelector('#lightbox-play');

const frames = [...document.querySelectorAll('#still-gallery [data-image]')];
let currentFrame = 0;
let playTimer = null;
let mode = 'still'; // 'still' or 'relic'

// Build thumbnail strip for the 12 still frames
frames.forEach((btn, idx) => {
  const t = document.createElement('button');
  t.setAttribute('aria-label', `Chuyển tới khung hình ${idx + 1}`);
  t.innerHTML = `<img src="${btn.dataset.image}" alt="" loading="lazy">`;
  t.onclick = () => showFrame(idx);
  thumbStrip.append(t);
});

function stopAutoPlay() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  if (playBtn) playBtn.textContent = 'TỰ ĐỘNG CHIẾU ▶';
}

function showFrame(n) {
  mode = 'still';
  currentFrame = (n + frames.length) % frames.length;
  const item = frames[currentFrame];
  dialogImg.src = item.dataset.image;
  dialogImg.alt = item.dataset.title || '';
  dialogTitle.textContent = item.dataset.title || `Khung hình ${currentFrame + 1}`;
  dialogCaption.textContent = item.dataset.caption || '';
  dialogTag.textContent = 'STILL FRAME 4K · H:\\GEN NEW MOI NGAY\\THIEN HA DI LUC\\STILL FRAME';
  slideCount.textContent =
    String(currentFrame + 1).padStart(2, '0') + ' / ' + String(frames.length).padStart(2, '0');
  thumbStrip.style.display = 'flex';
  playBtn.style.display = 'inline-block';
  [...thumbStrip.children].forEach((b, i) => b.classList.toggle('active', i === currentFrame));
  if (!dialog.open) dialog.showModal();
}

const relicData = [
  {
    src: 'assets/phap-khi/1.webp',
    title: 'Pháp Khí Mở Đầu 01 · Túi Vải Pháp Khí Của Linh (Huyền Uyên)',
    caption: 'Túi vải thô nhuộm huyết chu sa buộc trên một đầu đòn gánh gỗ mun chạm rồng của Linh — cất giữ thảo dược dẫn hồn, cổ trùng, huyết phù và tro cốt tà vật để nạp vào lư hương sai khiến Vong — Ma — Quỷ.'
  },
  {
    src: 'assets/phap-khi/2.webp',
    title: 'Pháp Khí Mở Đầu 02 · Lư Hương Huyết Khói Của Linh (Huyền Uyên)',
    caption: 'Đỉnh đồng cổ treo ở đầu còn lại trên đòn gánh chạm rồng của Linh (Huyền Uyên) — khi đốt trầm trộn huyết dược từ túi vải sẽ tỏa làn khói máu dẫn dụ và thao túng Vong — Ma — Quỷ.'
  },
  {
    src: 'assets/phap-khi/3.webp',
    title: 'Pháp Khí Mở Đầu 03 · La Bàn Tầm Khí Của Mót',
    caption: 'Phong Thủy Cổ Bàn bằng đồng khắc Bát Quái của Mót (Huyền Quang) — xoay tít và phát sáng khi chạm vào mạch đất Khí suy hoặc tử thi nhiễm oán linh.'
  },
  {
    src: 'assets/phap-khi/4.webp',
    title: 'Pháp Khí Mở Đầu 04 · Ngọc Lệnh Khâm Thiên Giám',
    caption: 'Thẻ bạch ngọc chạm lộng song long thếp chữ vàng “欽天監” — mật lệnh điều tra dị sự triều Minh Mạng năm 1836.'
  }
];

function showRelicModal(idx) {
  stopAutoPlay();
  mode = 'relic';
  currentFrame = (idx + relicData.length) % relicData.length;
  const r = relicData[currentFrame];
  dialogImg.src = r.src;
  dialogImg.alt = r.title;
  dialogTitle.textContent = r.title;
  dialogCaption.textContent = r.caption;
  dialogTag.textContent = 'CÁC PHÁP KHÍ ĐẦU TIÊN XUẤT HIỆN · CHƯƠNG I';
  slideCount.textContent = `PHÁP KHÍ MỞ ĐẦU 0${currentFrame + 1} / 04`;
  thumbStrip.style.display = 'none';
  playBtn.style.display = 'none';
  if (!dialog.open) dialog.showModal();
}

const charViewOrder = ['avatar', 'turnaround', 'sheet'];

function openCharLightbox(viewOverride) {
  stopAutoPlay();
  mode = 'char';
  if (viewOverride) {
    setCharViewMode(viewOverride);
  }
  const c = chars[currentCharIndex];
  const viewIdx = charViewOrder.indexOf(charViewMode);
  dialogImg.src = getCharImageByMode(c, charViewMode);
  dialogImg.alt = `${c[0]} — ${charViewLabels[charViewMode]}`;
  dialogTitle.textContent = `${c[0]} · ${charViewLabels[charViewMode].replace('CHẾ ĐỘ: ', '')}`;
  dialogCaption.textContent = `${c[1]} — ${c[3]}`;
  dialogTag.textContent = 'HỒ SƠ TẠO HÌNH NHÂN VẬT 4K · SƠN HÀ DỊ LỤC (1836)';
  slideCount.textContent = `GÓC NHÌN 0${viewIdx + 1} / 03 · ${c[0].toUpperCase()}`;
  thumbStrip.style.display = 'none';
  playBtn.style.display = 'none';
  if (!dialog.open) dialog.showModal();
}

function stepCharLightbox(delta) {
  const idx = (charViewOrder.indexOf(charViewMode) + delta + charViewOrder.length) % charViewOrder.length;
  openCharLightbox(charViewOrder[idx]);
}

if (portraitBox) {
  portraitBox.onclick = e => {
    if (e.target === charZoomBtn) return;
    openCharLightbox();
  };
}

if (charZoomBtn) {
  charZoomBtn.onclick = e => {
    e.stopPropagation();
    openCharLightbox();
  };
}

frames.forEach((b, i) => {
  b.onclick = () => {
    stopAutoPlay();
    showFrame(i);
  };
});

document.querySelectorAll('[data-relic-open]').forEach(btn => {
  btn.onclick = () => showRelicModal(Number(btn.dataset.relicOpen));
});

document.querySelector('.slideshow').onclick = () => {
  stopAutoPlay();
  showFrame(0);
};

document.querySelector('.previous').onclick = () => {
  if (mode === 'relic') showRelicModal(currentFrame - 1);
  else if (mode === 'char') stepCharLightbox(-1);
  else showFrame(currentFrame - 1);
};

document.querySelector('.next').onclick = () => {
  if (mode === 'relic') showRelicModal(currentFrame + 1);
  else if (mode === 'char') stepCharLightbox(1);
  else showFrame(currentFrame + 1);
};

if (playBtn) {
  playBtn.onclick = () => {
    if (playTimer) {
      stopAutoPlay();
    } else {
      playBtn.textContent = 'TẠM DỪNG ❚❚';
      playTimer = setInterval(() => showFrame(currentFrame + 1), 3200);
    }
  };
}

document.querySelector('.close').onclick = () => {
  stopAutoPlay();
  dialog.close();
};

dialog.onclick = e => {
  if (e.target === dialog) {
    stopAutoPlay();
    dialog.close();
  }
};

dialog.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') {
    if (mode === 'relic') showRelicModal(currentFrame + 1);
    else if (mode === 'char') stepCharLightbox(1);
    else showFrame(currentFrame + 1);
  }
  if (e.key === 'ArrowLeft') {
    if (mode === 'relic') showRelicModal(currentFrame - 1);
    else if (mode === 'char') stepCharLightbox(-1);
    else showFrame(currentFrame - 1);
  }
});

// Scroll Reveal & Progress Bar
document.documentElement.classList.add('js');
const observer = new IntersectionObserver(
  entries =>
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('shown');
        observer.unobserve(e.target);
      }
    }),
  { threshold: 0.08 }
);
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

let ticking = false;
addEventListener(
  'scroll',
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      document.querySelector('.progress').style.width = (max ? (scrollY / max) * 100 : 0) + '%';
      ticking = false;
    });
  },
  { passive: true }
);

// Fullscreen Menu
const menu = document.querySelector('#film-menu');
const toggle = document.querySelector('.menu-toggle');

function closeMenu() {
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

toggle.onclick = () => {
  const opening = menu.hidden;
  menu.hidden = !opening;
  toggle.setAttribute('aria-expanded', String(opening));
  document.body.style.overflow = opening ? 'hidden' : '';
};

menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeMenu();
    stopAutoPlay();
  }
});

// Spirit Lantern Cursor
const orbit = document.querySelector('.cursor-orbit');
addEventListener(
  'pointermove',
  e => {
    orbit.style.transform = `translate(${e.clientX + 82}px, ${e.clientY + 82}px)`;
  },
  { passive: true }
);


// Script Hub Tabs & Navbar Dropdown Jump
const scriptTabBtns = [...document.querySelectorAll('[data-script-tab]')];
const scriptPanels = [...document.querySelectorAll('.script-panel')];

function activateScriptTab(tabId, scrollIntoView = false) {
  scriptTabBtns.forEach(btn => {
    const active = btn.dataset.scriptTab === tabId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  scriptPanels.forEach(panel => {
    const match = panel.id === tabId;
    panel.classList.toggle('active', match);
    panel.hidden = !match;
  });
  if (scrollIntoView) {
    const hub = document.querySelector('#script');
    if (hub) hub.scrollIntoView({ behavior: 'smooth' });
  }
}

scriptTabBtns.forEach(btn => {
  btn.onclick = () => activateScriptTab(btn.dataset.scriptTab, false);
});

document.querySelectorAll('[data-script-jump]').forEach(btn => {
  btn.onclick = e => {
    e.preventDefault();
    activateScriptTab(btn.dataset.scriptJump, true);
  };
});

// Interactive Relationship Diagram Nodes
const relNodesData = {
  mot: {
    tag: 'TRỤC TRUNG TÂM · KHÂM THIÊN SỨ · MỆNH ÂM',
    name: 'Mót (Huyền Quang · 18 tuổi) — Điểm giao của mọi ân oán năm 1818 & 1836',
    desc: 'Đứa trẻ lăn ra từ chiếc bình gốm vỡ tại Điện Voi Ré đêm mưa năm 1818, được Ông An nhặt về nuôi lớn. Mang Mệnh Âm và Cổ Phù Phong Ấn của cha mẹ ruột trên cánh tay, Mót bước vào hành trình giải trừ dịch Khí suy và tìm lời giải cho câu hỏi: “Thế nào là một vị quan tốt vì dân?”',
    links: [
      '<strong>Với Ông An & Hương:</strong> Con nuôi hiếu thảo của Cụ An; người kế thừa ngọn đuốc công lý của anh hai Hương.',
      '<strong>Với Đại Sơn:</strong> Huynh đệ sinh tử, dùng Chưởng Cổ Phù Kim Quang cứu Đại Sơn khỏi tà khí Ma Hổ.',
      '<strong>Với Kim Lan:</strong> Mối tình đầu trong sáng nhưng buộc phải tố giác cha cô (Lão Phú) để cứu dân làng.',
      '<strong>Với Linh (Huyền Uyên):</strong> Cùng giữ hai nửa chiếc vòng năm 1818; từ thù sát phụ hóa tri kỷ sinh tử.',
      '<strong>Với Khánh Vũ:</strong> Người bạn duy nhất Vũ tin tưởng trui rèn để tự tay kết liễu Vũ khi hóa Quỷ Xương Cuồng.'
    ]
  },
  ongan: {
    tag: 'GIA ĐÌNH LONG THỌ · VỊ QUAN LIÊM VỀ HƯU',
    name: 'Ông An / Cụ An (65 tuổi) — Người cha già sợ quan trường cướp mất đứa con cuối cùng',
    desc: 'Cả đời làm quan thanh liêm rồi về quê dạy chữ ở làng Long Thọ. Đêm mưa năm 1818, ông nhặt Mót từ chiếc bình gốm vỡ ở Điện Voi Ré và trao “nắm xôi ấm” dạy Mót lòng thương người. Từng mất hai người con ruột vì quan trường nên ông kịch liệt cản Mót lên Kinh, trước khi nuốt nước mắt trao lại nửa vòng ngọc năm 1818.',
    links: [
      '<strong>Với Mót:</strong> Cha nuôi cứu mạng và là hình mẫu đạo đức lớn nhất đời Mót.',
      '<strong>Với Anh Cả (Tham quan):</strong> Đau đớn đập bát hương từ mặt khi con trai cả sa ngã vì tiền.',
      '<strong>Với Hương (Anh Hai):</strong> Tự hào nhưng luôn nơm nớp lo sợ sự cương trực cực đoan của con trai thứ.',
      '<strong>Với Đại Sơn:</strong> Ban đầu xua đuổi vì sợ Sơn kéo Mót vào chỗ chết, sau cảm kích nghĩa khí của Sơn.'
    ]
  },
  huong: {
    tag: 'NHA MÔN ÁN SỨ KINH THÀNH · PHÁP BẤT VỊ THÂN',
    name: 'Hương — Anh Hai (27 tuổi) — Ngọn đuốc công lý cô độc giữa triều đình Phú Xuân',
    desc: 'Con trai thứ của Ông An, lấy cảm hứng từ danh thần Nguyễn Khoa Đăng. Giữ phương châm “Quan thấy sai mà không dám xử, dân lành biết dựa vào đâu?”, Hương đơn độc điều tra danh sách đại quan nhận hối lộ của Vạn Kim và bị sát hại ngay đêm trước buổi thiết triều ở Thiên II.',
    links: [
      '<strong>Với Ông An:</strong> Giữ trọn lời cha dạy nhưng không dám gửi thư về quê vì sợ kẻ thù hại cha.',
      '<strong>Với Mót:</strong> Anh hai nuôi mà Mót ngưỡng mộ; trối trăng cuốn sổ chứng cứ đẫm máu trong vòng tay Mót.',
      '<strong>Với Lão Phú:</strong> Chính cuộc thanh tra của Hương khiến Lão Phú hoảng sợ ký khế ước với Vạn Kim.'
    ]
  },
  daison: {
    tag: 'SƯ HUYNH KHÂM THIÊN SỨ · HỎA PHÙ KIẾM PHÁP',
    name: 'Đại Sơn (21 tuổi) — Kiếm lửa trấn tà, gánh nặng chữ Hiếu nhà nghèo',
    desc: 'Võ quan Khâm Thiên Sứ bộc trực, máu lửa, xuất thân từ gia đình nông dân nghèo. Đại Sơn phát hiện Mót mang Mệnh Âm, dẫn dắt Mót vào nghề và xả thân đỡ đòn cho Mót ở Hổ Quyền. Về sau ở Thiên II, khi quyền quý đe dọa cha mẹ già dưới quê, Sơn chọn từ quan về quê giữ trọn chữ Hiếu trước khi quay lại trợ chiến cuối phim.',
    links: [
      '<strong>Với Mót:</strong> Sư huynh dẫn đường, người anh em vào sinh ra tử nơi lòng chảo Hổ Quyền.',
      '<strong>Với Ông An:</strong> Từng lỡ lời trách Ông An ích kỷ nhưng sau đó thấu hiểu nỗi lòng người cha già.',
      '<strong>Với Đại Ma Hổ:</strong> Bị tà khí Ma Hổ nhập đỏ mắt tại Hổ Quyền và được Mót dùng Cổ Phù cứu tỉnh.'
    ]
  },
  kimlan: {
    tag: 'NÀNG THƠ XỨ HUẾ · TIỂU THƯ CUNG TIỄN',
    name: 'Kim Lan (20 tuổi) — Bài học trưởng thành đau đớn đầu tiên về cái giá của công lý',
    desc: 'Thiếu nữ khuê các vừa tinh thông thơ phú vừa bắn cung bách phát bách trúng (3 mũi tên chụm hồng tâm). Khi Mót phanh phui tội ác của cha cô (Lão Phú) để cứu làng Long Thọ, suất tiến cử vào phủ Quận chúa của Kim Lan bị thu hồi. Vượt qua biến cố, cô ở lại quê mở lớp dạy chữ cho trẻ nghèo.',
    links: [
      '<strong>Với Mót:</strong> Mối rung động đầu đời trong sáng; không oán trách nhưng cũng không thể vượt qua khoảng cách gia biến.',
      '<strong>Với Lão Phú:</strong> Con gái ruột vô tội phải gánh chịu hậu quả từ lòng tham và sự mù quáng của cha.',
      '<strong>Với Ông An:</strong> Được Ông An thương cảm, cưu mang và cùng mở lớp dạy học ở Vĩ thanh.'
    ]
  },
  linh: {
    tag: 'NHÁNH CẤM KỴ HUYỀN UYÊN · LƯ HƯƠNG KHÓI ĐỎ',
    name: 'Linh — Huyền Uyên (25 tuổi) — Thiếu nữ mặc áo tang đen đội tang cha suốt 18 năm',
    desc: 'Năm 10 tuổi chứng kiến cha ruột chết oan trong vụ nổ ma trận của cha Mót (1818). Khi đao của Vạn Kim kề cổ, Linh nuốt ngược nước mắt thề hoàn tất công trình điều khiển quỷ để giữ mạng. Khoác áo tang đen và gánh lư hương khói đỏ suốt 18 năm, khi hai nửa vòng ngọc khớp lại, cô cùng Mót quay mũi giáo phá hủy lồng giam Vạn Kim.',
    links: [
      '<strong>Với Mót:</strong> Nắm giữ nửa kia chiếc vòng năm 1818; từ kẻ thù không đội trời chung thành tri kỷ sinh tử.',
      '<strong>Với Cha ruột Linh & Cha Mót:</strong> Hai học giả Huyền Uyên bị Vạn Kim biến thành công cụ trong thảm kịch 1818.',
      '<strong>Với Khánh Vũ:</strong> Người ngầm tiết lộ cho Vũ biết ngày ma trận kích hoạt cũng là ngày Vũ bị nghiền nát.'
    ]
  },
  laophu: {
    tag: 'QUAN THAM ĐỊA PHƯƠNG & CAI NGỤC HỔ QUYỀN',
    name: 'Lão Phú (45 tuổi) & Ông Quản Chuồng Hổ — Nguồn cơn đại dịch Khí suy Long Thọ',
    desc: 'Vì sợ bị thanh tra tội ăn chặn sưu thuế và muốn giữ tương lai cho con gái Kim Lan, Lão Phú ký khế ước nộp 100 bộ da hổ cho Vạn Kim. Thuộc hạ là Ông Quản Chuồng Hổ trực tiếp bẻ nanh, nhổ móng, đâm chết hổ trong chuồng số 3 và tư thông với Dâm Nữ, dẫn tới việc bị Đại Ma Hổ vồ chết nhét 5 chìa khóa sắt vào miệng.',
    links: [
      '<strong>Với Thương Hội Vạn Kim:</strong> Con nợ ngoại vi dùng lệnh bài giả sát hại trăm mạng hổ đổi lấy vàng và sự bảo kê.',
      '<strong>Với Kim Lan:</strong> Lấy tình thương con gái làm cái cớ để gieo họa cho cả làng Long Thọ.',
      '<strong>Với Mót:</strong> Quỳ lạy van xin Mót đốt khế ước nhưng bị Mót kiên quyết giao nộp cho nha môn.'
    ]
  },
  khanhvu: {
    tag: 'THIẾU GIA VẠN KIM · VẬT CHỦ QUỶ XƯƠNG CUỒNG',
    name: 'Khánh Vũ (24 tuổi) — “Chiếc bình sống” và kẻ phản bội đã báo trước trong nước mắt',
    desc: 'Con trai vợ lẽ của Hội trưởng Vạn Kim, bị chính cha ruột phong ấn đại cổ quỷ Xương Cuồng vào máu thịt ngay từ lúc sơ sinh và bị giam mẹ làm con tin. Kết bạn với Mót từ bến sông Long Thọ, Vũ âm thầm nuôi dưỡng Mót đủ mạnh để ngày Vũ buộc phải phá ấn kích hoạt ma trận cứu mẹ, Mót có thể tự tay kết liễu và giải thoát cho Vũ.',
    links: [
      '<strong>Với Mót:</strong> Bằng hữu tri kỷ; người trao thuốc quý, cho đi nhờ thuyền và gửi gắm nhát kiếm giải thoát cuối cùng.',
      '<strong>Với Hội Trưởng Vạn Kim:</strong> Nạn nhân bị chính người cha máu lạnh biến thành vũ khí chứa quỷ suốt 24 năm.',
      '<strong>Với Mẹ ruột Khánh Vũ:</strong> Chấp nhận mang tiếng phản bội và hóa quỷ chỉ để giữ mạng cho người mẹ trên đỉnh tháp.'
    ]
  },
  hoitruong: {
    tag: 'TRÙM CUỐI THƯƠNG HỘI VẠN KIM · BÁ QUYỀN KIM TIỀN',
    name: 'Hội Trưởng Thương Hội Vạn Kim — Kẻ đứng sau bức màn nhung Kinh thành Phú Xuân',
    desc: 'Bề nổi là liên minh phú thương giàu nhất Đại Nam, bề chìm là kẻ thao túng quan lại bằng vàng bạc, bức tử hai gia đình Mót – Linh năm 1818 và phong ấn Quỷ Xương Cuồng vào chính máu thịt con trai mình (Khánh Vũ) nhằm mưu đồ bá quyền.',
    links: [
      '<strong>Với Khánh Vũ & Mẹ Vũ:</strong> Giam lỏng mẹ Vũ trên đỉnh tháp để ép Vũ làm vật chủ chứa quỷ.',
      '<strong>Với Linh & Gia đình Mót:</strong> Kẻ chủ mưu đứng sau thảm kịch đêm mưa năm 1818.',
      '<strong>Với Quan trường Đại Nam:</strong> Dùng đĩnh vàng Vạn Kim mua chuộc quan tham từ Lão Phú đến các đại thần.'
    ]
  },
  chame1818: {
    tag: 'KHỞI NGUỒN ĐỊNH MỆNH · ĐÊM MƯA BÃO NĂM 1818',
    name: 'Cha Mẹ Ruột Mót & Cha Ruột Linh — Vụ nổ ma trận và hai nửa chiếc vòng ngọc',
    desc: 'Cha Mót và Cha Linh từng là hai học giả kiệt xuất của nhánh Huyền Uyên phục vụ dự án khống chế quỷ của Vạn Kim. Vì yêu mẹ Mót (một nữ Khâm Thiên Sứ), cha Mót quyết định hoàn lương, kích nổ hủy toàn bộ ma trận đêm mưa năm 1818. Trước khi hy sinh, cha mẹ Mót phong ấn năng lượng vào tay con và giấu Mót trong chiếc bình gốm ở Điện Voi Ré; còn cha Linh chết oan trong vụ nổ ngay trước mắt cô bé Linh 10 tuổi.',
    links: [
      '<strong>Với Mót:</strong> Để lại Cổ Phù Phong Ấn trên cánh tay và nửa chiếc vòng ngọc tín vật trong chiếc bình gốm.',
      '<strong>Với Linh (Huyền Uyên):</strong> Cái chết của cha Linh trong vụ nổ khiến Linh ôm mối hận 18 năm trước khi biết chân tướng.',
      '<strong>Với Hội Trưởng Vạn Kim:</strong> Phá hủy công trình điều khiển Quỷ Xương Cuồng đời đầu của Vạn Kim.'
    ]
  },
  maho: {
    tag: 'THỰC THỂ OÁN KHÍ & ĐẠI CỔ QUỶ',
    name: 'Đại Ma Hổ (Hổ Quyền) & Quỷ Xương Cuồng (Đỉnh Tháp Vạn Kim)',
    desc: 'Trong thế giới Sơn Hà Dị Lục, tà vật không tự nhiên sinh ra mà kết tụ từ lòng tham và tội ác của con người: Đại Ma Hổ hình thành từ oán hồn con mãnh hổ bị bẻ nanh, đâm chết trong chuồng số 3 cùng 100 bộ da hổ; còn Quỷ Xương Cuồng là đại cổ quỷ bị Hội trưởng Vạn Kim phong ấn vào thân xác Khánh Vũ để mưu đồ bá quyền.',
    links: [
      '<strong>Với Quản Chuồng Hổ & Lão Phú:</strong> Đại Ma Hổ vồ chết Quản Chuồng Hổ, nhét 5 chìa khóa sắt vào miệng để đòi nợ máu.',
      '<strong>Với Mót & Đại Sơn:</strong> Bị Mót dùng Chưởng Cổ Phù Kim Quang và Hỏa Phù Kiếm của Đại Sơn hóa giải tại Hổ Quyền.',
      '<strong>Với Khánh Vũ:</strong> Quỷ Xương Cuồng chiếm đoạt thân xác Vũ ở Thiên III trước khi bị Mót đánh tan để giải thoát cho bạn.'
    ]
  }
};

const relBoardEl = document.querySelector('#rel-board');
const relNodeBtns = document.querySelectorAll('[data-node]');
const wireGroups = document.querySelectorAll('.wire-group');
const relTagEl = document.querySelector('#rel-detail-tag');
const relNameEl = document.querySelector('#rel-detail-name');
const relDescEl = document.querySelector('#rel-detail-desc');
const relLinksEl = document.querySelector('#rel-detail-links');
const relFocusStatusEl = document.querySelector('#rel-focus-status');
const relResetBtn = document.querySelector('#rel-reset-btn');

let lockedNodeId = null;

function highlightNodeWires(nodeId) {
  if (!relBoardEl) return;
  if (!nodeId) {
    relBoardEl.classList.remove('has-focus');
    wireGroups.forEach(w => w.classList.remove('wire-active'));
    relNodeBtns.forEach(b => {
      b.classList.remove('active', 'is-selected', 'is-connected', 'is-dimmed');
      const badge = b.querySelector('.rel-conn-badge');
      if (badge) badge.textContent = '';
    });
    if (relFocusStatusEl) {
      relFocusStatusEl.innerHTML =
        'ĐANG HIỆN TOÀN BỘ SƠ ĐỒ (<strong>11 NHÂN VẬT · 17 MỐI QUAN HỆ</strong>) — Bấm vào bất kỳ nhân vật nào để chỉ phát sáng những mối liên quan';
    }
    if (relResetBtn) relResetBtn.classList.add('is-showing-all');
    return;
  }

  relBoardEl.classList.add('has-focus');
  if (relResetBtn) relResetBtn.classList.remove('is-showing-all');

  const connectedIds = new Set();
  wireGroups.forEach(w => {
    const from = w.dataset.from;
    const to = w.dataset.to;
    const isConnected = from === nodeId || to === nodeId;
    w.classList.toggle('wire-active', isConnected);
    if (isConnected) {
      connectedIds.add(from === nodeId ? to : from);
      if (w.parentNode) w.parentNode.appendChild(w);
    }
  });

  relNodeBtns.forEach(b => {
    const id = b.dataset.node;
    const isSelected = id === nodeId;
    const isConn = !isSelected && connectedIds.has(id);
    const isDimmed = !isSelected && !isConn;
    b.classList.toggle('active', isSelected);
    b.classList.toggle('is-selected', isSelected);
    b.classList.toggle('is-connected', isConn);
    b.classList.toggle('is-dimmed', isDimmed);
    const badge = b.querySelector('.rel-conn-badge');
    if (badge) {
      badge.textContent = isSelected ? '✦ ĐANG CHỌN' : isConn ? 'LIÊN QUAN' : '';
    }
  });

  if (relFocusStatusEl) {
    const selectedBtn = [...relNodeBtns].find(b => b.dataset.node === nodeId);
    const shortName = selectedBtn ? selectedBtn.querySelector('strong').textContent : nodeId;
    relFocusStatusEl.innerHTML =
      `ĐANG SOI MẠCH QUAN HỆ: <strong>${shortName}</strong> — Phát sáng <strong>${connectedIds.size}</strong> nhân vật liên quan &amp; dìm các mối không liên quan`;
  }
}

function selectRelNode(btn) {
  const nodeId = btn.dataset.node;
  lockedNodeId = nodeId;
  highlightNodeWires(nodeId);
  const data = relNodesData[nodeId];
  if (!data) return;
  relTagEl.textContent = data.tag;
  relNameEl.textContent = data.name;
  relDescEl.textContent = data.desc;
  relLinksEl.innerHTML = data.links.map(item => `<span>${item}</span>`).join('');
}

relNodeBtns.forEach(btn => {
  btn.onclick = e => {
    e.stopPropagation();
    selectRelNode(btn);
  };
  btn.addEventListener('pointerenter', () => {
    if (!lockedNodeId) highlightNodeWires(btn.dataset.node);
  });
  btn.addEventListener('pointerleave', () => {
    if (!lockedNodeId) highlightNodeWires(null);
  });
});

if (relResetBtn) {
  relResetBtn.onclick = () => {
    lockedNodeId = null;
    highlightNodeWires(null);
  };
}

if (relBoardEl) {
  relBoardEl.addEventListener('click', e => {
    if (e.target === relBoardEl || e.target.classList.contains('rel-wires')) {
      lockedNodeId = null;
      highlightNodeWires(null);
    }
  });
}

// Khởi tạo mặc định ở chế độ nhìn toàn cảnh rõ ràng, khi bấm vào bất kỳ nhân vật nào sẽ lập tức phát sáng nhánh liên quan & dìm phần còn lại
highlightNodeWires(null);

// Trailer & Moodboard Modal
const trailerDialog = document.querySelector('#trailer-dialog');
const openTrailerBtn = document.querySelector('#open-trailer-btn');
const closeTrailerBtn = document.querySelector('#close-trailer-btn');
const trailerVideoEl = document.querySelector('#trailer-video');
const trailerVideoSrcEl = document.querySelector('#trailer-video-src');
const trailerIframeEl = document.querySelector('#trailer-iframe');
const trailerPlaceholderEl = document.querySelector('#trailer-placeholder');
const trailerWatchOpeningBtn = document.querySelector('#trailer-watch-opening-btn');

window.GOSU_TRAILER_URL = '';

function toEmbedUrl(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  return '';
}

function stopTrailerPlayback() {
  if (trailerVideoEl) {
    trailerVideoEl.pause();
    trailerVideoEl.hidden = true;
  }
  if (trailerIframeEl) {
    trailerIframeEl.src = '';
    trailerIframeEl.hidden = true;
  }
}

function openTrailerModal(customUrl) {
  if (!trailerDialog) return;
  stopTrailerPlayback();
  const activeUrl = (typeof customUrl === 'string' ? customUrl : window.GOSU_TRAILER_URL || '').trim();
  if (!activeUrl) {
    if (trailerPlaceholderEl) trailerPlaceholderEl.hidden = false;
  } else {
    if (trailerPlaceholderEl) trailerPlaceholderEl.hidden = true;
    const embedUrl = toEmbedUrl(activeUrl);
    if (embedUrl && trailerIframeEl) {
      trailerIframeEl.src = embedUrl;
      trailerIframeEl.hidden = false;
    } else if (trailerVideoEl && trailerVideoSrcEl) {
      trailerVideoSrcEl.src = activeUrl;
      trailerVideoEl.load();
      trailerVideoEl.hidden = false;
      trailerVideoEl.play().catch(() => {});
    }
  }
  if (!trailerDialog.open) trailerDialog.showModal();
}

if (openTrailerBtn) {
  openTrailerBtn.onclick = () => openTrailerModal();
}

if (trailerWatchOpeningBtn) {
  trailerWatchOpeningBtn.onclick = () => openTrailerModal('assets/scene1-render.mp4');
}

if (closeTrailerBtn && trailerDialog) {
  closeTrailerBtn.onclick = () => {
    stopTrailerPlayback();
    trailerDialog.close();
  };
  trailerDialog.onclick = e => {
    if (e.target === trailerDialog) {
      stopTrailerPlayback();
      trailerDialog.close();
    }
  };
}

/* ==========================================================================
   CÂY NHANG NGHI LỄ GIỮA "DỊ" VÀ "LỤC" + ĐẾM SỐ NGƯỜI THẮP HƯƠNG (+1)
   Cơ chế: Hương cháy ngắn dần từ trên xuống (y1: 237.5 -> 329.5) và tối/tàn dần;
   bấm vào cây nhang hoặc nút đếm sẽ thắp sáng rực và dài lại 100% + cộng thêm 1.
   ========================================================================== */
const heroIncenseBtn = document.getElementById('hero-incense-btn');
const heroMainTitle = document.getElementById('hero-main-title');
const heroIncenseCounterBar = document.getElementById('hero-incense-counter-bar');
const heroIncenseCounterBtn = document.getElementById('hero-incense-counter-btn');
const incenseCountValueEl = document.getElementById('incense-count-value');
const incenseCounterCtaEl = document.getElementById('incense-counter-cta');
const incensePlusFloatEl = document.getElementById('incense-plus-float');

// Các phần tử SVG phục vụ hiệu ứng cháy ngắn dần & tối dần (tàn hương)
const stickBodyEl = document.getElementById('incense-stick-body');
const burningHeadEl = document.getElementById('incense-burning-head');
const haloLayerEl = document.getElementById('incense-halo-layer');
const smokeLayerEl = document.getElementById('incense-smoke-layer');
const unlitInviteEl = document.getElementById('incense-unlit-invite');
const litAuraEl = document.getElementById('hero-title-lit-aura');

const INCENSE_STORAGE_COUNT_KEY = 'gosu_shdl_incense_count_v1';
const INCENSE_STORAGE_LIT_KEY = 'gosu_shdl_incense_lit_v1';
const INCENSE_API_GET = 'https://abacus.jasoncameron.dev/get/gosucinema.web.id/shdl_incense_1836';
const INCENSE_API_HIT = 'https://abacus.jasoncameron.dev/hit/gosucinema.web.id/shdl_incense_1836';

// Thông số vật lý của cây nhang trong hệ tọa độ SVG (viewBox 0 0 366 416)
const STICK_TOP_Y = 237.5;       // Đỉnh nhang khi mới thắp (dài 100%)
const MAX_BURN_DELTA_Y = 92.0;   // Quãng đường cháy ngắn xuống (tới y = 329.5, sát chân nhang đỏ 337.5)
const BURN_DURATION_MS = 22000;  // 22 giây để cháy hết 1 nén nhang và tàn dần
const BURN_TICK_MS = 60;         // Cập nhật mượt ~16.6fps kết hợp CSS transition nhẹ

let currentIncenseCount = Math.max(1, parseInt(localStorage.getItem(INCENSE_STORAGE_COUNT_KEY) || '1', 10) || 1);
let flareTimer = null;
let floatTimer = null;
let burnIntervalId = null;
let burnElapsedMs = 0;
let lastBurnTickTime = 0;
let isHeroOffscreen = false;

function renderIncenseCount(val, animatePop = false) {
  if (!incenseCountValueEl) return;
  incenseCountValueEl.textContent = Number(val).toLocaleString('vi-VN');
  if (animatePop) {
    incenseCountValueEl.classList.remove('is-popping');
    void incenseCountValueEl.offsetWidth;
    incenseCountValueEl.classList.add('is-popping');
  }
}

function setIncenseLitVisual(lit, isBurnedOut = false) {
  if (heroIncenseBtn) {
    heroIncenseBtn.classList.toggle('is-lit', lit);
    heroIncenseBtn.setAttribute('aria-pressed', String(lit));
    const hintEl = heroIncenseBtn.querySelector('.incense-hint');
    if (hintEl) {
      hintEl.textContent = lit
        ? 'THẮP LẠI NÉN MỚI (+1)'
        : (isBurnedOut ? 'HƯƠNG ĐÃ TÀN · BẤM THẮP (+1)' : 'BẤM THẮP HƯƠNG (+1)');
    }
  }
  if (heroMainTitle) {
    heroMainTitle.classList.toggle('incense-lit', lit);
  }
  if (heroIncenseCounterBar) {
    heroIncenseCounterBar.classList.toggle('is-lit', lit);
  }
  if (incenseCounterCtaEl) {
    incenseCounterCtaEl.textContent = lit
      ? '🔥 THẮP THÊM / LÀM SÁNG LẠI (+1)'
      : (isBurnedOut ? '✦ HƯƠNG ĐÃ TÀN · BẤM THẮP LẠI (+1)' : '✦ BẤM THẮP HƯƠNG (+1)');
  }
}

function applyIncenseBurnProgress(progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  const deltaY = clamped * MAX_BURN_DELTA_Y;

  // 1. Thu ngắn thân nhang từ đỉnh (237.5) xuống chân nhang (329.5)
  if (stickBodyEl) {
    stickBodyEl.setAttribute('y1', (STICK_TOP_Y + deltaY).toFixed(2));
  }
  // 2. Hạ thấp đầu tàn lửa, vòng tròn chấm và làn khói theo đúng đỉnh nhang đang cháy
  if (burningHeadEl) {
    burningHeadEl.setAttribute('transform', 'translate(0, ' + deltaY.toFixed(2) + ')');
  }

  // 3. Giảm dần độ sáng (tối dần / tàn dần) khi nhang cháy ngắn xuống
  if (clamped < 1) {
    const intensity = Math.max(0.06, Math.pow(1 - clamped, 1.35));
    const smokeIntensity = Math.max(0.04, Math.pow(1 - clamped, 1.55));
    if (haloLayerEl) haloLayerEl.style.opacity = intensity.toFixed(3);
    if (smokeLayerEl) smokeLayerEl.style.opacity = smokeIntensity.toFixed(3);
    if (litAuraEl) litAuraEl.style.opacity = (intensity * 0.96).toFixed(3);
    if (unlitInviteEl) unlitInviteEl.style.opacity = ((1 - intensity) * 0.55).toFixed(3);
  } else {
    // Nhang đã cháy cạn và tàn hẳn — tắt lửa & khói, chờ người dùng bấm thắp lại
    if (haloLayerEl) haloLayerEl.style.opacity = '0';
    if (smokeLayerEl) smokeLayerEl.style.opacity = '0';
    if (litAuraEl) litAuraEl.style.opacity = '0';
    if (unlitInviteEl) unlitInviteEl.style.opacity = '0.78';
    setIncenseLitVisual(false, true);
  }
}

function startIncenseBurnCycle() {
  if (burnIntervalId) {
    clearInterval(burnIntervalId);
    burnIntervalId = null;
  }
  burnElapsedMs = 0;
  lastBurnTickTime = performance.now();
  setIncenseLitVisual(true, false);
  applyIncenseBurnProgress(0);

  burnIntervalId = setInterval(() => {
    const now = performance.now();
    const dt = now - lastBurnTickTime;
    lastBurnTickTime = now;

    // Chỉ trừ thời gian cháy khi người dùng đang nhìn thấy Frame 1
    if (isHeroOffscreen || document.hidden) return;

    burnElapsedMs += Math.min(dt, 250);
    const progress = Math.min(1, burnElapsedMs / BURN_DURATION_MS);
    applyIncenseBurnProgress(progress);

    if (progress >= 1) {
      clearInterval(burnIntervalId);
      burnIntervalId = null;
    }
  }, BURN_TICK_MS);
}

// Khởi tạo số đếm và bắt đầu hiệu ứng hương cháy ngắn dần & tối dần ngay khi mở trang
renderIncenseCount(currentIncenseCount, false);
startIncenseBurnCycle();

// Đồng bộ số đếm thực tế trên cloud trong nền (không chặn giao diện)
fetch(INCENSE_API_GET, { mode: 'cors', cache: 'no-store' })
  .then(r => (r.ok ? r.json() : null))
  .then(data => {
    if (data && typeof data.value === 'number' && data.value > 0) {
      currentIncenseCount = Math.max(currentIncenseCount, data.value);
      localStorage.setItem(INCENSE_STORAGE_COUNT_KEY, String(currentIncenseCount));
      renderIncenseCount(currentIncenseCount, false);
    }
  })
  .catch(() => {});

function triggerLightIncense(e) {
  if (e) e.stopPropagation();

  // 1. Phục hồi cây nhang dài lại 100% và sáng rực trở lại, bắt đầu chu kỳ cháy mới
  startIncenseBurnCycle();
  localStorage.setItem(INCENSE_STORAGE_LIT_KEY, '1');

  // 2. Cộng +1 ngay tức thì trên giao diện (Optimistic UI)
  currentIncenseCount += 1;
  localStorage.setItem(INCENSE_STORAGE_COUNT_KEY, String(currentIncenseCount));
  renderIncenseCount(currentIncenseCount, true);

  // 3. Hiệu ứng bùng tàn lửa & nhãn "+1 NÉN HƯƠNG" bay lên nhẹ nhàng
  if (heroMainTitle) {
    heroMainTitle.classList.remove('incense-flare');
    if (flareTimer) clearTimeout(flareTimer);
    requestAnimationFrame(() => {
      heroMainTitle.classList.add('incense-flare');
      flareTimer = setTimeout(() => heroMainTitle.classList.remove('incense-flare'), 650);
    });
  }
  if (incensePlusFloatEl) {
    incensePlusFloatEl.classList.remove('is-active');
    if (floatTimer) clearTimeout(floatTimer);
    requestAnimationFrame(() => {
      incensePlusFloatEl.classList.add('is-active');
      floatTimer = setTimeout(() => incensePlusFloatEl.classList.remove('is-active'), 900);
    });
  }

  // 4. Gửi lệnh +1 lên Cloud Counter bất đồng bộ
  fetch(INCENSE_API_HIT, { mode: 'cors', cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (data && typeof data.value === 'number' && data.value > currentIncenseCount) {
        currentIncenseCount = data.value;
        localStorage.setItem(INCENSE_STORAGE_COUNT_KEY, String(currentIncenseCount));
        renderIncenseCount(currentIncenseCount, false);
      }
    })
    .catch(() => {});
}

if (heroIncenseBtn) {
  heroIncenseBtn.addEventListener('click', triggerLightIncense);
}
if (heroIncenseCounterBtn) {
  heroIncenseCounterBtn.addEventListener('click', triggerLightIncense);
}

// Tạm dừng animation ở Hero khi cuộn qua khỏi Frame 1 để web nhẹ tuyệt đối
const heroSectionEl = document.querySelector('.hero');
if (heroSectionEl && 'IntersectionObserver' in window) {
  const heroObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        isHeroOffscreen = !entry.isIntersecting;
        heroSectionEl.classList.toggle('is-offscreen', isHeroOffscreen);
      });
    },
    { threshold: 0.05 }
  );
  heroObs.observe(heroSectionEl);
}

/* ==========================================================================
   NHẠC NỀN TOÀN WEB — MẶC ĐỊNH BẬT (TỪ 01:44 ĐẾN HẾT & TỰ ĐỘNG REPLAY)
   ========================================================================== */
const bgSoundtrackEl = document.getElementById('bg-soundtrack');
const soundtrackToggleBtn = document.getElementById('soundtrack-toggle');
const soundtrackLabelEl = document.getElementById('soundtrack-label');
const SOUNDTRACK_BASE_VOLUME = 0.68;

let userMutedSoundtrack = false;
let hasUnmutedAudio = false;
let unlockListenersAttached = false;

function updateSoundtrackUI(isOn) {
  if (!soundtrackToggleBtn) return;
  soundtrackToggleBtn.classList.toggle('is-playing', isOn);
  soundtrackToggleBtn.setAttribute('aria-pressed', String(isOn));
  if (soundtrackLabelEl) {
    soundtrackLabelEl.textContent = isOn ? 'NHẠC NỀN: BẬT' : 'NHẠC NỀN: TẮT';
  }
}

const UNLOCK_EVENTS = [
  'click',
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'touchstart',
  'touchend',
  'keydown',
  'wheel',
  'scroll'
];

function tryUnlockAndPlaySoundtrack(e) {
  if (userMutedSoundtrack || !bgSoundtrackEl) {
    detachUnlockListeners();
    return;
  }
  // Nếu bấm vào nút nhạc khi đã phát có tiếng rồi thì để sự kiện click của nút xử lý tắt/bật
  if (hasUnmutedAudio && e && soundtrackToggleBtn && soundtrackToggleBtn.contains(e.target)) {
    return;
  }

  bgSoundtrackEl.loop = true;
  bgSoundtrackEl.muted = false;
  bgSoundtrackEl.volume = SOUNDTRACK_BASE_VOLUME;

  const p = bgSoundtrackEl.play();
  if (p && typeof p.then === 'function') {
    p.then(() => {
      hasUnmutedAudio = true;
      updateSoundtrackUI(true);
      detachUnlockListeners();
    }).catch(() => {
      // Nếu sự kiện hiện tại (VD: scroll) chưa được trình duyệt cấp quyền âm thanh,
      // giữ trạng thái MẶC ĐỊNH BẬT trên giao diện và chạy ngầm muted chờ cú chạm kế tiếp
      updateSoundtrackUI(true);
      bgSoundtrackEl.muted = true;
      bgSoundtrackEl.play().catch(() => {});
    });
  }
}

function attachUnlockListeners() {
  if (unlockListenersAttached) return;
  unlockListenersAttached = true;
  UNLOCK_EVENTS.forEach(evt => {
    window.addEventListener(evt, tryUnlockAndPlaySoundtrack, { passive: true, capture: true });
  });
}

function detachUnlockListeners() {
  if (!unlockListenersAttached) return;
  unlockListenersAttached = false;
  UNLOCK_EVENTS.forEach(evt => {
    window.removeEventListener(evt, tryUnlockAndPlaySoundtrack, { capture: true });
  });
}

if (bgSoundtrackEl) {
  // Mặc định luôn ở trạng thái BẬT ngay khi vào trang
  updateSoundtrackUI(true);
  attachUnlockListeners();

  // Đảm bảo luôn replay từ đầu đoạn 01:44 khi phát hết bài
  bgSoundtrackEl.addEventListener('ended', () => {
    if (!userMutedSoundtrack) {
      bgSoundtrackEl.currentTime = 0;
      bgSoundtrackEl.play().catch(() => {});
    }
  });

  // Kích hoạt phát ngay lập tức khi mở trang
  tryUnlockAndPlaySoundtrack();
  window.addEventListener('load', () => {
    if (!userMutedSoundtrack && !hasUnmutedAudio) {
      tryUnlockAndPlaySoundtrack();
    }
  });
}

if (soundtrackToggleBtn && bgSoundtrackEl) {
  soundtrackToggleBtn.addEventListener('click', e => {
    e.stopPropagation();

    // Nếu trình duyệt trước đó đang khóa tiếng (muted/paused), cú click vào nút sẽ mở tiếng ngay lập tức
    if (!userMutedSoundtrack && (bgSoundtrackEl.paused || bgSoundtrackEl.muted || !hasUnmutedAudio)) {
      bgSoundtrackEl.muted = false;
      bgSoundtrackEl.volume = SOUNDTRACK_BASE_VOLUME;
      bgSoundtrackEl.play()
        .then(() => {
          hasUnmutedAudio = true;
          updateSoundtrackUI(true);
          detachUnlockListeners();
        })
        .catch(() => {});
      return;
    }

    // Chuyển đổi BẬT / TẮT theo ý người dùng
    if (!userMutedSoundtrack) {
      userMutedSoundtrack = true;
      detachUnlockListeners();
      bgSoundtrackEl.pause();
      updateSoundtrackUI(false);
    } else {
      userMutedSoundtrack = false;
      bgSoundtrackEl.muted = false;
      bgSoundtrackEl.volume = SOUNDTRACK_BASE_VOLUME;
      bgSoundtrackEl.play()
        .then(() => {
          hasUnmutedAudio = true;
          updateSoundtrackUI(true);
        })
        .catch(() => {});
    }
  });
}

// Tự động giảm âm lượng nhạc nền khi người dùng bật tiếng video Hồi Đầu
const openingVideo = document.querySelector('.opening-video-box video');
if (openingVideo && bgSoundtrackEl) {
  openingVideo.addEventListener('volumechange', () => {
    if (!bgSoundtrackEl.paused && !userMutedSoundtrack) {
      bgSoundtrackEl.volume = (!openingVideo.muted && !openingVideo.paused) ? 0.15 : SOUNDTRACK_BASE_VOLUME;
    }
  });
}

window.GOSU_STATE = {
  chars,
  places,
  relicData,
  relNodesData,
  openTrailerModal,
  getCurrentCharIndex: () => currentCharIndex,
  getCharViewMode: () => charViewMode,
  setCharViewMode,
  selectChar,
  updateCharStage,
  warmCharacterGpuPool,
  refreshTabs: () => {
    [...tabs.children].forEach((b, idx) => {
      if (chars[idx]) b.textContent = chars[idx][0];
    });
  }
};
