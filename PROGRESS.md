# TỔNG HỢP TIẾN ĐỘ ĐỒ ÁN CƠ SỞ 2 (CẬP NHẬT ĐÊM 09/11 – RẠNG SÁNG 10/11/2026)

- **Sinh viên thực hiện**: Phan Quốc Duy
- **MSSV**: `235019` | **Lớp**: `DH23TIN05`
- **Đề tài**: *Xây dựng website gợi ý phim cá nhân hóa ứng dụng trí tuệ nhân tạo sử dụng lọc cộng tác dựa trên đánh giá người dùng.*
- **Thư mục mã nguồn**: `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender`
- **Repository GitHub**: `https://github.com/Phanquocduy-23/movierec-ai-recommender`

---

## I. NHỮNG CÔNG VIỆC ĐÃ HOÀN THÀNH HÔM NAY (100% CODE & THỰC NGHIỆM AI)

### 1. Pipeline dữ liệu MovieLens & Phân tích khám phá (EDA)
- [x] Tự động tải bộ dữ liệu **MovieLens Latest Small (`ml-latest-small`)** của GroupLens Research và kiểm tra toàn vẹn bằng mã băm `SHA-256`.
- [x] Làm sạch dữ liệu (`ml/prepare_data.py` & `recsys/data.py`):
  - Chuẩn hóa **9.742 bộ phim**, **20 thể loại**, **610 người dùng** và **100.836 lượt đánh giá** (thang điểm `0.5` – `5.0`, bước nhảy `0.5`).
  - Chuẩn hóa lại **1.544 tiêu đề phim** bị đảo mạo từ tiếng Anh (ví dụ: `"Matrix, The (1999)"` $\rightarrow$ `"The Matrix"`, `"Lord of the Rings: The Two Towers, The"` $\rightarrow$ `"The Lord of the Rings: The Two Towers"`).
  - Ánh xạ toàn bộ **9.742 phim** sang mã định danh quốc tế `imdb_id` (`ttXXXXXXX`) và `tmdb_id` từ `links.csv`.
- [x] Chia tập dữ liệu theo thời gian trên từng người dùng (**Per-user Temporal Split 70/15/15**) chống rò rỉ dữ liệu tương lai (*Data Leakage*):
  - `train.csv`: **70.580** đánh giá
  - `val.csv`: **15.145** đánh giá
  - `test.csv`: **15.111** đánh giá
  - Kiểm chứng độ chồng lấp (`overlap = 0`).
- [x] Xuất báo cáo thống kê `data/processed/eda_report.md` và **3 biểu đồ trực quan hóa** (`Matplotlib`):
  - `data/processed/figures/rating_distribution.png` (Phân bố điểm đánh giá)
  - `data/processed/figures/long_tail.png` (Phân phối đuôi dài Long-tail)
  - `data/processed/figures/genre_ratings.png` (Số lượng & điểm trung bình theo thể loại)

### 2. Xây dựng, Huấn luyện & Đánh giá 3 Mô hình Gợi ý AI (`recsys/` & `ml/`)
- [x] Cài đặt hoàn chỉnh 3 thuật toán trong `recsys/algorithms.py`:
  1. **Popularity Baseline (`PopularityRecommender`)**: Xếp hạng theo công thức trọng số Bayes (IMDB Weighted Rating $WR = \frac{v}{v+m}R + \frac{m}{v+m}C$).
  2. **Item-based Collaborative Filtering (`ItemKNNRecommender`)**: Lọc cộng tác dựa trên phim sử dụng độ tương đồng **Adjusted Cosine** (trừ trung bình đánh giá của từng user $\bar{r}_u$), tham số co rút $\beta$ (*shrinkage*) và hàm giải thích trực quan `explain(user_id, item_id)` trả về các bộ phim tương tự mà người dùng đã chấm điểm cao.
  3. **Matrix Factorization (`SVDRecommender`)**: Phân rã ma trận có điều chuẩn ($\hat{r}_{ui} = \mu + b_u + b_i + p_u^T q_i$), hỗ trợ cả `scikit-surprise` và `SciPy/NumPy SVD`.
