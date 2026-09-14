# Locket Chi Tiêu

> Ứng dụng web **quản lý chi tiêu cá nhân** lấy cảm hứng giao diện từ app **Locket**:
> mỗi khoản chi là một "bức ảnh" bạn vừa chụp. Node.js + Express + EJS + SQLite,
> chạy trực tiếp bằng `node index.js`, không cần bước build.

---

## 1. Chạy trên máy local

```bash
npm install
npm start
# mở http://localhost:3000
```

Khuyến nghị: **Node.js 22** (xem `.nvmrc`). Node 24 không có bản native tương thích cho phiên bản `better-sqlite3` hiện tại.

Lần đầu mở web, app sẽ chuyển sang màn hình **Thiết lập lần đầu**: nhập tên, mật khẩu
(hoặc PIN 4–6 số) và hạn mức chi mỗi ngày. Tích chọn "Tạo sẵn vài khoản chi mẫu" để có
dữ liệu xem ngay (xoá được bất cứ lúc nào trong Cài đặt).

Biến môi trường (tuỳ chọn): copy `.env.example` thành `.env` rồi sửa.

```bash
cp .env.example .env
```

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `PORT` | `3000` | Cổng lắng nghe. Trên hosting panel để trống, panel tự cấp. |
| `SESSION_SECRET` | chuỗi dev | **Nên đặt** trên production để bảo vệ phiên đăng nhập. |
| `DB_FILE` | `chi_tieu.db` | Tên file SQLite, nằm trong thư mục project. |
| `APP_TZ` | `Asia/Ho_Chi_Minh` | Múi giờ dùng để tính "hôm nay". |
| `IMAGE_MAX_SIZE` | `1280` | Cạnh dài tối đa của ảnh sau khi nén (px). |
| `IMAGE_QUALITY` | `72` | Chất lượng JPEG sau khi nén. |
| `TRUST_PROXY` | `0` | Đặt `1` khi chạy sau reverse proxy có HTTPS. |

---

## 2. Cấu trúc thư mục

```
locket-chi-tieu/
├── index.js                  # ENTRY POINT — hosting chạy đúng file này
├── package.json              # start = node index.js, khai báo đủ dependencies
├── .env.example
├── chi_tieu.db               # tự tạo khi chạy lần đầu (không commit)
├── uploads/                  # ảnh khoản chi (đã nén) — nằm trong project
├── public/
│   ├── css/app.css           # toàn bộ CSS tự viết (không dùng Bootstrap)
│   ├── img/favicon.svg
│   └── js/
│       ├── icons.js          # bộ icon SVG nội bộ (đồng bộ 1 bộ duy nhất)
│       ├── edge-aura.js      # viền phát sáng Canvas 2D quanh màn hình
│       ├── hieu-ung.js       # Blob xác nhận, vo giấy, hologram, dây kéo
│       ├── app.js            # toast, modal, định dạng tiền, gọi API
│       ├── camera.js         # màn hình Camera + hộp xác nhận khoản chi
│       ├── feed.js           # feed, xem chi tiết, sửa, xoá
│       ├── dashboard.js      # biểu đồ cột + donut (Chart.js, có fallback)
│       ├── danh-muc.js       # thêm/sửa/xoá danh mục
│       └── cai-dat.js        # hạn mức, mật khẩu, dữ liệu mẫu, xuất CSV
├── src/
│   ├── config.js             # đọc .env, đường dẫn, ngưỡng cảnh báo
│   ├── db.js                 # kết nối SQLite + tự migrate schema
│   ├── sessionStore.js       # lưu session vào chính file SQLite
│   ├── helpers.js            # định dạng tiền/ngày VN, tính khoảng thời gian
│   ├── middleware/auth.js    # gắn user, chặn trang cần đăng nhập
│   ├── models/               # users, categories, expenses, stats, seed
│   └── routes/               # auth.js, pages.js, api.js
└── views/                    # EJS: camera, feed, dashboard, danh-muc, cai-dat…
    └── partials/             # dau, cuoi, sidebar, nav-duoi
```

---

## 3. Triển khai lên hosting Node.js dạng panel

Cấu hình trên panel:

| Trường | Giá trị |
| --- | --- |
| **FILE CHAY** | `index.js` |
| **PHIÊN BẢN** | `Nodejs 20` |
| **GITHUB** | link repo của bạn |
| **NHÁNH** | `main` |
| **AUTO PULL** | bật nếu muốn tự cập nhật khi push |

