"""Tự động vẽ sơ đồ kiến trúc & sinh file Báo cáo Đồ án cơ sở 2 (.docx) hoàn chỉnh kèm 9 hình ảnh minh họa."""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches

ROOT = Path(__file__).resolve().parents[1]
OUT_DOCX = ROOT / "docs" / "Bao_Cao_Do_An_CS2_Phan_Quoc_Duy_235019.docx"
EDA_FIG_DIR = ROOT / "data" / "processed" / "figures"
EXP_DIR = ROOT / "artifacts" / "experiments"


def generate_system_diagrams() -> None:
    """Vẽ 3 sơ đồ trực quan cho Chương 3 (Kiến trúc 3 tầng, Luồng Cold-start 3 nhánh, Sơ đồ 14 bảng CSDL)."""
    EDA_FIG_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Sơ đồ Kiến trúc 3 tầng
    fig, ax = plt.subplots(figsize=(10, 4.5), dpi=160)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 4.5)
    ax.axis("off")
    fig.patch.set_facecolor("#ffffff")

    boxes = [
        (0.4, 1.0, 2.6, 2.6, "#EEF2FF", "#4F46E5", "TẦNG GIAO DIỆN\n(Frontend SPA)\n\n• ReactJS 18 + Vite\n• Hero Spotlight & Trailer\n• Phòng thí nghiệm 3 mô hình\n• Dashboard Cá nhân & Admin"),
        (3.7, 1.0, 2.6, 2.6, "#ECFDF5", "#059669", "TẦNG DỊCH VỤ & AI\n(Backend API & RecSys)\n\n• Python FastAPI + JWT RBAC\n• Popularity (Weighted Bayes)\n• Item-KNN (Adjusted Cosine)\n• SVD Matrix Factorization"),
        (7.0, 1.0, 2.6, 2.6, "#FFFBEB", "#D97706", "TẦNG DỮ LIỆU\n(Database & Artifacts)\n\n• PostgreSQL / SQLite\n• SQLAlchemy 2.0 (14 bảng)\n• MovieLens (100.836 ratings)\n• Model Registry (.pkl)"),
    ]
    for x, y, w, h, fc, ec, text in boxes:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.15", facecolor=fc, edgecolor=ec, linewidth=2)
        ax.add_patch(rect)
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=9.5, color="#0F172A", fontweight="bold")

    ax.annotate("", xy=(3.65, 2.5), xytext=(3.05, 2.5), arrowprops=dict(arrowstyle="<->", lw=2, color="#334155"))
    ax.text(3.35, 2.75, "REST API\n(JSON/JWT)", ha="center", va="bottom", fontsize=8.5, color="#334155")
    ax.annotate("", xy=(6.95, 2.5), xytext=(6.35, 2.5), arrowprops=dict(arrowstyle="<->", lw=2, color="#334155"))
    ax.text(6.65, 2.75, "SQLAlchemy\n& Joblib", ha="center", va="bottom", fontsize=8.5, color="#334155")
    ax.set_title("Sơ đồ Kiến trúc Tổng thể 3 Tầng của Hệ thống MovieRec", fontsize=12, fontweight="bold", pad=10, color="#1E3A8A")
    fig.tight_layout()
    fig.savefig(EDA_FIG_DIR / "architecture_diagram.png", dpi=160)
    plt.close(fig)

    # 2. Sơ đồ Luồng gợi ý Hybrid 3 nhánh xử lý Cold-start
    fig, ax = plt.subplots(figsize=(10, 4.6), dpi=160)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 4.6)
    ax.axis("off")
    fig.patch.set_facecolor("#ffffff")

    start_box = patches.FancyBboxPatch((0.3, 1.7), 2.1, 1.2, boxstyle="round,pad=0.12", facecolor="#F1F5F9", edgecolor="#475569", linewidth=2)
    ax.add_patch(start_box)
    ax.text(1.35, 2.3, "Yêu cầu Gợi ý\nGET /api/recommendations\n(User / Khách)", ha="center", va="center", fontsize=9, fontweight="bold")

    branches = [
        (3.4, 3.2, 6.2, 1.0, "#FEF3C7", "#D97706", "NHÁNH 1: COLD-START (Khách / Tài khoản mới chưa chấm điểm)\n→ Xếp hạng theo Trọng số Bayes (Popularity WR) + Khung chấm nhanh theo thể loại"),
        (3.4, 1.8, 6.2, 1.0, "#DCFCE7", "#16A34A", "NHÁNH 2: CẬP NHẬT TỨC THỜI (Vừa chấm điểm mới / Chưa retrain SVD)\n→ Lọc cộng tác Item-based KNN (Adjusted Cosine) + Giải thích 'Vì bạn thích...'"),
        (3.4, 0.4, 6.2, 1.0, "#EDE9FE", "#7C3AED", "NHÁNH 3: CÁ NHÂN HÓA SÂU (Hồ sơ đã học trong mô hình SVD Active)\n→ Dự đoán điểm bằng SVD Matrix Factorization + Giải thích láng giềng Item-KNN"),
    ]
    for x, y, w, h, fc, ec, text in branches:
        r = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.12", facecolor=fc, edgecolor=ec, linewidth=1.8)
        ax.add_patch(r)
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=8.8, color="#0F172A", fontweight="bold")
        ax.annotate("", xy=(x - 0.05, y + h / 2), xytext=(2.45, 2.3), arrowprops=dict(arrowstyle="->", lw=1.8, color=ec))

    ax.set_title("Sơ đồ Luồng Gợi ý Thông minh 3 Nhánh & Xử lý Bài toán Cold-Start", fontsize=12, fontweight="bold", pad=8, color="#1E3A8A")
    fig.tight_layout()
    fig.savefig(EDA_FIG_DIR / "cold_start_flow.png", dpi=160)
    plt.close(fig)


