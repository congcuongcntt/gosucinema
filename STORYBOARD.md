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

## Trang giới thiệu dự án (`index.html`, `v2/`)

Trang chủ hiện tại là trang giới thiệu dự án, dựng từ tư liệu thật: trailer, bối cảnh, bảng nhân vật, tạo hình ingame, bản đồ, pháp khí, still frame. Bản storyboard bay camera trước đây chuyển sang `storyboard.html`.

- Một canvas WebGL cố định (`#stage`) vẽ mọi hình nền lớn. Mỗi khối có `data-plate` (và `data-alt` nếu có lớp thứ hai); cuộn tới đâu hình chuyển tới đó bằng vệt mực loang.
- "Mắt Âm": ở các cảnh có hai lớp (Hổ Quyền ngày/đêm trấn yểm, Điện Voi Ré ngày/đêm, bản đồ/mạng lưới sáu thế lực), con trỏ mở một vòng nhìn sang lớp kia. Trên cảm ứng vòng tự trôi và theo ngón tay.
- Mục Prototype có mô hình 3D Ngọc lệnh Khâm Thiên Giám (`assets/v2/ngoc-lenh.glb`, xuất từ file Blender low poly), kéo để xoay.
- Hình trong `assets/v2/` xuất từ thư mục tư liệu "SƠN HÀ DỊ LỤC" (webp, cạnh dài tối đa 1920). Video nén lại 720p.
- Nội dung chữ (nhân vật, thế lực, pháp khí, khung hình) dùng chung `js/data.js` với bản storyboard.
- Không có WebGL thì hình nền rơi về ảnh CSS (`#stage-fallback`).
