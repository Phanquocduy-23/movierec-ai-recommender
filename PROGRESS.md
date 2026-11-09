# Nhật ký Tiến độ Đồ án Cơ sở 2 (Progress Log)

- **Sinh viên thực hiện:** Phan Quốc Duy — **MSSV:** `235019` — **Lớp:** `DH23TIN05`
- **Tên đề tài:** Xây dựng website gợi ý phim cá nhân hóa ứng dụng trí tuệ nhân tạo sử dụng lọc cộng tác dựa trên đánh giá người dùng.
- **Thư mục dự án:** `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender`
- **Cập nhật lần cuối:** `09/11/2026`

---

## 1. Công việc ĐÃ HOÀN THÀNH trong buổi ngày 09/11/2026

| Mã việc | Giai đoạn (Theo lộ trình) | Nội dung đã hoàn thành | Đầu ra / Bằng chứng trong dự án | Trạng thái |
|---|---|---|---|---|
| **W01** | Bước 1–3: Rà soát lộ trình & phạm vi | Rà soát lộ trình 14 phần, bổ sung 6 điểm kỹ thuật chống rủi ro (tương thích Python 3.14, đáp ứng đồng thời Sheet Phần mềm & Sheet AI, giải thích gợi ý, phát hiện đổi điểm sau train, Coverage, xóa mềm phim). | `docs/SYSTEM_DESIGN_UML_AND_DB.md` | ✅ Hoàn thành |
| **W02** | Bước 4–5: Tổ chức dự án & cấu hình | Hoàn thiện cấu trúc thư mục (`backend`, `frontend`, `recsys`, `ml`, `docs`, `scripts`), tạo `.gitignore`, `backend/.env`, `README.md`, script khởi động nhanh 1 chạm `run_web.bat`. | `.gitignore`, `README.md`, `run_web.bat`, `backend/.env` | ✅ Hoàn thành |
| **W03** | Bước 6–8: Dữ liệu MovieLens, EDA & Chia tập | Tải bộ dữ liệu `ml-latest-small` (9.742 phim, 100.836 đánh giá, 610 người dùng), lưu mã băm `SHA-256`, làm sạch 5 quy tắc, chạy thống kê EDA, vẽ 3 biểu đồ (`rating_distribution.png`, `long_tail.png`, `genre_ratings.png`), chia tập theo thời gian từng người dùng (70% Train = 70.580 / 15% Val = 15.145 / 15% Test = 15.111, chồng lấn = 0). | `ml/download_data.py`, `ml/prepare_data.py`, `data/raw/manifest.json`, `data/processed/eda_report.md`, `data/processed/split_manifest.json` | ✅ Hoàn thành |
| **W04** | Bước 9–13: Xây dựng 3 mô hình AI & Đánh giá | Cài đặt `PopularityRecommender` (Weighted Rating), `ItemKNNRecommender` (Adjusted Cosine + giải thích lý do), `SVDRecommender` (hỗ trợ cả `scikit-surprise` và bộ giải `scipy-svds-funk`). Chạy thực nghiệm `20261109-224136`, xuất bảng `RMSE`, `MAE`, `Precision@10`, `Recall@10`, `Coverage` và biểu đồ so sánh. | `recsys/algorithms.py`, `recsys/metrics.py`, `ml/train_evaluate.py`, `artifacts/experiments/20261109-224136/` | ✅ Hoàn thành |
| **W05** | Bước 14–15: Tích hợp phục vụ 3 nhánh & Quản lý Model | Xử lý 3 tình huống người dùng (Khách/Chưa chấm $\rightarrow$ Phổ biến; Mới chấm hoặc vừa sửa điểm sau lần train SVD $\rightarrow$ Item-based KNN trực tiếp từ hồ sơ; Đã có trong SVD $\rightarrow$ SVD). Tách namespace `ml:<id>` và `web:<id>`. Có `ModelRegistry`, LRU Cache, kiểm tra `validate_bundle` trước khi phát hành và chức năng Rollback. | `backend/app/services/recommender.py`, `backend/app/services/training.py` | ✅ Hoàn thành |
| **W06** | Bước 16–17: Thiết kế UML, CSDL 14 bảng & Migration | Thiết kế 14 bảng thuộc 6 nhóm nghiệp vụ trong SQLAlchemy 2.0, tạo file migration Alembic `0001_initial_schema.py`, viết tài liệu Chương 4 (Use Case, đặc tả 4 ca chính, Activity, 3 Sequence, ERD/PDM, chứng minh chuẩn hóa 1NF–3NF) và script backup/restore PostgreSQL. | `backend/app/models.py`, `backend/alembic/versions/0001_initial_schema.py`, `docs/SYSTEM_DESIGN_UML_AND_DB.md`, `scripts/backup_restore.ps1` | ✅ Hoàn thành |
| **W07** | Bước 18: Xây dựng Backend FastAPI | Hoàn thiện các nhóm API: `auth` (JWT + Bcrypt), `movies` (tìm kiếm, lọc, phân trang, phim tương tự, phân bố điểm), `ratings` & `watchlist` (kiểm tra chủ sở hữu từ JWT), `recommendations`, `admin` (thống kê, xuất CSV, CRUD phim/thể loại, quản lý người dùng Chính–Chi tiết, import job, train job). | `backend/app/main.py`, `backend/app/routers/*.py` | ✅ Hoàn thành |
| **W08** | Bước 19: Xây dựng Frontend ReactJS & Nâng cấp thực tế | Hoàn thiện toàn bộ trang người dùng & 7 trang quản trị (`AdminData`, `AdminModels`, `AdminExperiments`, `AdminUsers` Master-Detail...). Tích hợp **Poster & Ảnh nền thật cho 9.742 phim**, chuẩn hóa 1.544 tên phim đảo ngữ, thêm **Live Search trên Navbar**, **Banner Carousel 5 phim**, **Xem Trailer YouTube Modal**, **Tóm tắt/Đạo diễn/Diễn viên/Giải thưởng/Điểm IMDb**, **Hồ sơ Gu Phim**, **Kệ phim vừa xem**, và **Đăng nhập nhanh 1-chạm cho 4 kịch bản demo**. | `frontend/src/App.jsx`, `frontend/src/styles.css`, `frontend/src/components/ui.jsx`, `frontend/src/pages/*.jsx`, `frontend/src/pages/admin/*.jsx` | ✅ Hoàn thành |
| **W09** | Bước 20–21: Kiểm thử tự động (Unit & API Tests) | Chạy và vượt qua 100% (`15/15 passed`) bộ kiểm thử tự động `pytest` kiểm tra: đăng ký trùng, sai mật khẩu, token giả, quyền admin, thang điểm 0.5–5.0, chống truy cập chéo tài khoản (IDOR), import idempotent theo SHA-256, cold-start fallback, cá nhân hóa 2 gu khác nhau và rollback model. | `backend/tests/test_api.py`, `backend/tests/test_recsys.py` | ✅ Hoàn thành |
| **W10** | Bước 23–24: Kịch bản Demo & Hỏi đáp bảo vệ | Soạn kịch bản trình diễn 5–7 phút theo đúng luồng chấm điểm và bộ 10 câu hỏi – trả lời cốt lõi khi bảo vệ. | `docs/DEMO_AND_DEFENSE_QA.md` | ✅ Hoàn thành |

