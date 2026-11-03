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
  }
};

const relNodeBtns = document.querySelectorAll('[data-node]');
const relTagEl = document.querySelector('#rel-detail-tag');
const relNameEl = document.querySelector('#rel-detail-name');
const relDescEl = document.querySelector('#rel-detail-desc');
const relLinksEl = document.querySelector('#rel-detail-links');

relNodeBtns.forEach(btn => {
  btn.onclick = () => {
    relNodeBtns.forEach(b => b.classList.toggle('active', b === btn));
    const data = relNodesData[btn.dataset.node];
    if (!data) return;
    relTagEl.textContent = data.tag;
    relNameEl.textContent = data.name;
    relDescEl.textContent = data.desc;
    relLinksEl.innerHTML = data.links.map(item => `<span>${item}</span>`).join('');
  };
});
