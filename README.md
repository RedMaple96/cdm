# 终端命令管理工具

一个安全的终端命令管理和执行工具，提供Web界面来管理和执行系统命令。

## 🚀 功能特性

- **命令配置管理**：支持创建分组、添加自定义命令
- **安全执行**：内置命令黑名单，防止危险操作
- **实时执行**：支持快速输入和预配置命令执行
- **目录管理**：支持cd命令，保持工作目录状态
- **执行历史**：记录命令执行历史和结果
- **别名支持**：自动加载用户的shell配置和别名
- **双视图模式**：支持分组视图和列表视图

## 📋 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- macOS/Linux系统
- zsh shell（推荐）

## 📖 使用指南

### 命令配置模块

1. **分组管理**
   - 创建新分组来组织命令
   - 删除不需要的分组
   - 查看现有分组列表

2. **添加命令**
   - 选择所属分组
   - 输入命令名称和内容
   - 添加命令描述
   - 保存到本地存储

3. **命令列表**
   - 分组视图：按分组显示命令
   - 列表视图：显示所有命令
   - 编辑和删除已配置的命令

### 命令执行模块

1. **快速输入模式**
   - 直接输入要执行的命令
   - 支持所有安全的系统命令
   - 实时显示执行结果

2. **预配置命令模式**
   - 从已配置的命令中选择
   - 可以在执行前编辑命令
   - 一键执行预设命令

3. **目录管理**
   - 显示当前工作目录
   - 支持cd命令切换目录
   - 目录状态在会话中保持

## 🔒 安全特性

### 命令黑名单

以下命令被禁止执行以确保系统安全：

```
rm, rmdir, mv, cp, chmod, chown, sudo, su,
passwd, useradd, userdel, groupadd, groupdel,
mount, umount, fdisk, mkfs, fsck,
iptables, systemctl, service, kill, killall,
reboot, shutdown, halt, poweroff,
dd, shred, wipefs, crontab
```

### 危险操作符检测

以下操作符和函数被禁止：

```
&&, ||, ;, |, >, >>, <, `, $(
eval, exec, system, curl, wget, nc, netcat
```

### 交互式命令限制

直接执行交互式命令（如`python`、`node`）被禁止，但支持：
- 执行脚本文件：`python script.py`
- 执行代码：`python -c "print('Hello')"`
- 查看版本：`python --version`

### 技术栈

- **后端**：Node.js + Express
- **前端**：原生HTML/CSS/JavaScript
- **存储**：localStorage（浏览器本地存储）
- **Shell**：zsh

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## ⚠️ 免责声明

本工具仅供学习和开发使用，请勿在生产环境中执行危险命令。使用者需要对执行的命令负责。
