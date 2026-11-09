# Kịch bản Demo Bảo vệ (5–7 phút) & Bộ Câu hỏi – Trả lời Phản biện

**Sinh viên:** Phan Quốc Duy — **MSSV:** `235019` — **Lớp:** `DH23TIN05`

---

## Phần 1: Kịch bản Demo Bảo vệ (5 – 7 phút)

> **Chuẩn bị trước giờ lên bảng 10 phút:**
> 1. Đã chạy `alembic upgrade head` và `python -m app.scripts.seed all` (đã có sẵn dữ liệu MovieLens, mô hình đã phát hành, 3 tài khoản demo và kết quả thực nghiệm trong `artifacts/experiments`).
> 2. Mở sẵn 2 tab trình duyệt: `http://localhost:5173` (Giao diện Web) và `http://localhost:8000/docs` (Swagger API).

### Phút 1: Giới thiệu & Trạng thái Cold-start (Khách / Tài khoản mới)
1. Mở Trang chủ ở chế độ chưa đăng nhập (hoặc đăng nhập `demo_new` / `Demo@123`).
2. Vào mục **Gợi ý cho bạn (`/recommendations`)**: chỉ rõ thông báo màu vàng **Dự phòng (Fallback) — Phương pháp đã dùng: Phổ biến**, giải thích rằng vì tài khoản chưa chấm điểm nào nên hệ thống không giả danh cá nhân hóa mà hiển thị bảng xếp hạng Weighted Rating kiểu IMDb.

### Phút 2–3: Chấm điểm thực tế & Cá nhân hóa tức thời bằng Item-based KNN
1. Vào trang **Khám phá (`/movies`)**, lọc thể loại `Action` hoặc `Animation`, vào trang Chi tiết 3–4 bộ phim (ví dụ *Toy Story*, *The Matrix*, *Inception*), chấm **4.5 – 5.0 sao** và bấm **"+ Muốn xem"**.
2. Quay lại trang **Gợi ý cho bạn (`/recommendations`)**:
   - Chỉ rõ trạng thái đã tự động chuyển sang **`Item-based KNN`** (không cần chờ train lại mô hình SVD).
   - Chỉ vào dòng giải thích dưới mỗi thẻ phim: **"Điểm dự đoán cho bạn: 4.xx — Vì bạn thích: Toy Story, The Matrix..."**.
   - Chuyển đổi qua lại giữa 3 tab **Tự động**, **Item-based KNN**, **Phổ biến (mốc so sánh)** để hội đồng thấy danh sách thay đổi rõ rệt.

### Phút 4: Đối chiếu hai tài khoản có gu trái ngược (SVD & Item-KNN)
1. Đăng xuất và đăng nhập lần lượt:
   - `demo_action` (`Demo@123` — thích *Action/Sci-Fi*, ghét *Romance*).
   - `demo_romance` (`Demo@123` — thích *Romance/Drama*, ghét *Horror*).
2. Mở trang **Gợi ý cho bạn**: chỉ rõ hai tài khoản nhận hai danh sách Top-10 hoàn toàn khác nhau, được phục vụ bởi mô hình **`SVD`** đã học vector ẩn sở thích, và không có bộ phim nào đã chấm bị lặp lại trong danh sách gợi ý.

### Phút 5–6: Quản trị hệ thống, Huấn luyện nền & Kết quả thực nghiệm
1. Đăng nhập tài khoản Quản trị (`admin` / `Admin@123`), vào mục **Quản trị (`/admin`)**:
   - **Thống kê:** Xem tổng số phim, số đánh giá MovieLens vs Web, biểu đồ phân bố điểm, biểu đồ thể loại, thống kê số lượt gọi từng nhánh AI và bấm **Xuất báo cáo phim (CSV)**.
   - **Người dùng (Form Chính – Chi tiết):** Bấm vào một người dùng ở bảng bên trái để xem ngay lịch sử đánh giá chi tiết ở khung bên phải.
   - **Huấn luyện & Mô hình (`/admin/models`):** Bấm chạy thử job huấn luyện hoặc bấm **Phát hành / Rollback** giữa các phiên bản mô hình.
   - **Kết quả thực nghiệm (`/admin/experiments`):** Trình bày bảng so sánh `Popular`, `Item-based KNN`, `SVD` trên 4 chỉ số `RMSE`, `MAE`, `Precision@10`, `Recall@10` và các biểu đồ Matplotlib.

---

## Phần 2: Bộ Câu hỏi & Câu trả lời Phản biện (Bước 24)

