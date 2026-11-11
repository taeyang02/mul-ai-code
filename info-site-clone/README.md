# info-site-clone

Bản local của https://info.dongthaiduong.com/, lấy từ HTML/CSS/JavaScript và dữ liệu hồ sơ công khai ngày 11/11/2026. Dự án độc lập, không sửa repo `mul-ai-code` hoặc extension.

## Chạy trên máy

Cài Node.js 22 LTS hoặc mới hơn, giải nén dự án rồi chạy:

```sh
cd info-site-clone
npm start
```

Mở http://127.0.0.1:5173. Nhấn “Click For Peak” để mở hồ sơ và phát nhạc. Dùng Ctrl+C để dừng. Không cần cài thư viện để chạy website; server chỉ dùng Node.js chuẩn. Đổi cổng bằng biến môi trường `PORT` nếu cần.

## Build và kiểm tra

```sh
npm run build
```

Kết quả trong `dist/`. Build sao chép các tài nguyên tĩnh; endpoint bộ đếm local do `server.mjs` cung cấp khi chạy `npm start`.

Kiểm tra bằng Chromium (cần Internet để truy cập trang gốc):

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Ảnh tham chiếu và ảnh local cùng kích thước 1440×900, 390×900 nằm trong `screenshots/`, cùng báo cáo `report.json`. Kiểm tra gồm màn hình bắt đầu, kích thước khối hồ sơ, liên kết, âm lượng, tắt tiếng, độ trong suốt và avatar.

## Giao diện và hành vi

- Nền video toàn màn hình, card hồ sơ tối mờ ở giữa, chữ trắng; font nền Courier New/monospace. Tên dùng Angel Wish với fallback sans-serif vì cấu hình gốc không cung cấp file font.
- Giữ hiệu ứng gõ chữ, hiện hồ sơ, nghiêng theo chuột, con trỏ riêng, viền avatar và tooltip badge; giữ CSS responsive gốc.
- Website quan sát được chỉ có một trang, không có menu và không cuộn. Discord/TikTok mở liên kết ngoài; Spotify chỉ là biểu tượng vì cấu hình gốc để URL rỗng.
- Ảnh đại diện, badge, biểu tượng, con trỏ, GSAP, video và năm bài nhạc đều được lưu trong dự án. Chạy website không phụ thuộc API gốc.

## Khác biệt còn lại

- Dữ liệu hồ sơ là snapshot công khai; thay đổi sau này ở website gốc không tự cập nhật.
- Bộ đếm chỉ tính lượt truy cập trên tiến trình local, reset khi khởi động lại; không ghi dữ liệu lên website gốc.
- Tại thời điểm chụp tham chiếu, bộ đếm website gốc hiển thị `Error`; bản local hiển thị số lượt truy cập riêng.
- Nhạc được xáo trộn và video/GIF/chữ có chuyển động nên ảnh chụp có thể khác khung hình hoặc thời điểm.
- Font fallback và hành vi autoplay phụ thuộc trình duyệt/hệ điều hành của người xem, giống giới hạn của trang gốc.
- Các thẻ âm thanh phụ cho theme không có điều khiển hiển thị được bỏ để tránh tải tài nguyên không được dùng.

Chỉ chạy local, chưa deploy hoặc merge. Nội dung và tài nguyên tham chiếu thuộc chủ website gốc.
