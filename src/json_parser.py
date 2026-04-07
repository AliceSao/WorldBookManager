import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from utils import (
    load_json_file,
    validate_json_structure,
    validate_entry_structure,
    backup_file
)


class JSONParser:
    """JSON世界书解析器"""
    
    def __init__(self, config_manager=None):
        """
        初始化JSON解析器
        
        Args:
            config_manager: 配置管理器实例
        """
        self.config_manager = config_manager
    
    def parse_worldbook_json(self, file_path: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        解析JSON世界书文件
        
        Args:
            file_path: JSON文件路径
            
        Returns:
            (世界书元数据, entries列表)
        """
        data = load_json_file(file_path)
        
        is_valid, error_msg = validate_json_structure(data)
        if not is_valid:
            raise ValueError(f"JSON结构验证失败: {error_msg}")
        
        entries = self.extract_entries(data)
        
        metadata = self._extract_metadata(data)
        
        return metadata, entries
    
    def _extract_metadata(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        提取世界书元数据
        
        Args:
            data: JSON数据
            
        Returns:
            元数据字典
        """
        metadata = {}
        
        if 'name' in data:
            metadata['name'] = data['name']
        
        if 'description' in data:
            metadata['description'] = data['description']
        
        if 'scanDepth' in data:
            metadata['scanDepth'] = data['scanDepth']
        
        if 'recursiveScanning' in data:
            metadata['recursiveScanning'] = data['recursiveScanning']
        
        if 'extensions' in data:
            metadata['extensions'] = data['extensions']
        
        return metadata
    
    def extract_entries(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        提取所有entries（支持新旧格式）
        
        Args:
            data: JSON数据
            
        Returns:
            entries列表
        """
        if 'entries' not in data:
            return []
        
        entries_data = data['entries']
        entries = []
        
        if isinstance(entries_data, dict):
            for uid, entry in entries_data.items():
                entry['uid'] = int(uid)
                entries.append(entry)
        elif isinstance(entries_data, list):
            for entry in entries_data:
                entries.append(entry)
        
        return entries
    
    def extract_entry_with_original_fields(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        提取所有entries并保留原始字段（包括旧格式字段，支持新旧格式）
        
        Args:
            data: JSON数据
            
        Returns:
            entries列表（保留所有原始字段）
        """
        if 'entries' not in data:
            return []
        
        entries_data = data['entries']
        entries = []
        
        if isinstance(entries_data, dict):
            for uid, entry in entries_data.items():
                entry['uid'] = int(uid)
                entries.append(entry)
        elif isinstance(entries_data, list):
            for entry in entries_data:
                entries.append(entry)
        
        return entries
    
    def validate_entry(self, entry: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        验证单个entry
        
        Args:
            entry: entry数据
            
        Returns:
            (是否有效, 错误信息)
        """
        return validate_entry_structure(entry)
    
    def validate_all_entries(self, entries: List[Dict[str, Any]]) -> Tuple[bool, List[Tuple[int, Optional[str]]]]:
        """
        验证所有entries
        
        Args:
            entries: entries列表
            
        Returns:
            (是否全部有效, 错误列表[(uid, 错误信息)])
        """
        errors = []
        
        for entry in entries:
            is_valid, error_msg = self.validate_entry(entry)
            if not is_valid:
                errors.append((entry.get('uid', 'unknown'), error_msg))
        
        return len(errors) == 0, errors
    
    def get_entry_by_uid(self, entries: List[Dict[str, Any]], uid: int) -> Optional[Dict[str, Any]]:
        """
        根据UID获取entry
        
        Args:
            entries: entries列表
            uid: 要查找的UID
            
        Returns:
            找到的entry，未找到返回None
        """
        for entry in entries:
            if entry.get('uid') == uid:
                return entry
        return None
    
    def filter_entries_by_order(self, entries: List[Dict[str, Any]], min_order: int = None, max_order: int = None) -> List[Dict[str, Any]]:
        """
        根据Order过滤entries
        
        Args:
            entries: entries列表
            min_order: 最小Order值（包含）
            max_order: 最大Order值（包含）
            
        Returns:
            过滤后的entries列表
        """
        filtered = entries
        
        if min_order is not None:
            filtered = [e for e in filtered if e.get('order', 100) >= min_order]
        
        if max_order is not None:
            filtered = [e for e in filtered if e.get('order', 100) <= max_order]
        
        return filtered
    
    def filter_entries_by_constant(self, entries: List[Dict[str, Any]], constant: bool = True) -> List[Dict[str, Any]]:
        """
        根据constant字段过滤entries
        
        Args:
            entries: entries列表
            constant: 是否为常量条目
            
        Returns:
            过滤后的entries列表
        """
        return [e for e in entries if e.get('constant', False) == constant]
    
    def filter_entries_by_selective(self, entries: List[Dict[str, Any]], selective: bool = True) -> List[Dict[str, Any]]:
        """
        根据selective字段过滤entries
        
        Args:
            entries: entries列表
            selective: 是否为可选项条目
            
        Returns:
            过滤后的entries列表
        """
        return [e for e in entries if e.get('selective', False) == selective]
    
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
        }
        
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
        
        return stats
    
    def backup_json_file(self, file_path: str, backup_dir: str = None) -> Path:
        """
        备份JSON文件
        
        Args:
            file_path: 要备份的文件路径
            backup_dir: 备份目录，如果为None则使用配置中的备份目录
            
        Returns:
            备份文件路径
        """
        if backup_dir is None and self.config_manager:
            backup_dir = self.config_manager.get_directory('json_bak')
        
        return backup_file(file_path, backup_dir)
    
    def get_worldbook_name_from_file(self, file_path: str) -> Optional[str]:
        """
        从文件路径获取世界书名称
        
        Args:
            file_path: 文件路径
            
        Returns:
            世界书名称
        """
        path = Path(file_path)
        return path.stem
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """
        获取文件信息
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件信息字典
        """
        path = Path(file_path)
        
        if not path.exists():
            return {'exists': False}
        
        stat = path.stat()
        
        return {
            'exists': True,
            'name': path.name,
            'stem': path.stem,
            'suffix': path.suffix,
            'size': stat.st_size,
            'parent': str(path.parent),
        }