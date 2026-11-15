"""Offline preflight for Qwen3-VL. Never downloads weights or contacts a service."""
from __future__ import annotations

import importlib.util
import os
import shutil
from pathlib import Path


MODEL_ID = "Qwen/Qwen3-VL-8B-Instruct"
REQUIRED_PACKAGES = ("torch", "transformers", "accelerate", "PIL")
RECOMMENDED_GPU_VRAM_GB = 24
RECOMMENDED_SYSTEM_RAM_GB = 32
RECOMMENDED_FREE_DISK_GB = 25


def _system_ram_gb() -> float | None:
    try:
        pages = os.sysconf("SC_PHYS_PAGES")
        page_size = os.sysconf("SC_PAGE_SIZE")
        return round((pages * page_size) / (1024 ** 3), 2)
    except (AttributeError, OSError, ValueError):
        return None


def _gpu_info() -> dict:
    try:
        import torch
        if not torch.cuda.is_available():
            return {"available": False, "devices": []}
        devices = []
        for index in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(index)
            devices.append({
                "name": props.name,
                "total_vram_gb": round(props.total_memory / (1024 ** 3), 2),
            })
        return {"available": bool(devices), "devices": devices}
    except Exception:
        return {"available": False, "devices": []}


def _model_cache_dir(cache_root: str | None = None) -> Path:
    root = Path(cache_root or os.getenv("HF_HUB_CACHE") or (
        Path(os.getenv("HF_HOME", Path.home() / ".cache/huggingface")) / "hub"
    ))
    return root / "models--Qwen--Qwen3-VL-8B-Instruct"


def inspect_runtime(cache_root: str | None = None, disk_path: str = ".") -> dict:
    """Return diagnostics only. No model import, download, or cache mutation."""
    packages = {
        name: importlib.util.find_spec(name) is not None
        for name in REQUIRED_PACKAGES
    }
    ram = _system_ram_gb()
    usage = shutil.disk_usage(disk_path)
    free_disk = round(usage.free / (1024 ** 3), 2)
    cache = _model_cache_dir(cache_root)
    has_weights = cache.exists() and any(cache.rglob("*.safetensors"))
    gpu = _gpu_info()
    max_gpu = max(
        (item["total_vram_gb"] for item in gpu["devices"]),
        default=0.0,
    )

    missing_packages = [name for name, present in packages.items() if not present]
    recommendations = []
    if missing_packages:
        recommendations.append("Optional model runtime packages are missing: " + ", ".join(missing_packages))
    if not has_weights:
        recommendations.append("Model weights are not cached; preflight did not download them.")
    if free_disk < RECOMMENDED_FREE_DISK_GB:
        recommendations.append(f"Less than {RECOMMENDED_FREE_DISK_GB} GiB free disk; model cache may not fit.")
    if ram is not None and ram < RECOMMENDED_SYSTEM_RAM_GB:
        recommendations.append(f"System RAM is below the {RECOMMENDED_SYSTEM_RAM_GB} GiB planning target.")
    if gpu["available"] and max_gpu < RECOMMENDED_GPU_VRAM_GB:
        recommendations.append(
            f"Largest GPU has {max_gpu} GiB VRAM; below the {RECOMMENDED_GPU_VRAM_GB} GiB single-GPU planning target."
        )
    if not gpu["available"]:
        recommendations.append("No CUDA GPU detected; CPU/offload performance is unverified.")

    return {
        "model_id": MODEL_ID,
        "network_access": False,
        "weights_cached": has_weights,
        "packages": packages,
        "system_ram_gb": ram,
        "free_disk_gb": free_disk,
        "gpu": gpu,
        "planning_targets": {
            "system_ram_gb": RECOMMENDED_SYSTEM_RAM_GB,
            "single_gpu_vram_gb": RECOMMENDED_GPU_VRAM_GB,
            "free_disk_gb": RECOMMENDED_FREE_DISK_GB,
        },
        "recommendations": recommendations,
        "ready_for_inference": (
            not missing_packages
            and has_weights
            and free_disk >= RECOMMENDED_FREE_DISK_GB
            and (
                max_gpu >= RECOMMENDED_GPU_VRAM_GB
                or (ram is not None and ram >= 64)
            )
        ),
    }


if __name__ == "__main__":
    import json
    print(json.dumps(inspect_runtime(), indent=2))