- [x] Cài đặt bộ độ đo đánh giá đầy đủ trong `recsys/metrics.py`: **RMSE**, **MAE**, **Precision@10**, **Recall@10**, **Catalog Coverage**.
- [x] Chạy thực nghiệm Grid Search & đánh giá trên tập Test (`artifacts/experiments/20261109-224136/`):

| Mô hình | Cấu hình tốt nhất | RMSE ($\downarrow$) | MAE ($\downarrow$) | Precision@10 ($\uparrow$) | Recall@10 ($\uparrow$) | Coverage |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Popularity (Baseline)** | `min_Votes=50` | 0.9613 | 0.7460 | 0.0589 | 0.0537 | 0.45% |
| **Item-based KNN** | `k=40, shrinkage=15` | 0.8926 | 0.6772 | 0.0369 | 0.0258 | 13.71% |
| **SVD (Mô hình tốt nhất)** | `n_factors=50, reg=0.05` | **0.8884** | **0.6762** | **0.0680** | **0.0566** | 7.36% |

- [x] Xuất **3 biểu đồ so sánh thực nghiệm** (`rating_metrics.png`, `ranking_metrics.png`, `validation_grid.png`).
- [x] Đóng gói mô hình active `v20261109-154147` (`artifacts/models/v20261109-154147.pkl`).

### 3. Cơ sở dữ liệu 14 bảng & Backend REST API (`backend/`)
- [x] Thiết kế 14 bảng ORM với **SQLAlchemy 2.0** (`backend/app/models.py`) và tạo file migration **Alembic** (`backend/alembic/versions/0001_initial_schema.py`):
  - `users`, `user_Tokens`, `user_genre_preferences`, `movies`, `genres`, `movie_genres`, `ratings`, `rating_history`, `watchlist_items`, `view_history`, `model_versions`, `training_jobs`, `recommendation_logs`, `data_import_batches`.
- [x] Xác thực **JWT (`HS256`)** + mã hóa mật khẩu **Bcrypt** + phân quyền **RBAC (`user` / `admin`)**.
- [x] Xây dựng luồng gợi ý thông minh **3 nhánh xử lý Cold-start** (`backend/app/services/recommender.py`):
  - **Nhánh 1 (`collaborative_filtering`)**: User đã có $\ge 5$ đánh giá $\rightarrow$ Cá nhân hóa bằng SVD + giải thích lý do bằng Item-KNN.
  - **Nhánh 2 (`cold_start_genre`)**: User mới ($< 5$ đánh giá) nhưng đã chọn thể loại yêu thích $\rightarrow$ Gợi ý phim nổi bật theo thể loại đã chọn.
  - **Nhánh 3 (`cold_start_popular`)**: Khách vãng lai hoặc chưa chọn thể loại $\rightarrow$ Gợi ý theo Bayesian Popularity.
  - Tự động **loại trừ toàn bộ phim người dùng đã đánh giá** và **ghi nhận lịch sử gợi ý (`recommendation_logs`)**.

