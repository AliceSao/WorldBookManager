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
        将entries转换为新格式（严格对照 worldbook.d.ts 的 WorldbookEntry 定义）

        新格式字段结构：
          uid, name, enabled, strategy{type,keys,keys_secondary{logic,keys},scan_depth},
          position{type,role,depth,order}, content, probability,
          recursion{prevent_incoming,prevent_outgoing,delay_until},
          effect{sticky,cooldown,delay}, extra?

        Args:
            entries: entries列表（可能是旧格式扁平字段）

        Returns:
            转换后的entries列表
        """
        position_map = {
            0: 'before_character_definition',
            1: 'after_character_definition',
            2: 'before_example_messages',
            3: 'after_example_messages',
            4: 'before_author_note',
            5: 'after_author_note',
            6: 'at_depth',
        }

        selective_logic_map = {
            0: 'and_any', 1: 'and_all', 2: 'not_all', 3: 'not_any',
        }

        converted = []
        for entry in entries:
            new_entry = {}

            # --- uid ---
            new_entry['uid'] = entry.get('uid', 0)

            # --- name (旧格式 comment → 新格式 name) ---
            new_entry['name'] = entry.get('comment', entry.get('name', ''))

            # --- enabled (旧格式 disable → 新格式 enabled) ---
            if 'enabled' in entry:
                new_entry['enabled'] = entry['enabled']
            else:
                new_entry['enabled'] = not entry.get('disable', False)

            # --- strategy ---
            if 'strategy' in entry and isinstance(entry['strategy'], dict):
                new_entry['strategy'] = entry['strategy']
            else:
                is_constant = entry.get('constant', False)
                is_vectorized = entry.get('vectorized', False)
                if is_constant:
                    s_type = 'constant'
                elif is_vectorized:
                    s_type = 'vectorized'
                else:
                    s_type = 'selective'

                logic_val = entry.get('selectiveLogic', entry.get('selectivelogic', 0))
                if isinstance(logic_val, int):
                    logic_str = selective_logic_map.get(logic_val, 'and_any')
                else:
                    logic_str = logic_val if logic_val in selective_logic_map.values() else 'and_any'

                scan_depth = entry.get('scanDepth', entry.get('scandepth', None))
                if scan_depth is None:
                    scan_depth = 'same_as_global'

                new_entry['strategy'] = {
                    'type': s_type,
                    'keys': entry.get('key', entry.get('keys', [])),
                    'keys_secondary': {
                        'logic': logic_str,
                        'keys': entry.get('keysecondary', entry.get('keysecondary', [])),
                    },
                    'scan_depth': scan_depth,
                }

            # --- position ---
            if 'position' in entry and isinstance(entry['position'], dict):
                new_entry['position'] = entry['position']
            else:
                pos_val = entry.get('position', 0)
                if isinstance(pos_val, int):
                    pos_type = position_map.get(pos_val, 'before_character_definition')
                else:
                    pos_type = pos_val if pos_val in position_map.values() else 'before_character_definition'

                role_val = entry.get('role', 0)
                if isinstance(role_val, int):
                    role_str = self._convert_role_to_string(role_val)
                else:
                    role_str = role_val if role_val in ('system', 'assistant', 'user') else 'system'

                new_entry['position'] = {
                    'type': pos_type,
                    'role': role_str,
                    'depth': entry.get('depth', 0),
                    'order': entry.get('order', 100),
                }

            # --- content ---
            new_entry['content'] = entry.get('content', '')

            # --- probability ---
            new_entry['probability'] = entry.get('probability', 100)

            # --- recursion ---
            if 'recursion' in entry and isinstance(entry['recursion'], dict):
                new_entry['recursion'] = entry['recursion']
            else:
                new_entry['recursion'] = {
                    'prevent_incoming': entry.get('excludeRecursion', entry.get('excluderecursion', False)),
                    'prevent_outgoing': entry.get('preventRecursion', entry.get('preventrecursion', False)),
                    'delay_until': entry.get('delayUntilRecursion', entry.get('delayuntilrecursion', None)),
                }
                # 规范化 delay_until: False → None
                if new_entry['recursion']['delay_until'] is False:
                    new_entry['recursion']['delay_until'] = None

            # --- effect ---
            if 'effect' in entry and isinstance(entry['effect'], dict):
                new_entry['effect'] = entry['effect']
            else:
                new_entry['effect'] = {
                    'sticky': entry.get('sticky', None),
                    'cooldown': entry.get('cooldown', None),
                    'delay': entry.get('delay', None),
                }

            # --- extra ---
            extra = entry.get('extra', None)
            if extra is not None:
                new_entry['extra'] = extra

            converted.append(new_entry)

        return converted
    
    def _convert_to_old_format(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        将entries转换为旧格式（对照 lorebook_entry.d.ts 的 LorebookEntry 定义）

        旧格式使用扁平字段：comment, disable, constant, selective, vectorized,
        position(int), role(int), depth, order, key[], keysecondary[],
        excludeRecursion, preventRecursion, delayUntilRecursion,
        sticky, cooldown, delay 等。

        Args:
            entries: entries列表（可能是新格式嵌套字段）

        Returns:
            转换后的entries列表
        """
        position_map = {
            'before_character_definition': 0,
            'after_character_definition': 1,
            'before_example_messages': 2,
            'after_example_messages': 3,
            'before_author_note': 4,
            'after_author_note': 5,
            'at_depth': 6,
            'outlet': 6,
        }

        selective_logic_map = {
            'and_any': 0, 'and_all': 1, 'not_all': 2, 'not_any': 3,
        }

        converted = []
        for entry in entries:
            new_entry = {}

            # --- uid ---
            new_entry['uid'] = entry.get('uid', 0)

            # --- comment (新格式 name → 旧格式 comment) ---
            new_entry['comment'] = entry.get('name', entry.get('comment', ''))

            # --- disable (新格式 enabled → 旧格式 disable) ---
            if 'disable' in entry:
                new_entry['disable'] = entry['disable']
            elif 'enabled' in entry:
                new_entry['disable'] = not entry['enabled']
            else:
                new_entry['disable'] = False

            # --- strategy → constant/selective/vectorized/key/keysecondary ---
            if 'strategy' in entry and isinstance(entry['strategy'], dict):
                s_type = entry['strategy'].get('type', 'selective')
                new_entry['constant'] = (s_type == 'constant')
                new_entry['selective'] = (s_type == 'selective')
                new_entry['vectorized'] = (s_type == 'vectorized')
                new_entry['key'] = entry['strategy'].get('keys', [])
                ks = entry['strategy'].get('keys_secondary', {})
                new_entry['keysecondary'] = ks.get('keys', [])
                logic = ks.get('logic', 'and_any')
                new_entry['selectiveLogic'] = selective_logic_map.get(logic, 0)
                sd = entry['strategy'].get('scan_depth', None)
                new_entry['scanDepth'] = None if sd == 'same_as_global' else sd
            else:
                # 已经是旧格式扁平字段，直接保留
                for k in ('constant', 'selective', 'vectorized', 'key',
                          'keysecondary', 'selectiveLogic', 'scanDepth'):
                    if k in entry:
                        new_entry[k] = entry[k]

            # --- position → position(int)/role(int)/depth/order ---
            if 'position' in entry and isinstance(entry['position'], dict):
                pos_type = entry['position'].get('type', 'at_depth')
                new_entry['position'] = position_map.get(pos_type, 6)
                new_entry['role'] = self._convert_role_to_int(entry['position'].get('role', 'system'))
                new_entry['depth'] = entry['position'].get('depth', 0)
                new_entry['order'] = entry['position'].get('order', 100)
            else:
                pos_val = entry.get('position', 0)
                if isinstance(pos_val, str):
                    new_entry['position'] = position_map.get(pos_val, 0)
                else:
                    new_entry['position'] = pos_val
                role_val = entry.get('role', 0)
                if isinstance(role_val, str):
                    new_entry['role'] = self._convert_role_to_int(role_val)
                else:
                    new_entry['role'] = role_val
                new_entry['depth'] = entry.get('depth', 0)
                new_entry['order'] = entry.get('order', 100)

            # --- content ---
            new_entry['content'] = entry.get('content', '')

            # --- probability ---
            new_entry['probability'] = entry.get('probability', 100)
            new_entry['useProbability'] = entry.get('useProbability', True)

            # --- recursion → excludeRecursion/preventRecursion/delayUntilRecursion ---
            if 'recursion' in entry and isinstance(entry['recursion'], dict):
                new_entry['excludeRecursion'] = entry['recursion'].get('prevent_incoming', False)
                new_entry['preventRecursion'] = entry['recursion'].get('prevent_outgoing', False)
                delay = entry['recursion'].get('delay_until', None)
                new_entry['delayUntilRecursion'] = False if delay is None else delay
            else:
                for k in ('excludeRecursion', 'preventRecursion', 'delayUntilRecursion'):
                    lk = k.lower()
                    new_entry[k] = entry.get(k, entry.get(lk, False))

            # --- effect → sticky/cooldown/delay ---
            if 'effect' in entry and isinstance(entry['effect'], dict):
                new_entry['sticky'] = entry['effect'].get('sticky', None)
                new_entry['cooldown'] = entry['effect'].get('cooldown', None)
                new_entry['delay'] = entry['effect'].get('delay', None)
            else:
                new_entry['sticky'] = entry.get('sticky', None)
                new_entry['cooldown'] = entry.get('cooldown', None)
                new_entry['delay'] = entry.get('delay', None)

            # --- extra ---
            extra = entry.get('extra', None)
            if extra is not None:
                new_entry['extra'] = extra

            # --- 保留其他可能存在的旧格式字段 ---
            for k in ('display_index', 'displayIndex', 'addMemo', 'group',
                       'groupOverride', 'groupWeight', 'caseSensitive',
                       'automationId', 'world', 'extensions'):
                if k in entry:
                    new_entry[k] = entry[k]

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
            if isinstance(worldbook['entries'], list):
                worldbook['entries'].append(entry)
            else:
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
        raw_entries = worldbook.get('entries', {})
        entries = list(raw_entries.values()) if isinstance(raw_entries, dict) else list(raw_entries)
        stats = self.get_entry_statistics(entries)
        
        return {
            'name': worldbook.get('name', ''),
            'description': worldbook.get('description', ''),
            'entry_count': stats['total'],
            'statistics': stats,
        }