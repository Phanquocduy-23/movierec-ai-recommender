# TỔNG HỢP TIẾN ĐỘ ĐỒ ÁN CƠ SỞ 2 (CẬP NHẬT TỐI 10/11/2026 — HOÀN THIỆN 100%)

- **Sinh viên thực hiện**: Phan Quốc Duy
- **MSSV**: `235019` | **Lớp**: `DH23TIN05`
- **Đề tài**: *Xây dựng website gợi ý phim cá nhân hóa ứng dụng trí tuệ nhân tạo sử dụng lọc cộng tác dựa trên đánh giá người dùng.*
- **Thư mục mã nguồn**: `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender`
- **Repository GitHub**: `https://github.com/Phanquocduy-23/movierec-ai-recommender`

---

## I. CÁC HẠNG MỤC MỚI HOÀN THÀNH THÊM HÔM NAY (10/11/2026)

1. **[x] Tính năng Bình luận & Đánh giá văn bản Cộng đồng (`User Reviews & Comments`)**:
   - Bổ sung trường `comment` vào bảng `ratings` (`backend/app/models.py`, `backend/alembic/versions/0001_initial_schema.py`) và tự động tạo dữ liệu bình luận mẫu tiếng Việt cho các tài khoản demo (`backend/app/main.py`).
   - Thêm API `GET /api/movies/{movie_id}/reviews` (`backend/app/routers/movies.py`) và nâng cấp `PUT /api/ratings/{movie_id}` (`backend/app/routers/ratings.py`) cho phép lưu đồng thời điểm sao (`0.5` – `5.0`) và nhận xét văn bản (tối đa 1.500 ký tự).
   - Nâng cấp giao diện [`MovieDetail.jsx`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/frontend/src/pages/MovieDetail.jsx) và [`MyRatings.jsx`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/frontend/src/pages/MyRatings.jsx) với khu vực **"💬 Bình luận & Cảm nhận Cộng đồng"**.
   - Bổ sung kiểm thử tích hợp `test_movie_reviews_and_comments` trong `backend/tests/test_api.py` (**nâng tổng số bài test tự động lên 16/16 PASSED**).
2. **[x] Công cụ chuyển đổi PostgreSQL 1 lệnh & Đóng gói Docker Compose**:
   - Tạo script [`scripts/switch_to_postgres.py`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/scripts/switch_to_postgres.py): Tự động tạo database `movierec` trên PostgreSQL (`localhost:5432`), cập nhật `backend/.env`, chạy `alembic upgrade head` và nạp dữ liệu chỉ bằng 1 lệnh.
   - Tạo trọn bộ [`Dockerfile.backend`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/Dockerfile.backend), [`frontend/Dockerfile`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/frontend/Dockerfile) và [`docker-compose.yml`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/docker-compose.yml) (tích hợp PostgreSQL 16 + FastAPI + React/Vite).
3. **[x] Xuất file Báo cáo Word (`.docx`) & Nội dung Slide Thuyết trình 12 trang**:
   - Tạo script [`scripts/generate_report_docx.py`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/scripts/generate_report_docx.py) và xuất thành công file Word hoàn chỉnh 5 chương: **[`docs/Bao_Cao_Do_An_CS2_Phan_Quoc_Duy_235019.docx`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/docs/Bao_Cao_Do_An_CS2_Phan_Quoc_Duy_235019.docx)**.
   - Soạn thảo nội dung chi tiết 12 slide bảo vệ đồ án tại **[`docs/SLIDE_THUYET_TRINH_DO_AN.md`](file:///C:/Users/phanq/.gemini/antigravity/scratch/movie-recommender/docs/SLIDE_THUYET_TRINH_DO_AN.md)**.

---

## II. TỔNG HỢP TOÀN BỘ HỆ THỐNG ĐÃ HOÀN THÀNH

- **Pipeline Dữ liệu & EDA**: 100.836 đánh giá, 9.742 phim (đã gắn poster IMDb thật & chuẩn hóa tên phim), chia Per-user Temporal Split 70/15/15 (`overlap = 0`), xuất 3 biểu đồ EDA.
- **3 Mô hình AI Gợi ý**:
  - `Popularity` (`RMSE = 0.9613`, `MAE = 0.7460`, `P@10 = 0.0589`, `R@10 = 0.0537`)
  - `Item-based KNN` (`RMSE = 0.8926`, `MAE = 0.6772`, `Coverage = 13.71%`, giải thích lý do gợi ý)
  - `SVD` (`RMSE = 0.8884`, `MAE = 0.6762`, `P@10 = 0.0680`, `R@10 = 0.0566`)
- **Backend FastAPI & 14 bảng SQLAlchemy**: JWT + Bcrypt RBAC (`user`/`admin`), luồng gợi ý Hybrid 3 nhánh xử lý Cold-start, huấn luyện nền & quản lý phiên bản mô hình.
- **Frontend ReactJS**: Hero Spotlight Carousel, Live Search có ảnh thu nhỏ, Xem Trailer YouTube Modal, Tóm tắt nội dung/Đạo diễn/Diễn viên/Giải thưởng IMDb, Bình luận Cộng đồng, Hồ sơ Gu Điện Ảnh, Cổng Quản trị Admin 7 phân hệ.
- **Kiểm thử & Tài liệu**: **16/16 bài test `pytest` PASSED**, `npm run build` 0 lỗi, Báo cáo `.docx`, Slide thuyết trình, UML/ERD 14 bảng, Q&A bảo vệ đồ án và hướng dẫn viết CV.
