"""
Utility module for downloading and extracting the EuroSAT dataset.
"""

import os
import sys
import zipfile
import logging
import requests
from pathlib import Path
from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

EUROSAT_RGB_URLS = [
    "https://zenodo.org/records/7711810/files/EuroSAT.zip?download=1",
    "https://zenodo.org/records/7711810/files/EuroSAT_RGB.zip?download=1",
    "https://madm.dfki.de/files/sentinel/EuroSAT.zip",
    "https://huggingface.co/datasets/torchgeo/eurosat/resolve/main/EuroSAT.zip"
]

CLASSES = [
    "AnnualCrop",
    "Forest",
    "HerbaceousVegetation",
    "Highway",
    "Industrial",
    "Pasture",
    "PermanentCrop",
    "Residential",
    "River",
    "SeaLake"
]

def download_file(url: str, dest_path: Path):
    """Download a file with a progress bar and fallback SSL handling."""
    logger.info(f"Downloading from {url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, stream=True, timeout=60, headers=headers)
    except requests.exceptions.SSLError:
        logger.warning("SSL verification failed, retrying with verify=False...")
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        response = requests.get(url, stream=True, timeout=60, headers=headers, verify=False)
        
    response.raise_for_status()
    total_size = int(response.headers.get("content-length", 0))

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, "wb") as f, tqdm(
        desc=dest_path.name,
        total=total_size,
        unit="iB",
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            size = f.write(chunk)
            bar.update(size)

def extract_zip(zip_path: Path, extract_to: Path):
    """Extract a zip archive."""
    logger.info(f"Extracting {zip_path} to {extract_to}...")
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_to)
    logger.info("Extraction complete.")

def get_target_dataset_dir(base_dir: Path) -> Path:
    """Find the actual directory containing the 10 class subfolders."""
    if (base_dir / "2750").exists():
        return base_dir / "2750"
    if (base_dir / "27000").exists():
        return base_dir / "27000"
    if (base_dir / "EuroSAT").exists():
        euro_sub = base_dir / "EuroSAT"
        if (euro_sub / "2750").exists():
            return euro_sub / "2750"
        if (euro_sub / "27000").exists():
            return euro_sub / "27000"
        return euro_sub
    return base_dir

def verify_dataset(dataset_dir: Path) -> bool:
    """Check if all 10 EuroSAT class folders exist and contain images."""
    target_dir = get_target_dataset_dir(dataset_dir)
    if not target_dir.exists():
        return False

    for class_name in CLASSES:
        class_folder = target_dir / class_name
        if not class_folder.exists() or len(list(class_folder.glob("*.jpg"))) == 0:
            return False
    return True

def download_eurosat_kaggle(handle: str = "apollo2506/eurosat-dataset") -> Path:
    """
    Download the EuroSAT dataset from Kaggle using kagglehub.

    Args:
        handle (str): Kaggle dataset handle.

    Returns:
        Path: Path to the cached dataset files directory.
    """
    try:
        import kagglehub
        logger.info(f"Downloading dataset from Kaggle ({handle}) via kagglehub...")
        cache_path = kagglehub.dataset_download(handle)
        logger.info(f"Kaggle dataset downloaded to: {cache_path}")
        return Path(cache_path)
    except Exception as e:
        logger.error(f"Failed to download from Kaggle via kagglehub: {e}")
        raise

def download_eurosat(raw_dir: str = "./data/raw", force: bool = False, use_kaggle: bool = False) -> Path:
    """
    Download and extract the EuroSAT dataset if not already present.

    Args:
        raw_dir (str): Base raw data directory.
        force (bool): If True, re-download dataset even if verified.
        use_kaggle (bool): If True, fetch dataset using kagglehub from apollo2506/eurosat-dataset.

    Returns:
        Path: Path to the extracted dataset directory containing class folders.
    """
    if use_kaggle:
        kaggle_path = download_eurosat_kaggle("apollo2506/eurosat-dataset")
        target_dir = get_target_dataset_dir(kaggle_path)
        if verify_dataset(kaggle_path):
            return target_dir

    raw_path = Path(raw_dir).resolve()
    raw_path.mkdir(parents=True, exist_ok=True)
    
    target_dir = get_target_dataset_dir(raw_path)

    if not force and verify_dataset(raw_path):
        logger.info(f"EuroSAT dataset already verified at {target_dir}")
        return target_dir

    zip_path = raw_path / "EuroSAT.zip"
    download_success = False

    if not zip_path.exists():
        for url in EUROSAT_RGB_URLS:
            try:
                download_file(url, zip_path)
                download_success = True
                break
            except Exception as e:
                logger.warning(f"Failed to download from {url}: {e}")

        if not download_success:
            raise RuntimeError("Failed to download EuroSAT dataset from all mirrors.")
    else:
        logger.info(f"Found existing zip file at {zip_path}")

    extract_zip(zip_path, raw_path)
    
    target_dir = get_target_dataset_dir(raw_path)

    if not verify_dataset(raw_path):
        raise ValueError(f"Extracted dataset at {target_dir} failed verification.")

    logger.info(f"EuroSAT dataset successfully prepared at {target_dir}")
    return target_dir

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download EuroSAT dataset.")
    parser.add_argument("--use-kaggle", action="store_true", help="Download via kagglehub from apollo2506/eurosat-dataset")
    args = parser.parse_args()

    if args.use_kaggle:
        target_path = download_eurosat_kaggle("apollo2506/eurosat-dataset")
    else:
        target_path = download_eurosat()
    print(f"EuroSAT dataset ready at: {target_path}")
