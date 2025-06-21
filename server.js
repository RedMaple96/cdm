/**
 * 终端命令管理工具 - Node.js后端服务
 * 提供真实的系统命令执行功能
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;

// 全局变量：保持当前工作目录状态
let currentWorkingDirectory = require('os').homedir();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

console.log('🚀 正在启动后端服务...');
console.log('📁 静态文件目录:', __dirname);
console.log('📂 初始工作目录:', currentWorkingDirectory);

// 移除了命令白名单，现在只使用黑名单进行安全控制

// 简化的危险命令黑名单（仅保留最危险的系统级命令）
const DANGEROUS_COMMANDS = [
    'reboot', 'shutdown', 'halt', 'poweroff',
    'dd', 'shred', 'wipefs'
];

// 本地使用模式：大部分命令都允许执行
const LOCAL_MODE = true;

/**
 * 验证命令是否安全（本地使用模式 - 简化版）
 * @param {string} command - 要执行的命令
 * @returns {Object} 验证结果
 */
function validateCommand(command) {
    const trimmedCommand = command.trim();
    
    // 检查是否为空命令
    if (!trimmedCommand) {
        return { valid: false, reason: '命令不能为空' };
    }
    
    // 本地使用模式：只检查最危险的系统级命令
    if (LOCAL_MODE) {
        const commandName = trimmedCommand.toLowerCase().split(' ')[0];
        
        // 只禁止最危险的系统级命令
        if (DANGEROUS_COMMANDS.some(dangerous => commandName === dangerous)) {
            return { valid: false, reason: `命令 "${commandName}" 被禁止执行，可能导致系统关机或数据丢失` };
        }
        
        // 本地模式下允许所有其他命令
        return { valid: true };
    }
    
    // 非本地模式的完整验证（保留原有逻辑作为备用）
    return { valid: true };
}

/**
 * 执行系统命令
 * @param {string} command - 要执行的命令
 * @param {Function} callback - 回调函数
 */
function executeCommand(command, callback) {
    const validation = validateCommand(command);
    
    if (!validation.valid) {
        return callback(new Error(validation.reason), null);
    }
    
    // 检查是否是cd命令
    const isCdCommand = command.trim().startsWith('cd ');
    
    // 设置执行选项
    const options = {
        // 移除timeout限制，支持长时间运行的脚本
        maxBuffer: 10 * 1024 * 1024, // 增加到10MB输出缓冲区
        cwd: currentWorkingDirectory, // 使用全局工作目录
        env: {
            ...process.env, // 继承环境变量
            // 确保使用用户的完整PATH环境，优先使用homebrew的python
            PATH: '/opt/homebrew/opt/python@3.9/libexec/bin:/opt/homebrew/bin:' + process.env.PATH,
            HOME: process.env.HOME,
            USER: process.env.USER,
            SHELL: process.env.SHELL || '/bin/zsh'
        },
        shell: '/bin/zsh' // 使用zsh shell
    };
    
    // 直接执行命令，与本地终端行为一致
    exec(command, options, (error, stdout, stderr) => {
        if (error) {
            // 执行错误
            return callback(error, null);
        }
        
        // 如果是cd命令且执行成功，更新当前工作目录
        if (isCdCommand) {
            const cdTarget = command.trim().substring(3).trim() || '~';
            try {
                // 解析目标路径
                let targetPath;
                if (cdTarget === '~') {
                    targetPath = require('os').homedir();
                } else if (cdTarget === '/') {
                    targetPath = '/';
                } else if (cdTarget.startsWith('/')) {
                    targetPath = cdTarget;
                } else {
                    targetPath = path.resolve(currentWorkingDirectory, cdTarget);
                }
                
                // 检查目录是否存在
                const fs = require('fs');
                if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
                    currentWorkingDirectory = targetPath;
                    console.log(`工作目录已切换到: ${currentWorkingDirectory}`);
                }
            } catch (err) {
                console.error('更新工作目录失败:', err.message);
            }
        }
        
        // 返回执行结果，包含当前工作目录信息
        const result = {
            stdout: stdout || '',
            stderr: stderr || '',
            success: true,
            timestamp: new Date().toISOString(),
            currentDirectory: currentWorkingDirectory
        };
        
        callback(null, result);
    });
}

// API路由

/**
 * 执行命令的API端点
 */
app.post('/api/execute', (req, res) => {
    const { command } = req.body;
    
    if (!command) {
        return res.status(400).json({
            success: false,
            error: '请提供要执行的命令'
        });
    }
    
    console.log(`执行命令: ${command}`);
    
    executeCommand(command, (error, result) => {
        if (error) {
            console.error(`命令执行失败: ${error.message}`);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`命令执行成功`);
        res.json({
            success: true,
            ...result
        });
    });
});

/**
 * 获取危险命令黑名单
 */
app.get('/api/dangerous-commands', (req, res) => {
    res.json({
        success: true,
        commands: DANGEROUS_COMMANDS,
        message: '以下命令被禁止执行，出于安全考虑'
    });
});

/**
 * 获取当前工作目录
 */
app.get('/api/current-directory', (req, res) => {
    res.json({
        success: true,
        currentDirectory: currentWorkingDirectory,
        message: '当前工作目录'
    });
});

/**
 * 健康检查端点
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 提供静态文件服务
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 终端命令管理工具后端服务已启动`);
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`🏠 本地使用模式: 已启用（简化安全验证）`);
    console.log(`🚫 仅禁止系统级危险命令: ${DANGEROUS_COMMANDS.length} 个`);
    console.log(`✅ 允许执行大部分常用命令（rm, mv, cp, sudo 等）`);
    console.log(`\n访问 http://localhost:${PORT} 开始使用工具\n`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});