### Nhóm 1: Kiến thức AI & Thuật toán Gợi ý

**Câu 1: Gợi ý cá nhân hóa khác gợi ý theo độ phổ biến ở điểm nào?**
- **Trả lời:** Phương pháp theo độ phổ biến (Popularity) xếp hạng dựa trên trung bình có trọng số toàn cục $WR_i = \frac{v_i}{v_i+m} R_i + \frac{m}{v_i+m} C$, nên mọi người dùng đều nhận cùng một thứ tự phim (chỉ trừ những phim họ đã xem). Ngược lại, gợi ý cá nhân hóa (Item-based KNN và SVD) mô hình hóa sở thích riêng của từng người dùng $u$ đối với từng phim $i$, tạo ra danh sách Top-$N$ khác nhau cho từng gu thưởng thức.

**Câu 2: Item-based Collaborative Filtering khác User-based thế nào? Vì sao đề tài chọn Item-based?**
- **Trả lời:**
  - *User-based CF* tìm những người dùng có lịch sử chấm điểm giống người dùng hiện tại rồi lấy trung bình điểm của họ.
  - *Item-based CF* tính độ tương đồng giữa các bộ phim dựa trên tập người dùng cùng đánh giá hai phim đó.
  - Đề tài chọn **Item-based CF** vì: (1) Ma trận tương đồng giữa các phim ổn định hơn nhiều so với sở thích người dùng; (2) Giải quyết được bài toán **tài khoản web mới vừa chấm vài điểm**: chỉ cần nhân vector hồ sơ điểm mới với ma trận tương đồng phim đã tính sẵn là ra ngay gợi ý cá nhân hóa mà không phải huấn luyện lại toàn bộ mô hình; (3) Giải thích trực quan được lý do gợi ý (*"Vì bạn đã chấm điểm cao phim X tương đồng với phim này"*).

**Câu 3: Trong đồ án, độ tương đồng giữa hai phim của Item-based KNN được tính như thế nào?**
- **Trả lời:** Em sử dụng **Adjusted Cosine Similarity** (Cosine trên điểm đã trừ trung bình của từng người dùng $\tilde{r}_{ui} = r_{ui} - \mu_u$) nhằm khử độ lệch thang chấm dễ/khó giữa các người dùng khác nhau. Sau đó dùng `NearestNeighbors(metric="cosine", algorithm="brute")` của `scikit-learn` để giữ lại $k$ láng giềng có tương đồng dương lớn nhất cho mỗi phim, và dự đoán theo công thức:
  $$\hat{r}_{ui} = \mu_u + \frac{\sum_{j \in N_k(i) \cap I_u} s_{ij} (r_{uj} - \mu_u)}{\sum_{j \in N_k(i) \cap I_u} |s_{ij}| + \text{shrink}}$$

**Câu 4: Thuật toán SVD học những tham số nào và tối ưu hàm mục tiêu gì?**
- **Trả lời:** SVD (Funk-SVD trong `scikit-surprise`) xấp xỉ điểm đánh giá bằng:
  $$\hat{r}_{ui} = \mu + b_u + b_i + p_u^T q_i$$
  Trong đó $\mu$ là trung bình toàn cục, $b_u$ là độ lệch của người dùng $u$, $b_i$ là độ lệch của phim $i$, và $p_u, q_i \in \mathbb{R}^f$ là vector nhân tố ẩn (latent factors) biểu diễn sở thích người dùng và đặc trưng ẩn của phim. Các tham số $(b_u, b_i, p_u, q_i)$ được học bằng **Stochastic Gradient Descent (SGD)** tối thiểu hóa sai số bình phương có điều chuẩn $L_2$:
  $$\min \sum_{(u,i) \in \mathcal{K}} \left(r_{ui} - \hat{r}_{ui}\right)^2 + \lambda \left(b_u^2 + b_i^2 + \|p_u\|_2^2 + \|q_i\|_2^2\right)$$

---

### Nhóm 2: Dữ liệu, Chia tập & Chỉ số Đánh giá

**Câu 5: Tập dữ liệu được chia như thế nào? Vì sao không chia ngẫu nhiên mà chia theo thời gian từng người dùng?**
- **Trả lời:** Với mỗi người dùng, các đánh giá được sắp xếp tăng dần theo `timestamp` (nếu trùng `timestamp` thì phân định cố định bằng `movieId`), sau đó chia 70% đầu vào `train`, 15% tiếp theo vào `validation` và 15% mới nhất vào `test`. Chia theo thứ tự thời gian mô phỏng đúng bài toán thực tế: dùng lịch sử quá khứ để dự đoán hành vi tương lai của người dùng, tránh rò rỉ thông tin từ tương lai về quá khứ.

