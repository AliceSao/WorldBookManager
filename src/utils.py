import os
import json
import re
from pathlib import Path
from typing import Any, Optional, Union
from datetime import datetime


def ensure_directory_exists(path: Union[str, Path]) -> None:
    """确保目录存在，不存在则创建"""
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)


def generate_uid() -> int:
    """生成唯一UID（基于时间戳）"""
    return int(datetime.now().timestamp() * 1000)


def sanitize_filename(name: str) -> str:
    """清理文件名，移除不安全字符"""
    invalid_chars = r'[<>:"/\\|?*\x00-\x1f]'
    return re.sub(invalid_chars, '_', name)


def validate_field_value(value: Any, field_type: str) -> bool:
    """验证字段值是否符合指定类型"""
    if value is None:
        return True
    
    type_mapping = {
        'str': str,
        'int': int,
        'float': (int, float),
        'bool': bool,
        'list': list,
        'dict': dict,
    }
    
    expected_type = type_mapping.get(field_type)
    if expected_type is None:
        return False
    
    return isinstance(value, expected_type)


def load_json_file(file_path: Union[str, Path]) -> dict:
    """加载JSON文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json_file(data: dict, file_path: Union[str, Path], indent: int = 2) -> None:
    """保存JSON文件"""
    ensure_directory_exists(Path(file_path).parent)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)


def load_text_file(file_path: Union[str, Path]) -> str:
    """加载文本文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()


def save_text_file(content: str, file_path: Union[str, Path]) -> None:
    """保存文本文件"""
    ensure_directory_exists(Path(file_path).parent)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)


def backup_file(file_path: Union[str, Path], backup_dir: Union[str, Path]) -> Path:
    """备份文件到指定目录"""
    file_path = Path(file_path)
    backup_dir = Path(backup_dir)
    ensure_directory_exists(backup_dir)
    
    backup_name = f"{file_path.stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_path.suffix}"
    backup_path = backup_dir / backup_name
    
    import shutil
    shutil.copy2(file_path, backup_path)
    
    return backup_path


def format_bool(value: bool) -> str:
    """格式化布尔值为字符串"""
    return 'true' if value else 'false'


def parse_bool(value: str) -> bool:
    """解析字符串为布尔值"""
    return value.lower() in ('true', '1', 'yes', 'on')


def format_list(value: list) -> str:
    """格式化列表为字符串"""
    return json.dumps(value, ensure_ascii=False)


def parse_list(value: str) -> list:
    """解析字符串为列表"""
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return [item.strip() for item in value.split(',') if item.strip()]


def get_file_size(file_path: Union[str, Path]) -> int:
    """获取文件大小（字节）"""
    return Path(file_path).stat().st_size


def format_file_size(size_bytes: int) -> str:
    """格式化文件大小为可读字符串"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def validate_json_structure(data: dict) -> tuple[bool, Optional[str]]:
    """验证JSON世界书结构（支持新旧格式）"""
    if not isinstance(data, dict):
        return False, "Root must be a dictionary"
    
    if 'entries' not in data:
        return False, "Missing 'entries' key"
    
    entries = data['entries']
    if not isinstance(entries, (dict, list)):
        return False, "'entries' must be a dictionary or list"
    
    return True, None


def validate_entry_structure(entry: dict) -> tuple[bool, Optional[str]]:
    """验证单个entry结构"""
    required_fields = ['uid', 'content']
    
    for field in required_fields:
        if field not in entry:
            return False, f"Missing required field: {field}"
    
    if not isinstance(entry['uid'], int):
        return False, "UID must be an integer"
    
    if not isinstance(entry['content'], str):
        return False, "Content must be a string"
    
    return True, None


def merge_dicts(*dicts: dict) -> dict:
    """合并多个字典"""
    result = {}
    for d in dicts:
        result.update(d)
    return result


def deep_update(base: dict, update: dict) -> dict:
    """深度更新字典"""
    for key, value in update.items():
        if isinstance(value, dict) and key in base and isinstance(base[key], dict):
            base[key] = deep_update(base[key], value)
        else:
            base[key] = value
    return base


def truncate_string(text: str, max_length: int = 100, suffix: str = '...') -> str:
    """截断字符串"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def remove_empty_lines(text: str) -> str:
    """移除空行"""
    lines = text.split('\n')
    return '\n'.join(line for line in lines if line.strip())


def normalize_whitespace(text: str) -> str:
    """规范化空白字符"""
    return ' '.join(text.split())