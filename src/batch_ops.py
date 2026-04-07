#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Batch Operations Module - 批量操作模块

将原 main.py 中 8 次重复的「文件筛选 + 逐行替换」逻辑抽象到这里。
所有批量操作都通过以下两个核心函数完成：
  - get_filtered_files : 按 UID 范围筛选 TXT 文件
  - batch_update_files : 对筛选结果执行通用的「读 → 改 → 写」操作
"""

from pathlib import Path
from typing import Callable, List, Optional


def get_filtered_files(
    txt_dir: Path,
    txt_parser,
    uid_start: Optional[int] = None,
    uid_end: Optional[int] = None,
) -> List[Path]:
    """
    从目录中获取符合 UID 范围的 TXT 文件列表。

    原本这段 ~25 行的逻辑在 main.py 中被重复粘贴了 8 次。
    现在统一放在这里，修 bug 只需改一处。

    Args:
        txt_dir   : TXT 文件目录
        txt_parser: TXTParser 实例（用于从内容中读取 UID）
        uid_start : 起始 UID（None 表示不限）
        uid_end   : 结束 UID（None 表示不限）

    Returns:
        符合条件的 Path 列表
    """
    selected: List[Path] = []

    for f in txt_dir.glob("*.txt"):
        try:
            content = f.read_text(encoding="utf-8")
            uid = txt_parser.get_uid_from_content(content)
        except Exception:
            uid = None

        if uid is None:
            continue

        if uid_start is not None and uid_end is not None:
            if uid_start <= uid <= uid_end:
                selected.append(f)
        elif uid_start is not None:
            if uid >= uid_start:
                selected.append(f)
        elif uid_end is not None:
            if uid <= uid_end:
                selected.append(f)
        else:
            selected.append(f)

    return selected


def batch_update_files(
    selected_files: List[Path],
    update_fn: Callable[[List[str]], List[str]],
    op_name: str = "批量操作",
) -> int:
    """
    对筛选出的文件批量执行「读 → 改行 → 写」操作。

    Args:
        selected_files: 已筛选好的 Path 列表
        update_fn     : 接收 lines 列表，返回修改后的 lines 列表的函数
        op_name       : 操作名称（用于错误输出）

    Returns:
        成功更新的文件数量
    """
    updated = 0
    for f in selected_files:
        try:
            content = f.read_text(encoding="utf-8")
            lines = content.split("\n")
            lines = update_fn(lines)
            f.write_text("\n".join(lines), encoding="utf-8")
            updated += 1
        except Exception as e:
            print(f"  [{op_name}] 失败 {f.name}: {e}")
    return updated


def find_file_by_uid(txt_dir: Path, txt_parser, uid: int) -> Optional[Path]:
    """
    在目录中按 UID 找到单个文件。
    用于 add-keywords / remove-keywords / clear-keywords 等单文件操作。

    Args:
        txt_dir   : TXT 目录
        txt_parser: TXTParser 实例
        uid       : 目标 UID

    Returns:
        找到则返回 Path，否则返回 None
    """
    for f in txt_dir.glob("*.txt"):
        try:
            content = f.read_text(encoding="utf-8")
            file_uid = txt_parser.get_uid_from_content(content)
        except Exception:
            file_uid = None

        if file_uid == uid:
            return f

    return None


def replace_line_by_prefix(lines: List[str], prefix: str, new_value: str) -> List[str]:
    """
    在 lines 中找到以 `prefix:` 开头的行并替换其值（仅替换第一个匹配）。

    Args:
        lines    : 文件行列表
        prefix   : 字段名前缀（不含冒号），如 "Position"
        new_value: 新值

    Returns:
        修改后的 lines 列表（in-place 修改后原样返回）
    """
    target = f"{prefix}:".lower()
    for i, line in enumerate(lines):
        if line.strip().lower().startswith(target):
            lines[i] = f"{prefix}: {new_value}"
            break
    return lines


def replace_lines_by_prefixes(
    lines: List[str], replacements: dict
) -> List[str]:
    """
    批量替换多个字段（用于 batch-set-strategy / batch-set-recursion / batch-set-effect）。

    Args:
        lines       : 文件行列表
        replacements: {prefix: new_value} 字典，所有匹配的行都会被替换

    Returns:
        修改后的 lines 列表
    """
    targets = {k.lower(): (k, v) for k, v in replacements.items()}
    for i, line in enumerate(lines):
        if ":" in line:
            prefix_lower = line.split(":", 1)[0].strip().lower()
            if prefix_lower in targets:
                original_prefix, new_value = targets[prefix_lower]
                lines[i] = f"{original_prefix}: {new_value}"
    return lines
