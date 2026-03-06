from app.config import settings
from app.services.file_reader import read_file, read_files


def test_read_file_returns_content(tmp_path):
    (tmp_path / "backend/app").mkdir(parents=True)
    target = tmp_path / "backend/app/main.py"
    target.write_text("from fastapi import FastAPI", encoding="utf-8")

    settings.local_source_path = str(tmp_path)
    try:
        result = read_file("backend/app/main.py")
        assert result == "from fastapi import FastAPI"
    finally:
        settings.local_source_path = ""


def test_read_file_returns_none_on_error(tmp_path):
    settings.local_source_path = str(tmp_path)
    try:
        assert read_file("no/such/file.py") is None
    finally:
        settings.local_source_path = ""


def test_read_files_returns_dict_of_found_files(tmp_path):
    (tmp_path / "a").mkdir()
    (tmp_path / "a/found.py").write_text("code", encoding="utf-8")

    settings.local_source_path = str(tmp_path)
    try:
        result = read_files(["a/found.py", "b/missing.py"])
        assert "a/found.py" in result
        assert "b/missing.py" not in result
    finally:
        settings.local_source_path = ""