Lưu ý đã được đảm bảo sẵn trong project:

- `index.js` nằm **ở thư mục gốc**, chạy được ngay bằng `node index.js`, **không có bước build** lúc runtime.
- Toàn bộ dependencies đã khai báo trong `package.json` để panel tự `npm install`:
  `express`, `express-session`, `ejs`, `better-sqlite3`, `multer`, `sharp`, `bcryptjs`, `dotenv`.
- App lắng nghe `process.env.PORT` (fallback `3000`) và bind `0.0.0.0`.
- File SQLite và thư mục `uploads/` đều nằm **trong thư mục project** (persistent trên volume container), không dùng cloud storage ngoài.
- Không có file nhị phân cần compile thủ công: `better-sqlite3` và `sharp` đều có prebuilt cho Linux x64 Node 20.
- `.gitignore` đã loại `node_modules/`, `*.db`, `.env` và ảnh trong `uploads/` (giữ lại `.gitkeep`) nên repo push lên GitHub gọn gàng.

Sau khi deploy, mở domain của panel → màn hình **Thiết lập lần đầu** → dùng bình thường.
Có endpoint `/khoe` trả `{ ok: true }` để panel/uptime-check ping.

> **Nếu `sharp` cài lỗi trên hosting:** app vẫn chạy được — phần lưu ảnh có sẵn nhánh dự phòng
> ghi thẳng file gốc khi không nén được. Có thể gỡ `sharp` khỏi `package.json` nếu muốn nhẹ hơn.

---

## 4. Giao diện Studio

Bản remake sử dụng nền than chì, điểm nhấn xanh lime, font **Be Vietnam Pro** hỗ trợ
đầy đủ tiếng Việt và một bộ icon SVG nội bộ. Giao diện thích ứng desktop, tablet và
điện thoại; chuyển động ngắn, tôn trọng thiết lập giảm chuyển động.

- **Ghi chi tiêu:** khung chụp ảnh, lựa chọn Camera / Thư viện rõ ràng, ghi thủ công,
  thẻ ngân sách có vòng tiến độ, nhật ký gần đây và điểm tiết kiệm.
- **Nhật ký:** thẻ ảnh với số tiền bên dưới, bộ lọc ngày và danh mục.
- **Thống kê:** tổng quan có thứ tự rõ ràng, biểu đồ cột xanh lime, đường hạn mức theo
  từng ngày/tháng và tổng hợp danh mục. Bấm tháng trong biểu đồ năm để xem chi tiết.
- **Danh mục và Cài đặt:** cùng hệ thống nút, biểu mẫu và khoảng cách.
- **Đăng nhập / Thiết lập:** bố cục hai cột trên desktop, biểu mẫu gọn trên điện thoại.
- **Bàn phím:** Tab để điều hướng, Enter/Space mở khung chụp, C mở camera,
  Escape đóng hộp thoại. Hộp thoại giữ và trả lại vị trí focus.

CSS gốc và các hiệu ứng được giữ tại `public/css/app.css`; giao diện mới được tổ chức
trong `public/css/remake.css`. Các thành phần dùng chung nằm ở `views/partials/`.
Font có dự phòng hệ thống khi không tải được Google Fonts. Không tải viền canvas
liên tục; dùng viền tĩnh dịu, hiệu ứng nút và thông báo lưu/xoá ngắn.

