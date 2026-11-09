# Hướng dẫn Đưa Dự án lên GitHub & Mẫu Mô tả Dự án trong CV (Resume)

**Sinh viên:** Phan Quốc Duy — **GitHub:** `https://github.com/Phanquocduy-23`

---

## 1. Mẫu ghi Dự án vào CV (Copy dùng ngay cho CV Thực tập / Fresher)

### 🇻🇳 Bản Tiếng Việt (Dùng cho CV Tiếng Việt)
> **MovieRec — Website Gợi ý Phim Cá nhân hóa Ứng dụng AI (Lọc Cộng tác)**  
> *Vai trò: Full-Stack & AI Developer (Đồ án cá nhân) | Công nghệ: Python, FastAPI, ReactJS, PostgreSQL, SQLAlchemy, Scikit-learn, SVD/KNN*  
> - **Xây dựng pipeline AI gợi ý đa nhánh:** Huấn luyện và đánh giá thực nghiệm 3 thuật toán (*Popularity Weighted Rating*, *Item-based KNN Adjusted Cosine*, và *Matrix Factorization SVD*) trên tập dữ liệu **MovieLens (100.836 đánh giá, 9.742 phim)** theo giao thức chia tập theo thời gian từng người dùng (70/15/15); đạt **RMSE = 0.8713** và **MAE = 0.6706** với SVD.
> - **Thiết kế kiến trúc phục vụ trực tuyến xử lý Cold-start:** Tự động điều phối giữa 3 nhánh (*Popularity* cho người dùng mới chưa chấm điểm $\rightarrow$ *Item-based KNN* chấm điểm tức thời kèm lời giải thích cho hồ sơ vừa cập nhật $\rightarrow$ *SVD* cho người dùng đã học vector ẩn), kết hợp bộ nhớ đệm LRU và tách biệt namespace (`ml:<id>` / `web:<id>`).
> - **Phát triển Full-Stack Web & Cổng Quản trị:** Thiết kế CSDL chuẩn hóa 3NF gồm **14 bảng** (Alembic Migration), xác thực **JWT/Bcrypt** phân quyền Role-based (`user`/`admin`), tích hợp **Model Registry** hỗ trợ huấn luyện nền bất đồng bộ, kiểm tra mô hình tự động và **Rollback** phiên bản an toàn; vượt qua **15/15** kịch bản kiểm thử tự động với `pytest`.

---

### 🌐 Bản Tiếng Anh (Dùng cho CV Tiếng Anh / Công ty Quốc tế)
> **MovieRec — AI-Powered Personalized Movie Recommendation Platform**  
> *Role: Full-Stack & ML Engineer (Solo Project) | Tech Stack: Python, FastAPI, React 18, PostgreSQL, SQLAlchemy 2.0, Scikit-learn, SVD, Pytest*  
> - **Engineered a Multi-Branch Collaborative Filtering Pipeline:** Implemented and benchmarked *Weighted Popularity*, *Item-based KNN (Adjusted Cosine)*, and *Matrix Factorization (SVD)* on **100,836 ratings across 9,742 movies (MovieLens)** using a leak-free per-user temporal split (70/15/15), achieving **0.8713 RMSE** and **0.6706 MAE**.
> - **Solved Real-Time Cold-Start & Explainable Serving:** Designed a hybrid online serving router that dynamically switches between *SVD* latent factors, real-time *Item-based KNN* profile scoring with *"Because you liked..."* explanations for newly rated items, and *Popularity* fallback, backed by version-aware LRU caching.
> - **Built Production-Grade Full-Stack Web & MLOps Admin Portal:** Architected a **14-table** 3NF schema with Alembic migrations, JWT/Bcrypt RBAC security, asynchronous background model training with pre-activation validation and 1-click **Model Rollback**, and an interactive React cinema UI; verified by **15/15** automated unit and API integration tests (`pytest`).

---

## 2. Quy trình Commit & Push tiếp theo trong quá trình làm đồ án

Mỗi khi bạn chỉnh sửa thêm code hoặc cập nhật báo cáo ở các tuần tiếp theo, chỉ cần mở Terminal tại thư mục `C:\Users\phanq\.gemini\antigravity\scratch\movie-recommender` và chạy 3 lệnh:

```powershell
git status
git add .
git commit -m "feat: mo ta ngan gon thay doi vua lam"
git push
```
