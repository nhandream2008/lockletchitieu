# Đưa Locket Chi Tiêu lên Vercel miễn phí

Project Supabase của ứng dụng: `https://imtxvbdumcvflrfcesty.supabase.co`.

## 1. Nhập dữ liệu cũ

Giải nén archive backup vào một thư mục riêng. Thư mục đó phải có
`chi_tieu.db`, `chi_tieu.db-wal`, `chi_tieu.db-shm` và `uploads`.

Mở PowerShell tại thư mục mã nguồn rồi chạy (thay hai đường dẫn và key):

```powershell
$env:SUPABASE_URL="https://imtxvbdumcvflrfcesty.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY_CUA_BAN"
$env:DB_FILE="C:\duong-dan-backup\chi_tieu.db"
$env:UPLOAD_DIR="C:\duong-dan-backup\uploads"
node scripts/migrate-to-supabase.js
```

Không gửi hoặc commit `SUPABASE_SERVICE_ROLE_KEY` lên GitHub.

## 2. Đưa mã nguồn lên GitHub

Giải nén `locket-vercel-supabase.zip`. Tạo repository GitHub mới ở chế độ
Private, rồi upload toàn bộ nội dung bên trong thư mục giải nén. Không upload
archive backup, `.env`, database hoặc ảnh riêng.

## 3. Deploy Vercel

Trong Vercel chọn Add New > Project, import repository vừa tạo. Framework
Preset chọn Other, giữ nguyên Build Command và Output Directory, rồi thêm các
Environment Variables:

```
SUPABASE_URL=https://imtxvbdumcvflrfcesty.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role key trong Supabase Project Settings > API
SUPABASE_STORAGE_BUCKET=expense-images
SESSION_SECRET=một chuỗi ngẫu nhiên dài ít nhất 32 ký tự
TRUST_PROXY=1
```

Bấm Deploy. Sau khi hoàn tất, mở `/khoe`; kết quả phải có `"ok":true`.

## Giới hạn

Cơ chế này dành cho ứng dụng cá nhân hoặc nhóm nhỏ: Vercel dùng SQLite tạm làm
bộ nhớ làm việc và đồng bộ dữ liệu với Supabase sau mỗi thao tác ghi. Tránh cho
nhiều người sửa dữ liệu đúng cùng một thời điểm.