---

## 2. Nhật ký Lỗi đã gặp & Hướng giải quyết (Dùng làm tư liệu báo cáo)

1. **`scikit-surprise` chưa có wheel Cython biên dịch sẵn cho Python 3.14 trên Windows:**
   - *Nguyên nhân:* Máy phát triển cài Python 3.14, trong khi `scikit-surprise 1.1.4` cần trình biên dịch C++ hoặc Python 3.10–3.12.
   - *Giải quyết:* Thiết kế `SVDRecommender` tự động dùng `surprise.SVD` khi có mặt và dự phòng bằng thuật toán phân rã ma trận có điều chuẩn (`scipy.sparse.linalg.svds` kết hợp ước lượng lệch `b_u, b_i`) giúp huấn luyện 100.836 đánh giá trong `< 2 giây` và đạt `RMSE = 0.8713`.
2. **Thư viện `email-validator 2.3.0` chặn tên miền nội bộ `.local` trong kiểm thử:**
   - *Nguyên nhân:* `EmailStr` mặc định từ chối tên miền `.local` (`alice@test.local`, `admin@movierec.local`).
   - *Giải quyết:* Chuẩn hóa kiểm tra định dạng email trong `RegisterIn` (`schemas.py`) để hỗ trợ cả email thực tế lẫn tên miền demo cục bộ khi chạy offline.
3. **Lỗi mã hóa ký tự tiếng Việt `UnicodeEncodeError (cp1252)` trên cửa sổ lệnh Windows:**
   - *Giải quyết:* Bổ sung `sys.stdout.reconfigure(encoding="utf-8")` và biến môi trường `PYTHONUTF8=1` vào tất cả các script CLI (`download_data.py`, `prepare_data.py`, `train_evaluate.py`, `seed.py`).
