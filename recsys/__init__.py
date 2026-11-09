"""Gói thuật toán gợi ý dùng chung cho thực nghiệm (ml/) và phục vụ web (backend/).

Dùng chung một mã nguồn giúp kết quả thực nghiệm và hành vi trên web nhất quán.
"""
from .algorithms import PopularityRecommender, ItemKNNRecommender, SVDRecommender  # noqa: F401
