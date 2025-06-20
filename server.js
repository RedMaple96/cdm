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

// 危险命令黑名单
const DANGEROUS_COMMANDS = [
    'rm', 'rmdir', 'mv', 'cp', 'chmod', 'chown', 'sudo', 'su',
    'passwd', 'useradd', 'userdel', 'groupadd', 'groupdel',
    'mount', 'umount', 'fdisk', 'mkfs', 'fsck',
    'iptables', 'systemctl', 'service', 'kill', 'killall',
    'reboot', 'shutdown', 'halt', 'poweroff',
    'dd', 'shred', 'wipefs', 'crontab'
];

/**
 * 验证命令是否安全
 * @param {string} command - 要执行的命令
 * @returns {Object} 验证结果
 */
function validateCommand(command) {
    const trimmedCommand = command.trim().toLowerCase();
    
    // 检查是否为空命令
    if (!trimmedCommand) {
        return { valid: false, reason: '命令不能为空' };
    }
    
    // 提取命令的第一个词（实际命令名）
    const commandName = trimmedCommand.split(' ')[0];
    
    // 检查是否为交互式命令
    const interactiveCommands = ['python', 'python3', 'node', 'irb', 'ruby', 'mysql', 'psql', 'mongo', 'redis-cli'];
    if (interactiveCommands.includes(commandName) && trimmedCommand === commandName) {
        return { 
            valid: false, 
            reason: `交互式命令 "${commandName}" 不支持直接执行。请使用以下方式：\n` +
                   `• 执行脚本文件：${commandName} script.py\n` +
                   `• 执行代码：${commandName} -c "print('Hello World')"\n` +
                   `• 查看版本：${commandName} --version`
        };
    }
    
    // 检查是否在危险命令黑名单中
    if (DANGEROUS_COMMANDS.some(dangerous => commandName.includes(dangerous))) {
        return { valid: false, reason: `命令 "${commandName}" 被禁止执行，出于安全考虑` };
    }
    
    // 检查是否包含危险字符或操作符
    const dangerousPatterns = [
        '&&', '||', ';', '|', '>', '>>', '<', '`', '$(',
        'eval', 'exec', 'system', 'curl', 'wget', 'nc', 'netcat'
    ];
    
    if (dangerousPatterns.some(pattern => command.includes(pattern))) {
        return { valid: false, reason: '命令包含不安全的操作符或函数' };
    }
    
    // 已移除白名单检查，只要不在黑名单中即可执行
    
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
        timeout: 10000, // 10秒超时
        maxBuffer: 1024 * 1024, // 1MB输出缓冲区
        cwd: currentWorkingDirectory, // 使用全局工作目录
        env: process.env, // 继承环境变量
        shell: '/bin/zsh' // 使用zsh shell
    };
    
    // 通过交互式shell执行命令以加载用户配置和别名
    const shellCommand = `/bin/zsh -i -c "source ~/.zshrc 2>/dev/null && ${command}"`;
    
    exec(shellCommand, {...options, shell: false}, (error, stdout, stderr) => {
        if (error) {
            // 如果是超时错误
            if (error.code === 'ETIMEDOUT') {
                return callback(new Error('命令执行超时（10秒）'), null);
            }
            // 其他执行错误
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
    console.log(`🔒 安全模式: 已启用命令黑名单`);
    console.log(`🚫 禁止的命令数量: ${DANGEROUS_COMMANDS.length}`);
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