### 4. Giao diện Frontend ReactJS như Web Xem Phim Thực Tế (`frontend/`)
- [x] **Ảnh Poster thật cho cả 9.742 phim**: Kết nối trực tiếp poster từ IMDb (`images.metahub.space`) kèm cơ chế tự động dự phòng (fallback) nếu ảnh lỗi.
- [x] **Hero Spotlight Carousel**: Banner phim nổi bật tự động chuyển cảnh mỗi 6 giây trên trang chủ, có ảnh nền rộng (backdrop), nút xem chi tiết và chấm điểm nhanh.
- [x] **Tìm kiếm nhanh (Live Search Dropdown)** ngay trên thanh điều hướng: Gõ tên phim sẽ hiện ngay danh sách gợi ý kèm ảnh poster thu nhỏ, năm phát hành và điểm sao.
- [x] **Trang Chi tiết phim (`MovieDetail.jsx`) nâng cấp toàn diện**:
  - Tự động lấy dữ liệu thời gian thực từ IMDb/Cinemeta: **Tóm tắt nội dung phim (Synopsis)**, **Đạo diễn**, **Dàn diễn viên (Cast)**, **Thời lượng chiếu**, **Giải thưởng (Oscars / Wins & Nominations)**, **Điểm IMDb thực tế**.
  - **Xem Trailer YouTube chính thức ngay trên web (Modal Popup Cinema)** không cần rời trang.
  - Kệ **"Phim tương tự cùng phong cách"** được trích xuất từ ma trận tương đồng **Item-KNN Adjusted Cosine** của AI.
- [x] **Trang Gợi ý cá nhân hóa (`Recommendations.jsx`)**:
  - Có thẻ **"Hồ sơ Gu Điện Ảnh của bạn" (Taste Profile)** thống kê thanh tiến trình các thể loại bạn thích nhất từ lịch sử chấm điểm.
  - Có nút chuyển đổi thuật toán trực tiếp (**Tự động / SVD / Item-KNN / Phổ biến**) để so sánh ngay trên giao diện khi thuyết trình bảo vệ.
- [x] **Đăng nhập Demo 1-Click (`AuthPages.jsx`)**: Chỉ cần bấm 1 nút để đăng nhập ngay vào 4 tài khoản mẫu (`admin`, `demo_action`, `demo_romance`, `demo_new`).
- [x] **Trang Quản trị viên (`AdminLayout.jsx` - 7 phân hệ)**: Tổng quan hệ thống, Quản lý Phim, Quản lý Thể loại, Quản lý Người dùng, Quản lý Dữ liệu & Nạp CSV, Quản lý Mô hình AI & Huấn luyện lại, Biểu đồ Thực nghiệm.

### 5. Kiểm thử tự động, Tài liệu báo cáo & Quản lý mã nguồn Git
- [x] Vượt qua **15/15 bài kiểm thử tự động `pytest`** (`backend/tests/test_recsys.py` và `backend/tests/test_api.py`) và build production Frontend (`npm run build` 0 lỗi).
- [x] Soạn thảo trọn bộ tài liệu phục vụ viết báo cáo & bảo vệ đồ án trong thư mục `docs/`:
  - `docs/SYSTEM_DESIGN_UML_AND_DB.md`: Sơ đồ kiến trúc, Use Case, Activity, Sequence, ERD và đặc tả 14 bảng CSDL.
  - `docs/DEMO_AND_DEFENSE_QA.md`: Kịch bản demo 5 bước và 10 câu hỏi – đáp bảo vệ trước hội đồng.
  - `docs/CV_AND_GITHUB_GUIDE.md`: Mẫu mô tả dự án bằng tiếng Việt & tiếng Anh chuẩn ATS để đưa vào CV xin thực tập/việc làm.
- [x] Khởi tạo Git local (`git init -b main`) với **7 commits chuẩn Conventional Commits**, file `.gitignore` sạch sẽ, và file chạy nhanh `run_web.bat`.

---

## II. NHỮNG HẠNG MỤC CHƯA HOÀN THÀNH / CẦN LÀM TIẾP Ở BUỔI SAU

