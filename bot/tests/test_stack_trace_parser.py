from app.utils.stack_trace_parser import extract_related_imports, parse_stack_trace


def test_parse_extracts_project_files():
    trace = (
        'Traceback (most recent call last):\n'
        '  File "backend/app/mail/services/gmail.py", line 45, in sync_gmail\n'
        '    user_id = current_user.id\n'
    )
    result = parse_stack_trace(trace, "backend/app")
    assert len(result) == 1
    assert result[0]["file"] == "backend/app/mail/services/gmail.py"
    assert result[0]["line"] == 45
    assert result[0]["method"] == "sync_gmail"


def test_parse_deduplicates_same_file():
    trace = (
        '  File "backend/app/mail/services/gmail.py", line 45, in sync_gmail\n'
        '  File "backend/app/mail/services/gmail.py", line 20, in fetch_mails\n'
    )
    result = parse_stack_trace(trace, "backend/app")
    assert len(result) == 1


def test_parse_returns_empty_for_no_match():
    trace = '  File "/usr/lib/python3.12/asyncio/runners.py", line 194, in run\n'
    result = parse_stack_trace(trace, "backend/app")
    assert result == []


def test_parse_empty_string():
    assert parse_stack_trace("", "backend/app") == []


def test_parse_absolute_path_extracts_relative():
    trace = '  File "/workspace/source/backend/app/core/database.py", line 10, in get_db\n'
    result = parse_stack_trace(trace, "backend/app")
    assert len(result) == 1
    assert result[0]["file"] == "backend/app/core/database.py"
    assert result[0]["line"] == 10
    assert result[0]["method"] == "get_db"


# --- extract_related_imports ---

def test_extract_imports_filters_by_project_root():
    source = (
        "from app.mail.services.gmail import sync_gmail\n"
        "from app.core.database import get_db\n"
        "import asyncio\n"
        "from fastapi import APIRouter\n"
    )
    result = extract_related_imports(source, "backend/app", set())
    assert "backend/app/mail/services/gmail.py" in result
    assert "backend/app/core/database.py" in result
    assert len(result) == 2


def test_extract_imports_excludes_already_fetched():
    source = "from app.mail.services.gmail import sync_gmail\nfrom app.core.database import get_db\n"
    already = {"backend/app/mail/services/gmail.py"}
    result = extract_related_imports(source, "backend/app", already)
    assert result == ["backend/app/core/database.py"]


def test_extract_imports_deduplicates():
    source = "from app.core.database import get_db\nfrom app.core.database import Base\n"
    result = extract_related_imports(source, "backend/app", set())
    assert result == ["backend/app/core/database.py"]


def test_extract_imports_empty_source():
    assert extract_related_imports("", "backend/app", set()) == []


def test_extract_imports_no_project_imports():
    source = "import asyncio\nfrom fastapi import FastAPI\n"
    assert extract_related_imports(source, "backend/app", set()) == []
