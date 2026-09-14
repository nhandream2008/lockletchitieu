# Sửa lỗi `better_sqlite3.node: invalid ELF header` trên Pikamc

Tệp native đang có trên máy chủ không phải định dạng Linux hợp lệ. Gói ZIP cũ
có chứa `node_modules` từ Windows; `npm install` có thể thấy thư viện đã tồn tại
và giữ nguyên tệp đó. Cần cài lại dependency ngay trên hosting.

## Thao tác trong panel

1. Stop máy chủ.
2. Sao lưu dữ liệu đang có: các tệp SQLite (`chi_tieu.db` cùng `-wal`, `-shm` nếu có,
   hoặc tên đã đặt qua `DB_FILE`), thư mục `uploads` và cấu hình `.env`.
3. Trong File Manager, chỉ xoá `/home/container/node_modules`.
   Giữ nguyên database, `uploads`, `.env` và những tệp riêng khác của bạn.
4. Upload `locket-chi-tieu-hosting.zip` và giải nén trực tiếp vào `/home/container`.
   Cho phép ghi đè các tệp mã nguồn. `index.js` và `package.json` phải nằm ngay ở
   `/home/container`, không nằm thêm trong thư mục con.
5. File chạy (`MAIN_FILE`): `index.js`. Giữ Node 20 của hosting cho lần sửa này.
6. Start máy chủ. Lệnh khởi động panel sẽ tự chạy `npm install` và cài bản Linux.

`package.json` mới đã khai báo `allowScripts` cho đúng hai phiên bản đang dùng:
`better-sqlite3@11.10.0` và `sharp@0.33.5`. Không cần cho phép mọi install script.

Nếu bật AUTO_UPDATE từ Git, hãy cập nhật mã nguồn mới lên đúng nhánh trước;
nếu không, lần khởi động kế tiếp có thể kéo bản cũ ghi đè lên tệp vừa upload.

## Nếu có terminal SSH/container thực sự

Sau khi upload mã nguồn mới, có thể chạy từ thư mục ứng dụng:

```sh
cd /home/container
npm ci
node -e "const D = require('better-sqlite3'); const d = new D(':memory:'); console.log(d.prepare('SELECT 1 AS ok').get()); d.close()"
```

`npm ci` thay thư mục dependency bằng bản cài sạch theo `package-lock.json`.
Lệnh kiểm tra dùng database trong bộ nhớ, không mở hoặc thay đổi dữ liệu thật.
Console log của panel không nhất thiết là terminal shell; khi không chạy được
các lệnh này, dùng các bước File Manager ở trên.

## Tạo gói upload cho những lần sau (Windows)

```powershell
powershell -File scripts/package-hosting.ps1
```

Gói tạo trong `dist-packages/locket-chi-tieu-hosting.zip`, chỉ chứa mã nguồn và
cấu hình mẫu. Không chứa `node_modules`, tệp native, database, `.env` hoặc ảnh cá nhân.
Không upload ZIP cũ chứa `node_modules` trở lại.

Các dòng `npm audit` trong log là cảnh báo riêng, không phải nguyên nhân của
`invalid ELF header`. Không dùng `npm audit fix --force` để xử lý lỗi này.

Nguồn tham khảo:
- https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md
- https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/
- https://docs.npmjs.com/cli/v11/commands/npm-ci/