### 1. Hoàn tất xác thực đẩy 7 commits lên GitHub (`Phanquocduy-23/movierec-ai-recommender`)
- **Trạng thái hiện tại**: Bạn đã tạo sẵn repo trống tại `https://github.com/Phanquocduy-23/movierec-ai-recommender` và toàn bộ 7 commits đã được đóng gói sẵn trong máy tính của bạn. Tuy nhiên bước xác thực trình duyệt của Git đang chờ mã xác nhận cho tài khoản `Phanquocduy-23` (do trước đó máy lưu tài khoản `YenNhi2704`).
- **Cách hoàn tất nhanh nhất vào buổi sau (chỉ mất 1 phút)**:
  - **Cách A (Dùng nút "Set up in GitHub Desktop" trên trang GitHub của bạn)**: Bấm nút `Set up in GitHub Desktop` hoặc mở file `push_github.bat` trong thư mục `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender`, lấy mã 8 ký tự in trên màn hình nhập vào `https://github.com/login/device` rồi bấm **Authorize**.
  - **Cách B (Dùng Personal Access Token)**: Vào GitHub $\rightarrow$ *Settings* $\rightarrow$ *Developer settings* $\rightarrow$ *Personal access tokens (Classic)* $\rightarrow$ *Generate new token* (tích chọn `repo`) và dán token khi Git hỏi mật khẩu.

### 2. Chuyển đổi sang PostgreSQL khi quay video Demo / Bảo vệ chính thức
- **Trạng thái hiện tại**: Hệ thống đang chạy trên **SQLite (`data/movierec.db`)** để bạn mở web nhanh bằng 1 click mà không cần cấu hình dịch vụ nền. Toàn bộ 14 bảng SQLAlchemy và script migration Alembic đã tương thích 100% với PostgreSQL.
- **Việc cần làm trước buổi bảo vệ**:
  1. Mở **pgAdmin 4** (đã cài sẵn trên máy bạn), tạo database tên `movierec`.
  2. Sửa biến `DATABASE_URL` trong file `backend/.env` thành:
     `DATABASE_URL=postgresql+psycopg://postgres:<mat_khau>@localhost:5432/movierec`
  3. Chạy `alembic upgrade head` và `python -m app.scripts.seed` để nạp dữ liệu vào PostgreSQL.

### 3. Hoàn thiện cuốn Báo cáo Word (`.docx`) & Slide Thuyết trình (`.pptx`)
- **Việc cần làm**:
  - Chụp ảnh màn hình các trang thực tế của web (Trang chủ Hero Banner, Tìm kiếm nhanh, Chi tiết phim có Trailer & Giải thích AI, Trang Gợi ý có Hồ sơ Gu Điện Ảnh, Trang Admin Biểu đồ thực nghiệm).
  - Copy các sơ đồ UML, bảng đặc tả 14 bảng CSDL từ `docs/SYSTEM_DESIGN_UML_AND_DB.md` và các biểu đồ trong `data/processed/figures/` + `artifacts/experiments/20261109-224136/figures/` vào file Word báo cáo theo đúng định dạng của khoa.

### 4. Các tính năng mở rộng tùy chọn (Nếu muốn nâng cấp thêm trong quá trình làm)
- [ ] **Bình luận & Đánh giá văn bản (User Reviews/Comments)**: Cho phép người dùng viết nhận xét cảm nghĩ bên dưới mỗi bộ phim ngoài việc chấm điểm sao.
- [ ] **Bộ lọc nâng cao kết hợp nhiều tiêu chí**: Lọc theo quốc gia, đạo diễn hoặc diễn viên.
- [ ] **Triển khai Online (Cloud Deployment)**: Đưa Frontend lên **Vercel** và Backend lên **Render / Railway** để có đường link Live Demo đính kèm trực tiếp vào CV.

---

## III. HƯỚNG DẪN BẬT LẠI WEB MỖI KHI MỞ MÁY
Mỗi khi bạn mở máy tính và muốn chạy lại trang web để xem hoặc code tiếp:
1. Vào thư mục: `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender`
2. Nhấp đúp chuột vào file **`run_web.bat`** (sẽ tự động bật cả Backend cổng `8000` và Frontend cổng `5173`).
3. Mở trình duyệt vào địa chỉ: **http://127.0.0.1:5173**
