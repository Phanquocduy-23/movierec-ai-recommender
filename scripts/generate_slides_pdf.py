"""Tự động sinh bộ Slide Thuyết trình Bảo vệ Đồ án cơ sở 2 (12 trang Widescreen 16:9 PDF) kèm biểu đồ thực nghiệm."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import matplotlib
matplotlib.use("Agg")
import matplotlib.image as mpimg
import matplotlib.patches as patches
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

ROOT = Path(__file__).resolve().parents[1]
OUT_PDF = ROOT / "docs" / "Slide_Thuyet_Trinh_Do_An_CS2_Phan_Quoc_Duy_235019.pdf"
EDA_FIG_DIR = ROOT / "data" / "processed" / "figures"
EXP_DIR = ROOT / "artifacts" / "experiments"


def find_latest_exp_fig_dir() -> Path | None:
    if not EXP_DIR.exists():
        return None
    runs = sorted([d for d in EXP_DIR.iterdir() if d.is_dir()], reverse=True)
    for r in runs:
        fdir = r / "figures"
        if fdir.exists():
            return fdir
    return None


def new_slide(slide_num: int, total: int = 12, title: str = "", subtitle: str = ""):
    fig = plt.figure(figsize=(13.33, 7.5), dpi=150)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9)
    ax.axis("off")
    fig.patch.set_facecolor("#0B1120")
    ax.add_patch(patches.Rectangle((0, 0), 16, 9, facecolor="#0B1120"))

    # Thanh header trang trí
    ax.add_patch(patches.Rectangle((0, 8.82), 16, 0.18, facecolor="#6366F1"))
    # Footer
    ax.add_patch(patches.Rectangle((0, 0), 16, 0.55, facecolor="#0F172A"))
    ax.text(0.6, 0.27, "Đồ án cơ sở 2  |  Phan Quốc Duy — MSSV: 235019 — Lớp: DH23TIN05",
            color="#94A3B8", fontsize=10, va="center")
    ax.text(15.4, 0.27, f"Slide {slide_num} / {total}",
            color="#F59E0B", fontsize=10.5, fontweight="bold", va="center", ha="right")

    if title:
        ax.text(0.8, 8.1, title, color="#F8FAFC", fontsize=22, fontweight="bold", va="top")
    if subtitle:
        ax.text(0.8, 7.45, subtitle, color="#38BDF8", fontsize=13, va="top")
    return fig, ax


def add_bullets(ax, items: list[str], x: float = 0.9, y_start: float = 6.7, step: float = 0.85, fontsize: int = 13.5):
    y = y_start
    for it in items:
        ax.add_patch(patches.Circle((x, y - 0.12), 0.09, facecolor="#F59E0B"))
        ax.text(x + 0.3, y, it, color="#E2E8F0", fontsize=fontsize, va="top")
        y -= step


def add_image_on_slide(fig, img_path: Path | None, rect: list[float]):
    if img_path and img_path.exists():
        sub = fig.add_axes(rect)
        sub.imshow(mpimg.imread(str(img_path)))
        sub.axis("off")


def build_slides() -> Path:
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    exp_fig_dir = find_latest_exp_fig_dir()

    with PdfPages(str(OUT_PDF)) as pdf:
        # SLIDE 1: Trang bìa
        fig, ax = new_slide(1)
        ax.add_patch(patches.FancyBboxPatch((1.2, 1.5), 13.6, 6.2, boxstyle="round,pad=0.3",
                                            facecolor="#111827", edgecolor="#4F46E5", linewidth=2.5))
        ax.text(8, 6.7, "BÁO CÁO ĐỒ ÁN CƠ SỞ 2", color="#38BDF8", fontsize=18, fontweight="bold", ha="center")
        ax.text(8, 5.4, "XÂY DỰNG WEBSITE GỢI Ý PHIM CÁ NHÂN HÓA\nỨNG DỤNG TRÍ TUỆ NHÂN TẠO SỬ DỤNG LỌC CỘNG TÁC\nDỰA TRÊN ĐÁNH GIÁ NGƯỜI DÙNG",
                color="#FFFFFF", fontsize=22, fontweight="bold", ha="center", va="center")
        ax.text(8, 3.3, "Sinh viên thực hiện: Phan Quốc Duy\nMSSV: 235019   |   Lớp: DH23TIN05",
                color="#F59E0B", fontsize=16, fontweight="bold", ha="center", va="center")
        ax.text(8, 2.1, "Tech Stack: ReactJS 18 · FastAPI · PostgreSQL · SQLAlchemy 2.0 · Item-KNN & SVD",
                color="#94A3B8", fontsize=12.5, ha="center")
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 2: Đặt vấn đề & Mục tiêu
        fig, ax = new_slide(2, title="1. ĐẶT VẤN ĐỀ & MỤC TIÊU ĐỀ TÀI",
                            subtitle="Giải quyết bài toán quá tải thông tin (Information Overload) trên nền tảng phim trực tuyến")
        add_bullets(ax, [
            "Kho phim trực tuyến có hàng chục nghìn bộ phim → người dùng khó tự tìm được phim hợp sở thích cá nhân.",
            "Mục tiêu 1: Xây dựng pipeline làm sạch dữ liệu MovieLens (100.836 lượt đánh giá, 9.742 phim, 610 người dùng).",
            "Mục tiêu 2: Cài đặt & so sánh thực nghiệm 3 phương pháp: Popularity (Baseline), Item-based KNN và SVD.",
            "Mục tiêu 3: Đánh giá khách quan bằng cả độ đo dự đoán điểm (RMSE, MAE) và xếp hạng Top-10 (Precision@10, Recall@10).",
            "Mục tiêu 4: Phát triển Website hoàn chỉnh (User + Admin), xử lý trọn vẹn bài toán Người dùng mới (Cold-Start).",
        ])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 3: Kiến trúc hệ thống 3 tầng
        fig, ax = new_slide(3, title="2. KIẾN TRÚC TỔNG THỂ HỆ THỐNG (3 TẦNG)",
                            subtitle="Thiết kế tách biệt Frontend ReactJS SPA — Backend FastAPI — Cơ sở dữ liệu 14 bảng")
        add_image_on_slide(fig, EDA_FIG_DIR / "architecture_diagram.png", [0.06, 0.14, 0.88, 0.62])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 4: Bộ dữ liệu MovieLens & Tiền xử lý EDA
        fig, ax = new_slide(4, title="3. DỮ LIỆU MOVIELENS & CHIA TẬP THEO THỜI GIAN",
                            subtitle="Kiểm tra toàn vẹn SHA-256 và chia Per-user Temporal Split (70% Train / 15% Val / 15% Test)")
        add_bullets(ax, [
            "Tổng số đánh giá hợp lệ: 100.836 lượt (thang 0.5 – 5.0 sao) trên 9.742 phim (20 thể loại).",
            "Độ thưa ma trận (Sparsity): 98.30% — chuẩn hóa 1.544 tên phim & gắn mã IMDb lấy poster thật.",
            "Chia theo thời gian từng người dùng (overlap = 0): Train (70.580) · Val (15.145) · Test (15.111).",
        ], y_start=6.8, step=0.65, fontsize=12.5)
        add_image_on_slide(fig, EDA_FIG_DIR / "rating_distribution.png", [0.05, 0.12, 0.43, 0.42])
        add_image_on_slide(fig, EDA_FIG_DIR / "long_tail.png", [0.52, 0.12, 0.43, 0.42])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 5: Thuật toán Lọc cộng tác Item-based KNN
        fig, ax = new_slide(5, title="4. THUẬT TOÁN 1: LỌC CỘNG TÁC ITEM-BASED KNN",
                            subtitle="Sử dụng độ tương đồng Adjusted Cosine kết hợp tham số co rút (Shrinkage)")
        add_bullets(ax, [
            "Trừ trung bình đánh giá của từng người dùng (r_bar_u) trước khi tính Cosine giữa 2 phim i và j.",
            "Khử hoàn toàn sự thiên lệch giữa người chấm điểm dễ tính và người chấm điểm khắt khe.",
            "Áp dụng hệ số co rút (Shrinkage beta = 15) để tránh nhiễu khi hai phim có quá ít người cùng chấm.",
            "Cập nhật gợi ý TỨC THỜI (Real-time) ngay khi người dùng vừa chấm điểm mới mà không cần chờ train lại.",
            "Cung cấp lời giải thích minh bạch trên giao diện: “Gợi ý vì bạn đã thích bộ phim X”.",
        ])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 6: Thuật toán Phân rã ma trận SVD
        fig, ax = new_slide(6, title="5. THUẬT TOÁN 2: PHÂN RÃ MA TRẬN SVD",
                            subtitle="Chiếu người dùng và phim vào không gian nhân tố tiềm ẩn (Latent Factors f = 50)")
        add_bullets(ax, [
            "Công thức dự đoán điểm:  r_hat(u, i) = mu + b_u + b_i + p_u^T * q_i",
            "Trong đó mu là trung bình toàn cục, b_u là độ lệch người dùng, b_i là độ lệch bộ phim.",
            "Vector nhân tố ẩn người dùng p_u và vector nhân tố ẩn bộ phim q_i có số chiều f = 50.",
            "Tối ưu hàm mục tiêu bình phương tối thiểu có điều chuẩn L2 (reg = 0.05) chống quá khớp (Overfitting).",
            "Khắc phục xuất sắc độ thưa 98.30% của ma trận đánh giá và đạt độ chính xác dự đoán cao nhất.",
        ])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 7: Kết quả thực nghiệm trên tập Test
        fig, ax = new_slide(7, title="6. KẾT QUẢ THỰC NGHIỆM TRÊN TẬP TEST",
                            subtitle="SVD đạt sai số thấp nhất (RMSE = 0.8884) và chất lượng xếp hạng Top-10 cao nhất (P@10 = 0.0680)")
        add_bullets(ax, [
            "Popularity (min_votes=50):   RMSE = 0.9613  |  MAE = 0.7460  |  P@10 = 0.0589  |  Coverage = 0.45%",
            "Item-based KNN (k=40, B=15): RMSE = 0.8926  |  MAE = 0.6772  |  P@10 = 0.0369  |  Coverage = 13.71%",
            "SVD (n_factors=50, reg=0.05): RMSE = 0.8884  |  MAE = 0.6762  |  P@10 = 0.0680  |  Coverage = 7.36%",
        ], y_start=6.85, step=0.6, fontsize=12.5)
        if exp_fig_dir:
            add_image_on_slide(fig, exp_fig_dir / "rating_metrics.png", [0.05, 0.12, 0.43, 0.43])
            add_image_on_slide(fig, exp_fig_dir / "ranking_metrics.png", [0.52, 0.12, 0.43, 0.43])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 8: Luồng gợi ý Hybrid 3 nhánh & Cold-start
        fig, ax = new_slide(8, title="7. LUỒNG GỢI Ý THÔNG MINH 3 NHÁNH & XỬ LÝ COLD-START",
                            subtitle="Tự động chuyển đổi linh hoạt giữa Popularity, Item-based KNN và SVD theo trạng thái hồ sơ")
        add_image_on_slide(fig, EDA_FIG_DIR / "cold_start_flow.png", [0.06, 0.14, 0.88, 0.62])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 9: Thiết kế Cơ sở dữ liệu 14 bảng
        fig, ax = new_slide(9, title="8. THIẾT KẾ CƠ SỞ DỮ LIỆU QUAN HỆ (14 BẢNG)",
                            subtitle="Chuẩn hóa với SQLAlchemy 2.0 ORM & Alembic Migration — Tách biệt dữ liệu MovieLens và Web")
        add_bullets(ax, [
            "Nhóm Tài khoản & Phân quyền (2 bảng): roles, users (mật khẩu Bcrypt, JWT RBAC user/admin).",
            "Nhóm Danh mục Phim (4 bảng): movies, genres, movie_genres, movie_links (IMDb ttXXXXXXX & TMDB).",
            "Nhóm Tương tác Người dùng (2 bảng): ratings (điểm 0.5–5.0 + bình luận comment), watchlist_items.",
            "Nhóm Dữ liệu Nguồn (3 bảng): dataset_versions (SHA-256), dataset_ratings (100.836 dòng), import_jobs.",
            "Nhóm Mô hình AI & Thực nghiệm (3 bảng): model_versions, training_runs, evaluation_results, recommendation_events.",
        ])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 10: Tính năng nổi bật giao diện Người dùng
        fig, ax = new_slide(10, title="9. TÍNH NĂNG GIAO DIỆN NGƯỜI DÙNG (REACTJS 18)",
                            subtitle="Trải nghiệm hoàn chỉnh như một nền tảng khám phá điện ảnh thực tế")
        add_bullets(ax, [
            "Hero Spotlight Carousel, Tìm kiếm nhanh tức thì (Ctrl+K) có ảnh Poster IMDb thật cho 9.742 phim.",
            "Trang Chi tiết phim: Tóm tắt nội dung, Đạo diễn, Diễn viên, Giải thưởng, Xem Trailer YouTube & Bình luận Cộng đồng.",
            "Phòng Thí Nghiệm AI: Đối chiếu trực tiếp 3 cột SVD vs. Item-KNN vs. Popularity song song trên 1 màn hình.",
            "Khám phá theo Tâm Trạng (Mood Matcher), Bốc thăm phim ngẫu nhiên & Khởi tạo nhanh Cold-Start 1-click.",
            "Dashboard Hồ sơ Cá nhân: Thống kê phong cách chấm điểm, biểu đồ thập niên yêu thích & Xuất CSV/Excel.",
        ])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 11: Phân hệ Quản trị Admin & Kiểm thử tự động
        fig, ax = new_slide(11, title="10. CỔNG QUẢN TRỊ ADMIN & KIỂM THỬ TỰ ĐỘNG",
                            subtitle="7 phân hệ Quản trị viên + Vượt qua 16/16 kịch bản kiểm thử tự động Pytest (100% PASSED)")
        add_bullets(ax, [
            "Admin Portal 7 phân hệ: Thống kê tổng quan, Quản lý Phim, Thể loại, Người dùng, Nạp CSV, Mô hình AI, Thực nghiệm.",
            "Cho phép Admin kích hoạt Huấn luyện lại mô hình (Retrain) trên nền và Khôi phục phiên bản cũ (Rollback).",
            "16/16 bài kiểm thử tự động Pytest PASSED: Kiểm thử thuật toán, JWT RBAC, Cold-start, Bình luận & Retrain.",
            "Đóng gói sẵn Docker Compose (PostgreSQL 16 + FastAPI + React) và GitHub Actions CI/CD.",
        ])
        pdf.savefig(fig)
        plt.close(fig)

        # SLIDE 12: Kết luận & Hướng phát triển
        fig, ax = new_slide(12, title="11. KẾT LUẬN & HƯỚNG PHÁT TRIỂN",
                            subtitle="Tổng kết kết quả đạt được và định hướng mở rộng nghiên cứu")
        add_bullets(ax, [
            "Đã hoàn thành 100% mục tiêu đề tài từ pipeline dữ liệu MovieLens, huấn luyện AI đến ứng dụng Web thực tế.",
            "Chứng minh thực nghiệm SVD và Item-based KNN vượt trội hơn hẳn phương pháp gợi ý theo độ phổ biến.",
            "Kết hợp hài hòa giữa độ chính xác của SVD và khả năng phản hồi tức thời + giải thích minh bạch của Item-KNN.",
            "Hướng phát triển: Tích hợp thêm Content-based Filtering (Embeddings nội dung phim) & Học trực tuyến (Online Learning).",
        ], y_start=6.7, step=0.8)
        ax.text(8, 2.0, "CẢM ƠN THẦY/CÔ VÀ HỘI ĐỒNG ĐÃ LẮNG NGHE!",
                color="#F59E0B", fontsize=20, fontweight="bold", ha="center")
        pdf.savefig(fig)
        plt.close(fig)

    return OUT_PDF


if __name__ == "__main__":
    out = build_slides()
    print(f"[OK] Đã xuất bộ Slide thuyết trình 12 trang PDF tại: {out}")
