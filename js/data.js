// Nội dung & cấu hình storyboard (nguồn dữ liệu duy nhất).
export const BASE = 'assets/';
export const asset = (p) => BASE + p;

export const STILL = (n) => asset(`still-frame/${String(n).padStart(2, '0')}.webp`);

/**
 * Mỗi shot = một khung storyboard. Camera bay giữa các shot theo spline.
 * frame: chủ thể nằm bên nào của khung hình (overlay chữ nằm phía đối diện).
 */
export const SHOTS = [
  { id: 'opening',    code: 'SC 01', label: 'Mở màn',        move: 'PUSH IN · 24mm',     frame: 'center' },
  { id: 'story',      code: 'SC 02', label: 'Khởi nguồn',    move: 'TRUCK LEFT · 35mm',  frame: 'left' },
  { id: 'render',     code: 'SC 03', label: 'Bản dựng',      move: 'DUTCH DOLLY · 40mm', frame: 'left' },
  { id: 'characters', code: 'SC 04', label: 'Nhân vật',      move: 'ARC ORBIT · 50mm',   frame: 'left' },
  { id: 'factions',   code: 'SC 05', label: 'Sáu thế lực',   move: 'CRANE DOWN · 28mm',  frame: 'left' },
  { id: 'world',      code: 'SC 06', label: 'Địa đồ',        move: 'PAN · 35mm',         frame: 'left' },
  { id: 'relics',     code: 'SC 07', label: 'Pháp khí',      move: 'TURNTABLE · 85mm',   frame: 'left' },
  { id: 'timeline',   code: 'SC 08', label: 'Thời gian',     move: 'TRACKING · 35mm',    frame: 'top' },
  { id: 'gallery',    code: 'SC 09', label: 'Khung hình',    move: 'ROTUNDA · 32mm',     frame: 'top' },
  { id: 'credits',    code: 'SC 10', label: 'Hồi kết',       move: 'CRANE UP · 24mm',    frame: 'center' }
];

export const CHARACTERS = [
  {
    name: 'Mót', seal: '命陰', sub: 'HUYỀN QUANG · 18 TUỔI · MỆNH ÂM',
    avatar: asset('159.jpg'), turnaround: asset('characters/mot-3view.webp'), sheet: asset('characters/mot-sheet.webp'),
    bio: 'Thiếu niên mang Mệnh Âm bẩm sinh, nhìn thấu và chạm được vào linh thể người khuất. Từ đứa trẻ lăn ra trong chiếc bình gốm vỡ đêm mưa năm 1818 tại Điện Voi Ré, Mót bước vào nhánh mật Khâm Thiên Sứ với cổ phù phong ấn ẩn sâu trên cánh tay.',
    quote: '“Mình đã may mắn được cứu khỏi đêm mưa, thì không thể để người khác phải tuyệt vọng chờ một may mắn tình cờ.”'
  },
  {
    name: 'Đại Sơn', seal: '火符', sub: 'KHÂM THIÊN SỨ · 21 TUỔI · HỎA PHÙ KIẾM',
    avatar: asset('161.jpg'), turnaround: asset('characters/daison-3view.webp'), sheet: asset('characters/daison-sheet.webp'),
    bio: 'Sư huynh bộc trực, trọng nghĩa khí, luôn đứng mũi chịu sào che chở cho Mót. Kẹp linh phù chu sa vuốt dọc sống kiếm, Đại Sơn kích hoạt ngọn lửa dương khí chém tan âm tà giữa lòng chảo Hổ Quyền.',
    quote: '“Kiếm lửa trấn tà. Nghĩa khí giữ người.”'
  },
  {
    name: 'Linh', seal: '血香', sub: 'HUYỀN UYÊN · 25 TUỔI · LƯ HƯƠNG KHÓI ĐỎ',
    avatar: asset('186.jpg'), turnaround: asset('characters/linh-3view.webp'), sheet: asset('characters/linh-sheet.webp'),
    bio: 'Thiếu nữ khoác áo ngũ thân gấm đen như người cầm hương tang lễ, vai vắt đòn gánh đầu rồng treo lư hương tỏa khói máu. Sống sót sau đêm thảm sát 1818, nàng đội tang cha suốt đời và giữ nửa kia chiếc vòng tín vật của Mót.',
    quote: '“Tám phần nhân tính hóa tro tàn, hai phần máu lạnh giữ mạng nơi hang cọp.”'
  },
  {
    name: 'Kim Lan', seal: '悲弓', sub: 'LONG THỌ · 20 TUỔI · CUNG TIỄN KHUÊ CÁC',
    avatar: asset('188.jpg'), turnaround: asset('characters/kimlan-3view.webp'), sheet: asset('characters/kimlan-sheet.webp'),
    bio: 'Tiểu thư xứ Huế tinh thông thơ phú, bắn cung bách phát bách trúng. Biến cố cha nàng nhúng chàm vào khế ước trăm bộ da hổ biến Kim Lan thành bài học trưởng thành đau đớn nhất của Mót về cái giá của công lý.',
    quote: '“Giữa điều đúng và điều thương, có bao nhiêu khoảng cách?”'
  },
  {
    name: 'Ông An', seal: '老證', sub: 'LÀNG LONG THỌ · 65 TUỔI · CHA NUÔI CỦA MÓT',
    avatar: asset('characters/ongan-avatar.webp'), turnaround: asset('characters/ongan-3view.webp'), sheet: asset('characters/ongan-sheet.webp'),
    bio: 'Vị quan thanh liêm về quê dạy chữ, người nhặt Mót từ chiếc bình gốm vỡ đêm mưa 1818. Ông là người đầu tiên nhận ra mạch nước sông Hương hóa độc và thấy những bóng đen vận chuyển rương gỗ niêm phong vào Điện Voi Ré.',
    quote: '“Đất có mạch, người có tâm. Tâm người một khi đã mục ruỗng thì lúa ngoài đồng cũng rỉ máu.”'
  },
  {
    name: 'Lão Phú', seal: '貪契', sub: 'QUAN LÀNG LONG THỌ · 45 TUỔI · KHẾ ƯỚC MÁU',
    avatar: asset('characters/laophu-avatar.webp'), turnaround: asset('characters/laophu-3view.webp'), sheet: asset('characters/laophu-sheet.webp'),
    bio: 'Viên quan cai quản Long Thọ, cha ruột Kim Lan. Vì chức vị và gia sản, Lão Phú ký khế ước ngầm với Vạn Kim Thương Hội, lén giết 100 con hổ tại Hổ Quyền khiến Đại Ma Hổ thức tỉnh.',
    quote: '“Ta làm tất cả cũng chỉ để con bé không bao giờ phải nếm mùi bần hàn!”'
  }
];