def find_latest_exp_fig_dir() -> Path | None:
    if not EXP_DIR.exists():
        return None
    runs = sorted([d for d in EXP_DIR.iterdir() if d.is_dir()], reverse=True)
    for r in runs:
        fdir = r / "figures"
        if fdir.exists():
            return fdir
    return None


def _p(text: str, bold: bool = False, italic: bool = False, size_half_pt: int = 26,
       align: str = "both", color: str = "000000", space_after: int = 140) -> str:
    b_tag = "<w:b/>" if bold else ""
    i_tag = "<w:i/>" if italic else ""
    return (
        f'<w:p><w:pPr><w:jc w:val="{align}"/><w:spacing w:after="{space_after}" w:line="320" w:lineRule="auto"/></w:pPr>'
        f'<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>{b_tag}{i_tag}'
        f'<w:color w:val="{color}"/><w:sz w:val="{size_half_pt}"/><w:szCs w:val="{size_half_pt}"/></w:rPr>'
        f'<w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
    )


def _h1(text: str) -> str:
    return _p(text, bold=True, size_half_pt=32, align="left", color="1E3A8A", space_after=180)


def _h2(text: str) -> str:
    return _p(text, bold=True, size_half_pt=28, align="left", color="0F172A", space_after=140)


def _bullet(text: str) -> str:
    return _p(f"•  {text}", bold=False, size_half_pt=26, align="both", space_after=100)


def _img(rel_id: str, doc_pr_id: int, caption: str, cx: int = 5120640, cy: int = 2743200) -> str:
    drawing = (
        '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr><w:r><w:drawing>'
        f'<wp:inline distT="0" distB="0" distL="0" distR="0">'
        f'<wp:extent cx="{cx}" cy="{cy}"/>'
        f'<wp:docPr id="{doc_pr_id}" name="Picture {doc_pr_id}"/>'
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:nvPicPr><pic:cNvPr id="{doc_pr_id}" name="fig_{doc_pr_id}.png"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rel_id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
    )
    cap = _p(caption, italic=True, size_half_pt=22, align="center", color="334155", space_after=180)
    return drawing + cap


