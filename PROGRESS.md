# TỔNG HỢP TIẾN ĐỘ ĐỒ ÁN CƠ SỞ 2 (CẬP NHẬT 23:05 NGÀY 10/11/2026)

- **Sinh viên thực hiện**: Phan Quốc Duy
- **MSSV**: `235019` | **Lớp**: `DH23TIN05`
- **Đề tài**: *Xây dựng website gợi ý phim cá nhân hóa ứng dụng trí tuệ nhân tạo sử dụng lọc cộng tác dựa trên đánh giá người dùng.*
- **Thư mục dự án**: `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender`
- **Repository GitHub**: `https://github.com/Phanquocduy-23/movierec-ai-recommender`

---

## I. NHỮNG CÔNG VIỆC ĐÃ HOÀN THÀNH HÔM NAY (10/11/2026)

### 1. Hoàn thiện 10 Tính năng Nâng cao cho Website & Mô hình AI
1. **[x] Bình luận & Đánh giá văn bản Cộng đồng (`User Reviews & Comments`)**:
   - Mở rộng bảng `ratings` thêm cột `comment` (`backend/app/models.py`, `0001_initial_schema.py`), tự động nạp bình luận mẫu tiếng Việt cho các tài khoản demo (`backend/app/main.py`).
   - Thêm API `GET /api/movies/{movie_id}/reviews` và nâng cấp `PUT /api/ratings/{movie_id}` cho phép lưu đồng thời điểm sao (`0.5` – `5.0`) và nhận xét văn bản (tối đa 1.500 ký tự).
   - Hiển thị khu vực **"💬 Bình luận & Cảm nhận Cộng đồng"** trên trang chi tiết phim (`MovieDetail.jsx`) và trong lịch sử đánh giá (`MyRatings.jsx`).
2. **[x] Phòng Thí Nghiệm: Đối chiếu 3 Mô hình AI Song Song (`Side-by-Side Comparison Lab`)**:
   - Trên trang `Recommendations.jsx`, thêm chế độ **`🔬 So sánh 3 mô hình song song`** hiển thị đồng thời 3 cột Top-10 của **SVD**, **Item-based KNN** và **Popularity (Baseline)** trên cùng 1 màn hình.
   - Tự động tính toán số lượng phim đồng thuận giữa SVD & Item-KNN (**`🎯 Đồng thuận AI`**), mức độ khác biệt so với phương pháp Phổ biến và độ đa dạng thể loại của từng mô hình.
3. **[x] Khung "Khởi tạo nhanh Gu Điện Ảnh (Xử lý Cold-Start trực tiếp)"**:
   - Trên trang `Recommendations.jsx`, tài khoản mới hoặc người dùng có thể chọn nhanh 12 thể loại và bấm chấm điểm 1-click (`★ 5.0`, `★ 4.0`, `★ 3.0`) để thấy danh sách gợi ý chuyển tức thì từ *Fallback Phổ biến* sang *Cá nhân hóa AI*.
4. **[x] Tích hợp lời giải thích *"Vì bạn thích..."* cho cả mô hình SVD**:
   - Nâng cấp `backend/app/services/recommender.py` để khi xếp hạng bằng **SVD**, hệ thống kết hợp luôn ma trận tương đồng của **Item-KNN** nhằm hiển thị lý do `"Vì bạn thích: [Tên phim]"` dưới mỗi bộ phim được gợi ý.
5. **[x] Tính năng "🎭 Hôm nay tâm trạng của bạn thế nào?" (`Mood Matcher`) & `🎲 Bốc thăm Phim Ngẫu nhiên`**:
   - Trên trang chủ `Home.jsx`, cho phép lọc nhanh phim đỉnh cao theo 6 tâm trạng (*Kịch tính & Hành động*, *Hack não & Viễn tưởng*, *Lãng mạn & Chữa lành*, *Hài hước*, *Hình sự*, *Hoạt hình & Gia đình*) và nút bốc thăm ngẫu nhiên 1 bộ phim xuất sắc.
6. **[x] Dashboard Thống kê Điện ảnh Cá nhân & Xuất file Excel/CSV (`Profile.jsx`)**:
   - Nâng cấp trang Hồ sơ cá nhân với **4 thẻ KPI** (Tổng phim đã chấm, Điểm trung bình, Số phim Muốn xem, Số bình luận), **Nhận diện phong cách chấm điểm**, **3 biểu đồ cá nhân** (Phân bố điểm `0.5`–`5.0`, Top thể loại, Thập niên yêu thích) và nút **`📥 Xuất lịch sử đánh giá (CSV)`** mở trực tiếp bằng Excel.
7. **[x] Hộp "🧮 Minh bạch Toán học AI" & Nút Chia sẻ nhanh trên trang Chi tiết Phim (`MovieDetail.jsx`)**:
   - Hiển thị trực tiếp công thức và phép thế số thực tế của **Điểm Trọng số Bayes ($WR = \frac{v}{v+m}R + \frac{m}{v+m}C$)** cho từng bộ phim kèm nút sao chép liên kết chia sẻ.
8. **[x] Nâng cấp Danh sách Muốn Xem (`Watchlist.jsx`) & Phím tắt toàn cục `Ctrl + K` (`App.jsx`)**:
   - Tìm kiếm, sắp xếp trong Watchlist và **Chấm điểm trực tiếp = Đánh dấu đã xem**.
   - Nhấn **`Ctrl + K`** ở bất kỳ đâu để nhảy ngay vào thanh tìm kiếm phim trực tiếp.

