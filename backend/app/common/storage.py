import os
import shutil
import unicodedata
import uuid
from pathlib import Path
from typing import Tuple

UPLOAD_ROOT = Path("uploads")


class StorageError(Exception):
    """Raised when saving or reading a stored file fails."""


def _sanitize_filename(filename: str) -> str:
    if not filename:
        return uuid.uuid4().hex
    name = unicodedata.normalize("NFKD", filename)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = "".join(ch for ch in name if ch not in {'"', "'", "`"})
    name = name.replace(" ", "_")
    return name or uuid.uuid4().hex


def save_uploaded_file(file, folder: str) -> Tuple[str, str]:
    """
    Сохраняет файл в указанную папку uploads/<folder> и возвращает (abs, rel).
    """
    safe_name = _sanitize_filename(getattr(file, "filename", None))
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    relative_path = Path(folder) / unique_name
    absolute_path = UPLOAD_ROOT / relative_path

    try:
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        file.file.seek(0)
        with absolute_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:  # pragma: no cover - filesystem errors
        raise StorageError(str(exc)) from exc

    return str(absolute_path), str(relative_path).replace(os.sep, "/")


def save_consultation_file(file, consultation_id: int) -> Tuple[str, str]:
    """
    Обёртка для сохранения файлов консультации.
    """
    return save_uploaded_file(file, f"consultations/{consultation_id}")


def resolve_storage_path(relative_path: str) -> Path:
    """
    Преобразует относительный путь из БД в абсолютный путь на диске.
    """
    path = UPLOAD_ROOT / Path(relative_path)
    return path

