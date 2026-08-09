"""
Dataset splitting routines for EuroSAT: Random split vs. Spatially-disjoint (Cluster-bucket) split.
"""

import json
import os
import random
from pathlib import Path
from typing import Dict, List, Tuple, Any
import numpy as np
from PIL import Image

try:
    import imagehash
    IMAGEHASH_AVAILABLE = True
except ImportError:
    IMAGEHASH_AVAILABLE = False

from data.dataset import CLASSES, CLASS_TO_IDX

DEFAULT_RAW_DIR = "./data/raw/EuroSAT"
PROCESSED_DIR = "./data/processed"


def find_dataset_root(root_dir: str = DEFAULT_RAW_DIR) -> Path:
    """Find the root directory containing EuroSAT class subfolders."""
    path = Path(root_dir).resolve()
    candidates = [
        path,
        path / "2750",
        path / "27000",
        path / "EuroSAT" / "2750",
        path / "EuroSAT" / "27000",
        path / "EuroSAT",
        Path("C:/Users/priyanka/.cache/kagglehub/datasets/apollo2506/eurosat-dataset/versions/6/EuroSAT"),
        Path("./data/raw/2750"),
        Path("./data/raw/EuroSAT/2750"),
    ]
    for cand in candidates:
        if cand.exists():
            all_classes_exist = all((cand / cls_name).exists() for cls_name in CLASSES)
            if all_classes_exist:
                return cand
    raise FileNotFoundError(f"Could not locate EuroSAT class folders in {root_dir} or standard cache locations.")