### 2. Hoàn thiện DevOps, Kiểm thử Tự động & Tài liệu Báo cáo
9. **[x] Công cụ chuyển đổi PostgreSQL 1 lệnh, Docker Compose & GitHub Actions CI**:
   - Script `scripts/switch_to_postgres.py`: Tự động tạo DB `movierec` trên PostgreSQL, chạy Alembic migration và seed dữ liệu chỉ bằng 1 lệnh.
   - Đóng gói `Dockerfile.backend`, `frontend/Dockerfile`, `docker-compose.yml` (PostgreSQL 16 + FastAPI + React) và `.github/workflows/ci.yml`.
   - Vượt qua **16/16 bài kiểm thử tự động `pytest` (`100% PASSED`)** và build production Frontend (`npm run build` 0 lỗi).
10. **[x] Xuất file Báo cáo Word (`.docx`) có nhúng sẵn 6 biểu đồ PNG & Slide Thuyết trình 12 trang**:
    - File Word hoàn chỉnh 5 chương kèm 6 biểu đồ thực nghiệm: `docs/Bao_Cao_Do_An_CS2_Phan_Quoc_Duy_235019.docx`.
    - Nội dung 12 trang Slide thuyết trình bảo vệ: `docs/SLIDE_THUYET_TRINH_DO_AN.md`.

### 3. Lịch sử 9 Commits Đã Đóng Gói Sẵn Trong Git Local (`main`)
1. `28f71d1` — `chore: initialize project structure, environment template and gitignore`
2. `a7a970c` — `feat(recsys): implement MovieLens data cleaning, temporal split and evaluation metrics`
3. `32360d3` — `feat(ml): implement Popularity, Item-based KNN and SVD models with experiment pipeline`
4. `14a35cf` — `feat(backend): add SQLAlchemy 14-table schema, Alembic migration and JWT RBAC security`
5. `9d036b8` — `feat(api): implement FastAPI routers, 3-branch cold-start recommender and background training`
6. `2b60e3f` — `feat(frontend): build ReactJS movie discovery UI, IMDb trailer modal, taste profile and admin portal`
7. `1d53b98` — `docs & test: add 15 pytest integration tests, UML/DB design docs, defense QA and CV-ready README`
8. `0693f13` — `feat(reviews & devops): add community movie comments, Docker Compose, PostgreSQL switcher and Word report`
9. `916d79f` — `feat(ux & analytics): add 3-model side-by-side comparison lab, mood matcher, personal analytics dashboard and CSV export`

---

## II. NHỮNG MỤC CHƯA HOÀN THÀNH / CẦN BẠN THAO TÁC TIẾP

> **Về mặt lập trình (Code, AI, Giao diện, Kiểm thử, Tài liệu báo cáo): Đã hoàn thành 100%.**
> Chỉ còn **3 thao tác cá nhân trên máy của bạn** dưới đây để hoàn tất việc đưa lên GitHub và nộp báo cáo:

### 1. [ ] Bấm xác thực để đẩy 9 commits lên GitHub (`Phanquocduy-23/movierec-ai-recommender`)
- **Hiện trạng**: Repo trống đã tạo trên GitHub và 9 commits đã nằm sẵn trong Git dưới máy bạn, nhưng chưa được đẩy lên web vì cần bạn bấm **Authorize** cho tài khoản `Phanquocduy-23` trên trình duyệt.
- **Cách thực hiện**:
  1. Nhấp đúp vào file **`push_github.bat`** trong thư mục `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender`.
  2. Lấy mã 8 ký tự hiện ra trên màn hình đen, nhập vào trang `https://github.com/login/device` trên trình duyệt đang đăng nhập `Phanquocduy-23` rồi bấm **Authorize**.
  *(Hoặc dùng ứng dụng **GitHub Desktop** bấm Publish branch `main`).*

### 2. [ ] Chuyển kết nối từ SQLite sang PostgreSQL (`pgAdmin 4`) trước buổi chấm/bảo vệ chính thức
- **Hiện trạng**: Mặc định web đang dùng SQLite (`data/movierec.db`) để bạn bật nhanh bằng `run_web.bat` không cần cấu hình mật khẩu DB.
- **Cách thực hiện khi cần demo với PostgreSQL**:
  Chạy đúng 1 lệnh sau (thay `<MAT_KHAU>` bằng mật khẩu `postgres` trên máy bạn):
  ```powershell
  cd C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender
  C:\Users\phanq\AppData\Local\Python\pythoncore-3.14-64\python.exe scripts\switch_to_postgres.py --password <MAT_KHAU>
  ```

### 3. [ ] Điền tên Giảng viên hướng dẫn & Chèn ảnh chụp màn hình Web vào Báo cáo Word + Slide PowerPoint
- **Hiện trạng**: File Word `docs/Bao_Cao_Do_An_CS2_Phan_Quoc_Duy_235019.docx` đã có sẵn 5 chương, bảng biểu và 6 biểu đồ thực nghiệm AI; file `docs/SLIDE_THUYET_TRINH_DO_AN.md` đã có đủ kịch bản 12 slide.
- **Cách thực hiện**:
  - Mở `docs/Bao_Cao_Do_An_CS2_Phan_Quoc_Duy_235019.docx` bằng Microsoft Word, điền họ tên **Giảng viên hướng dẫn** ở trang bìa, bấm tạo Mục lục tự động và dán thêm 4–5 ảnh chụp màn hình giao diện Web thực tế của bạn.
  - Copy nội dung từ `docs/SLIDE_THUYET_TRINH_DO_AN.md` sang PowerPoint / Canva để làm slide thuyết trình.
