# Python CLI — 工作流教程

本文通过几个实际场景，演示 WorldBook Manager Python CLI 的典型使用方式。

---

## 场景一：整理一个已有世界书

**目标**：将现有世界书的所有条目统一设为"可选"策略，Order 改为 100，并添加共同关键字。

```bash
cd WorldBookManager/src

# 1. 拆分世界书
python main.py sp "MyWorld.json"
# → 输出到 TXT/MyWorld/

# 2. 批量改策略为 selective
python main.py bss selective -t TXT/MyWorld

# 3. 批量改 Order 为 100
python main.py bso 100 -t TXT/MyWorld

# 4. 为所有条目添加共同关键字
python main.py bak "异世界,魔法" -t TXT/MyWorld

# 5. 合并回 JSON
python main.py mg -n "MyWorld" -t TXT/MyWorld
# → 生成 JSON/new/MyWorld.json
```

---

## 场景二：分区管理——部分条目改为常量

**目标**：UID 0-10 的条目（背景设定）设为常量蓝灯，UID 11-100 的条目（人物/地点）保持可选绿灯。

```bash
# UID 0-10 改为常量
python main.py bss constant -t TXT/MyWorld -s 0 -e 10

# UID 11-100 确保是可选
python main.py bss selective -t TXT/MyWorld -s 11 -e 100

# 同时将常量条目的 Order 设为 10（优先插入）
python main.py bso 10 -t TXT/MyWorld -s 0 -e 10

# 合并
python main.py mg -n "MyWorld" -t TXT/MyWorld
```

---

## 场景三：拆分世界书——提取常量条目为独立世界书

**目标**：从一个大世界书中提取所有蓝灯条目，生成单独的"常量库"世界书。

```bash
# 1. 拆分
python main.py sp "BigWorld.json"

# 2. 提取常量条目到新目录
python main.py ec TXT/BigWorld
# → 输出到 TXT/constant/BigWorld/

# 3. 将提取的条目合并为独立世界书
python main.py mg -n "BigWorld_Constants" -t TXT/constant/BigWorld

# 4. 将原世界书的常量改为可选（可选步骤）
python main.py bss selective -t TXT/BigWorld

# 5. 重新合并原世界书
python main.py mg -n "BigWorld" -t TXT/BigWorld
```

---

## 场景四：按关键字拆分世界书

**目标**：从世界书中提取所有包含"龙"关键字的条目，独立管理。

```bash
# 1. 拆分
python main.py sp "WorldDragon.json"

# 2. 按关键字提取
python main.py ebk "龙" -t TXT/WorldDragon -o TXT/DragonEntries

# 3. 对提取的条目进行修改
python main.py bss constant -t TXT/DragonEntries
python main.py bso 5 -t TXT/DragonEntries

# 4. 合并为独立世界书
python main.py mg -n "Dragons" -t TXT/DragonEntries
```

---

## 场景五：创建新条目并加入世界书

**目标**：快速创建几个新条目模板，填写内容后加入现有世界书。

```bash
# 1. 创建模板（自动分配 UID）
python main.py cr -n "新地点：东部森林" -o 80 -d TXT/MyWorld
python main.py cr -n "新人物：法师塔娜" -o 85 -d TXT/MyWorld
python main.py cr -n "新道具：龙晶" -o 90 -d TXT/MyWorld

# 2. 手动编辑生成的 TXT 文件，填写关键字和正文

# 3. 确认文件列表
python main.py ls -t TXT/MyWorld

# 4. 合并
python main.py mg -n "MyWorld" -t TXT/MyWorld
```

---

## 场景六：批量整理关键字

**目标**：清空某个目录下所有条目的关键字，然后重新批量添加。

```bash
# 清空所有关键字
python main.py bck -t TXT/MyWorld

# 全部添加一个通用前缀关键字
python main.py bak "异世界" -t TXT/MyWorld

# 对特定 UID 范围添加专属关键字
python main.py bak "人物,角色" -t TXT/MyWorld -s 20 -e 50
python main.py bak "地点,场景" -t TXT/MyWorld -s 51 -e 80
```

---

## 获取帮助

```bash
# 查看所有命令
python main.py --help

# 查看单个命令详细用法
python main.py bss --help
python main.py merge --help
```
