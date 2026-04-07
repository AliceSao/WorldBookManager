#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
WorldBook Manager 功能测试脚本

用于测试所有核心功能是否正常工作
"""

import sys
import os
from pathlib import Path

# 添加当前目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from main import WorldBookManager


def test_basic_functions():
    """测试基础功能"""
    print("=" * 60)
    print("测试基础功能")
    print("=" * 60)
    
    manager = WorldBookManager()
    
    # 测试创建模板
    print("\n[1/4] 测试创建模板...")
    try:
        manager.create_template("测试条目", uid=9999, order=990)
        print("✅ 创建模板成功")
    except Exception as e:
        print(f"❌ 创建模板失败: {e}")
        return False
    
    # 测试列出文件
    print("\n[2/4] 测试列出文件...")
    try:
        manager.list_txt_files("TXT/TMP")
        print("✅ 列出文件成功")
    except Exception as e:
        print(f"❌ 列出文件失败: {e}")
        return False
    
    # 测试删除文件
    print("\n[3/4] 测试删除文件...")
    try:
        manager.remove("TXT/TMP/9999_测试条目.txt")
        print("✅ 删除文件成功")
    except Exception as e:
        print(f"❌ 删除文件失败: {e}")
        return False
    
    # 测试批量移动
    print("\n[4/4] 测试批量移动...")
    try:
        # 创建测试文件
        Path("TXT/TMP/test1.txt").write_text("test")
        Path("TXT/TMP/test2.txt").write_text("test")
        manager.batch_move("TXT/TMP/*.txt", "TXT/TestMove")
        print("✅ 批量移动成功")
    except Exception as e:
        print(f"❌ 批量移动失败: {e}")
        return False
    
    # 清理
    try:
        manager.remove("TXT/TestMove", recursive=True)
    except:
        pass
    
    return True


def test_batch_operations():
    """测试批量操作"""
    print("\n" + "=" * 60)
    print("测试批量操作")
    print("=" * 60)
    
    manager = WorldBookManager()
    
    # 创建测试文件
    print("\n准备测试文件...")
    for i in range(1, 4):
        manager.create_template(f"测试{i}", uid=i, order=100)
    
    # 测试批量设置 Order
    print("\n[1/4] 测试批量设置 Order...")
    try:
        manager.batch_update_field("Order", "500", "TXT/TMP", 1, 3)
        print("✅ 批量设置 Order 成功")
    except Exception as e:
        print(f"❌ 批量设置 Order 失败: {e}")
        return False
    
    # 测试批量设置 Strategy
    print("\n[2/4] 测试批量设置 Strategy...")
    try:
        manager.batch_set_strategy("constant", "TXT/TMP", 1, 3)
        print("✅ 批量设置 Strategy 成功")
    except Exception as e:
        print(f"❌ 批量设置 Strategy 失败: {e}")
        return False
    
    # 测试批量添加关键字
    print("\n[3/4] 测试批量添加关键字...")
    try:
        manager.batch_add_keywords("测试关键字", "TXT/TMP", 1, 3)
        print("✅ 批量添加关键字成功")
    except Exception as e:
        print(f"❌ 批量添加关键字失败: {e}")
        return False
    
    # 测试批量清空关键字
    print("\n[4/4] 测试批量清空关键字...")
    try:
        manager.batch_clear_keywords("TXT/TMP", 1, 3)
        print("✅ 批量清空关键字成功")
    except Exception as e:
        print(f"❌ 批量清空关键字失败: {e}")
        return False
    
    # 清理
    try:
        manager.remove("TXT/TMP", recursive=True)
    except:
        pass
    
    return True


def test_keyword_operations():
    """测试关键字操作"""
    print("\n" + "=" * 60)
    print("测试关键字操作")
    print("=" * 60)
    
    manager = WorldBookManager()
    
    # 创建测试文件
    print("\n准备测试文件...")
    manager.create_template("测试", uid=9999, order=100)
    
    # 测试添加关键字
    print("\n[1/4] 测试添加关键字...")
    try:
        manager.add_keywords("关键字1,关键字2", "TXT/TMP", 9999)
        print("✅ 添加关键字成功")
    except Exception as e:
        print(f"❌ 添加关键字失败: {e}")
        return False
    
    # 测试删除关键字
    print("\n[2/4] 测试删除关键字...")
    try:
        manager.remove_keywords("关键字1", "TXT/TMP", 9999)
        print("✅ 删除关键字成功")
    except Exception as e:
        print(f"❌ 删除关键字失败: {e}")
        return False
    
    # 测试清空关键字
    print("\n[3/4] 测试清空关键字...")
    try:
        manager.clear_keywords("TXT/TMP", 9999)
        print("✅ 清空关键字成功")
    except Exception as e:
        print(f"❌ 清空关键字失败: {e}")
        return False
    
    # 测试提取常量
    print("\n[4/4] 测试提取常量...")
    try:
        manager.extract_constant("TXT/TMP")
        print("✅ 提取常量成功")
    except Exception as e:
        print(f"❌ 提取常量失败: {e}")
        return False
    
    # 清理
    try:
        manager.remove("TXT/TMP", recursive=True)
        manager.remove("TXT/constant", recursive=True)
    except:
        pass
    
    return True


def test_advanced_batch_operations():
    """测试高级批量操作（batch-set-uid / bsn / bsp / bsr / bse）"""
    print("\n" + "=" * 60)
    print("测试高级批量操作")
    print("=" * 60)

    manager = WorldBookManager()

    # 准备测试文件
    print("\n准备测试文件...")
    for i in range(1, 4):
        manager.create_template(f"高级测试{i}", uid=i, order=100)

    # [1] batch_set_uid — 重新编号 UID
    print("\n[1/5] 测试 batch-set-uid（批量设置 UID）...")
    try:
        manager.batch_set_uid("10-12", "TXT/TMP")
        print("✅ batch-set-uid 成功")
    except Exception as e:
        print(f"❌ batch-set-uid 失败: {e}")
        return False

    # [2] batch_set_newname — 批量设置 WorldBook_NewName
    print("\n[2/5] 测试 batch-set-newname（批量设置新书名）...")
    try:
        manager.batch_set_newname("测试新书名", "TXT/TMP")
        print("✅ batch-set-newname 成功")
    except Exception as e:
        print(f"❌ batch-set-newname 失败: {e}")
        return False

    # [3] batch_set_position — 批量设置 Position
    print("\n[3/5] 测试 batch-set-position（批量设置插入位置）...")
    try:
        manager.batch_set_position("before_author_note", "TXT/TMP")
        print("✅ batch-set-position 成功")
    except Exception as e:
        print(f"❌ batch-set-position 失败: {e}")
        return False

    # [4] batch_set_recursion — 批量设置递归控制
    print("\n[4/5] 测试 batch-set-recursion（批量设置递归控制）...")
    try:
        manager.batch_set_recursion("true,true,false", "TXT/TMP")
        print("✅ batch-set-recursion 成功")
    except Exception as e:
        print(f"❌ batch-set-recursion 失败: {e}")
        return False

    # [5] batch_set_effect — 批量设置 Effect
    print("\n[5/5] 测试 batch-set-effect（批量设置 Effect）...")
    try:
        manager.batch_set_effect("0,0,0", "TXT/TMP")
        print("✅ batch-set-effect 成功")
    except Exception as e:
        print(f"❌ batch-set-effect 失败: {e}")
        return False

    # 清理
    try:
        manager.remove("TXT/TMP", recursive=True)
    except Exception:
        pass

    return True


def test_split_merge_extract():
    """测试 split / merge / extract-by-key 三条命令"""
    print("\n" + "=" * 60)
    print("测试 split / merge / extract-by-key")
    print("=" * 60)

    import json as _json
    from pathlib import Path as _Path

    manager = WorldBookManager()
    test_json = "TXT/TMP/test_worldbook.json"
    test_out = "TXT/TMP/split_out"
    test_merge_out = "TXT/TMP/merge_out"
    test_extract_out = "TXT/TMP/extract_out"

    # 准备最小 JSON 世界书 fixture
    _Path("TXT/TMP").mkdir(parents=True, exist_ok=True)
    fixture = {
        "entries": {
            "0": {
                "uid": 0,
                "key": ["关键词A"],
                "keysecondary": [],
                "comment": "条目零",
                "content": "这是第一个条目的内容",
                "constant": False,
                "selective": True,
                "vectorized": False,
                "selectiveLogic": 0,
                "addMemo": True,
                "order": 100,
                "position": 0,
                "disable": False,
                "probability": 100,
                "useProbability": True,
                "depth": 4,
                "group": "",
                "groupOverride": False,
                "groupWeight": 100,
                "scanDepth": None,
                "caseSensitive": None,
                "automationId": "",
                "role": None,
                "sticky": None,
                "cooldown": None,
                "delay": None,
                "excludeRecursion": True,
                "preventRecursion": True,
                "delayUntilRecursion": False,
                "world": "test_worldbook",
            },
            "1": {
                "uid": 1,
                "key": ["关键词B"],
                "keysecondary": [],
                "comment": "条目一",
                "content": "这是第二个条目的内容",
                "constant": True,
                "selective": False,
                "vectorized": False,
                "selectiveLogic": 0,
                "addMemo": True,
                "order": 200,
                "position": 1,
                "disable": False,
                "probability": 100,
                "useProbability": True,
                "depth": 4,
                "group": "",
                "groupOverride": False,
                "groupWeight": 100,
                "scanDepth": None,
                "caseSensitive": None,
                "automationId": "",
                "role": None,
                "sticky": None,
                "cooldown": None,
                "delay": None,
                "excludeRecursion": False,
                "preventRecursion": False,
                "delayUntilRecursion": False,
                "world": "test_worldbook",
            },
        },
        "originalData": {"name": "test_worldbook"},
    }
    _Path(test_json).write_text(_json.dumps(fixture, ensure_ascii=False), encoding="utf-8")

    # [1] split_worldbook
    print("\n[1/3] 测试 split（拆分 JSON 为 TXT）...")
    try:
        manager.split_worldbook(test_json, test_out)
        txt_files = list(_Path(f"{test_out}/test_worldbook").glob("*.txt"))
        if not txt_files:
            print("❌ split 失败：未生成 TXT 文件")
            return False
        print(f"✅ split 成功，生成 {len(txt_files)} 个文件")
    except Exception as e:
        print(f"❌ split 失败: {e}")
        return False

    # [2] merge_worldbook（使用上一步生成的 TXT 文件）
    print("\n[2/3] 测试 merge（合并 TXT 为 JSON）...")
    try:
        txt_paths = [str(f) for f in txt_files]
        manager.merge_worldbook(
            "test_merged",
            txt_paths,
            output_dir=test_merge_out,
        )
        merged_files = list(_Path(test_merge_out).glob("*.json"))
        if not merged_files:
            print("❌ merge 失败：未生成 JSON 文件")
            return False
        print(f"✅ merge 成功，生成 {len(merged_files)} 个文件")
    except Exception as e:
        print(f"❌ merge 失败: {e}")
        return False

    # [3] extract_by_key（从 split 结果中按关键词提取）
    print("\n[3/3] 测试 extract-by-key（按关键词提取条目）...")
    try:
        manager.extract_by_key(
            f"{test_out}/test_worldbook",
            "关键词A",
            output_dir=test_extract_out,
        )
        extracted = list(_Path(test_extract_out).glob("*.txt"))
        if not extracted:
            print("❌ extract-by-key 失败：未提取到文件")
            return False
        print(f"✅ extract-by-key 成功，提取 {len(extracted)} 个文件")
    except Exception as e:
        print(f"❌ extract-by-key 失败: {e}")
        return False

    # 清理
    try:
        manager.remove("TXT/TMP", recursive=True)
    except Exception:
        pass

    return True


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("WorldBook Manager 功能测试")
    print("=" * 60)

    results = []

    # 测试基础功能
    results.append(("基础功能", test_basic_functions()))

    # 测试批量操作
    results.append(("批量操作", test_batch_operations()))

    # 测试关键字操作
    results.append(("关键字操作", test_keyword_operations()))

    # 测试高级批量操作（新增：bsu / bsn / bsp / bsr / bse）
    results.append(("高级批量操作", test_advanced_batch_operations()))

    # 测试 split / merge / extract-by-key（新增）
    results.append(("split/merge/extract-by-key", test_split_merge_extract()))

    # 输出结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)

    all_passed = True
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
        if not result:
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("所有测试通过！✅")
    else:
        print("部分测试失败！❌")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())