"""Converte todas as imagens do diretório atual para WebP."""

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from subprocess import run
from threading import Lock

source_formats = {".png", ".jpg", ".jpeg", ".bmp"}
backup_root = Path("original")

input_roots = ["public", "manutencao"]

if len(sys.argv) >= 2:
    quality = int(sys.argv[1])
else:
    quality = 90

delta_lock = Lock()
total_delta = 0


def convert(path: Path):
    global total_delta

    dest = path.with_suffix(".webp")
    backup = backup_root / path

    print("Processando:", path)

    os.makedirs(backup.parent, exist_ok=True)
    os.rename(path, backup)

    run(
        ["cwebp", "-q", str(quality), backup, "-o", dest],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    old = os.stat(backup).st_size
    new = os.stat(dest).st_size
    with delta_lock:
        total_delta += old - new

    os.remove(path)


with ThreadPoolExecutor() as pool:
    for root in input_roots:
        for path, dirs, files in os.walk(root):
            if backup_root in Path(path).parents:
                continue

            for file in files:
                _, ext = os.path.splitext(file)
                if ext not in source_formats:
                    continue
                full = Path(path, file)
                pool.submit(convert, full)

print(f"Redução: {total_delta:,} bytes")
