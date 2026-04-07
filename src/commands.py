#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Commands Module - 命令定义模块

负责定义所有命令行参数，集中管理命令结构。

短别名对照表（所有别名也在 main.py 的 COMMAND_ALIASES 字典中注册）：
  split               sp
  merge               mg
  create              cr
  list                ls
  batch-set-uid       bsu
  batch-set-newname   bsn
  batch-set-order     bso
  batch-set-position  bsp
  batch-set-strategy  bss
  batch-set-recursion bsr
  batch-set-effect    bse
  batch-update-field  buf
  extract-by-key      ebk
  add-keywords        ak
  batch-add-keywords  bak
  remove-keywords     rk
  clear-keywords      ck
  batch-clear-keywords bck
  extract-constant    ec
  batch-move          bm
  remove              rm
"""

import argparse


def setup_parser():
    """设置主解析器"""
    parser = argparse.ArgumentParser(
        description="WorldBook Manager - SillyTavern 世界书管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例（完整命令名 / 短别名 均可使用）:

  # 拆分 JSON 世界书
  python main.py split "YouWorldBook.json"
  python main.py sp "YouWorldBook.json"

  # 合并 TXT 文件为 JSON
  python main.py merge -n "YouWorldBook" -t "TXT/YouWorldBook"
  python main.py mg -n "YouWorldBook" -t "TXT/YouWorldBook"

  # 创建 TXT 模板
  python main.py create -n "新条目" -u 999 -o 990
  python main.py cr -n "新条目" -u 999 -o 990

  # 批量设置 Position（全目录）
  python main.py bsp "before_author_note" -t "TXT/YouWorldBook"

  # 批量设置 Position（仅 UID 1-50）
  python main.py bsp "before_author_note" -t "TXT/YouWorldBook" -s 1 -e 50

  # 批量设置激活策略
  python main.py bss constant -t "TXT/YouWorldBook"

  # 批量添加关键字
  python main.py bak "鬼杀队,炭治郎" -t "TXT/YouWorldBook" -s 1 -e 20

  # 提取蓝灯条目
  python main.py ec "TXT/YouWorldBook"

  # 批量移动
  python main.py bm "TXT/YouWorldBook/*.txt" -o "TXT/NewLocation"

  # 删除目录
  python main.py rm "TXT/YouWorldBook" -r
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    _setup_split(subparsers)
    _setup_merge(subparsers)
    _setup_create(subparsers)
    _setup_list(subparsers)
    _setup_batch_set_uid(subparsers)
    _setup_batch_set_newname(subparsers)
    _setup_batch_set_order(subparsers)
    _setup_batch_set_position(subparsers)
    _setup_batch_set_strategy(subparsers)
    _setup_batch_set_recursion(subparsers)
    _setup_batch_set_effect(subparsers)
    _setup_batch_update_field(subparsers)
    _setup_extract_by_key(subparsers)
    _setup_add_keywords(subparsers)
    _setup_batch_add_keywords(subparsers)
    _setup_remove_keywords(subparsers)
    _setup_clear_keywords(subparsers)
    _setup_batch_clear_keywords(subparsers)
    _setup_extract_constant(subparsers)
    _setup_batch_move(subparsers)
    _setup_remove(subparsers)

    return parser


# --------------------------------------------------------------------------- #
# 各子命令定义
# --------------------------------------------------------------------------- #

def _setup_split(subparsers):
    p = subparsers.add_parser(
        "split", aliases=["sp"],
        help="拆分 JSON 世界书为 TXT 文件（别名：sp）",
    )
    p.add_argument(
        "json_file", nargs="?", default=None,
        help="JSON 世界书文件路径（不填则自动读取 JSON/old/ 目录中唯一或最新的 .json 文件）"
    )
    p.add_argument("--output-dir", "-o", help="输出目录（默认: TXT/{worldbook_name}/）")


def _setup_merge(subparsers):
    p = subparsers.add_parser(
        "merge", aliases=["mg"],
        help="合并 TXT 文件为 JSON 世界书（别名：mg）",
    )
    p.add_argument("--name", "-n", required=True, help="输出世界书名称")
    p.add_argument("--txt", "-t", required=True, help="TXT 文件路径（目录或通配符）")
    p.add_argument("--output-dir", "-o", help="输出目录（默认: JSON/new/）")
    p.add_argument(
        "--format", "-f", choices=["new", "old"], default="new",
        help="输出格式：new（新格式，默认）或 old（旧格式）",
    )


def _setup_create(subparsers):
    p = subparsers.add_parser(
        "create", aliases=["cr"],
        help="创建 TXT 模板（别名：cr）",
    )
    p.add_argument("--name", "-n", required=True, help="条目名称（Comment）")
    p.add_argument("--uid", "-u", type=int, help="UID（可选，不指定则自动生成）")
    p.add_argument("--order", "-o", type=int, help="Order（可选，默认 100）")
    p.add_argument("--output-dir", "-d", help="输出目录（默认: TXT/TMP/）")


def _setup_list(subparsers):
    p = subparsers.add_parser(
        "list", aliases=["ls"],
        help="列出 TXT 文件（别名：ls）",
    )
    p.add_argument("--txt-dir", "-t", help="TXT 目录（默认: TXT/）")


def _setup_batch_set_uid(subparsers):
    p = subparsers.add_parser(
        "batch-set-uid", aliases=["bsu"],
        help="批量设置 UID（别名：bsu）",
    )
    p.add_argument("uid_spec", help='UID 规格（范围 "1-100" 或列表 "1,7,10"）')
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")


def _setup_batch_set_newname(subparsers):
    p = subparsers.add_parser(
        "batch-set-newname", aliases=["bsn"],
        help="批量设置 WorldBook_NewName（别名：bsn）",
    )
    p.add_argument("new_name", help="新的世界书名称")
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_batch_set_order(subparsers):
    p = subparsers.add_parser(
        "batch-set-order", aliases=["bso"],
        help="批量设置 Order（别名：bso）",
    )
    p.add_argument("order_value", help="Order 值")
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_batch_set_position(subparsers):
    p = subparsers.add_parser(
        "batch-set-position", aliases=["bsp"],
        help="批量设置 Position（插入位置）（别名：bsp）",
    )
    p.add_argument("position", help="位置类型（字符串或数字）")
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_batch_set_strategy(subparsers):
    p = subparsers.add_parser(
        "batch-set-strategy", aliases=["bss"],
        help="批量设置 Strategy（激活策略）（别名：bss）",
    )
    p.add_argument(
        "strategy", choices=["constant", "selective", "vectorized"],
        help="策略类型（constant / selective / vectorized）",
    )
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_batch_set_recursion(subparsers):
    p = subparsers.add_parser(
        "batch-set-recursion", aliases=["bsr"],
        help="批量设置 Recursion（递归控制）（别名：bsr）",
    )
    p.add_argument(
        "recursion_params",
        help="三个参数，逗号分隔（prevent_incoming,prevent_outgoing,delay_until）\n"
             "示例: true,true,false",
    )
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_batch_set_effect(subparsers):
    p = subparsers.add_parser(
        "batch-set-effect", aliases=["bse"],
        help="批量设置 Effect（效果控制）（别名：bse）",
    )
    p.add_argument(
        "effect_params",
        help="三个参数，逗号分隔（sticky,cooldown,delay）\n示例: 0,0,0",
    )
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_batch_update_field(subparsers):
    p = subparsers.add_parser(
        "batch-update-field", aliases=["buf"],
        help="批量更新任意字段值（别名：buf）",
    )
    p.add_argument("field_name", help="字段名（如 Order、Position）")
    p.add_argument("field_value", help="字段值")
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_extract_by_key(subparsers):
    p = subparsers.add_parser(
        "extract-by-key", aliases=["ebk"],
        help="根据关键词提取 TXT 文件（别名：ebk）",
    )
    p.add_argument("source_dir", help="源 TXT 目录")
    p.add_argument("keywords", help='关键词（单个"XX"或多个"XX,YY,ZZ"）')
    p.add_argument("--output-dir", "-o", help="输出目录（默认: TXT/extracted/{源目录名}/）")


def _setup_add_keywords(subparsers):
    p = subparsers.add_parser(
        "add-keywords", aliases=["ak"],
        help="为指定 UID 的 TXT 文件添加关键字（别名：ak）",
    )
    p.add_argument("keywords", help='关键字（单个"XX"或多个"XX,YY,ZZ"）')
    p.add_argument("--txt", "-t", required=True, help="TXT 目录")
    p.add_argument("--uid", "-u", type=int, required=True, help="指定 UID")


def _setup_batch_add_keywords(subparsers):
    p = subparsers.add_parser(
        "batch-add-keywords", aliases=["bak"],
        help="批量为多个 UID 添加关键字（别名：bak）",
    )
    p.add_argument("keywords", help='关键字（单个"XX"或多个"XX,YY,ZZ"）')
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_remove_keywords(subparsers):
    p = subparsers.add_parser(
        "remove-keywords", aliases=["rk"],
        help="从指定 UID 的 TXT 文件中删除关键字（别名：rk）",
    )
    p.add_argument("keywords", help='关键字（单个"XX"或多个"XX,YY,ZZ"）')
    p.add_argument("--txt", "-t", required=True, help="TXT 目录")
    p.add_argument("--uid", "-u", type=int, required=True, help="指定 UID")


def _setup_clear_keywords(subparsers):
    p = subparsers.add_parser(
        "clear-keywords", aliases=["ck"],
        help="清空指定 UID 的 TXT 文件的所有关键字（别名：ck）",
    )
    p.add_argument("--txt", "-t", required=True, help="TXT 目录")
    p.add_argument("--uid", "-u", type=int, required=True, help="指定 UID")


def _setup_batch_clear_keywords(subparsers):
    p = subparsers.add_parser(
        "batch-clear-keywords", aliases=["bck"],
        help="批量清空多个 TXT 文件的所有关键字（别名：bck）",
    )
    p.add_argument("--txt", "-t", help="TXT 目录（默认: TXT/）")
    p.add_argument("--uid-start", "-s", type=int, help="起始 UID（可选）")
    p.add_argument("--uid-end", "-e", type=int, help="结束 UID（可选）")


def _setup_extract_constant(subparsers):
    p = subparsers.add_parser(
        "extract-constant", aliases=["ec"],
        help="提取常量（蓝灯）条目到指定目录（别名：ec）",
    )
    p.add_argument("source_dir", help="源 TXT 目录")
    p.add_argument("--output-dir", "-o", help="输出目录（默认: TXT/constant/{源目录名}/）")


def _setup_batch_move(subparsers):
    p = subparsers.add_parser(
        "batch-move", aliases=["bm"],
        help="批量移动 TXT 文件（别名：bm）",
    )
    p.add_argument("source", help="源文件路径（支持通配符）")
    p.add_argument("--output-dir", "-o", required=True, help="目标目录")


def _setup_remove(subparsers):
    p = subparsers.add_parser(
        "remove", aliases=["rm"],
        help="删除 TXT 子目录或文件（别名：rm）",
    )
    p.add_argument("path", help="路径（目录或文件）")
    p.add_argument("--recursive", "-r", action="store_true", help="递归删除目录")