export const FACTIONS = [
  { name: 'Khâm Thiên Giám', place: 'HOÀNG THÀNH PHÚ XUÂN', side: 'Chính phái triều đình', desc: 'Cơ quan chính thống của triều đình, điều tra dị sự và trấn yểm tà vật theo 4 phép: Giải · Diệt · Trấn · An. Nhân sự: Mót, Đại Sơn.' },
  { name: 'Thương Hội Vạn Kim', place: 'CẢNG BAO VINH', side: 'Trùm phản diện', desc: 'Hội kín phú thương dùng tiền bạc mua chuộc quan lại và lập ma trận thâu tóm đại cổ quỷ Xương Cuồng. Nhân sự: Hội Trưởng, Khánh Vũ.' },
  { name: 'Viện Bách Uyên · Huyền Uyên', place: 'LÀNG LONG THỌ', side: 'Bí thuật nửa chính nửa tà', desc: 'Nhánh học giả cổ thuật dùng lư hương đỏ dẫn dụ và điều khiển Vong – Ma – Quỷ; bị Vạn Kim khống chế từ vụ nổ 1818.' },
  { name: 'Bách Tạo Đường', place: 'NAM SÔNG HƯƠNG', side: 'Hậu phương rèn đúc', desc: 'Phường hội nghệ nhân chế tạo binh khí, cơ quan và pháp khí vật lý cho người không có Mệnh Âm.' },
  { name: 'Vô Danh & Ty Trảm Thiên', place: 'KIM LONG · THIÊN MỤ', side: 'Tình báo & hiệp khách', desc: 'Vô Danh là mạng lưới trẻ mồ côi đưa tin mật; Ty Trảm Thiên là nhóm hiệp khách ngầm tự xử quan tham.' },
  { name: 'Quy Nguyên Giáo', place: 'NÚI NGỰ BÌNH · BIÊN VIỄN', side: 'Tà phái ngoại đạo', desc: 'Tà giáo cực đoan ẩn nơi rừng núi biên viễn, lợi dụng dịch Khí suy để mê hoặc dân chúng và gieo rắc tai ương.' }
];

