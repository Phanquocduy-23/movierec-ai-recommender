# Báo cáo kiểm tra & EDA

## Quy tắc làm sạch

| Quy tắc | Lý do | Trước | Sau |
|---|---|---|---|
| drop_missing | Thiếu userId/movieId/rating/timestamp | 100836 | 100836 |
| rating_scale | Điểm ngoài thang 0.5-5.0 bước 0.5 | 100836 | 100836 |
| unknown_movie | movieId không có trong movies.csv | 100836 | 100836 |
| duplicate_pair | Trùng cặp (userId, movieId): giữ đánh giá mới nhất | 100836 | 100836 |
| bad_timestamp | timestamp <= 0 | 100836 | 100836 |

## Thống kê

```json
{
  "n_ratings": 100836,
  "n_users": 610,
  "n_movies_rated": 9724,
  "n_movies_catalog": 9742,
  "sparsity": 0.9830003169443864,
  "rating_mean": 3.501556983616962,
  "rating_std": 1.042529239060635,
  "rating_distribution": {
    "0.5": 1370,
    "1.0": 2811,
    "1.5": 1791,
    "2.0": 7551,
    "2.5": 5550,
    "3.0": 20047,
    "3.5": 13136,
    "4.0": 26818,
    "4.5": 8551,
    "5.0": 13211
  },
  "ratings_per_user": {
    "count": 610.0,
    "mean": 165.3,
    "std": 269.48,
    "min": 20.0,
    "25%": 35.0,
    "50%": 70.5,
    "75%": 168.0,
    "max": 2698.0
  },
  "ratings_per_movie": {
    "count": 9724.0,
    "mean": 10.37,
    "std": 22.4,
    "min": 1.0,
    "25%": 1.0,
    "50%": 3.0,
    "75%": 9.0,
    "max": 329.0
  },
  "movies_with_1_rating": 3446,
  "time_range": [
    "1996-03-29T18:36:55",
    "2018-09-24T14:27:30"
  ]
}
```

## Chia tập

```json
{
  "split_version": "per_user_temporal_70_15_15_v1",
  "source_sha256": "aa289ca83157595d0df6aea1be6a4ded676ddc4385472e8313a8ed9805352646",
  "clean_sha256": "aa289ca83157595d0df6aea1be6a4ded676ddc4385472e8313a8ed9805352646",
  "counts": {
    "train": 70580,
    "val": 15145,
    "test": 15111
  },
  "overlap_check": {
    "train&val": 0,
    "train&test": 0,
    "val&test": 0
  },
  "cold_start": {
    "val_ratings_item_not_in_train": 1178,
    "test_ratings_item_not_in_train_val": 1236
  },
  "files": {
    "train": "da499d5b68a59812ae0a37cc5c346e99b11dfe2bf2e5737c6f1e68e3f7a503c8",
    "val": "ce820f15cbffa1327ac4870b08a6c038a8904ebf70bb771df1ff7d0814c186a5",
    "test": "8db4ca9e96fd4d31de03bf10e5521d27a92346192d7e78a3219f44fe205c5a7f"
  }
}
```

![](figures/rating_distribution.png)
![](figures/long_tail.png)
![](figures/genre_ratings.png)

> Lưu ý: phim chưa được đánh giá KHÔNG đồng nghĩa người dùng không thích.