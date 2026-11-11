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

## Bản thử "Mắt Âm" (`mat-am/`)

Bản thử cho hướng redesign tương tác, ít chữ: một đêm ở đấu trường Hổ Quyền năm 1836, dựng theo số đo thật (lòng chảo 44 m, thành trong 5,9 m, thành ngoài 4,75 m, 5 chuồng cọp phía Nam, khán đài vua phía Bắc).

- Đánh 3 hồi trống để vào (cũng là lúc trình duyệt cho phép phát âm thanh).
- Nhấn giữ chuột / chạm giữ / giữ phím cách để mở **Mắt Âm** quanh con trỏ; giữ hơn 4 giây thì mở cả khung hình.
- Năm bóng hổ khói lần lượt ra khỏi chuồng. Bị Mắt Âm nhìn trúng thì gần như đứng im; khuất mắt thì lao tới. Nhìn thẳng khi nó tới gần để giải oán; giải đủ 5 con thì trời sáng.
- Âm thanh tổng hợp toàn bộ bằng Web Audio, tiếng hổ đặt trong không gian 3D (HRTF), nên đeo tai nghe.
- Không dùng micro, webcam. Điện thoại dùng con quay hồi chuyển để nhìn quanh.

Mở http://localhost:5173/mat-am/. Khi phát triển: `?debug` gắn `window.__matam`, `?debug&ts=8` tua nhanh thời gian.