**Câu 6: Phim người dùng chưa đánh giá có phải là phim họ không thích không?**
- **Trả lời:** **Không.** Dữ liệu đánh giá bị thiếu không ngẫu nhiên (Missing Not At Random). Một bộ phim chưa được người dùng chấm điểm có thể do họ chưa biết đến hoặc chưa kịp xem, tuyệt đối không được gán nhãn âm (không thích) khi huấn luyện dự đoán điểm.

**Câu 7: RMSE/MAE khác Precision@10 và Recall@10 như thế nào? Vì sao phải dùng cả hai nhóm chỉ số?**
- **Trả lời:**
  - `RMSE` và `MAE` đo độ chính xác của **bài toán dự đoán điểm số** trên các cặp $(u, i)$ có điểm thật trong tập Test (RMSE phạt nặng các sai số lớn hơn MAE).
  - Tuy nhiên, trên giao diện web, người dùng quan tâm đến **danh sách Top-10 phim được gợi ý** có chứa những phim họ thực sự yêu thích ($\text{rating} \ge 4.0$) hay không. Đó là bài toán xếp hạng (Top-$N$ Ranking), được đo bằng:
    $$\text{Precision@10} = \frac{|\text{Top10}(u) \cap \text{Rel}(u)|}{10}, \quad \text{Recall@10} = \frac{|\text{Top10}(u) \cap \text{Rel}(u)|}{|\text{Rel}(u)|}$$
  - Kết hợp cả hai nhóm chỉ số giúp đánh giá toàn diện cả khả năng ước lượng điểm và chất lượng danh sách gợi ý thực tế.

---

### Nhóm 3: Tích hợp Web, Cold-start & Cơ sở dữ liệu

**Câu 8: Khi một người dùng mới vừa đăng ký tài khoản trên web và chấm 5 bộ phim, mô hình SVD có gợi ý cá nhân hóa cho họ ngay được không?**
- **Trả lời:** **Không thể dùng trực tiếp SVD ngay lúc đó**, vì tài khoản mới chưa xuất hiện trong tập dữ liệu ở lần huấn luyện SVD trước nên chưa có vector nhân tố ẩn $p_u$ và $b_u$. Nếu gọi SVD sẽ chỉ trả về điểm trung bình cộng độ lệch phim ($\mu + b_i$). Do đó, hệ thống được thiết kế **tự động chuyển sang nhánh Item-based KNN** để chấm điểm trực tiếp từ 5 bộ phim họ vừa đánh giá kết hợp với ma trận tương đồng phim $S$. Khi quản trị viên chạy job huấn luyện định kỳ tiếp theo, tài khoản này mới có vector $p_u$ trong SVD.

**Câu 9: Làm sao để ID người dùng đăng ký trên web (1, 2, 3...) không bị trùng và lấy nhầm lịch sử của người dùng số 1, 2, 3 trong bộ dữ liệu MovieLens?**
- **Trả lời:**
  1. Ở tầng Cơ sở dữ liệu: đánh giá gốc MovieLens được lưu ở bảng `dataset_ratings(source_user_id, ...)`, còn tài khoản thực trên web lưu ở bảng `users` và `ratings(user_id, ...)`.
  2. Ở tầng Huấn luyện AI (`load_training_frame`): mọi người dùng MovieLens được gắn tiền tố namespace `"ml:<id>"` (ví dụ `"ml:1"`), còn người dùng web được gắn tiền tố `"web:<id>"` (ví dụ `"web:1"`). Hai tập định danh hoàn toàn rời nhau.

**Câu 10: Phân quyền và bảo mật trong hệ thống được kiểm soát như thế nào?**
- **Trả lời:**
  1. Mật khẩu người dùng được băm một chiều có salt bằng `bcrypt` trước khi lưu vào PostgreSQL.
  2. Khi đăng nhập thành công, hệ thống cấp JWT có thời hạn (`exp`).
  3. Trên mọi API thao tác dữ liệu cá nhân (`ratings`, `watchlist`, `profile`), `user_id` luôn được trích xuất từ JWT đã xác thực tại Backend (`get_current_user`), không bao giờ nhận `user_id` từ phía client gửi lên, chống hoàn toàn lỗi IDOR (truy cập/sửa xóa dữ liệu của người khác).
  4. Mọi API `/api/admin/*` đều qua dependency `require_admin` kiểm tra trực tiếp vai trò của người dùng trong CSDL.
