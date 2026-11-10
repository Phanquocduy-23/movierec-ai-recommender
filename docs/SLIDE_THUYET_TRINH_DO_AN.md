# NỘI DUNG SLIDE THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN CƠ SỞ 2 (12 SLIDES)

- **Sinh viên**: Phan Quốc Duy — **MSSV**: `235019` — **Lớp**: `DH23TIN05`
- **Đề tài**: Xây dựng website gợi ý phim cá nhân hóa ứng dụng trí tuệ nhân tạo sử dụng lọc cộng tác dựa trên đánh giá người dùng.

---

## Slide 1: Trang bìa
- **Tiêu đề**: XÂY DỰNG WEBSITE GỢI Ý PHIM CÁ NHÂN HÓA ỨNG DỤNG TRÍ TUỆ NHÂN TẠO SỬ DỤNG LỌC CỘNG TÁC DỰA TRÊN ĐÁNH GIÁ NGƯỜI DÙNG
- **Sinh viên thực hiện**: Phan Quốc Duy (`235019` – `DH23TIN05`)
- **Công nghệ cốt lõi**: ReactJS · FastAPI · PostgreSQL · SQLAlchemy · Item-Based KNN & SVD Matrix Factorization

---

## Slide 2: Đặt vấn đề & Mục tiêu đề tài
- **Bài toán thực tế**: Kho phim trực tuyến có hàng chục nghìn bộ phim $\rightarrow$ người dùng mất nhiều thời gian tìm kiếm (*Information Overload*).
- **Giải pháp**: Cá nhân hóa danh sách phim cho từng người dùng dựa trên lịch sử chấm điểm sao (`0.5` – `5.0`) và hành vi của cộng đồng.
- **Mục tiêu**:
  1. Huấn luyện & so sánh khách quan 3 mô hình: **Popularity (Baseline)**, **Item-based KNN**, **SVD**.
  2. Xây dựng Website hoàn chỉnh có khả năng gợi ý theo thời gian thực, giải thích lý do gợi ý và xử lý trọn vẹn bài toán **Người dùng mới (Cold-start)**.

---

## Slide 3: Kiến trúc Hệ thống 3 tầng
- **Frontend (ReactJS 18 + Vite)**: Giao diện khám phá phim, tìm kiếm tức thời, xem Trailer YouTube, chấm điểm & bình luận cộng đồng, biểu đồ Gu Điện Ảnh cá nhân và Cổng Quản trị Admin.
- **Backend (Python FastAPI + SQLAlchemy 2.0)**: RESTful API, xác thực **JWT + Bcrypt** phân quyền `user` / `admin`, quản lý phiên bản mô hình AI (`.pkl`) và huấn luyện nền.
- **Database (PostgreSQL / SQLite - 14 bảng chuẩn hóa)**: Tách biệt rõ ràng giữa dữ liệu huấn luyện gốc MovieLens (`dataset_ratings`) và tài khoản người dùng thực trên web (`users`, `ratings`).

---

## Slide 4: Bộ dữ liệu MovieLens & Tiền xử lý (EDA)
- **Nguồn dữ liệu**: Bộ dữ liệu chuẩn **MovieLens Latest Small** (GroupLens Research), kiểm tra toàn vẹn bằng `SHA-256`.
- **Quy mô sau làm sạch**:
  - **100.836** lượt đánh giá hợp lệ (`0.5` – `5.0` sao)
  - **9.742** bộ phim thuộc **20** thể loại (đã chuẩn hóa tên phim và ánh xạ `imdb_id` lấy ảnh poster thật)
  - **610** người dùng (Độ thưa ma trận: **98.30%**)
- **Chiến lược chia dữ liệu**: Chia theo thời gian trên từng người dùng (**Per-user Temporal Split 70/15/15** $\rightarrow$ `70.580` Train / `15.145` Val / `15.111` Test, `overlap = 0`) để chống rò rỉ dữ liệu tương lai (*Data Leakage*).
- *(Chèn hình `data/processed/figures/rating_distribution.png` và `long_tail.png`)*

---

## Slide 5: Thuật toán 1 — Lọc cộng tác dựa trên phim (Item-based KNN)
- **Độ tương đồng Adjusted Cosine**:
  $$s(i, j) = \frac{\sum_{u \in U_{ij}} (r_{ui} - \bar{r}_u)(r_{uj} - \bar{r}_u)}{\sqrt{\sum_{u \in U_{ij}} (r_{ui} - \bar{r}_u)^2}\sqrt{\sum_{u \in U_{ij}} (r_{uj} - \bar{r}_u)^2}} \cdot \frac{|U_{ij}|}{|U_{ij}| + \beta}$$
- **Ưu điểm nổi bật**:
  1. Khử được độ lệch do người dùng chấm điểm dễ tính hay khắt khe nhờ trừ đi $\bar{r}_u$.
  2. Cập nhật gợi ý **tức thì (Real-time)** ngay khi người dùng vừa chấm điểm phim mới mà không cần chờ huấn luyện lại mô hình.
  3. Cung cấp lời giải thích minh bạch: *"Gợi ý vì bạn đã thích bộ phim X"*.