4. **Dữ liệu gốc MovieLens không có sẵn URL ảnh poster và đảo mạo từ `, The` xuống cuối tên phim:**
   - *Giải quyết:* Viết hàm `normalize_article()` chuẩn hóa 1.544 tiêu đề phim và ánh xạ `imdb_id` trong `links.csv` sang CDN ảnh IMDb công khai (`images.metahub.space`) kèm thông tin mở rộng từ `v3-cinemeta.strem.io` (có cơ chế fallback an toàn khi mất mạng).

---

## 3. Các mục CÒN LẠI CHƯA XONG / Cần làm tiếp ở các buổi sau

| Mã việc | Hạng mục công việc | Việc cần thực hiện chi tiết | Người thực hiện | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| **T01** | **Xác nhận yêu cầu với Giảng viên** (Bước 1–2) | 1. Hỏi giảng viên xác nhận chấm theo **Sheet Phần mềm CS2** hay **Sheet KHMT - TTNT (AI)**.<br/>2. Lấy đúng file **Mẫu đề cương Chương 1 (C1)** từ giảng viên để điền và nộp duyệt đề cương. | **Duy** (hỏi thầy) + **Trợ lý AI** (hỗ trợ điền mẫu) | 🔴 Cao nhất | ⏳ Chờ xác nhận |
| **T02** | **Kết nối PostgreSQL 17 thật** (Bước 4 & 17) | 1. Hiện tại web đang chạy trên file `data/movierec.db` (SQLite) để xem ngay mà không cần mật khẩu `postgres`.<br/>2. Tạo user/db `movierec` trong PostgreSQL 17 trên máy, sửa `DATABASE_URL` trong `backend/.env` sang `postgresql+psycopg2://movierec:movierec@localhost:5432/movierec`.<br/>3. Chạy `alembic upgrade head`, `python -m app.scripts.seed all` và kiểm tra script `scripts/backup_restore.ps1`. | **Duy** + **Trợ lý AI** | 🔴 Cao | ⏳ Chưa làm |
| **T03** | **Chạy Full Grid Search cho Chương 5** (Bước 10–13) | 1. Hôm nay đã chạy `python ml/train_evaluate.py --quick` (1 cấu hình/mô hình).<br/>2. Cần chạy lệnh đầy đủ `python ml/train_evaluate.py` (không có `--quick`) để quét toàn bộ lưới tham số trong `ml/config.json` (`popular`: 4 cấu hình, `item_knn`: 6 cấu hình, `svd`: 4 cấu hình) và sinh biểu đồ `validation_grid.png` đầy đủ cho Chương 5.<br/>3. *(Tùy chọn)* Nếu muốn báo cáo chạy bằng `scikit-surprise` Cython gốc: cài thêm Python 3.11/3.12 tạo `.venv` riêng. | **Duy** + **Trợ lý AI** | 🟠 Trung bình – Cao | ⏳ Chưa làm |
| **T04** | **Quản lý mã nguồn Git / GitHub** (Bước 5) | 1. Chạy `git init` tại thư mục `movie-recommender`.<br/>2. Tạo các commit theo từng mốc (Data/EDA $\rightarrow$ AI Models $\rightarrow$ Backend/DB $\rightarrow$ Frontend UI $\rightarrow$ Tests/Docs) và đẩy lên GitHub cá nhân để làm bằng chứng quá trình làm đồ án. | **Duy** + **Trợ lý AI** | 🟠 Trung bình | ⏳ Chưa làm |
| **T05** | **Viết Báo cáo Word (6 chương, chuẩn QD 309)** (Bước 22) | 1. Chuyển nội dung từ `docs/SYSTEM_DESIGN_UML_AND_DB.md`, `data/processed/eda_report.md` và kết quả thực nghiệm sang file Word `.docx` 6 chương đúng định dạng **QD 309** (A4, Times New Roman 13, lề trái 3.5cm, phải 2cm, trên/dưới 2.5cm, giãn dòng 1.2).<br/>2. Chụp ảnh màn hình giao diện thực tế của web đưa vào Chương 5.<br/>3. Lập bảng phiếu kiểm thử (Test cases) đính kèm báo cáo. | **Duy** + **Trợ lý AI** | 🟠 Trung bình | ⏳ Chưa làm |
| **T06** | **Làm Slide thuyết trình & Tập dượt bảo vệ** (Bước 23–24) | 1. Tạo bộ Slide (12–15 trang) tóm tắt bài toán, kiến trúc, thuật toán Item-KNN & SVD, thiết kế CSDL, kết quả thực nghiệm.<br/>2. Tập chạy demo 5–7 phút theo `docs/DEMO_AND_DEFENSE_QA.md`. | **Duy** | 🟢 Giai đoạn cuối | ⏳ Chưa làm |
