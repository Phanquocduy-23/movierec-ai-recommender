# TỔNG HỢP ĐÓNG GÓI ĐỒ ÁN CƠ SỞ 2 — WEBSITE GỢI Ý PHIM CÁ NHÂN HÓA AI (`MovieRec`)

- **Sinh viên thực hiện**: Phan Quốc Duy — **MSSV**: `235019` — **Lớp**: `DH23TIN05`
- **Tên đề tài**: *Xây dựng website gợi ý phim cá nhân hóa ứng dụng trí tuệ nhân tạo sử dụng lọc cộng tác dựa trên đánh giá người dùng.*
- **Kho lưu trữ GitHub (Đã Push 100%)**: https://github.com/Phanquocduy-23/movierec-ai-recommender
- **Báo cáo Word (`.docx`) nhúng 8 biểu đồ/sơ đồ**: `docs/Bao_Cao_Do_An_CS2_Phan_Quoc_Duy_235019.docx`
- **Slide Thuyết trình 12 trang Widescreen 16:9 (`.pdf`)**: `docs/Slide_Thuyet_Trinh_Do_An_CS2_Phan_Quoc_Duy_235019.pdf`

---

## I. TẤT CẢ CÁC HẠNG MỤC ĐÃ HOÀN THÀNH (100%)

1. **Lõi Trí Tuệ Nhân Tạo (AI / Collaborative Filtering) & Thực Nghiệm Khoa Học**:
   - Tiền xử lý & Chia tập dữ liệu theo thời gian (`Temporal Split 80/20`) trên **100.836 lượt đánh giá**, **9.742 bộ phim**, **610 người dùng** (`recsys/data.py`).
   - Huấn luyện & đánh giá 3 mô hình (`Popularity WR`, `Item-based KNN Adjusted Cosine`, `SVD Matrix Factorization`) với 5 thước đo `RMSE`, `MAE`, `Precision@10`, `Recall@10`, `Coverage` (`recsys/models.py`, `recsys/metrics.py`).
   - Kiến trúc phục vụ gợi ý 3 nhánh tự động (`3-Branch Cold-Start Routing`: `SVD` -> `Item-KNN` -> `Popularity WR`) (`backend/app/services/recommender.py`).

2. **Backend FastAPI, Cơ Sở Dữ Liệu 14 Bảng & Bảo Mật RBAC**:
   - CSDL quan hệ 14 bảng chuẩn hóa 3NF & Migration Alembic (`backend/app/models.py`, `backend/alembic/`).
   - Xác thực JWT + Bcrypt + Phân quyền `user` / `admin` (`backend/app/security.py`).
   - Hệ thống API đầy đủ: Khám phá phim, Bảng xếp hạng Trọng số Bayes động (`/api/leaderboard`), Đối chiếu AI giữa 2 bộ phim (`/api/movies/{id}/compare/{other_id}`), Đánh giá & Bình luận cộng đồng, Huấn luyện mô hình AI bất đồng bộ, Nhật ký Telemetry AI thời gian thực và Kiểm duyệt bình luận.

3. **Giao Diện ReactJS 18 Hiện Đại & Trải Nghiệm Xem Phim Thực Tế**:
   - **Trang chủ (`Home.jsx`)**: Hero Banner, Chọn phim theo Tâm trạng (`Mood Matcher`), Bốc thăm phim ngẫu nhiên (`Surprise Me`), Lịch sử phim vừa xem.
   - **Phòng thí nghiệm Gợi ý AI (`Recommendations.jsx`)**: Đối sánh 3 mô hình song song (`SVD` vs `Item-KNN` vs `Popularity`), Chấm điểm nhanh 12 phim kinh điển, Xuất gợi ý AI ra CSV.
   - **Bảng xếp hạng (`Leaderboard.jsx`)**: Top Trọng số Bayes tùy biến tham số `m`, Viên Ngọc Ẩn (`Hidden Gems`), Bom Tấn Đông Khán Giả, Quán Quân 20 Thể Loại.
   - **Chi tiết phim & Phòng Chiếu (`MovieDetail.jsx`)**: Phòng chiếu phim trực tuyến 3 Server, Chế độ Tắt đèn rạp phim (`Theater Mode`), Chọn tập/bản chiếu, Đối chiếu AI giữa 2 bộ phim (`Double Feature`), Vinh danh Fan cứng, Làm mờ chống Spoiler, Breadcrumb & Hashtag SEO.
   - **Hồ sơ thống kê cá nhân (`Profile.jsx`)**: 4 KPI, phân tích phong cách chấm điểm, 3 biểu đồ cá nhân, Xuất CSV và Sao lưu/Khôi phục dữ liệu bằng file `.JSON`.
   - **Tiện ích toàn cục (`App.jsx`)**: Trợ lý nổi chọn phim theo ý bạn, Chế độ Sáng/Tối (`Light/Dark Theme`), Tìm kiếm nhanh `Ctrl + K`.

4. **Kiểm Thử, DevOps, Báo Cáo Word & Slide Bảo Vệ**:
   - **18/18 bài kiểm thử tích hợp `pytest` PASSED (100%)** (`backend/tests/test_api.py`).
   - Docker Compose & GitHub Actions CI (`docker-compose.yml`, `.github/workflows/ci.yml`).
   - Báo cáo Word `.docx` nhúng 8 biểu đồ/sơ đồ, Slide PDF 12 trang 16:9, Bộ 20 câu hỏi phản biện bảo vệ đồ án.

---

## II. HẠNG MỤC TÙY CHỌN CÒN LẠI (DO BẠN CHỦ ĐỘNG THỰC HIỆN KHI CẦN)

- **[ ] Chuyển đổi CSDL từ SQLite sang PostgreSQL (`pgAdmin 4`) khi muốn demo trên pgAdmin**:
  ```powershell
  C:\Users\phanq\AppData\Local\Python\pythoncore-3.14-64\python.exe scripts\switch_to_postgres.py --password <MAT_KHAU_POSTGRES>
  ```