---

## Slide 6: Thuật toán 2 — Phân rã ma trận (SVD Matrix Factorization)
- **Công thức dự đoán**:
  $$\hat{r}_{ui} = \mu + b_u + b_i + p_u^T q_i$$
- **Nguyên lý**: Chiếu người dùng ($p_u \in \mathbb{R}^f$) và bộ phim ($q_i \in \mathbb{R}^f$) vào không gian nhân tố tiềm ẩn chiều $f = 50$ có điều chuẩn $L_2$ ($\lambda = 0.05$).
- **Ưu điểm**: Khắc phục hiệu quả độ thưa 98.30% của ma trận đánh giá và nắm bắt được mối liên hệ tiềm ẩn giữa các thể loại phim.

---

## Slide 7: Kết quả Thực nghiệm & So sánh Mô hình
| Mô hình | Siêu tham số tối ưu | RMSE ($\downarrow$) | MAE ($\downarrow$) | Precision@10 ($\uparrow$) | Recall@10 ($\uparrow$) | Coverage |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Popularity (Baseline)** | `min_votes = 50` | 0.9613 | 0.7460 | 0.0589 | 0.0537 | 0.45% |
| **Item-based KNN** | `k = 40, shrinkage = 15` | 0.8926 | 0.6772 | 0.0369 | 0.0258 | **13.71%** |
| **SVD (Tốt nhất)** | `n_factors = 50, reg = 0.05` | **0.8884** | **0.6762** | **0.0680** | **0.0566** | 7.36% |

- *(Chèn hình `artifacts/experiments/20261109-224136/figures/rating_metrics.png` và `ranking_metrics.png`)*

---

## Slide 8: Cơ chế Gợi ý Hybrid 3 nhánh & Xử lý Cold-Start
1. **Nhánh Cold-start (`popular`)**: Khách chưa đăng nhập hoặc tài khoản mới có $< 3$ đánh giá $\rightarrow$ Gợi ý phim nổi bật theo trọng số Bayes.
2. **Nhánh Phản hồi tức thời (`item_knn`)**: Người dùng vừa chấm điểm mới trên web $\rightarrow$ Sử dụng ma trận tương đồng Item-KNN để đổi danh sách gợi ý ngay lập tức.
3. **Nhánh Cá nhân hóa sâu (`svd` + giải thích `item_knn`)**: Hồ sơ đã được học trong phiên bản mô hình SVD active $\rightarrow$ Xếp hạng bằng SVD và hiển thị lý do giải thích từ Item-KNN.

---

## Slide 9: Giao diện Người dùng (Live Demo)
- Trang chủ **Hero Spotlight Carousel** & kệ phim theo thể loại.
- Thanh **Tìm kiếm nhanh (Live Search)** có ảnh poster IMDb thật.
- Trang **Chi tiết phim**: Tóm tắt nội dung, Đạo diễn, Diễn viên, Giải thưởng, **Xem Trailer YouTube**, **Bình luận cộng đồng** và kệ **Phim tương tự**.
- Trang **Gợi ý cho bạn**: Thẻ **Hồ sơ Gu Điện Ảnh cá nhân** và nút chuyển đổi trực tiếp giữa các thuật toán AI.

---

## Slide 10: Phân hệ Quản trị viên (Admin Portal)
- Thống kê tổng quan hệ thống & biểu đồ phân bố dữ liệu.
- Quản lý CRUD danh mục Phim, Thể loại và Tài khoản người dùng.
- Quản lý phiên bản Mô hình AI: Kích hoạt **Huấn luyện lại (Retrain)** với siêu tham số tùy chỉnh và **Khôi phục phiên bản mô hình cũ (Rollback)** chỉ với 1 cú nhấp chuột.

---

## Slide 11: Kiểm thử Hệ thống (16/16 Pytest Passed)
- Kiểm thử đơn vị (Unit Test) các thuật toán gợi ý và độ đo đánh giá (`test_recsys.py`).
- Kiểm thử tích hợp (Integration Test) toàn bộ luồng API: Đăng ký/Đăng nhập JWT, phân quyền RBAC, chấm điểm, viết bình luận, cá nhân hóa gợi ý khác nhau giữa 2 user khác gu và huấn luyện lại mô hình (`test_api.py`).

---

## Slide 12: Kết luận & Hướng phát triển
- **Kết luận**: Hoàn thành 100% mục tiêu đề tài từ pipeline dữ liệu, huấn luyện đánh giá mô hình AI đến ứng dụng Web thực tế.
- **Hướng phát triển**: Kết hợp thêm Content-based Filtering (Embeddings nội dung phim + đạo diễn/diễn viên) và học tăng trưởng trực tuyến (Online Incremental Learning).
- **Cảm ơn thầy/cô và hội đồng đã lắng nghe!**
