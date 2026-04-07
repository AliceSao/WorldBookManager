import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from utils import (
    load_text_file,
    parse_bool,
    parse_list,
    validate_entry_structure
)


class TXTParser:
    """TXT文件解析器"""
    
    def __init__(self, config_manager=None):
        """
        初始化TXT解析器
        
        Args:
            config_manager: 配置管理器实例
        """
        self.config_manager = config_manager
    
    def parse_txt_file(self, file_path: str) -> Dict[str, Any]:
        """
        解析TXT文件
        
        Args:
            file_path: TXT文件路径
            
        Returns:
            解析后的entry字典
        """
        content = load_text_file(file_path)
        lines = content.split('\n')
        
        entry = self._build_entry_from_txt(lines)
        
        is_valid, error_msg = validate_entry_structure(entry)
        if not is_valid:
            raise ValueError(f"Entry验证失败: {error_msg}")
        
        return entry
    
    def _build_entry_from_txt(self, lines: List[str]) -> Dict[str, Any]:
        """
        从TXT行构建entry
        
        Args:
            lines: TXT文件行列表
            
        Returns:
            entry字典
        """
        entry = {}
        content_lines = []
        in_content = False
        
        # 已知的字段名列表，用于判断Content字段何时结束
        known_fields = {
            'useprobability', 'probability', 'excluderecursion', 
            'preventrecursion', 'delayuntilrecursion', 'sticky', 
            'cooldown', 'delay', 'pathchain', 'extra', 'extensions'
        }
        
        for line in lines:
            line = line.rstrip('\n\r')
            
            if line.strip() == "=== WorldBook Entry ===":
                continue
            
            if line.strip() == "=== End Entry ===":
                break
            
            if in_content:
                # 检查是否遇到了下一个已知字段
                if ':' in line:
                    potential_key = line.split(':', 1)[0].strip().lower()
                    if potential_key in known_fields:
                        # Content字段结束
                        in_content = False
                        entry['content'] = '\n'.join(content_lines)
                    else:
                        # 仍然是Content的一部分
                        content_lines.append(line)
                        continue
                else:
                    # 仍然是Content的一部分
                    content_lines.append(line)
                    continue
            
            if line.strip() == "Content:":
                in_content = True
                continue
            
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                entry[key] = self._parse_field_value(key, value)
        
        # 如果还在Content状态，保存Content
        if in_content:
            entry['content'] = '\n'.join(content_lines)
        
        return self._normalize_entry(entry)
    
    def _parse_field_value(self, key: str, value: str) -> Any:
        """
        解析字段值
        
        Args:
            key: 字段名
            value: 字符串值
            
        Returns:
            解析后的值
        """
        if value.lower() == 'null' or value == '':
            return None
        
        boolean_fields = ['disable', 'constant', 'selective', 'vectorized', 
                          'useprobability', 'excluderecursion', 'preventrecursion']
        
        if key.lower() in boolean_fields:
            return parse_bool(value)
        
        # delayUntilRecursion 特殊处理：可能是布尔值或数字
        if key.lower() == 'delayuntilrecursion':
            if value.lower() in ('true', 'false'):
                return parse_bool(value)
            try:
                return int(value)
            except ValueError:
                return False
        
        integer_fields = ['uid', 'displayindex', 'selectivelogic', 'position', 
                          'role', 'depth', 'order', 'probability']
        
        if key.lower() in integer_fields:
            try:
                return int(value)
            except ValueError:
                return None
        
        list_fields = ['key', 'keysecondary']
        
        if key.lower() in list_fields:
            return parse_list(value)
        
        # extra字段特殊处理：解析为JSON对象
        if key.lower() == 'extra':
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return {}
        
        # extensions字段特殊处理：解析为JSON对象
        if key.lower() == 'extensions':
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return None
        
        return value
    
    def _normalize_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        标准化entry字段名
        
        Args:
            entry: 原始entry
            
        Returns:
            标准化后的entry
        """
        normalized = {}
        
        field_mapping = {
            'worldbook_filename': None,
            'worldbook_oldname': None,
            'worldbook_newname': None,
            'uid': 'uid',
            'displayindex': 'displayIndex',
            'comment': 'comment',
            'disable': 'disable',
            'constant': 'constant',
            'selective': 'selective',
            'key': 'key',
            'selectivelogic': 'selectiveLogic',
            'keysecondary': 'keysecondary',
            'scandepth': 'scanDepth',
            'vectorized': 'vectorized',
            'position': 'position',
            'role': 'role',
            'depth': 'depth',
            'order': 'order',
            'content': 'content',
            'useprobability': 'useProbability',
            'probability': 'probability',
            'excluderecursion': 'excludeRecursion',
            'preventrecursion': 'preventRecursion',
            'delayuntilrecursion': 'delayUntilRecursion',
            'sticky': 'sticky',
            'cooldown': 'cooldown',
            'delay': 'delay',
            'pathchain': 'pathChain',
            'extra': 'extra',
            'extensions': 'extensions',
        }
        
        for key, value in entry.items():
            normalized_key = field_mapping.get(key.lower())
            if normalized_key:
                normalized[normalized_key] = value
        
        return normalized
    
    def validate_txt_structure(self, lines: List[str]) -> Tuple[bool, Optional[str]]:
        """
        验证TXT结构
        
        Args:
            lines: TXT文件行列表
            
        Returns:
            (是否有效, 错误信息)
        """
        has_start = False
        has_end = False
        has_content = False
        has_uid = False
        
        for line in lines:
            if line.strip() == "=== WorldBook Entry ===":
                has_start = True
            elif line.strip() == "=== End Entry ===":
                has_end = True
            elif line.strip() == "Content:":
                has_content = True
            elif line.strip().startswith("UID:"):
                has_uid = True
        
        if not has_start:
            return False, "缺少起始标记 '=== WorldBook Entry ==='"
        
        if not has_end:
            return False, "缺少结束标记 '=== End Entry ==='"
        
        if not has_content:
            return False, "缺少Content字段"
        
        if not has_uid:
            return False, "缺少UID字段"
        
        return True, None
    
    def get_worldbook_names(self, file_path: str) -> Tuple[Optional[str], Optional[str]]:
        """
        从TXT文件获取世界书名称
        
        Args:
            file_path: TXT文件路径
            
        Returns:
            (WorldBook_OldName, WorldBook_NewName)
        """
        content = load_text_file(file_path)
        lines = content.split('\n')
        
        old_name = None
        new_name = None
        
        for line in lines:
            if line.strip().startswith("WorldBook_OldName:"):
                old_name = line.split(':', 1)[1].strip()
            elif line.strip().startswith("WorldBook_NewName:"):
                new_name = line.split(':', 1)[1].strip()
        
        return old_name, new_name
    
    def batch_parse_txt(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        """
        批量解析TXT文件
        
        Args:
            file_paths: TXT文件路径列表
            
        Returns:
            解析后的entries列表
        """
        entries = []
        
        for file_path in file_paths:
            try:
                entry = self.parse_txt_file(file_path)
                entries.append(entry)
            except Exception as e:
                print(f"解析TXT文件失败 ({file_path}): {e}")
        
        return entries
    
    def validate_new_name(self, file_path: str, user_input_name: str) -> Tuple[bool, Optional[str]]:
        """
        验证新名称
        
        Args:
            file_path: TXT文件路径
            user_input_name: 用户输入的名称
            
        Returns:
            (是否使用新名称, 最终使用的名称)
        """
        old_name, new_name = self.get_worldbook_names(file_path)
        
        if new_name and new_name.strip():
            if user_input_name == new_name.strip():
                return True, new_name.strip()
            else:
                return False, old_name or ''
        else:
            return False, old_name or ''
    
    def get_uid_from_filename(self, file_path: str) -> Optional[int]:
        """
        从文件名提取UID
        
        Args:
            file_path: 文件路径
            
        Returns:
            UID，提取失败返回None
        """
        filename = Path(file_path).stem
        
        try:
            if '_' in filename:
                uid_str = filename.split('_')[0]
                return int(uid_str)
            else:
                return int(filename)
        except (ValueError, IndexError):
            return None
    
    def get_uid_from_content(self, content: str) -> Optional[int]:
        """
        从文件内容中提取UID
        
        Args:
            content: 文件内容
            
        Returns:
            UID，提取失败返回None
        """
        try:
            lines = content.split('\n')
            for line in lines:
                if line.strip().startswith('UID:'):
                    uid_str = line.split(':', 1)[1].strip()
                    return int(uid_str)
            return None
        except (ValueError, IndexError):
            return None
    
    def get_comment_from_filename(self, file_path: str) -> str:
        """
        从文件名提取注释
        
        Args:
            file_path: 文件路径
            
        Returns:
            注释内容
        """
        filename = Path(file_path).stem
        
        if '_' in filename:
            parts = filename.split('_', 1)
            if len(parts) > 1:
                return parts[1]
        
        return ''
    
    def get_txt_file_info(self, file_path: str) -> Dict[str, Any]:
        """
        获取TXT文件信息
        
        Args:
            file_path: TXT文件路径
            
        Returns:
            文件信息字典
        """
        path = Path(file_path)
        
        if not path.exists():
            return {'exists': False}
        
        uid = self.get_uid_from_filename(file_path)
        comment = self.get_comment_from_filename(file_path)
        old_name, new_name = self.get_worldbook_names(file_path)
        
        return {
            'exists': True,
            'name': path.name,
            'stem': path.stem,
            'suffix': path.suffix,
            'uid': uid,
            'comment': comment,
            'worldbook_old_name': old_name,
            'worldbook_new_name': new_name,
            'size': path.stat().st_size,
        }