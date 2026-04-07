import json
from pathlib import Path
from typing import Any, Dict, Optional
from utils import (
    ensure_directory_exists,
    load_json_file,
    save_json_file,
    validate_json_structure
)


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_dir: str = None):
        """
        初始化配置管理器
        
        Args:
            config_dir: 配置文件目录，默认为当前目录的config文件夹
        """
        if config_dir is None:
            config_dir = Path(__file__).parent / 'config'
        
        self.config_dir = Path(config_dir)
        ensure_directory_exists(self.config_dir)
        self.config_file = self.config_dir / 'config.json'
        
        self.default_config = {
            'directories': {
                'json_old': 'JSON/old',
                'json_new': 'JSON/new',
                'json_bak': 'JSON/bak',
                'txt': 'TXT',
            },
            'defaults': {
                'order': 100,
                'uid': None,
                'disable': False,
                'constant': False,
                'selective': False,
                'vectorized': False,
                'use_probability': True,
                'probability': 100,
                'exclude_recursion': True,
                'prevent_recursion': True,
                'delay_until_recursion': False,
                'sticky': None,
                'cooldown': None,
                'delay': None,
            },
            'txt_format': {
                'encoding': 'utf-8',
                'line_ending': '\n',
                'indent': 2,
            },
            'json_format': {
                'encoding': 'utf-8',
                'indent': 2,
                'ensure_ascii': False,
            },
        }
        
        self.config = self.load_config()
    
    def load_config(self) -> Dict[str, Any]:
        """
        加载配置文件
        
        Returns:
            配置字典
        """
        if not self.config_file.exists():
            return self.default_config.copy()
        
        try:
            config = load_json_file(self.config_file)
            return self._merge_with_defaults(config)
        except Exception as e:
            print(f"加载配置文件失败: {e}")
            return self.default_config.copy()
    
    def save_config(self, config: Dict[str, Any] = None) -> bool:
        """
        保存配置文件
        
        Args:
            config: 要保存的配置，如果为None则保存当前配置
            
        Returns:
            是否成功保存
        """
        if config is None:
            config = self.config
        
        try:
            save_json_file(config, self.config_file)
            return True
        except Exception as e:
            print(f"保存配置文件失败: {e}")
            return False
    
    def validate_config(self, config: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        验证配置
        
        Args:
            config: 要验证的配置
            
        Returns:
            (是否有效, 错误信息)
        """
        required_keys = ['directories', 'defaults', 'txt_format', 'json_format']
        
        for key in required_keys:
            if key not in config:
                return False, f"缺少必需的配置项: {key}"
        
        return True, None
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        获取配置值
        
        Args:
            key: 配置键（支持点号分隔的嵌套键）
            default: 默认值
            
        Returns:
            配置值
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any) -> None:
        """
        设置配置值
        
        Args:
            key: 配置键（支持点号分隔的嵌套键）
            value: 配置值
        """
        keys = key.split('.')
        config = self.config
        
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        config[keys[-1]] = value
    
    def reset_to_defaults(self) -> None:
        """重置为默认配置"""
        self.config = self.default_config.copy()
        self.save_config()
    
    def _merge_with_defaults(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        将配置与默认配置合并
        
        Args:
            config: 用户配置
            
        Returns:
            合并后的配置
        """
        result = self.default_config.copy()
        
        for key, value in config.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = {**result[key], **value}
            else:
                result[key] = value
        
        return result
    
    def get_directory(self, dir_type: str) -> Path:
        """
        获取目录路径
        
        Args:
            dir_type: 目录类型 (json_old, json_new, json_bak, txt)
            
        Returns:
            目录路径
        """
        dir_path = self.get(f'directories.{dir_type}')
        if dir_path is None:
            raise ValueError(f"未知的目录类型: {dir_type}")
        
        return Path(__file__).parent / dir_path
    
    def get_default_value(self, field: str) -> Any:
        """
        获取字段的默认值
        
        Args:
            field: 字段名
            
        Returns:
            默认值
        """
        return self.get(f'defaults.{field}')
    
    def set_default_value(self, field: str, value: Any) -> None:
        """
        设置字段的默认值
        
        Args:
            field: 字段名
            value: 默认值
        """
        self.set(f'defaults.{field}', value)
    
    def get_txt_format(self, format_key: str) -> Any:
        """
        获取TXT格式设置
        
        Args:
            format_key: 格式键
            
        Returns:
            格式值
        """
        return self.get(f'txt_format.{format_key}')
    
    def get_json_format(self, format_key: str) -> Any:
        """
        获取JSON格式设置
        
        Args:
            format_key: 格式键
            
        Returns:
            格式值
        """
        return self.get(f'json_format.{format_key}')