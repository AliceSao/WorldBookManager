import json
from pathlib import Path
from typing import Dict, Any, Optional
from utils import (
    save_text_file,
    format_bool,
    format_list,
    sanitize_filename,
    truncate_string
)


class TXTGenerator:
    """TXT文件生成器"""
    
    def __init__(self, config_manager=None):
        """
        初始化TXT生成器
        
        Args:
            config_manager: 配置管理器实例
        """
        self.config_manager = config_manager
    
    def generate_txt_from_entry(self, entry: Dict[str, Any], output_dir: str, worldbook_name: str = None) -> str:
        """
        从entry生成TXT文件
        
        Args:
            entry: entry数据
            output_dir: 输出目录
            worldbook_name: 世界书名称（用于WorldBook_OldName）
            
        Returns:
            生成的TXT文件路径
        """
        uid = entry.get('uid', 0)
        comment = entry.get('comment', '')
        display_index = entry.get('displayIndex', uid)
        
        filename = self._generate_filename(uid, comment)
        output_path = Path(output_dir) / filename
        
        content = self._format_entry_as_txt(entry, worldbook_name)
        
        save_text_file(content, output_path)
        
        return str(output_path)
    
    def _generate_filename(self, uid: int, comment: str) -> str:
        """
        生成文件名
        
        Args:
            uid: entry的UID
            comment: entry的注释
            
        Returns:
            文件名
        """
        if comment:
            safe_comment = sanitize_filename(comment)
            safe_comment = truncate_string(safe_comment, 50)
            return f"{uid}_{safe_comment}.txt"
        else:
            return f"{uid}.txt"
    
    def _format_entry_as_txt(self, entry: Dict[str, Any], worldbook_name: str = None) -> str:
        """
        将entry格式化为TXT内容（支持新旧格式）
        
        Args:
            entry: entry数据
            worldbook_name: 世界书名称
            
        Returns:
            TXT格式的内容
        """
        uid = entry.get('uid', 0)
        
        # 统一字段提取（支持新旧格式）
        comment = entry.get('comment', '')
        name = entry.get('name', '')
        display_index = entry.get('displayIndex', uid)
        
        # 使用name作为comment的备用
        if not comment and name:
            comment = name
        
        # 提取策略和状态信息（支持新旧格式）
        is_constant = False
        is_selective = False
        is_vectorized = False
        is_enabled = True
        keys = []
        keys_secondary = []
        selective_logic = 0
        scan_depth = None
        position_value = 0
        role_value = 0
        depth_value = 0
        order_value = 100
        use_probability = True
        probability = 100
        exclude_recursion = True
        prevent_recursion = True
        delay_until_recursion = None
        sticky = None
        cooldown = None
        delay = None
        path_chain = ''
        extra = {}
        
        # 新格式：嵌套结构
        if 'strategy' in entry and isinstance(entry['strategy'], dict):
            strategy = entry['strategy']
            strategy_type = strategy.get('type', '')
            
            if strategy_type == 'constant':
                is_constant = True
            elif strategy_type == 'selective':
                is_selective = True
            elif strategy_type == 'vectorized':
                is_vectorized = True
            
            keys = strategy.get('keys', [])
            
            keys_secondary_dict = strategy.get('keys_secondary', {})
            keys_secondary = keys_secondary_dict.get('keys', [])
            logic = keys_secondary_dict.get('logic', 'and_any')
            logic_map = {'and_any': 0, 'and_all': 1, 'not_all': 2, 'not_any': 3}
            selective_logic = logic_map.get(logic, 0)
            
            scan_depth = strategy.get('scan_depth')
            if scan_depth == 'same_as_global':
                scan_depth = None
        
        # 旧格式：扁平结构
        else:
            is_constant = entry.get('constant', False)
            is_selective = entry.get('selective', False)
            is_vectorized = entry.get('vectorized', False)
            keys = entry.get('key', [])
            keys_secondary = entry.get('keysecondary', [])
            selective_logic = entry.get('selectiveLogic', 0)
            scan_depth = entry.get('scanDepth')
        
        # 提取位置信息（支持新旧格式）
        if 'position' in entry and isinstance(entry['position'], dict):
            position = entry['position']
            position_type = position.get('type', 'at_depth')
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
            position_value = position_map.get(position_type, 6)
            role_value = position.get('role', 'system')
            role_map = {'system': 0, 'assistant': 1, 'user': 2}
            role_value = role_map.get(role_value, 0)
            depth_value = position.get('depth', 0)
            order_value = position.get('order', 100)
        else:
            position_value = entry.get('position', 0)
            role_value = entry.get('role', 0)
            depth_value = entry.get('depth', 0)
            order_value = entry.get('order', 100)
        
        # 提取启用状态（支持新旧格式）
        if 'enabled' in entry:
            is_enabled = entry['enabled']
        elif 'disable' in entry:
            is_enabled = not entry['disable']
        
        # 提取概率信息（支持新旧格式）
        if 'probability' in entry:
            probability = entry['probability']
            use_probability = True
        else:
            use_probability = entry.get('useProbability', True)
            probability = entry.get('probability', 100)
        
        # 提取递归信息（支持新旧格式）
        if 'recursion' in entry and isinstance(entry['recursion'], dict):
            recursion = entry['recursion']
            exclude_recursion = recursion.get('prevent_incoming', True)
            prevent_recursion = recursion.get('prevent_outgoing', True)
            delay_until_recursion = recursion.get('delay_until')
        else:
            exclude_recursion = entry.get('excludeRecursion', True)
            prevent_recursion = entry.get('preventRecursion', True)
            delay_until_recursion = entry.get('delayUntilRecursion')
        
        # 提取效果信息（支持新旧格式）
        if 'effect' in entry and isinstance(entry['effect'], dict):
            effect = entry['effect']
            sticky = effect.get('sticky')
            cooldown = effect.get('cooldown')
            delay = effect.get('delay')
        else:
            sticky = entry.get('sticky')
            cooldown = entry.get('cooldown')
            delay = entry.get('delay')
        
        # 提取额外信息
        extra = entry.get('extra', {})
        
        # 支持两种命名格式：path_chain（旧格式）和pathChain（新格式）
        path_chain = entry.get('pathChain') or entry.get('path_chain', '')
        
        lines = []
        
        lines.append("=== WorldBook Entry ===")
        lines.append(f"WorldBook_FileName: {self._generate_filename(uid, comment)}")
        lines.append(f"WorldBook_OldName: {worldbook_name or ''}")
        lines.append("WorldBook_NewName: ")
        lines.append(f"UID: {uid}")
        lines.append(f"DisplayIndex: {display_index}")
        lines.append(f"Comment: {comment}")
        lines.append(f"Disable: {format_bool(not is_enabled)}")
        lines.append(f"Constant: {format_bool(is_constant)}")
        lines.append(f"Selective: {format_bool(is_selective)}")
        
        if keys:
            lines.append(f"Key: {format_list(keys)}")
        else:
            lines.append("Key: []")
        
        lines.append(f"SelectiveLogic: {selective_logic}")
        
        if keys_secondary:
            lines.append(f"KeySecondary: {format_list(keys_secondary)}")
        else:
            lines.append("KeySecondary: []")
        
        if scan_depth is not None:
            lines.append(f"ScanDepth: {scan_depth}")
        else:
            lines.append("ScanDepth: null")
        
        lines.append(f"Vectorized: {format_bool(is_vectorized)}")
        lines.append(f"Position: {position_value}")
        lines.append(f"Role: {role_value}")
        lines.append(f"Depth: {depth_value}")
        lines.append(f"Order: {order_value}")
        
        lines.append("Content:")
        content = entry.get('content', '')
        lines.append(content)
        
        lines.append(f"UseProbability: {format_bool(use_probability)}")
        lines.append(f"Probability: {probability}")
        lines.append(f"ExcludeRecursion: {format_bool(exclude_recursion)}")
        lines.append(f"PreventRecursion: {format_bool(prevent_recursion)}")
        
        if delay_until_recursion is not None:
            lines.append(f"DelayUntilRecursion: {delay_until_recursion}")
        else:
            lines.append("DelayUntilRecursion: false")
        
        if sticky is not None:
            lines.append(f"Sticky: {sticky}")
        else:
            lines.append("Sticky: null")
        
        if cooldown is not None:
            lines.append(f"Cooldown: {cooldown}")
        else:
            lines.append("Cooldown: null")
        
        if delay is not None:
            lines.append(f"Delay: {delay}")
        else:
            lines.append("Delay: null")
        
        lines.append(f"PathChain: {path_chain}")
        
        if extra:
            lines.append(f"Extra: {json.dumps(extra, ensure_ascii=False)}")
        else:
            lines.append("Extra: {}")
        
        # 保存extensions字段（旧格式）
        extensions = entry.get('extensions')
        if extensions:
            lines.append(f"Extensions: {json.dumps(extensions, ensure_ascii=False)}")
        
        lines.append("=== End Entry ===")
        
        return '\n'.join(lines)
    
    def generate_txt_template(self, output_dir: str, template_name: str = "new_entry", uid: int = None, order: int = None) -> str:
        """
        生成TXT模板文件
        
        Args:
            output_dir: 输出目录
            template_name: 模板名称
            uid: 指定的UID，如果为None则自动生成
            order: 指定的Order，如果为None则使用默认值100
            
        Returns:
            生成的TXT文件路径
        """
        if uid is None:
            from utils import generate_uid
            uid = generate_uid()
        
        if order is None:
            order = 100
        
        filename = f"{uid}_{template_name}.txt"
        output_path = Path(output_dir) / filename
        
        content = self._format_template(uid, template_name, order)
        
        save_text_file(content, output_path)
        
        return str(output_path)
    
    def _format_template(self, uid: int, template_name: str, order: int = 100) -> str:
        """
        格式化模板内容
        
        Args:
            uid: UID
            template_name: 模板名称
            order: Order值
            
        Returns:
            模板内容
        """
        lines = []
        
        lines.append("=== WorldBook Entry ===")
        lines.append(f"WorldBook_FileName: {uid}_{template_name}.txt")
        lines.append("WorldBook_OldName: ")
        lines.append("WorldBook_NewName: ")
        lines.append(f"UID: {uid}")
        lines.append(f"DisplayIndex: {uid}")
        lines.append(f"Comment: {template_name}")
        lines.append("Disable: false")
        lines.append("Constant: false")
        lines.append("Selective: false")
        lines.append("Key: []")
        lines.append("SelectiveLogic: 0")
        lines.append("KeySecondary: []")
        lines.append("ScanDepth: null")
        lines.append("Vectorized: false")
        lines.append("Position: 0")
        lines.append("Role: 0")
        lines.append("Depth: 0")
        lines.append(f"Order: {order}")
        lines.append("Content:")
        lines.append("")
        lines.append("UseProbability: true")
        lines.append("Probability: 100")
        lines.append("ExcludeRecursion: true")
        lines.append("PreventRecursion: true")
        lines.append("DelayUntilRecursion: false")
        lines.append("Sticky: null")
        lines.append("Cooldown: null")
        lines.append("Delay: null")
        lines.append("PathChain: ")
        lines.append("Extra: {}")
        lines.append("=== End Entry ===")
        
        return '\n'.join(lines)
    
    def batch_generate_txt(self, entries: list, output_dir: str, worldbook_name: str = None) -> list:
        """
        批量生成TXT文件
        
        Args:
            entries: entries列表
            output_dir: 输出目录
            worldbook_name: 世界书名称
            
        Returns:
            生成的文件路径列表
        """
        generated_files = []
        
        for entry in entries:
            try:
                file_path = self.generate_txt_from_entry(entry, output_dir, worldbook_name)
                generated_files.append(file_path)
            except Exception as e:
                print(f"生成TXT文件失败 (UID: {entry.get('uid', 'unknown')}): {e}")
        
        return generated_files
    
    def format_field_value(self, value: Any, field_type: str = None) -> str:
        """
        格式化字段值
        
        Args:
            value: 字段值
            field_type: 字段类型
            
        Returns:
            格式化后的字符串
        """
        if value is None:
            return "null"
        
        if isinstance(value, bool):
            return format_bool(value)
        
        if isinstance(value, (list, dict)):
            return json.dumps(value, ensure_ascii=False)
        
        return str(value)