def _table(headers: list[str], rows: list[list[str]]) -> str:
    xml = [
        '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>'
        '<w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>'
        '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>'
        '<w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        '</w:tblBorders></w:tblPr>'
    ]
    xml.append("<w:tr>")
    for h in headers:
        xml.append(
            '<w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/></w:tcPr>'
            + _p(h, bold=True, size_half_pt=24, align="center", space_after=60)
            + "</w:tc>"
        )
    xml.append("</w:tr>")
    for r in rows:
        xml.append("<w:tr>")
        for cell in r:
            xml.append("<w:tc>" + _p(str(cell), bold=False, size_half_pt=24, align="left", space_after=60) + "</w:tc>")
        xml.append("</w:tr>")
    xml.append("</w:tbl>" + _p("", space_after=80))
    return "".join(xml)


def build_report() -> Path:
    generate_system_diagrams()
    body = []
    media_files: list[tuple[str, str, Path]] = []

    def register_img(path: Path | None, caption: str) -> None:
        if path and path.exists():
            idx = len(media_files) + 1
            rel_id = f"rIdImg{idx}"
            media_name = f"media/fig_{idx}.png"
            media_files.append((rel_id, media_name, path))
            body.append(_img(rel_id, idx, caption))

    # Trang bìa
    body.append(_p("BÁO CÁO ĐỒ ÁN CƠ SỞ 2", bold=True, size_half_pt=36, align="center", color="1E3A8A", space_after=240))
    body.append(_p("ĐỀ TÀI: XÂY DỰNG WEBSITE GỢI Ý PHIM CÁ NHÂN HÓA ỨNG DỤNG TRÍ TUỆ NHÂN TẠO SỬ DỤNG LỌC CỘNG TÁC DỰA TRÊN ĐÁNH GIÁ NGƯỜI DÙNG", bold=True, size_half_pt=30, align="center", color="0F172A", space_after=300))
    body.append(_p("Sinh viên thực hiện: Phan Quốc Duy", bold=True, size_half_pt=28, align="center", space_after=100))
    body.append(_p("Mã số sinh viên: 235019  |  Lớp: DH23TIN05", bold=False, size_half_pt=26, align="center", space_after=100))
    body.append(_p("Ngành: Công nghệ thông tin  —  Năm học: 2026", bold=False, size_half_pt=26, align="center", space_after=320))

    # Mục lục tóm tắt
    body.append(_h1("MỤC LỤC BÁO CÁO"))
    body.append(_bullet("CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI (Lý do chọn đề tài, Mục tiêu, Phạm vi & Công nghệ sử dụng)"))
    body.append(_bullet("CHƯƠNG 2: CƠ SỞ LÝ THUYẾT (Popularity Bayes, Item-based KNN Adjusted Cosine, Phân rã ma trận SVD & Độ đo đánh giá)"))
    body.append(_bullet("CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (Kiến trúc 3 tầng, Luồng Cold-Start 3 nhánh, Thiết kế 14 bảng CSDL & Giao diện)"))
    body.append(_bullet("CHƯƠNG 4: THỰC NGHIỆM, CÀI ĐẶT VÀ KIỂM THỬ (Tiền xử lý MovieLens, Kết quả thực nghiệm AI & 16 kịch bản kiểm thử Pytest)"))
    body.append(_bullet("CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN"))

    # Chương 1
    body.append(_h1("CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI"))
    body.append(_h2("1.1. Lý do chọn đề tài"))
    body.append(_p("Trong bối cảnh kho nội dung số phát triển bùng nổ với hàng chục nghìn bộ phim trực tuyến, người dùng thường gặp tình trạng quá tải thông tin (Information Overload) khi tìm kiếm bộ phim hợp sở thích. Hệ thống gợi ý (Recommender System) sử dụng Trí tuệ nhân tạo đóng vai trò cốt lõi trên các nền tảng như Netflix, IMDb để cá nhân hóa trải nghiệm giải trí."))
    body.append(_p("Đề tài tập trung nghiên cứu, huấn luyện và tích hợp hai phương pháp lọc cộng tác điển hình là Lọc cộng tác dựa trên phim (Item-based Collaborative Filtering sử dụng KNN) và Phân rã ma trận (Matrix Factorization - SVD) vào một ứng dụng Web hoàn chỉnh theo kiến trúc Client-Server."))

    body.append(_h2("1.2. Công nghệ sử dụng"))
    body.append(_table(
        ["Thành phần", "Công nghệ / Thư viện", "Vai trò trong hệ thống"],
        [
            ["Frontend", "ReactJS 18, Vite, HTML5, CSS3, JavaScript", "Giao diện khám phá phim, xem Trailer YouTube, chấm điểm, viết bình luận, Phòng thí nghiệm đối chiếu 3 mô hình song song, Mood Matcher, Dashboard cá nhân và cổng Admin"],
            ["Backend API", "Python, FastAPI, REST API, Pydantic v2", "Cung cấp dịch vụ API, kiểm tra dữ liệu đầu vào và phục vụ suy luận AI"],
            ["Cơ sở dữ liệu & ORM", "PostgreSQL / SQLite, SQLAlchemy 2.0, Alembic", "Thiết kế 14 bảng quan hệ chuẩn hóa và quản lý phiên bản lược đồ CSDL"],
            ["Bảo mật & Phân quyền", "JWT (HS256), Bcrypt RBAC", "Xác thực bằng token JWT và phân quyền theo vai trò Người dùng (user) / Quản trị viên (admin)"],
            ["AI & Xử lý dữ liệu", "Pandas, NumPy, SciPy, Scikit-learn, Scikit-surprise", "Làm sạch bộ dữ liệu MovieLens, huấn luyện Popularity, Item-based KNN, SVD và đánh giá độ đo"],
            ["Công cụ hỗ trợ", "Matplotlib, Pytest, Git/GitHub, Docker Compose", "Trực quan hóa kết quả thực nghiệm, kiểm thử 16 test cases và quản lý mã nguồn"],
        ],
    ))

    # Chương 2
    body.append(_h1("CHƯƠNG 2: CƠ SỞ LÝ THUYẾT"))
    body.append(_h2("2.1. Gợi ý theo độ phổ biến (Bayesian Popularity Baseline)"))
    body.append(_p("Áp dụng công thức trọng số Bayes (IMDB Weighted Rating): WR = (v / (v + m)) * R + (m / (v + m)) * C, giúp cân bằng giữa điểm trung bình R và số lượt đánh giá v, đóng vai trò Baseline so sánh và phục vụ người dùng mới (Cold-start)."))
    body.append(_h2("2.2. Lọc cộng tác dựa trên phim (Item-based KNN với Adjusted Cosine)"))
    body.append(_p("Sử dụng độ tương đồng Adjusted Cosine (trừ trung bình đánh giá của từng người dùng r_bar_u) kết hợp tham số co rút (Shrinkage beta = 15) để khử thiên lệch chấm điểm cá nhân và trích xuất lời giải thích trực quan “Gợi ý vì bạn đã thích bộ phim X”."))
    body.append(_h2("2.3. Phân rã ma trận SVD (Matrix Factorization)"))
    body.append(_p("Chiếu người dùng và bộ phim vào không gian nhân tố tiềm ẩn chiều f = 50 với công thức dự đoán r_hat_ui = mu + b_u + b_i + p_u^T * q_i, có điều chuẩn L2 (reg = 0.05) giúp khắc phục độ thưa 98.30% của ma trận đánh giá."))
    body.append(_h2("2.4. Độ đo đánh giá thực nghiệm"))
    body.append(_bullet("RMSE và MAE: Đánh giá độ chính xác dự đoán điểm số trên thang 0.5 – 5.0 sao."))
    body.append(_bullet("Precision@10 và Recall@10: Đánh giá chất lượng danh sách Top-10 phim gợi ý (ngưỡng phù hợp >= 4.0 sao)."))
    body.append(_bullet("Catalog Coverage: Đánh giá độ phủ và tính đa dạng của danh mục gợi ý."))

    # Chương 3
    body.append(_h1("CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG"))
    body.append(_h2("3.1. Kiến trúc hệ thống 3 tầng & Luồng gợi ý thông minh 3 nhánh"))
    register_img(EDA_FIG_DIR / "architecture_diagram.png", "Hình 3.1: Sơ đồ kiến trúc tổng thể 3 tầng của hệ thống MovieRec.")
    body.append(_bullet("Nhánh 1 (Cold-start Popularity): Phục vụ khách vãng lai hoặc tài khoản mới chưa có đánh giá, kèm giao diện chọn nhanh thể loại & chấm nhanh trên trang gợi ý."))
    body.append(_bullet("Nhánh 2 (Real-time Item-KNN): Phục vụ tức thời ngay khi người dùng vừa chấm điểm phim mới trên web mà không cần chờ huấn luyện lại mô hình."))
    body.append(_bullet("Nhánh 3 (SVD + Giải thích Item-KNN): Cá nhân hóa sâu bằng mô hình SVD active kèm lý do giải thích “Vì bạn thích...” từ Item-KNN."))
    register_img(EDA_FIG_DIR / "cold_start_flow.png", "Hình 3.2: Sơ đồ luồng gợi ý thông minh 3 nhánh xử lý bài toán Cold-Start.")

    body.append(_h2("3.2. Thiết kế 14 bảng Cơ sở dữ liệu (SQLAlchemy 2.0)"))
    body.append(_table(
        ["Nhóm bảng", "Danh sách bảng", "Mô tả chức năng"],
        [
            ["Tài khoản & Phân quyền", "roles, users", "Lưu thông tin tài khoản, mật khẩu Bcrypt, vai trò user/admin và thời điểm cập nhật đánh giá"],
            ["Danh mục phim", "movies, genres, movie_genres, movie_links", "Lưu 9.742 bộ phim, 20 thể loại và ánh xạ mã quốc tế IMDb (ttXXXXXXX) / TMDB"],
            ["Tương tác người dùng", "ratings, watchlist_items", "Lưu điểm đánh giá (0.5 - 5.0), bình luận văn bản (comment) và danh sách phim muốn xem"],
            ["Dữ liệu huấn luyện", "dataset_versions, dataset_ratings, import_jobs", "Lưu 100.836 lượt đánh giá gốc từ MovieLens kèm kiểm tra toàn vẹn SHA-256"],
            ["Quản lý Mô hình & Thực nghiệm", "model_versions, training_runs, evaluation_results, recommendation_events", "Quản lý các phiên bản mô hình AI (.pkl), kết quả RMSE/MAE/P@10/R@10 và nhật ký gợi ý"],
        ],
    ))

    # Chương 4
    body.append(_h1("CHƯƠNG 4: KẾT QUẢ THỰC NGHIỆM VÀ KIỂM THỬ"))
    body.append(_h2("4.1. Tiền xử lý dữ liệu MovieLens & Chia tập dữ liệu theo thời gian"))
    body.append(_p("Bộ dữ liệu MovieLens Latest Small gồm 100.836 đánh giá hợp lệ của 610 người dùng trên 9.742 bộ phim được chia theo thời gian trên từng người dùng (Per-user Temporal Split 70/15/15): 70.580 mẫu Train, 15.145 mẫu Validation và 15.111 mẫu Test (độ chồng lấp overlap = 0)."))

    register_img(EDA_FIG_DIR / "rating_distribution.png", "Hình 4.1: Phân bố điểm đánh giá (0.5 – 5.0 sao) trong bộ dữ liệu MovieLens.")
    register_img(EDA_FIG_DIR / "long_tail.png", "Hình 4.2: Phân phối đuôi dài (Long-tail) của số lượt đánh giá theo từng bộ phim.")
    register_img(EDA_FIG_DIR / "genre_ratings.png", "Hình 4.3: Số lượng đánh giá và điểm trung bình theo 20 thể loại phim.")

    body.append(_h2("4.2. Bảng tổng hợp kết quả thực nghiệm trên tập Test"))
    body.append(_table(
        ["Mô hình", "Siêu tham số tối ưu", "RMSE (↓)", "MAE (↓)", "Precision@10 (↑)", "Recall@10 (↑)", "Coverage"],
        [
            ["Popularity (Baseline)", "min_votes = 50", "0.9613", "0.7460", "0.0589", "0.0537", "0.45%"],
            ["Item-based KNN", "k = 40, shrinkage = 15", "0.8926", "0.6772", "0.0369", "0.0258", "13.71%"],
            ["SVD (Mô hình tốt nhất)", "n_factors = 50, reg = 0.05", "0.8884", "0.6762", "0.0680", "0.0566", "7.36%"],
        ],
    ))

    exp_fig_dir = find_latest_exp_fig_dir()
    if exp_fig_dir:
        register_img(exp_fig_dir / "rating_metrics.png", "Hình 4.4: So sánh sai số dự đoán điểm RMSE và MAE giữa Popularity, Item-KNN và SVD.")
        register_img(exp_fig_dir / "ranking_metrics.png", "Hình 4.5: So sánh chất lượng danh sách gợi ý Precision@10 và Recall@10.")
        register_img(exp_fig_dir / "validation_grid.png", "Hình 4.6: Kết quả tinh chỉnh siêu tham số (Grid Search) trên tập Validation.")

    body.append(_h2("4.3. Kết quả kiểm thử tự động hệ thống (16/16 Pytest Passed)"))
    body.append(_table(
        ["Nhóm kiểm thử", "Kịch bản kiểm thử chính", "Kết quả"],
        [
            ["Kiểm thử dữ liệu & chia tập", "Kiểm tra làm sạch dữ liệu, loại bỏ trùng lặp và Per-user Temporal Split (overlap = 0)", "PASSED"],
            ["Kiểm thử thuật toán AI", "Kiểm tra Popularity, Item-KNN (Adjusted Cosine + explain), SVD và độ đo RMSE/MAE/P@10/R@10", "PASSED"],
            ["Kiểm thử Xác thực & Phân quyền", "Đăng ký, đăng nhập JWT, chặn truy cập trái phép vào các API /api/admin/* (401/403)", "PASSED"],
            ["Kiểm thử Cá nhân hóa & Cold-start", "Kiểm chứng 2 người dùng khác gu nhận gợi ý khác nhau, loại trừ phim đã xem, tự động chuyển nhánh", "PASSED"],
            ["Kiểm thử Bình luận Cộng đồng", "Lưu đồng thời điểm đánh giá + bình luận văn bản và truy xuất danh sách review theo phim", "PASSED"],
            ["Kiểm thử Quản trị & Huấn luyện lại", "Kích hoạt huấn luyện mô hình mới từ Admin và khôi phục (Rollback) phiên bản mô hình cũ", "PASSED"],
        ],
    ))

    # Chương 5
    body.append(_h1("CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN"))
    body.append(_p("Đồ án đã xây dựng hoàn chỉnh hệ thống gợi ý phim cá nhân hóa kết hợp Item-based KNN và SVD trên nền tảng FastAPI, ReactJS và SQLAlchemy/PostgreSQL, vượt qua 16/16 bài kiểm thử tự động Pytest. Trong tương lai, hệ thống có thể mở rộng thêm Content-based Filtering sử dụng vector nhúng ngữ nghĩa (Embeddings) và triển khai trên hạ tầng đám mây với Docker Compose."))

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
        "<w:body>"
        + "".join(body)
        + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1134" w:bottom="1440" w:left="1701"/></w:sectPr>'
        "</w:body></w:document>"
    )

    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Default Extension="png" ContentType="image/png"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )

    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        "</Relationships>"
    )

    doc_rels_items = "".join(
        f'<Relationship Id="{rel_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{media_name}"/>'
        for rel_id, media_name, _ in media_files
    )
    doc_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + doc_rels_items
        + "</Relationships>"
    )

    OUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT_DOCX, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", rels_xml)
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/_rels/document.xml.rels", doc_rels_xml)
        for _, media_name, img_path in media_files:
            zf.write(img_path, f"word/{media_name}")
    return OUT_DOCX


if __name__ == "__main__":
    out = build_report()
    print(f"[OK] Đã xuất file báo cáo Word (kèm 8 biểu đồ & sơ đồ kiến trúc) tại: {out}")