export const PLACES = [
  { name: 'Đấu trường Hổ Quyền', img: STILL(1), desc: 'Đấu trường lộ thiên hình vành khăn bằng gạch vồ xây năm Canh Dần (1830). Sau tiếng trống lễ tế là năm chuồng hổ tối tăm — nơi mãnh hổ bị bẻ nanh, nhổ móng, đâm chết trong đêm, kết tụ thành Đại Ma Hổ bằng khói đen và mắt máu.' },
  { name: 'Điện Voi Ré — Long Châu Miếu', img: asset('120.jpg'), desc: 'Cổ miếu thờ bốn vị Tượng thần trung nghĩa dưới bóng cổ thụ. Nơi Mót được tìm thấy trong chiếc bình vỡ đêm mưa 1818, và cũng là nơi giấu mật thất chứa 100 bộ da hổ của Thương hội Vạn Kim.' },
  { name: 'Làng Long Thọ — Nguyệt Biều', img: STILL(6), desc: 'Vùng lò gạch ngói lưu ly cung đình và cánh đồng ven sông Hương. Khi nhân tâm loạn bởi tham quan và khế ước máu, mạch Địa nghẽn tắc: lúa vàng hóa đen, dân lành ho ra máu trước cổng đình.' }
];

export const RELICS = [
  { name: 'Túi Vải Pháp Khí', glyph: '玄淵', owner: 'Linh (Huyền Uyên)', img: asset('phap-khi/1.webp'), desc: 'Túi vải thô nhuộm huyết chu sa treo trên đầu đòn gánh gỗ mun chạm rồng — cất thảo dược dẫn hồn, cổ trùng, huyết phù và tro cốt oán linh để nạp vào lư hương.' },
  { name: 'Lư Hương Huyết Khói', glyph: '血香', owner: 'Linh (Huyền Uyên)', img: asset('phap-khi/2.webp'), desc: 'Đỉnh đồng treo đầu còn lại của đòn gánh. Đốt trầm trộn huyết dược, làn khói trắng pha đỏ đánh thức chấp niệm người chết và thao túng Vong — Ma — Quỷ.' },
  { name: 'La Bàn Tầm Khí', glyph: '尋氣', owner: 'Mót (Huyền Quang)', img: asset('phap-khi/3.webp'), desc: 'Đĩa đồng khắc 8 quẻ Tiên Thiên và 24 sơn hướng. Kim đồng xoay tít và rực sáng khi chạm long mạch bị bức tử hoặc tử thi còn vương oán khí.' },
  { name: 'Ngọc Lệnh Khâm Thiên', glyph: '欽天', owner: 'Khâm Thiên Giám', img: asset('phap-khi/4.webp'), desc: 'Lệnh bài bạch ngọc chạm song long, thếp vàng 欽天監. Trao quyền khám nghiệm dị sự khắp Đại Nam, nhưng tuyệt đối không được xét xử thay pháp luật.' }
];

