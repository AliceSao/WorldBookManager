#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
WorldBook Manager - 主程序入口

用于管理 SillyTavern 世界书的拆分、编辑和重组。

重构说明（相对于原版）：
  1. 将 8 处重复的「文件筛选」逻辑统一到 batch_ops.get_filtered_files()
  2. 将「读文件 → 改行 → 写文件」模板统一到 batch_ops.batch_update_files()
  3. 修复 batch_add_keywords / batch_clear_keywords 中 file_uid 可能为 None
     时直接比较的 TypeError bug
  4. 将文件操作通过 batch_ops.find_file_by_uid() 统一处理
  5. 命令别名在 commands.py 中定义，main() 通过 COMMAND_ALIASES 归一化
"""

import json
import glob
import shutil
import traceback
from pathlib import Path
from typing import List, Optional

from config_manager import ConfigManager
from json_parser import JSONParser
from txt_generator import TXTGenerator
from txt_parser import TXTParser
from json_generator import JSONGenerator
from utils import (
    ensure_directory_exists,
    format_file_size,
)
from commands import setup_parser
from batch_ops import (
    get_filtered_files,
    batch_update_files,
    find_file_by_uid,
    replace_line_by_prefix,
    replace_lines_by_prefixes,
)

# --------------------------------------------------------------------------- #
# 命令别名映射表：短别名 → 正式命令名
# 所有新增的短命令别名都在这里注册，main() 中只需归一化一次
# --------------------------------------------------------------------------- #
COMMAND_ALIASES: dict = {
    "sp":  "split",
    "mg":  "merge",
    "cr":  "create",
    "ls":  "list",
    "bsu": "batch-set-uid",
    "bsn": "batch-set-newname",
    "bso": "batch-set-order",
    "bsp": "batch-set-position",
    "bss": "batch-set-strategy",
    "bsr": "batch-set-recursion",
    "bse": "batch-set-effect",
    "buf": "batch-update-field",
    "ebk": "extract-by-key",
    "ak":  "add-keywords",
    "bak": "batch-add-keywords",
    "rk":  "remove-keywords",
    "ck":  "clear-keywords",
    "bck": "batch-clear-keywords",
    "ec":  "extract-constant",
    "bm":  "batch-move",
    "rm":  "remove",
}


class WorldBookManager:
    """世界书管理器"""

    def __init__(self):
        self.config = ConfigManager()
        self.json_parser = JSONParser(self.config)
        self.txt_generator = TXTGenerator(self.config)
        self.txt_parser = TXTParser(self.config)
        self.json_generator = JSONGenerator(self.config)

    # ======================================================================= #
    # split / merge / create / list
    # ======================================================================= #

    def split_worldbook(self, json_file: str = None, output_dir: str = None) -> None:
        """拆分 JSON 世界书为 TXT 文件"""
        # 未指定文件时，自动从 JSON/old/ 目录中选取
        if json_file is None:
            old_dir = self.config.get_directory("json_old")
            candidates = sorted(old_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
            if not candidates:
                print(f"错误: JSON/old/ 目录下没有 .json 文件，请手动指定文件路径")
                print(f"  目录: {old_dir}")
                return
            if len(candidates) == 1:
                json_file = str(candidates[0])
                print(f"自动选取: {candidates[0].name}")
            else:
                print(f"JSON/old/ 目录下有多个文件，将使用最近修改的：")
                for c in candidates[:5]:
                    print(f"  {c.name}")
                json_file = str(candidates[0])
                print(f"→ 选取: {candidates[0].name}")

        print(f"正在拆分世界书: {json_file}")

        json_path = Path(json_file)
        if not json_path.exists():
            print(f"错误: 文件不存在 - {json_file}")
            return

        worldbook_name = self.json_parser.get_worldbook_name_from_file(json_file)

        if output_dir is None:
            out = self.config.get_directory("txt") / worldbook_name
        else:
            out = Path(output_dir) / worldbook_name

        ensure_directory_exists(out)

        try:
            metadata, entries = self.json_parser.parse_worldbook_json(json_file)
            print(f"找到 {len(entries)} 个条目")

            generated = self.txt_generator.batch_generate_txt(
                entries, str(out), worldbook_name
            )
            print(f"成功生成 {len(generated)} 个 TXT 文件")
            print(f"输出目录: {out}")

            stats = self.json_parser.get_entry_statistics(entries)
            _print_stats(stats)

        except Exception as e:
            print(f"拆分失败: {e}")
            traceback.print_exc()

    def merge_worldbook(
        self,
        output_name: str,
        txt_files: List[str],
        output_dir: str = None,
        user_input_name: str = None,
        format: str = "new",
    ) -> None:
        """合并 TXT 文件为 JSON 世界书"""
        print(f"正在合并世界书: {output_name}")
        print(f"输入文件数: {len(txt_files)}  输出格式: {format}")

        out_dir = Path(output_dir) if output_dir else self.config.get_directory("json_new")
        ensure_directory_exists(out_dir)

        try:
            entries = self.txt_parser.batch_parse_txt(txt_files)
            print(f"成功解析 {len(entries)} 个条目")

            output_file = out_dir / f"{output_name}.json"
            metadata = {
                "name": output_name,
                "description": f"从 {len(txt_files)} 个 TXT 文件合并",
            }
            self.json_generator.generate_worldbook_json(
                entries, str(output_file), metadata, format
            )
            print(f"成功生成 JSON 文件: {output_file}")

            stats = self.json_generator.get_entry_statistics(entries)
            _print_stats(stats, show_order=True)

        except Exception as e:
            print(f"合并失败: {e}")
            traceback.print_exc()

    def create_template(
        self,
        template_name: str,
        output_dir: str = None,
        uid: int = None,
        order: int = None,
    ) -> None:
        """创建 TXT 模板"""
        print(f"正在创建 TXT 模板: {template_name}")

        out_dir = Path(output_dir) if output_dir else self.config.get_directory("txt") / "TMP"
        ensure_directory_exists(out_dir)

        try:
            file_path = self.txt_generator.generate_txt_template(
                str(out_dir), template_name, uid, order
            )
            print(f"UID: {uid if uid is not None else '自动生成'}")
            print(f"Order: {order if order is not None else '100（默认）'}")
            print(f"成功创建 TXT 模板文件: {file_path}")

        except Exception as e:
            print(f"创建 TXT 模板失败: {e}")
            traceback.print_exc()

    def list_txt_files(self, txt_dir: str = None) -> None:
        """列出 TXT 文件"""
        dir_path = Path(txt_dir) if txt_dir else self.config.get_directory("txt")

        if not dir_path.exists():
            print(f"目录不存在: {dir_path}")
            return

        txt_files = sorted(dir_path.glob("*.txt"))
        if not txt_files:
            print(f"目录中没有 TXT 文件: {dir_path}")
            return

        print(f"找到 {len(txt_files)} 个 TXT 文件:\n")
        for f in txt_files:
            info = self.txt_parser.get_txt_file_info(str(f))
            size = format_file_size(info["size"])
            print(f"文件: {info['name']}")
            print(f"  UID: {info['uid']}")
            print(f"  注释: {info['comment']}")
            print(f"  旧名称: {info['worldbook_old_name'] or '(无)'}")
            print(f"  新名称: {info['worldbook_new_name'] or '(无)'}")
            print(f"  大小: {size}")
            print()

    # ======================================================================= #
    # batch-set-uid（特殊：按文件排序顺序赋值，不筛选 UID 范围）
    # ======================================================================= #

    def batch_set_uid(self, uid_spec: str, txt_dir: str = None) -> None:
        """批量设置 UID"""
        print(f"正在批量设置 UID: {uid_spec}")

        dir_path = Path(txt_dir) if txt_dir else self.config.get_directory("txt")

        try:
            uid_list = self._parse_uid_spec(uid_spec)
            txt_files = sorted(dir_path.glob("*.txt"), key=lambda x: x.name)

            if len(uid_list) != len(txt_files):
                print(
                    f"警告: UID 数量({len(uid_list)})与文件数量({len(txt_files)})不匹配"
                )

            print(f"找到 {len(txt_files)} 个 TXT 文件需要更新")

            updated = 0
            for i, f in enumerate(txt_files):
                if i >= len(uid_list):
                    break
                try:
                    content = f.read_text(encoding="utf-8")
                    lines = content.split("\n")
                    lines = replace_line_by_prefix(lines, "UID", str(uid_list[i]))
                    f.write_text("\n".join(lines), encoding="utf-8")
                    updated += 1
                except Exception as e:
                    print(f"更新失败 {f.name}: {e}")

            print(f"成功更新 {updated} 个文件")

        except Exception as e:
            print(f"批量设置 UID 失败: {e}")
            traceback.print_exc()

    def _parse_uid_spec(self, uid_spec: str) -> List[int]:
        """解析 UID 规格：范围 '1-100' 或列表 '1,7,10,100'"""
        if "-" in uid_spec:
            start, end = map(int, uid_spec.split("-", 1))
            return list(range(start, end + 1))
        elif "," in uid_spec:
            return [int(u.strip()) for u in uid_spec.split(",")]
        else:
            return [int(uid_spec)]

    # ======================================================================= #
    # 通用批量字段设置（使用 batch_ops 消除重复）
    # ======================================================================= #

    def _batch_set_field(
        self,
        op_name: str,
        txt_dir_raw: Optional[str],
        uid_start: Optional[int],
        uid_end: Optional[int],
        update_fn,
    ) -> None:
        """
        所有「批量替换字段」操作的统一骨架。

        原来 8 个方法各自含有相同的筛选逻辑，现在全部收归于此。
        """
        dir_path = Path(txt_dir_raw) if txt_dir_raw else self.config.get_directory("txt")

        try:
            selected = get_filtered_files(dir_path, self.txt_parser, uid_start, uid_end)
            print(f"找到 {len(selected)} 个 TXT 文件需要更新")

            updated = batch_update_files(selected, update_fn, op_name)
            print(f"成功更新 {updated} 个文件")

        except Exception as e:
            print(f"{op_name}失败: {e}")
            traceback.print_exc()

    def batch_set_position(
        self, position: str, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """批量设置 Position（插入位置）"""
        print(f"正在批量设置 Position: {position}")
        self._batch_set_field(
            "批量设置 Position", txt_dir, uid_start, uid_end,
            lambda lines: replace_line_by_prefix(lines, "Position", position),
        )

    def batch_set_strategy(
        self, strategy: str, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """批量设置 Strategy（激活策略：constant / selective / vectorized）"""
        print(f"正在批量设置 Strategy: {strategy}")

        strategy_map = {
            "constant":   {"Constant": "true",  "Selective": "false", "Vectorized": "false"},
            "selective":  {"Constant": "false", "Selective": "true",  "Vectorized": "false"},
            "vectorized": {"Constant": "false", "Selective": "false", "Vectorized": "true"},
        }
        replacements = strategy_map.get(strategy)
        if replacements is None:
            print(f"错误: 未知策略类型 - {strategy}")
            return

        self._batch_set_field(
            "批量设置 Strategy", txt_dir, uid_start, uid_end,
            lambda lines: replace_lines_by_prefixes(lines, replacements),
        )

    def batch_set_recursion(
        self, recursion_params: str, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """批量设置 Recursion（递归控制：prevent_incoming,prevent_outgoing,delay_until）"""
        print(f"正在批量设置 Recursion: {recursion_params}")

        params = [p.strip() for p in recursion_params.split(",")]
        if len(params) != 3:
            print("错误: 参数格式不正确，需要 3 个参数（prevent_incoming,prevent_outgoing,delay_until）")
            return

        replacements = {
            "ExcludeRecursion":    params[0],
            "PreventRecursion":    params[1],
            "DelayUntilRecursion": params[2],
        }
        self._batch_set_field(
            "批量设置 Recursion", txt_dir, uid_start, uid_end,
            lambda lines: replace_lines_by_prefixes(lines, replacements),
        )

    def batch_set_effect(
        self, effect_params: str, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """批量设置 Effect（效果控制：sticky,cooldown,delay）"""
        print(f"正在批量设置 Effect: {effect_params}")

        params = [p.strip() for p in effect_params.split(",")]
        if len(params) != 3:
            print("错误: 参数格式不正确，需要 3 个参数（sticky,cooldown,delay）")
            return

        replacements = {
            "Sticky":   params[0],
            "Cooldown": params[1],
            "Delay":    params[2],
        }
        self._batch_set_field(
            "批量设置 Effect", txt_dir, uid_start, uid_end,
            lambda lines: replace_lines_by_prefixes(lines, replacements),
        )

    def batch_set_newname(
        self, new_name: str, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """批量设置 WorldBook_NewName"""
        print(f"正在批量设置 WorldBook_NewName: {new_name}")
        self._batch_set_field(
            "批量设置 NewName", txt_dir, uid_start, uid_end,
            lambda lines: replace_line_by_prefix(lines, "WorldBook_NewName", new_name),
        )

    def batch_update_field(
        self, field_name: str, field_value: str, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """批量更新任意字段值"""
        print(f"正在批量更新字段: {field_name} = {field_value}")
        self._batch_set_field(
            f"批量更新 {field_name}", txt_dir, uid_start, uid_end,
            lambda lines: replace_line_by_prefix(lines, field_name, field_value),
        )

    # ======================================================================= #
    # 关键字操作
    # ======================================================================= #

    def add_keywords(self, keywords: str, txt_dir: str, uid: int) -> None:
        """为指定 UID 的 TXT 文件添加关键字"""
        print(f"正在为 UID {uid} 添加关键字: {keywords}")

        dir_path = Path(txt_dir)
        if not dir_path.exists():
            print(f"错误: 目录不存在 - {txt_dir}")
            return

        target = find_file_by_uid(dir_path, self.txt_parser, uid)
        if not target:
            print(f"错误: 未找到 UID 为 {uid} 的 TXT 文件")
            return

        try:
            keyword_list = [k.strip() for k in keywords.split(",")]
            content = target.read_text(encoding="utf-8")
            lines = content.split("\n")

            for i, line in enumerate(lines):
                if line.strip().startswith("Key:"):
                    existing_raw = line.split(":", 1)[1].strip()
                    try:
                        existing = json.loads(existing_raw) if existing_raw and existing_raw != "[]" else []
                    except Exception:
                        existing = []
                    merged = existing + [k for k in keyword_list if k not in existing]
                    lines[i] = f"Key: {json.dumps(merged, ensure_ascii=False)}"
                    break

            target.write_text("\n".join(lines), encoding="utf-8")
            print(f"成功添加关键字到 {target.name}")

        except Exception as e:
            print(f"添加关键字失败: {e}")
            traceback.print_exc()

    def batch_add_keywords(
        self, keywords: str, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """
        批量为多个 UID 添加关键字。

        Bug 修复：原版在 uid_start 不为 None 时直接与 file_uid（可能是 None）比较，
        会引发 TypeError。现在使用 get_filtered_files() 统一处理 None 安全问题。
        """
        print(f"正在批量添加关键字: {keywords}")

        dir_path = Path(txt_dir) if txt_dir else self.config.get_directory("txt")
        if not dir_path.exists():
            print(f"错误: 目录不存在 - {dir_path}")
            return

        keyword_list = [k.strip() for k in keywords.split(",")]

        def _add_keys(lines: List[str]) -> List[str]:
            for i, line in enumerate(lines):
                if line.strip().startswith("Key:"):
                    existing_raw = line.split(":", 1)[1].strip()
                    try:
                        existing = json.loads(existing_raw) if existing_raw and existing_raw != "[]" else []
                    except Exception:
                        existing = []
                    merged = existing + [k for k in keyword_list if k not in existing]
                    lines[i] = f"Key: {json.dumps(merged, ensure_ascii=False)}"
                    break
            return lines

        try:
            selected = get_filtered_files(dir_path, self.txt_parser, uid_start, uid_end)
            print(f"找到 {len(selected)} 个 TXT 文件")
            updated = batch_update_files(selected, _add_keys, "批量添加关键字")
            print(f"成功为 {updated} 个文件添加关键字")

        except Exception as e:
            print(f"批量添加关键字失败: {e}")
            traceback.print_exc()

    def remove_keywords(self, keywords: str, txt_dir: str, uid: int) -> None:
        """从指定 UID 的 TXT 文件中删除关键字"""
        print(f"正在从 UID {uid} 删除关键字: {keywords}")

        dir_path = Path(txt_dir)
        if not dir_path.exists():
            print(f"错误: 目录不存在 - {txt_dir}")
            return

        target = find_file_by_uid(dir_path, self.txt_parser, uid)
        if not target:
            print(f"错误: 未找到 UID 为 {uid} 的 TXT 文件")
            return

        try:
            to_remove = {k.strip() for k in keywords.split(",")}
            content = target.read_text(encoding="utf-8")
            lines = content.split("\n")

            for i, line in enumerate(lines):
                if line.strip().startswith("Key:"):
                    existing_raw = line.split(":", 1)[1].strip()
                    try:
                        existing = json.loads(existing_raw) if existing_raw and existing_raw != "[]" else []
                        filtered = [k for k in existing if k not in to_remove]
                        lines[i] = f"Key: {json.dumps(filtered, ensure_ascii=False)}"
                    except Exception:
                        pass
                    break

            target.write_text("\n".join(lines), encoding="utf-8")
            print(f"成功从 {target.name} 删除 {len(to_remove)} 个关键字")

        except Exception as e:
            print(f"删除关键字失败: {e}")
            traceback.print_exc()

    def clear_keywords(self, txt_dir: str, uid: int) -> None:
        """清空指定 UID 的 TXT 文件的所有关键字"""
        print(f"正在清空 UID {uid} 的所有关键字")

        dir_path = Path(txt_dir)
        if not dir_path.exists():
            print(f"错误: 目录不存在 - {txt_dir}")
            return

        target = find_file_by_uid(dir_path, self.txt_parser, uid)
        if not target:
            print(f"错误: 未找到 UID 为 {uid} 的 TXT 文件")
            return

        try:
            content = target.read_text(encoding="utf-8")
            lines = content.split("\n")
            lines = replace_line_by_prefix(lines, "Key", "[]")
            target.write_text("\n".join(lines), encoding="utf-8")
            print(f"成功清空 {target.name} 的所有关键字")

        except Exception as e:
            print(f"清空关键字失败: {e}")
            traceback.print_exc()

    def batch_clear_keywords(
        self, txt_dir: str = None,
        uid_start: int = None, uid_end: int = None
    ) -> None:
        """
        批量清空多个 TXT 文件的所有关键字。

        Bug 修复：同 batch_add_keywords，修复 file_uid 为 None 时的比较错误。
        """
        print("正在批量清空关键字")

        dir_path = Path(txt_dir) if txt_dir else self.config.get_directory("txt")
        if not dir_path.exists():
            print(f"错误: 目录不存在 - {dir_path}")
            return

        def _clear_keys(lines: List[str]) -> List[str]:
            for i, line in enumerate(lines):
                if line.strip().startswith("Key:"):
                    existing_raw = line.split(":", 1)[1].strip()
                    if existing_raw and existing_raw != "[]":
                        lines[i] = "Key: []"
                    break
            return lines

        try:
            selected = get_filtered_files(dir_path, self.txt_parser, uid_start, uid_end)
            print(f"找到 {len(selected)} 个 TXT 文件")
            updated = batch_update_files(selected, _clear_keys, "批量清空关键字")
            print(f"成功清空 {updated} 个文件的关键字")

        except Exception as e:
            print(f"批量清空关键字失败: {e}")
            traceback.print_exc()

    # ======================================================================= #
    # 文件提取与移动操作
    # ======================================================================= #

    def extract_by_key(
        self, source_dir: str, keywords: str, output_dir: str = None
    ) -> None:
        """根据关键词提取包含该关键词的 TXT 文件到指定目录"""
        print("正在根据关键词提取 TXT 文件")

        source_path = Path(source_dir)
        if not source_path.exists():
            print(f"错误: 源目录不存在 - {source_dir}")
            return

        out = (
            Path(output_dir) if output_dir
            else self.config.get_directory("txt") / "extracted" / source_path.name
        )
        ensure_directory_exists(out)

        try:
            keyword_list = [k.strip() for k in keywords.split(",")]
            print(f"提取关键词: {', '.join(keyword_list)}")

            matched = []
            for f in source_path.glob("*.txt"):
                try:
                    entry = self.txt_parser.parse_txt_file(str(f))
                    keys = entry.get("key", [])
                    if any(kw in keys for kw in keyword_list):
                        matched.append(f)
                except Exception as e:
                    print(f"解析失败 {f.name}: {e}")

            print(f"找到 {len(matched)} 个包含指定关键词的文件")

            for f in matched:
                shutil.move(str(f), str(out / f.name))
                print(f"移动: {f.name}")

            print(f"成功移动 {len(matched)} 个文件到 {out}")

        except Exception as e:
            print(f"提取失败: {e}")
            traceback.print_exc()

    def extract_constant(self, source_dir: str, output_dir: str = None) -> None:
        """提取常量（蓝灯）条目到指定目录"""
        print("正在提取常量（蓝灯）条目")

        source_path = Path(source_dir)
        if not source_path.exists():
            print(f"错误: 源目录不存在 - {source_dir}")
            return

        out = (
            Path(output_dir) if output_dir
            else self.config.get_directory("txt") / "constant" / source_path.name
        )
        ensure_directory_exists(out)

        try:
            constant_files = []
            for f in source_path.glob("*.txt"):
                try:
                    entry = self.txt_parser.parse_txt_file(str(f))
                    constant = entry.get("constant", False)
                    if (isinstance(constant, bool) and constant) or (
                        isinstance(constant, str) and constant.lower() == "true"
                    ):
                        constant_files.append(f)
                except Exception as e:
                    print(f"解析失败 {f.name}: {e}")

            print(f"找到 {len(constant_files)} 个常量条目")
            for f in constant_files:
                shutil.move(str(f), str(out / f.name))
            print(f"成功移动 {len(constant_files)} 个常量条目到 {out}")

        except Exception as e:
            print(f"提取失败: {e}")
            traceback.print_exc()

    def batch_move(self, source: str, output_dir: str) -> None:
        """批量移动 TXT 文件到指定目录（支持通配符）"""
        print("正在批量移动文件")

        out = Path(output_dir)
        ensure_directory_exists(out)

        try:
            source_files = glob.glob(source) if ("*" in source or "?" in source) else [source]
            print(f"找到 {len(source_files)} 个文件")

            moved = 0
            for sf in source_files:
                sp = Path(sf)
                if sp.exists():
                    shutil.move(str(sp), str(out / sp.name))
                    moved += 1

            print(f"成功移动 {moved} 个文件到 {output_dir}")

        except Exception as e:
            print(f"批量移动失败: {e}")
            traceback.print_exc()

    def remove(self, path: str, recursive: bool = False) -> None:
        """删除 TXT 子目录或文件"""
        print(f"正在删除: {path}")

        target = Path(path)
        if not target.exists():
            print(f"错误: 路径不存在 - {path}")
            return

        try:
            if target.is_file():
                target.unlink()
                print(f"成功删除文件: {path}")
            elif target.is_dir():
                if recursive:
                    shutil.rmtree(str(target))
                    print(f"成功递归删除目录: {path}")
                else:
                    print(f"错误: 目录需要使用 -r 参数递归删除")
                    print(f'用法: python main.py remove "{path}" -r')

        except Exception as e:
            print(f"删除失败: {e}")
            traceback.print_exc()


# =========================================================================== #
# 工具函数
# =========================================================================== #

def _print_stats(stats: dict, show_order: bool = False) -> None:
    """打印统计信息"""
    print("\n统计信息:")
    print(f"  总条目数: {stats['total']}")
    print(f"  常量条目: {stats['constant']}")
    print(f"  可选条目: {stats['selective']}")
    print(f"  启用条目: {stats['enabled']}")
    print(f"  禁用条目: {stats['disabled']}")
    if show_order and "order_range" in stats:
        r = stats["order_range"]
        print(f"  Order 范围: {r['min']} - {r['max']}")


# =========================================================================== #
# main()
# =========================================================================== #

def main():
    parser = setup_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # 归一化命令名（短别名 → 正式名）
    command = COMMAND_ALIASES.get(args.command, args.command)

    manager = WorldBookManager()

    if command == "split":
        manager.split_worldbook(args.json_file, args.output_dir)

    elif command == "merge":
        txt_path = Path(args.txt)
        if txt_path.is_dir():
            txt_files = [str(f) for f in txt_path.glob("*.txt")]
        elif "*" in args.txt or "?" in args.txt:
            txt_files = glob.glob(args.txt)
        elif txt_path.exists():
            txt_files = [args.txt]
        else:
            print(f"错误: 路径不存在 - {args.txt}")
            return
        manager.merge_worldbook(args.name, txt_files, args.output_dir, None, args.format)

    elif command == "create":
        output_dir = args.output_dir if args.output_dir else "TXT/TMP"
        manager.create_template(args.name, output_dir, args.uid, args.order)

    elif command == "list":
        manager.list_txt_files(args.txt_dir)

    elif command == "batch-set-uid":
        manager.batch_set_uid(args.uid_spec, args.txt)

    elif command == "batch-set-newname":
        manager.batch_set_newname(args.new_name, args.txt, args.uid_start, args.uid_end)

    elif command == "batch-set-order":
        manager.batch_update_field("Order", args.order_value, args.txt, args.uid_start, args.uid_end)

    elif command == "batch-set-position":
        manager.batch_set_position(args.position, args.txt, args.uid_start, args.uid_end)

    elif command == "batch-set-strategy":
        manager.batch_set_strategy(args.strategy, args.txt, args.uid_start, args.uid_end)

    elif command == "batch-set-recursion":
        manager.batch_set_recursion(args.recursion_params, args.txt, args.uid_start, args.uid_end)

    elif command == "batch-set-effect":
        manager.batch_set_effect(args.effect_params, args.txt, args.uid_start, args.uid_end)

    elif command == "batch-update-field":
        manager.batch_update_field(args.field_name, args.field_value, args.txt, args.uid_start, args.uid_end)

    elif command == "extract-by-key":
        manager.extract_by_key(args.source_dir, args.keywords, args.output_dir)

    elif command == "add-keywords":
        manager.add_keywords(args.keywords, args.txt, args.uid)

    elif command == "batch-add-keywords":
        manager.batch_add_keywords(args.keywords, args.txt, args.uid_start, args.uid_end)

    elif command == "remove-keywords":
        manager.remove_keywords(args.keywords, args.txt, args.uid)

    elif command == "clear-keywords":
        manager.clear_keywords(args.txt, args.uid)

    elif command == "batch-clear-keywords":
        manager.batch_clear_keywords(args.txt, args.uid_start, args.uid_end)

    elif command == "extract-constant":
        manager.extract_constant(args.source_dir, args.output_dir)

    elif command == "batch-move":
        manager.batch_move(args.source, args.output_dir)

    elif command == "remove":
        manager.remove(args.path, args.recursive)

    else:
        print(f"未知命令: {command}")
        parser.print_help()


if __name__ == "__main__":
    main()