Tham khảo: [Astryx](https://astryx.atmeta.com/) cho thứ tự thông tin và thành phần,
[FeralUI](https://feralui.dev/) cho chuyển động phản hồi nhẹ. Không thêm React hoặc
thay đổi cơ sở dữ liệu để phục vụ thiết kế mới.

### Kiểm tra

Khuyến nghị **Node.js 22** (đã ghi trong `.nvmrc`) cho các thư viện native hiện tại.
Chạy `npm test` để kiểm tra render các trang ở trạng thái rỗng/có dữ liệu/vượt ngân
sách, ghi/sửa/xoá khoản chi, xuất CSV, và biểu đồ khi có/không có Chart.js. Bài kiểm
tra chạy trên cổng 4317 và cơ sở dữ liệu tạm riêng, tự dọn sau khi kết thúc.

---

## 5. Tính năng

### Camera (trang chủ)
Khung ngắm lớn ở giữa + nút chụp tròn. Bấm nút (hoặc phím **C**) mở camera trên điện thoại
(`capture="environment"`), mở trình chọn ảnh trên laptop. Có nút ghi khoản chi **không cần ảnh**.
Sau khi có ảnh → hộp xác nhận: xem trước ảnh, nhập **số tiền** (tự chèn dấu chấm ngăn nghìn,
có nút cộng nhanh 10k/20k/50k/100k/200k), chọn **nhiều danh mục** dạng chip, chọn ngày, ghi chú →
**Lưu** → hiệu ứng Blob xác nhận → ở lại Camera hoặc sang Feed.

### Feed
Lưới thẻ chi tiêu mới nhất trước, nhóm theo ngày (kèm tổng tiền từng ngày): thumbnail, số tiền,
các tag, giờ:phút. Lọc **Hôm nay / Tuần này / Tháng này / Tất cả** và lọc theo danh mục.
Bấm 1 thẻ → xem ảnh lớn, sửa số tiền / danh mục / ngày / ghi chú, hoặc xoá với animation vo giấy.

### Dashboard
Tab **Ngày / Tuần / Tháng / Năm**, có nút lùi/tiến kỳ. Thẻ tổng quan: tổng đã chi, ngân sách kỳ,
thanh tiến độ đổi màu xanh → vàng → đỏ, còn lại/vượt, trung bình mỗi ngày, số giao dịch.
Biểu đồ cột theo ngày (có đường nét đứt = hạn mức/ngày) + biểu đồ donut theo danh mục +
bảng breakdown (icon, tên, tổng tiền, %, số giao dịch). Ở chế độ **Năm**: 12 cột, bấm vào một
tháng để mở chi tiết tháng đó.

### Ngân sách tự động
Chỉ nhập **1 con số** — hạn mức chi tối đa mỗi ngày:

- Ngân sách **ngày** = hạn mức
- Ngân sách **tuần** = hạn mức × 7
- Ngân sách **tháng** = hạn mức × **số ngày thực tế** của tháng đang xem (28/29/30/31, đúng năm nhuận)
- Ngân sách **năm** = tổng ngân sách 12 tháng (cộng dồn theo số ngày thật, **không** nhân tròn 365)

Đổi hạn mức bất cứ lúc nào trong Cài đặt. App **lưu lịch sử hạn mức theo ngày hiệu lực**, nên
các kỳ đã qua vẫn được tính theo đúng hạn mức áp dụng tại thời điểm đó (phần nâng cao của đề bài).
Cảnh báo: đổi màu ở mốc **80%** và **100%**, kèm toast ngay khi khoản chi vừa lưu làm vượt ngưỡng.

### Danh mục
Mặc định khi tạo tài khoản: **Ăn uống 🍜**, **Mua sắm 🛍️**, **Đi chơi/Giải trí 🎡** (mỗi mục 1 màu riêng).
Thêm / đổi tên / đổi icon / đổi màu thoải mái. Khi xoá danh mục còn khoản chi, app hỏi rõ:
*gỡ tag khỏi các khoản chi* hay *xoá luôn cả các khoản chi đó*.

### Cài đặt
Đổi hạn mức (xem trước ngay ngân sách tuần/tháng), quản lý danh mục, đổi mật khẩu/PIN,
**xuất CSV** theo khoảng ngày (có BOM UTF-8, mở Excel không lỗi font), nạp lại / xoá **dữ liệu mẫu**.

---

## 6. Mô hình dữ liệu

```sql
users              (id, ten UNIQUE, mat_khau_hash, han_muc_ngay, ngay_tao)
categories         (id, user_id, ten, icon, mau_sac, la_mac_dinh, thu_tu, ngay_tao)
expenses           (id, user_id, so_tien, ghi_chu, duong_dan_anh, ngay_tao, created_at, la_mau)
expense_categories (expense_id, category_id)      -- nhiều-nhiều: 1 khoản chi nhiều tag
han_muc_history    (id, user_id, han_muc_ngay, ngay_hieu_luc, created_at)
sessions           (sid, du_lieu, han_su_dung)    -- session đăng nhập
```

Schema tự tạo/migrate khi app khởi động lần đầu.

---

## 7. Các giả định đã tự quyết (theo tinh thần "giống Locket nhưng để quản lý chi tiêu")

1. **Nhiều người dùng** trên cùng một cài đặt (mỗi tài khoản dữ liệu tách biệt), đăng nhập bằng
   tên + mật khẩu/PIN. Tài khoản đầu tiên tạo qua màn hình Thiết lập lần đầu.
2. **Ảnh là tuỳ chọn**: vẫn ghi được khoản chi không có ảnh (hiển thị icon danh mục thay ảnh) —
   thực tế nhiều lúc không tiện chụp.
3. **Một khoản chi gắn nhiều danh mục** thì trong thống kê số tiền được **chia đều** cho các danh
   mục đó, nên tổng các danh mục luôn khớp tổng chi (không bị đếm trùng).
4. Khoản chi không gắn danh mục nào được gom vào nhóm **"Chưa phân loại" ❓** trong thống kê.
5. `bcryptjs` (thuần JS) thay cho `bcrypt` để `npm install` không cần compile native trên hosting.
6. **Session lưu trong chính file SQLite** (không dùng MemoryStore) để không mất đăng nhập khi
   panel restart và không cần thêm Redis.
7. Icon giao diện dùng **một bộ SVG nội bộ duy nhất** (`public/js/icons.js`, vẽ theo phong cách
   lucide) thay vì tải lucide từ CDN — app vẫn đẹp và dùng được kể cả khi hosting chặn CDN.
   Icon của **danh mục** thì dùng emoji cho vui mắt và cho phép người dùng tự chọn.
8. **Chart.js tải qua CDN** đúng như đề bài; nếu không tải được, `dashboard.js` tự vẽ biểu đồ cột
   và donut bằng Canvas 2D (số liệu y hệt), kèm ghi chú nhỏ báo đang ở chế độ ngoại tuyến.
9. Ảnh được nén về JPEG cạnh dài tối đa 1280px, chất lượng 72 bằng `sharp`; nếu `sharp` không dùng
   được thì ghi thẳng file gốc (giới hạn 15MB/ảnh) để tính năng không bao giờ chết.
10. **Dữ liệu mẫu** được đánh dấu riêng bằng cột `la_mau`, nên nút "Xoá dữ liệu mẫu" chỉ xoá đúng
    phần mẫu, không đụng tới khoản chi thật.
11. Múi giờ mặc định `Asia/Ho_Chi_Minh`; tuần bắt đầu từ **Thứ 2**; tiền hiển thị `150.000 ₫`,
    ngày `dd/mm/yyyy`; toàn bộ giao diện tiếng Việt.
12. Chưa làm tính năng chia sẻ/bạn bè (đề bài không yêu cầu) — thay vào đó có xuất CSV.

---

## 8. Danh sách API (dùng nội bộ cho giao diện)

| Method | Đường dẫn | Công dụng |
| --- | --- | --- |
| `POST` | `/api/chi-tieu` | Tạo khoản chi (multipart: `anh`, `so_tien`, `danh_muc[]`, `ngay`, `ghi_chu`) |
| `GET` | `/api/chi-tieu/:id` | Lấy chi tiết 1 khoản chi |
| `POST` | `/api/chi-tieu/:id` | Cập nhật khoản chi (kèm `xoa_anh=1` nếu muốn bỏ ảnh) |
| `DELETE` | `/api/chi-tieu/:id` | Xoá khoản chi (xoá luôn file ảnh) |
| `GET/POST` | `/api/danh-muc`, `/api/danh-muc/:id` | Danh sách / tạo / sửa danh mục |
| `DELETE` | `/api/danh-muc/:id?cheDo=go-tag\|xoa-het` | Xoá danh mục theo lựa chọn của người dùng |
| `POST` | `/api/han-muc` | Đổi hạn mức/ngày (trả về ngân sách tuần/tháng mới) |
| `POST` | `/api/mat-khau` | Đổi mật khẩu/PIN |
| `POST` | `/api/du-lieu-mau` | `{ hanh: "xoa" \| "nap-lai" }` |
| `GET` | `/api/thong-ke?loai=&moc=` | Số liệu dashboard |
| `GET` | `/api/tom-tat` | Tóm tắt hôm nay + trạng thái cảnh báo |
| `GET` | `/xuat-csv?tu=&den=` | Tải CSV khoảng ngày |
| `GET` | `/khoe` | Health check cho panel |

---

## 9. Giấy phép

Mã nguồn trong repo này do bạn sở hữu và sử dụng tự do. Các trang ở mục 0 chỉ được dùng làm
**nguồn cảm hứng thiết kế**; toàn bộ CSS/JS hiệu ứng trong project đều được viết lại từ đầu,
không sao chép code có bản quyền.
