import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from utils import (
    save_json_file,
    validate_entry_structure,
    ensure_directory_exists
)


class JSONGenerator:
    """JSON世界书生成器"""
    
    def __init__(self, config_manager=None):
        """
        初始化JSON生成器
        
        Args:
            config_manager: 配置管理器实例
        """
        self.config_manager = config_manager
    
    def generate_worldbook_json(self, entries: List[Dict[str, Any]], output_path: str, 
                                 metadata: Dict[str, Any] = None, format: str = 'new') -> str:
        """
        生成JSON世界书文件
        
        Args:
            entries: entries列表
            output_path: 输出文件路径
            metadata: 世界书元数据
            format: 输出格式（'new'或'old'）
            
        Returns:
            生成的文件路径
        """
        is_valid, errors = self.validate_entries(entries)
        if not is_valid:
            error_msg = '\n'.join([f"UID {uid}: {msg}" for uid, msg in errors])
            raise ValueError(f"Entries验证失败:\n{error_msg}")
        
        sorted_entries = self.sort_entries_by_order(entries)
        
        # 根据格式转换entries
        if format == 'new':
            converted_entries = self._convert_to_new_format(sorted_entries)
        else:
            converted_entries = self._convert_to_old_format(sorted_entries)
        
        worldbook_data = self._build_worldbook_structure(converted_entries, metadata, format)
        
        save_json_file(worldbook_data, output_path, indent=2)
        
        return output_path
    
    def _build_worldbook_structure(self, entries: List[Dict[str, Any]], 
                                    metadata: Dict[str, Any] = None, format: str = 'new') -> Dict[str, Any]:
        """
        构建世界书结构（支持新旧格式）
        
        Args:
            entries: entries列表
            metadata: 元数据
            format: 输出格式（'new'或'old'）
            
        Returns:
            世界书数据结构
        """
        worldbook = {}
        
        if metadata:
            worldbook.update(metadata)
        
        # 按UID排序以确保entries键的顺序正确
        sorted_entries = sorted(entries, key=lambda x: x.get('uid', 0))
        
        if format == 'new':
            worldbook['entries'] = sorted_entries
        else:
            entries_dict = {}
            for entry in sorted_entries:
                uid = entry.get('uid')
                if uid is not None:
                    entries_dict[str(uid)] = entry
            worldbook['entries'] = entries_dict
        
        return worldbook
    
    def _convert_to_new_format(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        将entries转换为新格式（worldbook.d.ts定义）
        
        Args:
            entries: entries列表
            
        Returns:
            转换后的entries列表
        """
        converted = []
        for entry in entries:
            new_entry = entry.copy()
            
            # Position映射：数字 -> 字符串
            position_map = {
                0: 'before_character_definition',
                1: 'after_character_definition',
                2: 'before_example_messages',
                3: 'after_example_messages',
                4: 'before_author_note',
                5: 'after_author_note',
                6: 'at_depth'
            }
            
            position_value = entry.get('position', 4)
            if isinstance(position_value, int) and position_value in position_map:
                new_entry['position'] = {
                    'type': position_map[position_value],
                    'role': self._convert_role_to_string(entry.get('role', 0)),
                    'depth': entry.get('depth', 0),
                    'order': entry.get('order', 100)
                }
            
            # Role映射：数字 -> 字符串
            if 'role' in new_entry and isinstance(new_entry['role'], int):
                new_entry['role'] = self._convert_role_to_string(new_entry['role'])
            
            converted.append(new_entry)
        
        return converted
    
    def _convert_to_old_format(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        将entries转换为旧格式（原始JSON格式）
        
        Args:
            entries: entries列表
            
        Returns:
            转换后的entries列表
        """
        converted = []
        for entry in entries:
            new_entry = entry.copy()
            
            # Position映射：字符串 -> 数字
            position_map = {
                'before_character_definition': 0,
                'after_character_definition': 1,
                'before_example_messages': 2,
                'after_example_messages': 3,
                'before_author_note': 4,
                'after_author_note': 5,
                'at_depth': 6,
                'outlet': 6
            }
            
            # 如果position是对象，转换为数字
            if 'position' in entry and isinstance(entry['position'], dict):
                position_type = entry['position'].get('type', 'at_depth')
                new_entry['position'] = position_map.get(position_type, 6)
                new_entry['role'] = self._convert_role_to_int(entry['position'].get('role', 'system'))
                new_entry['depth'] = entry['position'].get('depth', 0)
                new_entry['order'] = entry['position'].get('order', 100)
            
            # Role映射：字符串 -> 数字
            if 'role' in new_entry and isinstance(new_entry['role'], str):
                new_entry['role'] = self._convert_role_to_int(new_entry['role'])
            
            converted.append(new_entry)
        
        return converted
    
    def _convert_role_to_string(self, role_int: int) -> str:
        """
        将role数字转换为字符串
        
        Args:
            role_int: role数字
            
        Returns:
            role字符串
        """
        role_map = {
            0: 'system',
            1: 'assistant',
            2: 'user'
        }
        return role_map.get(role_int, 'system')
    
    def _convert_role_to_int(self, role_str: str) -> int:
        """
        将role字符串转换为数字
        
        Args:
            role_str: role字符串
            
        Returns:
            role数字
        """
        role_map = {
            'system': 0,
            'assistant': 1,
            'user': 2
        }
        return role_map.get(role_str.lower(), 0)
    
    def validate_entries(self, entries: List[Dict[str, Any]]) -> Tuple[bool, List[Tuple[int, str]]]:
        """
        验证所有entries
        
        Args:
            entries: entries列表
            
        Returns:
            (是否全部有效, 错误列表[(uid, 错误信息)])
        """
        errors = []
        
        for entry in entries:
            is_valid, error_msg = validate_entry_structure(entry)
            if not is_valid:
                errors.append((entry.get('uid', 'unknown'), error_msg))
        
        return len(errors) == 0, errors
    
    def sort_entries_by_order(self, entries: List[Dict[str, Any]], reverse: bool = False) -> List[Dict[str, Any]]:
        """
        根据Order排序entries
        
        Args:
            entries: entries列表
            reverse: 是否降序排序
            
        Returns:
            排序后的entries列表
        """
        return sorted(entries, key=lambda x: x.get('order', 100), reverse=reverse)
    
    def merge_entries(self, *entry_lists: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        合并多个entries列表
        
        Args:
            entry_lists: 多个entries列表
            
        Returns:
            合并后的entries列表
        """
        merged = []
        seen_uids = set()
        
        for entry_list in entry_lists:
            for entry in entry_list:
                uid = entry.get('uid')
                if uid is not None and uid not in seen_uids:
                    merged.append(entry)
                    seen_uids.add(uid)
        
        return merged
    
    def deduplicate_entries(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        去重entries（基于UID）
        
        Args:
            entries: entries列表
            
        Returns:
            去重后的entries列表
        """
        seen_uids = set()
        deduplicated = []
        
        for entry in entries:
            uid = entry.get('uid')
            if uid is not None and uid not in seen_uids:
                deduplicated.append(entry)
                seen_uids.add(uid)
        
        return deduplicated
    
    def filter_entries_by_uid(self, entries: List[Dict[str, Any]], uids: List[int]) -> List[Dict[str, Any]]:
        """
        根据UID过滤entries
        
        Args:
            entries: entries列表
            uids: 要保留的UID列表
            
        Returns:
            过滤后的entries列表
        """
        uid_set = set(uids)
        return [e for e in entries if e.get('uid') in uid_set]
    
    def exclude_entries_by_uid(self, entries: List[Dict[str, Any]], uids: List[int]) -> List[Dict[str, Any]]:
        """
        排除指定UID的entries
        
        Args:
            entries: entries列表
            uids: 要排除的UID列表
            
        Returns:
            过滤后的entries列表
        """
        uid_set = set(uids)
        return [e for e in entries if e.get('uid') not in uid_set]
    
    def get_entry_statistics(self, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        获取entries统计信息（支持新旧格式）
        
        Args:
            entries: entries列表
            
        Returns:
            统计信息字典
        """
        stats = {
            'total': len(entries),
            'constant': 0,
            'selective': 0,
            'vectorized': 0,
            'enabled': 0,
            'disabled': 0,
            'with_keys': 0,
            'without_keys': 0,
            'order_range': {'min': None, 'max': None},
            'uid_range': {'min': None, 'max': None},
        }
        
        orders = []
        uids = []
        
        for entry in entries:
            is_constant = False
            is_selective = False
            is_vectorized = False
            is_enabled = True
            keys = []
            
            if 'strategy' in entry and isinstance(entry['strategy'], dict):
                strategy_type = entry['strategy'].get('type', '')
                if strategy_type == 'constant':
                    is_constant = True
                elif strategy_type == 'selective':
                    is_selective = True
                elif strategy_type == 'vectorized':
                    is_vectorized = True
                keys = entry['strategy'].get('keys', [])
            else:
                is_constant = entry.get('constant', False)
                is_selective = entry.get('selective', False)
                is_vectorized = entry.get('vectorized', False)
                keys = entry.get('key', [])
            
            if 'enabled' in entry:
                is_enabled = entry['enabled']
            elif 'disable' in entry:
                is_enabled = not entry['disable']
            
            if is_constant:
                stats['constant'] += 1
            if is_selective:
                stats['selective'] += 1
            if is_vectorized:
                stats['vectorized'] += 1
            if is_enabled:
                stats['enabled'] += 1
            else:
                stats['disabled'] += 1
            if keys:
                stats['with_keys'] += 1
            else:
                stats['without_keys'] += 1
            
            order = entry.get('order', 100)
            orders.append(order)
            
            uid = entry.get('uid')
            if uid is not None:
                uids.append(uid)
        
        if orders:
            stats['order_range']['min'] = min(orders)
            stats['order_range']['max'] = max(orders)
        
        if uids:
            stats['uid_range']['min'] = min(uids)
            stats['uid_range']['max'] = max(uids)
        
        return stats
    
    def create_backup(self, file_path: str, backup_dir: str = None) -> str:
        """
        创建备份
        
        Args:
            file_path: 要备份的文件路径
            backup_dir: 备份目录
            
        Returns:
            备份文件路径
        """
        from utils import backup_file
        return backup_file(file_path, backup_dir)
    
    def generate_minimal_worldbook(self, name: str, description: str = "") -> Dict[str, Any]:
        """
        生成最小世界书结构
        
        Args:
            name: 世界书名称
            description: 描述
            
        Returns:
            世界书数据结构
        """
        return {
            'name': name,
            'description': description,
            'scanDepth': None,
            'recursiveScanning': None,
            'extensions': {
                'position': 0,
                'exclude_recursion': True,
                'display_index': 0,
                'probability': 100,
                'useProbability': True,
                'depth': 4,
                'selectiveLogic': 0,
            },
            'entries': {},
        }
    
    def add_entry_to_worldbook(self, worldbook: Dict[str, Any], entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        向世界书添加entry
        
        Args:
            worldbook: 世界书数据
            entry: 要添加的entry
            
        Returns:
            更新后的世界书数据
        """
        if 'entries' not in worldbook:
            worldbook['entries'] = {}
        
        uid = entry.get('uid')
        if uid is not None:
            worldbook['entries'][str(uid)] = entry
        
        return worldbook
    
    def remove_entry_from_worldbook(self, worldbook: Dict[str, Any], uid: int) -> Dict[str, Any]:
        """
        从世界书移除entry
        
        Args:
            worldbook: 世界书数据
            uid: 要移除的UID
            
        Returns:
            更新后的世界书数据
        """
        if 'entries' in worldbook and str(uid) in worldbook['entries']:
            del worldbook['entries'][str(uid)]
        
        return worldbook
    
    def update_entry_in_worldbook(self, worldbook: Dict[str, Any], entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新世界书中的entry
        
        Args:
            worldbook: 世界书数据
            entry: 更新后的entry
            
        Returns:
            更新后的世界书数据
        """
        return self.add_entry_to_worldbook(worldbook, entry)
    
    def get_worldbook_summary(self, worldbook: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取世界书摘要
        
        Args:
            worldbook: 世界书数据
            
        Returns:
            摘要信息
        """
        entries = list(worldbook.get('entries', {}).values())
        stats = self.get_entry_statistics(entries)
        
        return {
            'name': worldbook.get('name', ''),
            'description': worldbook.get('description', ''),
            'entry_count': stats['total'],
            'statistics': stats,
        }