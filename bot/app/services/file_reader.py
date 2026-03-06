from pathlib import Path

from app.config import settings


def read_file(file_path: str) -> str | None:
    """로컬 소스에서 파일 내용을 읽는다. 없으면 None."""
    try:
        return (Path(settings.local_source_path) / file_path).read_text(encoding="utf-8")
    except Exception:
        return None


def read_files(file_paths: list[str]) -> dict[str, str]:
    """여러 파일을 읽어서 {경로: 내용} 딕셔너리로 반환한다."""
    results = {}
    for path in file_paths:
        content = read_file(path)
        if content is not None:
            results[path] = content
    return results
