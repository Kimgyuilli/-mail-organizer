import re


def parse_stack_trace(stack_trace: str, project_root: str) -> list[dict]:
    """
    Python traceback에서 프로젝트 코드만 추출.

    예: project_root = "backend/app"
    입력: 'File "backend/app/mail/services/gmail.py", line 45, in sync_gmail'
    출력: [{"file": "backend/app/mail/services/gmail.py", "line": 45, "method": "sync_gmail"}]
    """
    pattern = r'File "([^"]+)", line (\d+), in (\w+)'
    matches = re.findall(pattern, stack_trace)

    results = []
    seen = set()
    for file_path, line, method in matches:
        # project_root에 포함된 파일만 필터
        if project_root not in file_path:
            continue
        # 경로 정규화: 절대 경로에서 프로젝트 상대 경로 추출
        idx = file_path.find(project_root)
        relative_path = file_path[idx:]
        if relative_path not in seen:
            seen.add(relative_path)
            results.append({
                "file": relative_path,
                "line": int(line),
                "method": method,
            })
    return results


def extract_related_imports(
    source_code: str, project_root: str, already_fetched: set[str]
) -> list[str]:
    """
    Python 소스코드의 import문에서 프로젝트 내부 모듈 파일 경로를 추출.

    - 'from app.xxx import ...' 또는 'import app.xxx' 형태 파싱
    - project_root 기반으로 파일 경로 변환: app.mail.services.gmail → backend/app/mail/services/gmail.py
    - already_fetched에 있는 파일은 제외
    """
    # project_root에서 prefix 추출: "backend/app" → prefix="backend/", module_root="app"
    parts = project_root.rstrip("/").split("/")
    if len(parts) >= 2:
        prefix = "/".join(parts[:-1]) + "/"
        module_root = parts[-1]
    else:
        prefix = ""
        module_root = parts[0]

    # from app.xxx import ... 또는 import app.xxx 패턴
    from_pattern = rf"from\s+({re.escape(module_root)}(?:\.\w+)*)\s+import"
    import_pattern = rf"import\s+({re.escape(module_root)}(?:\.\w+)+)"

    modules = set()
    modules.update(re.findall(from_pattern, source_code))
    modules.update(re.findall(import_pattern, source_code))

    results = []
    for module in modules:
        # 모듈 경로를 파일 경로로 변환: app.mail.services.gmail → backend/app/mail/services/gmail.py
        file_path = prefix + module.replace(".", "/") + ".py"
        if file_path not in already_fetched:
            results.append(file_path)

    return list(dict.fromkeys(results))  # 순서 유지하면서 중복 제거
