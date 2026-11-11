# Sơn Hà Dị Lục · Storyboard (WebGL / three.js)

Bản redesign của gosucinema.web.id theo hướng storyboard điện ảnh: mỗi lần cuộn, camera bay tới một cảnh (SC 01 → SC 10) thay vì dàn trải một trang dài.

## Chạy thử

```bash
python3 -m http.server 5173
```

Mở http://localhost:5173 (ES modules cần chạy qua HTTP, không mở bằng file://).

## Cấu trúc

| File | Vai trò |
|---|---|
| `index.html` | Khung HUD, nội dung chữ của 10 cảnh (nằm sẵn trong DOM cho SEO và trình đọc màn hình) |
| `css/style.css` | Letterbox, viewfinder, thẻ storyboard, dải cảnh, giao diện mobile, chế độ giảm chuyển động |
| `js/data.js` | **Nguồn dữ liệu duy nhất**: nhân vật, thế lực, địa danh, pháp khí, timeline, 12 still frame |
| `js/world.js` | Scene three.js: 10 cảnh đặt dọc một spline, camera rig, panel shader, tàn nhang, khói, hậu kỳ |
| `js/fx.js` | Hiệu ứng linh dị: nén nhang 3D (chưa thắp cho tới khi hơ lửa vào đầu nhang + bấm; cháy ngắn dần, khói, tia lửa, sóng xung kích), pháp trận Bát quái, bùa chú bay (chạm lửa thì cháy lan, rơi tro, rồi tụ lại), ma trơi, sương đất, ngọn lửa theo con trỏ, chuyển cảnh "âm môn" (chữ Hán bay xuyên qua, vệt hồn lướt); "hồn tụ hồn tán" — chữ Hán vùng đất kết từ hạt rồi tan khi máy quay bay xuyên qua; bokeh độ sâu trường ảnh cho mọi hệ hạt |
| `js/lands.js` | Địa hình âm giới dọc hành trình và 9 vùng đất giữa các cảnh (núi sương, rừng trúc, bãi tha ma, thành quách, sông hồn, lối tam quan, rừng cây chết, hồ sen, bậc đá lên trời); đường bay của máy quay giữa hai cảnh |
| `js/shaders.js` | GLSL: hiện ảnh kiểu giấy bén lửa, hạt tàn hương, khói fbm, film pass (grain, vignette, quang sai) |
| `js/main.js` | Cuộn → tiến trình camera, trạng thái chọn, lightbox, âm thanh, loader, fallback khi không có WebGL |

## Tham số URL khi phát triển

- `?nocount` — thử hiệu ứng thắp hương mà không cộng vào bộ đếm thật.
- `?debug` — gắn `window.__world` (scene, camera, các cảnh) để soi trong console.

## Trang cũ

Phiên bản trang dài trước đây (kèm Visual Editor và `site-overrides.json`) được giữ nguyên ở `classic.html`, có link từ nút "BẢN CỔ ĐIỂN" trên thanh HUD.

## Đêm Hổ Quyền · 1836 (`dem-ho-quyen/`)

Trải nghiệm tương tác 6 hồi cho hướng redesign ít chữ, kể bằng hành động và âm thanh. Bối cảnh là một ngày đêm ở đấu trường Hổ Quyền năm Minh Mạng thứ 17, dựng theo số đo thật (lòng chảo 44 m, thành trong 5,9 m, thành ngoài 4,75 m, 5 chuồng cọp phía Nam, khán đài vua phía Bắc). Chuyển hồi bằng một nét châu phê son đỏ quệt qua khung hình.

| Hồi | Cảnh | Thao tác |
| --- | --- | --- |
| 0 · Trống chầu | Màn đen, mặt trống | Nhấn 3 lần (cũng là lúc trình duyệt cho phát âm thanh) |
| 1 · Giờ Ngọ | Trận voi hổ, nhìn từ khán đài vua | Lăn chuột / kéo lên / mũi tên lên để thời gian đi tiếp; mỗi nấc là một nốt kèn |
| 2 · Những chiếc rương | Chạng vạng, đường sang Điện Voi Ré | Bấm vào từng rương: da hổ còn máu, lệnh bài dấu lệch, đĩnh vàng ký hiệu lạ |
| 3 · Mắt Âm | Giờ Tý, lòng chảo | Nhấn giữ mở Mắt Âm; bóng hổ bị nhìn thì chậm lại, khuất mắt thì lao tới; nhìn thẳng khi nó tới gần để giải oán (5 con) |
| 4 · Đại Ma Hổ | Canh Tư | Giữ và kéo nối 5 dấu bùa, rồi bấm khi vòng đỏ khớp vòng trong |
| 5 · Bình minh | Sương sớm | Rê chuột để lúa hồi lại; hơ ngọn lửa vào đầu nhang để thắp; màn kết đếm số nén nhang |

- Âm thanh tổng hợp toàn bộ bằng Web Audio, tiếng hổ đặt trong không gian 3D (HRTF), nên đeo tai nghe. Nhạc nền màn kết: `assets/audio/soundtrack-1836.m4a`.
- Không dùng micro, webcam. Điện thoại dùng con quay hồi chuyển để nhìn quanh.
- Bàn phím: phím cách / Enter thay cho nhấn, mũi tên thay cho lăn.

Khi phát triển: `?act=1..5` vào thẳng một hồi, `?debug` gắn `window.__dhq`, `?debug&ts=4` tua nhanh thời gian. Trên localhost bộ đếm nhang không cộng.

Bản thử "Mắt Âm" cũ (`mat-am/`) nay chuyển thẳng sang hồi 3 của `dem-ho-quyen/`.
