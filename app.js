const chars = [
  [
    'Mót',
    'HUYỀN QUANG · 18 TUỔI · MỆNH ÂM',
    '159',
    'Một thiếu niên mang Mệnh Âm bẩm sinh, có thể nhìn thấu và chạm vào linh thể người khuất. Từ đứa trẻ lăn ra trong chiếc bình gốm vỡ đêm mưa năm 1818 tại Điện Voi Ré, Mót bước vào nhánh mật Khâm Thiên Sứ với cổ phù phong ấn ẩn sâu trên cánh tay.',
    '“Mình đã may mắn được cứu khỏi đêm mưa, thì không thể để người khác phải tuyệt vọng chờ một may mắn tình cờ.”',
    '命陰'
  ],
  [
    'Đại Sơn',
    'KHÂM THIÊN SỨ · 21 TUỔI · HỎA PHÙ KIẾM',
    '161',
    'Sư huynh bộc trực, trọng nghĩa khí, người luôn đứng mũi chịu sào che chở cho Mót. Dùng hai ngón tay kẹp linh phù chu sa vuốt dọc sống kiếm, Đại Sơn kích hoạt ngọn lửa dương khí chém tan âm tà giữa lòng chảo Hổ Quyền.',
    '“Kiếm lửa trấn tà. Nghĩa khí giữ người.”',
    '火符'
  ],
  [
    'Linh',
    'HUYỀN UYÊN · 25 TUỔI · LƯ HƯƠNG KHÓI ĐỎ',
    '186',
    'Thiếu nữ khoác áo ngũ thân gấm đen như người cầm hương tang lễ, trên vai vắt đòn gánh đầu rồng treo lư hương tỏa khói máu. Sống sót sau đêm thảm sát năm 1818, nàng đội tang cha suốt đời và nắm giữ nửa kia chiếc vòng tín vật của Mót.',
    '“Tám phần nhân tính hóa tro tàn, hai phần máu lạnh giữ mạng nơi hang cọp.”',
    '血香'
  ],
  [
    'Kim Lan',
    'LONG THỌ · 20 TUỔI · CUNG TIỄN KHUÊ CÁC',
    '188',
    'Tiểu thư thanh tú xứ Huế vừa tinh thông thơ phú vừa sở hữu tài bắn cung bách phát bách trúng. Nhưng biến cố cha nàng nhúng chàm vào khế ước trăm bộ da hổ đã biến Kim Lan thành bài học trưởng thành đau đớn nhất của Mót về cái giá của công lý.',
    '“Giữa điều đúng và điều thương, có bao nhiêu khoảng cách?”',
    '悲弓'
  ]
];

const tabs = document.querySelector('.tabs');
const portraitImg = document.querySelector('#portrait');
const portraitSeal = document.querySelector('#portrait-seal');
const charInfo = document.querySelector('#character-info');

chars.forEach((c, i) => {
  const b = document.createElement('button');
  b.textContent = c[0];
  b.setAttribute('role', 'tab');
  b.onclick = () => selectChar(i);
  tabs.append(b);
});

function selectChar(i) {
  const c = chars[i];
  [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', j === i));
  portraitImg.src = 'assets/' + c[2] + '.jpg';
  portraitImg.alt = c[0];
  if (portraitSeal) portraitSeal.textContent = c[5];
  charInfo.innerHTML = `<span class="small">${c[1]}</span><h3>${c[0]}</h3><p>${c[3]}</p><blockquote>${c[4]}</blockquote>`;
}

selectChar(0);

tabs.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  let i = [...tabs.children].indexOf(document.activeElement);
  const step = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : 3;
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
    title: 'Pháp Khí Đệ Nhất · Túi Pháp Khí Trấn Tà',
    caption: 'Túi vải thô nhuộm chu sa buộc trên đầu trượng gỗ mun chạm rồng — cất giữ kim bạc thử độc và linh phù Hoàng Kim của Khâm Thiên Sứ.'
  },
  {
    src: 'assets/phap-khi/2.webp',
    title: 'Pháp Khí Đệ Nhị · Lư Hương Huyết Khói',
    caption: 'Đỉnh đồng cổ treo trên đòn gánh đầu rồng của Huyền Uyên (Linh), tỏa làn khói máu dẫn dụ và thao túng Vong — Ma — Quỷ.'
  },
  {
    src: 'assets/phap-khi/3.webp',
    title: 'Pháp Khí Đệ Tam · La Bàn Tầm Khí',
    caption: 'Phong Thủy Cổ Bàn bằng đồng khắc Bát Quái của Mót — xoay tít và phát sáng khi chạm vào mạch đất Khí suy hoặc tử thi nhiễm oán linh.'
  },
  {
    src: 'assets/phap-khi/4.webp',
    title: 'Pháp Khí Đệ Tứ · Ngọc Lệnh Khâm Thiên Giám',
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
  dialogTag.textContent = 'TỨ ĐẠI PHÁP KHÍ · HỒ SƠ CỔ VẬT LINH DỊ';
  slideCount.textContent = `PHÁP KHÍ 0${currentFrame + 1} / 04`;
  thumbStrip.style.display = 'none';
  playBtn.style.display = 'none';
  if (!dialog.open) dialog.showModal();
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
  else showFrame(currentFrame - 1);
};

document.querySelector('.next').onclick = () => {
  if (mode === 'relic') showRelicModal(currentFrame + 1);
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
    else showFrame(currentFrame + 1);
  }
  if (e.key === 'ArrowLeft') {
    if (mode === 'relic') showRelicModal(currentFrame - 1);
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