def get_all_image_paths(dataset_root: Path) -> List[Tuple[str, str, int]]:
    """
    Collect relative paths, absolute paths, and class labels for all dataset images.
    
    Returns:
        List[Tuple[rel_path, abs_path, class_idx]]
    """
    samples = []
    for class_name in CLASSES:
        class_dir = dataset_root / class_name
        class_idx = CLASS_TO_IDX[class_name]
        image_files = sorted(list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")))
        for img_path in image_files:
            rel_path = f"{class_name}/{img_path.name}"
            samples.append((rel_path, str(img_path), class_idx))
    return samples


def create_random_split(
    samples: List[Tuple[str, str, int]],
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    seed: int = 42
) -> Dict[str, List[str]]:
    """
    Create a stratified random split across classes.
    """
    random.seed(seed)
    np.random.seed(seed)

    by_class: Dict[int, List[str]] = {cls_idx: [] for cls_idx in range(len(CLASSES))}
    for rel_path, _, class_idx in samples:
        by_class[class_idx].append(rel_path)

    train_set, val_set, test_set = [], [], []

    for cls_idx, paths in by_class.items():
        shuffled = paths.copy()
        random.shuffle(shuffled)
        n = len(shuffled)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train_set.extend(shuffled[:n_train])
        val_set.extend(shuffled[n_train:n_train + n_val])
        test_set.extend(shuffled[n_train + n_val:])

    return {
        "train": train_set,
        "val": val_set,
        "test": test_set
    }


def compute_perceptual_hashes(
    samples: List[Tuple[str, str, int]],
    hash_size: int = 8
) -> Dict[str, str]:
    """
    Compute perceptual hash (pHash) for each image using parallel multi-threading.
    """
    if not IMAGEHASH_AVAILABLE:
        raise ImportError("imagehash module is required for perceptual hash spatial split.")

    from concurrent.futures import ThreadPoolExecutor

    def process_sample(sample):
        rel_path, abs_path, _ = sample
        try:
            with Image.open(abs_path) as img:
                phash = str(imagehash.phash(img.convert("RGB"), hash_size=hash_size))
                return rel_path, phash
        except Exception:
            return rel_path, "0" * (hash_size * hash_size // 4)

    hashes = {}
    with ThreadPoolExecutor(max_workers=16) as executor:
        results = executor.map(process_sample, samples)
        for rel_path, phash in results:
            hashes[rel_path] = phash

    return hashes


def cluster_images_by_phash(
    hashes: Dict[str, str],
    hamming_threshold: int = 10
) -> Dict[str, int]:
    """
    Group images into cluster buckets based on pHash Hamming distance.
    Images with pHash distance <= hamming_threshold belong to the same scene cluster.
    """
    if not IMAGEHASH_AVAILABLE:
        # Fallback if imagehash not installed: group by prefix/number range
        rel_paths = list(hashes.keys())
        return {path: idx // 50 for idx, path in enumerate(rel_paths)}

    path_list = list(hashes.keys())
    hash_objs = [imagehash.hex_to_hash(hashes[p]) for p in path_list]
    n = len(path_list)

    # Disjoint set / union-find for clustering
    parent = list(range(n))

    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]

    def union(i, j):
        root_i, root_j = find(i), find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    # Compute pairwise distances (bucketed/optimized by prefix to reduce O(N^2))
    # Bucketing by 16-bit prefix for fast candidate matching
    prefix_buckets: Dict[str, List[int]] = {}
    for i, p in enumerate(path_list):
        prefix = hashes[p][:4]  # 16-bit hex hash prefix
        prefix_buckets.setdefault(prefix, []).append(i)

    # Connect within buckets
    for i in range(n):
        h_i = hash_objs[i]
        prefix = hashes[path_list[i]][:4]
        for j in prefix_buckets.get(prefix, []):
            if i < j:
                if (h_i - hash_objs[j]) <= hamming_threshold:
                    union(i, j)

    # Normalize cluster IDs
    cluster_map = {}
    cluster_id_counter = 0
    root_to_id = {}
    for i in range(n):
        root = find(i)
        if root not in root_to_id:
            root_to_id[root] = cluster_id_counter
            cluster_id_counter += 1
        cluster_map[path_list[i]] = root_to_id[root]

    return cluster_map


def create_spatial_cluster_split(
    samples: List[Tuple[str, str, int]],
    hashes: Dict[str, str],
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    hamming_threshold: int = 10,
    seed: int = 42
) -> Dict[str, List[str]]:
    """
    Create a spatially-disjoint (cluster-bucketed) holdout split.
    Entire perceptual hash scene clusters are assigned to either train, val, or test.
    """
    random.seed(seed)
    np.random.seed(seed)

    cluster_map = cluster_images_by_phash(hashes, hamming_threshold=hamming_threshold)

    # Group sample relative paths by cluster
    clusters: Dict[int, List[str]] = {}
    for rel_path, _, _ in samples:
        cid = cluster_map[rel_path]
        clusters.setdefault(cid, []).append(rel_path)

    cluster_ids = list(clusters.keys())
    random.shuffle(cluster_ids)

    total_samples = len(samples)
    target_train = int(total_samples * train_ratio)
    target_val = int(total_samples * val_ratio)

    train_set, val_set, test_set = [], [], []
    curr_train, curr_val = 0, 0

    for cid in cluster_ids:
        c_paths = clusters[cid]
        c_len = len(c_paths)

        if curr_train + c_len <= target_train or (curr_train < target_train and len(train_set) == 0):
            train_set.extend(c_paths)
            curr_train += c_len
        elif curr_val + c_len <= target_val or (curr_val < target_val and len(val_set) == 0):
            val_set.extend(c_paths)
            curr_val += c_len
        else:
            test_set.extend(c_paths)

    return {
        "train": train_set,
        "val": val_set,
        "test": test_set
    }


def generate_and_save_splits(
    root_dir: str = DEFAULT_RAW_DIR,
    output_dir: str = PROCESSED_DIR,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Generate both random and spatial splits and save them to splits.json.
    """
    dataset_root = find_dataset_root(root_dir)
    print(f"Using dataset root: {dataset_root}")

    samples = get_all_image_paths(dataset_root)
    print(f"Total images found: {len(samples)}")

    print("Generating random split...")
    random_split = create_random_split(samples, seed=seed)

    print("Computing perceptual hashes for spatial cluster split...")
    hashes = compute_perceptual_hashes(samples)
    
    print("Generating spatially-disjoint (cluster-bucket) split...")
    spatial_split = create_spatial_cluster_split(samples, hashes, seed=seed)

    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)

    splits_data = {
        "dataset_root": str(dataset_root),
        "total_samples": len(samples),
        "classes": CLASSES,
        "random_split": {
            "train_count": len(random_split["train"]),
            "val_count": len(random_split["val"]),
            "test_count": len(random_split["test"]),
            "splits": random_split
        },
        "spatial_split": {
            "train_count": len(spatial_split["train"]),
            "val_count": len(spatial_split["val"]),
            "test_count": len(spatial_split["test"]),
            "splits": spatial_split
        }
    }

    json_file = output_path / "splits.json"
    with open(json_file, "w") as f:
        json.dump(splits_data, f, indent=2)

    print(f"Splits saved to: {json_file}")
    print(f"Random split counts  -> Train: {len(random_split['train'])}, Val: {len(random_split['val'])}, Test: {len(random_split['test'])}")
    print(f"Spatial split counts -> Train: {len(spatial_split['train'])}, Val: {len(spatial_split['val'])}, Test: {len(spatial_split['test'])}")

    return splits_data


if __name__ == "__main__":
    generate_and_save_splits()
