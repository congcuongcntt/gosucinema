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
| `js/shaders.js` | GLSL: hiện ảnh kiểu giấy bén lửa, hạt tàn hương, khói fbm, film pass (grain, vignette, quang sai) |
| `js/main.js` | Cuộn → tiến trình camera, trạng thái chọn, lightbox, âm thanh, loader, fallback khi không có WebGL |

## Trang cũ

Phiên bản trang dài trước đây (kèm Visual Editor và `site-overrides.json`) được giữ nguyên ở `classic.html`, có link từ nút "BẢN CỔ ĐIỂN" trên thanh HUD.