export const TIMELINE = [
  { year: '1818', era: 'GIA LONG THỨ 17', title: 'Đêm mưa bão · Đứa trẻ trong chiếc bình vỡ', img: asset('120.jpg'),
    desc: 'Cha Mót kích nổ ma trận điều khiển Quỷ Xương Cuồng của Vạn Kim. Cha mẹ Mót phong ấn năng lượng vào tay con, giấu Mót trong bình gốm tại Điện Voi Ré; Ông An nhặt Mót về nuôi. Cùng đêm, cha Linh chết oan.' },
  { year: '1830–35', era: 'MINH MẠNG', title: 'Hổ Quyền & khế ước 100 bộ da hổ', img: STILL(2),
    desc: 'Triều đình xây Đấu trường Hổ Quyền và khởi đúc Cửu Đỉnh. Lão Phú ký khế ước mật nộp 100 bộ da hổ cho Vạn Kim; mãnh hổ chết oan trong chuồng số 3 kết tụ thành Đại Ma Hổ.' },
  { year: '1836', era: 'CHƯƠNG I · MỞ ĐẦU PHIM', title: 'Đại án Long Thọ & Hổ Quyền', img: STILL(4),
    desc: 'Mót và Đại Sơn khám nghiệm xác Quản Chuồng Hổ ngậm 5 chìa khóa sắt, tìm ra mật thất da hổ và tố giác Lão Phú. Đêm quyết chiến, Mót kích hoạt Cổ Phù Kim Quang chém tan Đại Ma Hổ.' },
  { year: 'Thu 1836', era: 'THIÊN II', title: 'Kinh thành Phú Xuân & 12 vùng đất Cửu Đỉnh', img: STILL(9),
    desc: 'Mót nhận ngọc lệnh 欽天監. Anh hai Hương bị sát hại đêm trước buổi thiết triều. Đại Sơn cáo quan về quê giữ chữ Hiếu; Mót cùng Khánh Vũ đi qua 12 vùng đất truy tìm cách giải Hắc Ấn.' },
  { year: '1837', era: 'THIÊN III', title: 'Đỉnh tháp Vạn Kim · Quỷ Xương Cuồng', img: STILL(12),
    desc: 'Hai nửa vòng ngọc của Mót và Linh khớp lại, hóa giải hận thù 18 năm. Khánh Vũ điểm vỡ Cổ Phù để cứu mẹ, hóa thành Quỷ Xương Cuồng và cầu xin Mót tự tay kết liễu mình.' },
  { year: 'Năm sau', era: 'VĨ THANH', title: 'Bông lúa vàng trĩu hạt', img: STILL(11),
    desc: 'Mạch Khí toàn cõi thông suốt. Kim Lan mở lớp dạy chữ bên hiên nhà Ông An. Mót cầm chiếc vòng ngọc đã ghép tròn, bước xuống bến đò về ăn bữa cơm chiều đã hứa với cha nuôi.' }
];

export const GALLERY = [
  ['Đấu Trường Hổ Quyền', 'Toàn cảnh quan giám sát trước giờ khai cuộc lễ tế tại Hổ Quyền năm Minh Mạng thứ 17.'],
  ['Uy Linh Tượng Chiến', 'Voi chiến triều đình đối đầu mãnh hổ giữa lòng chảo gạch vồ Hổ Quyền.'],
  ['Đoạt Mệnh Sơn Quân', 'Cú quật vòi và cặp ngà voi chiến húc tung mãnh hổ — khởi nguồn của nỗi oán hận.'],
  ['Dấu Chân Khâm Thiên Sứ', 'Hai huynh đệ Mót và Đại Sơn cưỡi ngựa tiến vào làng Long Thọ giữa buổi chiều tà.'],
  ['Điềm Báo Khí Suy', 'Bông lúa vàng khô quắt trên tay lão nông, rỉ ra làn khói đen tà khí báo hiệu mạch đất suy tàn.'],
  ['Tiếng Khóc Trước Cổng Đình', 'Nỗi tuyệt vọng của người dân Long Thọ bên thi hài nạn nhân phủ chiếu cói.'],
  ['Vết Cào Tà Vật', 'Tử khí đen kịt ăn sâu vào vết cào mãnh hổ trên lưng nạn nhân trong rừng.'],
  ['Kim Bạc Hóa Đen, La Bàn Định Oán', 'Mót dùng kim bạc thử độc và La Bàn Tầm Khí phát hiện oán linh phát tác từ tử thi.'],
  ['Huyết Phù Trấn Ngục', 'Đại Sơn dán linh phù chu sa phong ấn cửa chuồng hổ số 3 giữa đêm Hổ Quyền.'],
  ['Oán Hồn Thức Giấc', 'Đặc tả ánh mắt kinh hoàng phản chiếu ngọn lửa tà linh khi Đại Ma Hổ trỗi dậy.'],
  ['Tàn Tro Sau Huyết Chiến', 'Hai huynh đệ dìu nhau bước qua cổng vòm Hổ Quyền trong làn khói sương buổi sớm.'],
  ['Huyết Hương Trên Thành Cao', 'Trên bờ thành Hổ Quyền cao vợi, thiếu nữ áo đen Huyền Uyên gánh lư hương khói đỏ lặng lẽ quan sát.']
].map(([title, caption], i) => ({ title, caption, img: STILL(i + 1) }));

export const MEDIA = {
  heroArt: asset('uploads/1793706265279-9.jpg'),
  titleArt: asset('son-ha-di-luc-title.webp?v=15'),
  story: STILL(5),
  render: asset('scene1-render.mp4'),
  renderPoster: STILL(4),
  factionMap: asset('bando-6-the-luc.jpg'),
  soundtrack: asset('audio/soundtrack-1836.m4a')
};
