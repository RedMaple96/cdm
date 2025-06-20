/**
 * 终端命令管理工具 - 主要JavaScript文件
 * 包含命令配置和执行功能
 */

// 全局变量
let commands = JSON.parse(localStorage.getItem('terminalCommands')) || [];
let executionHistory = JSON.parse(localStorage.getItem('executionHistory')) || [];
let commandGroups = JSON.parse(localStorage.getItem('commandGroups')) || [];
let editingCommandId = null;
let currentView = 'group'; // 'group' 或 'list'

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    loadGroups();
    renderGroups();
    updateGroupSelector();
    renderCommands();
    updateCommandSelector();
    renderExecutionHistory();
    refreshCurrentDirectory(); // 加载当前工作目录
});

/**
 * 切换页签功能
 * @param {string} tabName - 页签名称 ('config' 或 'execute')
 */
function switchTab(tabName) {
    // 移除所有活动状态
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 激活选中的页签
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // 如果切换到执行页签，更新命令选择器
    if (tabName === 'execute') {
        updateCommandSelector();
    }
}

/**
 * 添加新命令
 */
function addCommand() {
    const name = document.getElementById('command-name').value.trim();
    const content = document.getElementById('command-content').value.trim();
    const description = document.getElementById('command-description').value.trim();
    const group = document.getElementById('command-group').value.trim();
    
    // 验证输入
    if (!name || !content) {
        alert('请填写命令名称和命令内容！');
        return;
    }
    
    // 检查命令名称是否已存在（编辑模式除外）
    const existingCommand = commands.find(cmd => cmd.name === name);
    if (existingCommand && editingCommandId !== existingCommand.id) {
        alert('命令名称已存在，请使用其他名称！');
        return;
    }
    
    if (editingCommandId) {
        // 编辑模式：更新现有命令
        const commandIndex = commands.findIndex(cmd => cmd.id === editingCommandId);
        if (commandIndex !== -1) {
            commands[commandIndex] = {
                ...commands[commandIndex],
                name,
                content,
                description,
                group: group || '默认分组',
                updatedAt: new Date().toISOString()
            };
        }
        editingCommandId = null;
        document.querySelector('.add-command-form h3').textContent = '添加新命令';
        document.querySelector('.btn-primary').textContent = '添加命令';
    } else {
        // 添加模式：创建新命令
        const newCommand = {
            id: Date.now().toString(),
            name,
            content,
            description,
            group: group || '默认分组',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        commands.push(newCommand);
    }
    
    // 保存到本地存储
    saveCommands();
    
    // 清空表单
    clearForm();
    
    // 重新渲染命令列表
    renderCommands();
    updateCommandSelector();
    
    alert(editingCommandId ? '命令更新成功！' : '命令添加成功！');
}

/**
 * 清空表单
 */
function clearForm() {
    document.getElementById('command-name').value = '';
    document.getElementById('command-content').value = '';
    document.getElementById('command-description').value = '';
    document.getElementById('command-group').value = '';
}

/**
 * 渲染命令列表
 */
function renderCommands() {
    const container = document.getElementById('commands-container');
    
    if (commands.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3em; margin-bottom: 20px; opacity: 0.5;">📝</div>
                <p>暂无配置的命令</p>
                <p>请在上方添加您的第一个命令</p>
            </div>
        `;
        return;
    }
    
    if (currentView === 'group') {
        renderGroupView(container);
    } else {
        renderListView(container);
    }
}

/**
 * 渲染分组视图
 * @param {HTMLElement} container - 容器元素
 */
function renderGroupView(container) {
    // 按分组整理命令
    const groupedCommands = {};
    commands.forEach(command => {
        const group = command.group || '默认分组';
        if (!groupedCommands[group]) {
            groupedCommands[group] = [];
        }
        groupedCommands[group].push(command);
    });
    
    // 生成分组视图HTML
    const groupsHtml = Object.keys(groupedCommands).map(groupName => {
        const groupCommands = groupedCommands[groupName];
        return `
            <div class="command-group">
                <div class="command-group-header">
                    <h4 class="command-group-title">${escapeHtml(groupName)}</h4>
                    <span class="command-group-count">${groupCommands.length}</span>
                </div>
                <div class="command-group-items">
                    ${groupCommands.map(command => renderCommandItem(command)).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = groupsHtml;
}

/**
 * 渲染列表视图
 * @param {HTMLElement} container - 容器元素
 */
function renderListView(container) {
    container.innerHTML = commands.map(command => renderCommandItem(command)).join('');
}

/**
 * 渲染单个命令项
 * @param {Object} command - 命令对象
 * @returns {string} 命令项HTML
 */
function renderCommandItem(command) {
    return `
        <div class="command-item">
            <div class="command-header">
                <div class="command-name">
                    ${escapeHtml(command.name)}
                    ${currentView === 'list' && command.group ? `<span style="font-size: 12px; color: #6c757d; margin-left: 8px;">[${escapeHtml(command.group)}]</span>` : ''}
                </div>
                <div class="command-actions">
                    <button class="btn btn-warning" onclick="editCommand('${command.id}')">
                        编辑
                    </button>
                    <button class="btn btn-danger" onclick="deleteCommand('${command.id}')">
                        删除
                    </button>
                </div>
            </div>
            <div class="command-content">${escapeHtml(command.content)}</div>
            ${command.description ? `<div class="command-description">${escapeHtml(command.description)}</div>` : ''}
        </div>
    `;
}

/**
 * 编辑命令
 * @param {string} commandId - 命令ID
 */
function editCommand(commandId) {
    const command = commands.find(cmd => cmd.id === commandId);
    if (!command) return;
    
    // 填充表单
    document.getElementById('command-name').value = command.name;
    document.getElementById('command-content').value = command.content;
    document.getElementById('command-description').value = command.description || '';
    document.getElementById('command-group').value = command.group || '';
    
    // 设置编辑模式
    editingCommandId = commandId;
    document.querySelector('.add-command-form h3').textContent = '编辑命令';
    document.querySelector('.btn-primary').textContent = '更新命令';
    
    // 滚动到表单顶部
    document.querySelector('.add-command-form').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 删除命令
 * @param {string} commandId - 命令ID
 */
function deleteCommand(commandId) {
    const command = commands.find(cmd => cmd.id === commandId);
    if (!command) return;
    
    if (confirm(`确定要删除命令 "${command.name}" 吗？`)) {
        commands = commands.filter(cmd => cmd.id !== commandId);
        saveCommands();
        renderCommands();
        updateCommandSelector();
        alert('命令删除成功！');
    }
}

/**
 * 添加新分组
 */
function addGroup() {
    const groupNameInput = document.getElementById('new-group-name');
    const groupName = groupNameInput.value.trim();
    
    if (!groupName) {
        alert('请输入分组名称');
        return;
    }
    
    if (commandGroups.includes(groupName)) {
        alert('分组名称已存在');
        return;
    }
    
    commandGroups.push(groupName);
    saveGroups();
    renderGroups();
    updateGroupSelector();
    groupNameInput.value = '';
}

/**
 * 删除分组
 * @param {string} groupName - 分组名称
 */
function deleteGroup(groupName) {
    if (groupName === '默认分组') {
        alert('默认分组不能删除');
        return;
    }
    
    // 检查是否有命令使用此分组
    const hasCommands = commands.some(cmd => cmd.group === groupName);
    if (hasCommands) {
        if (!confirm(`分组 "${groupName}" 中还有命令，删除后这些命令将移动到默认分组。确定要删除吗？`)) {
            return;
        }
        // 将使用此分组的命令移动到默认分组
        commands.forEach(cmd => {
            if (cmd.group === groupName) {
                cmd.group = '默认分组';
            }
        });
        saveCommands();
    }
    
    commandGroups = commandGroups.filter(group => group !== groupName);
    saveGroups();
    renderGroups();
    updateGroupSelector();
    renderCommands();
}

/**
 * 渲染分组列表
 */
function renderGroups() {
    const container = document.getElementById('groups-container');
    
    if (commandGroups.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>暂无自定义分组</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = commandGroups.map(group => `
        <div class="group-item">
            <span class="group-name">${escapeHtml(group)}</span>
            ${group !== '默认分组' ? `
                <button class="btn btn-danger btn-sm" onclick="deleteGroup('${escapeHtml(group)}')">
                    删除
                </button>
            ` : ''}
        </div>
    `).join('');
}

/**
 * 更新分组选择器
 */
function updateGroupSelector() {
    const selector = document.getElementById('command-group');
    const currentValue = selector.value;
    
    // 清空现有选项
    selector.innerHTML = '<option value="">选择分组（可选）</option>';
    
    // 添加所有分组选项
    commandGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        selector.appendChild(option);
    });
    
    // 恢复之前的选择
    selector.value = currentValue;
}

/**
 * 切换视图模式
 * @param {string} view - 视图模式 ('list' 或 'group')
 */
function switchView(view) {
    currentView = view;
    
    // 更新按钮状态
    document.querySelectorAll('.view-switch .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchView('${view}')"]`).classList.add('active');
    
    // 重新渲染命令列表
    renderCommands();
}

/**
 * 保存分组到本地存储
 */
function saveGroups() {
    localStorage.setItem('commandGroups', JSON.stringify(commandGroups));
}

/**
 * 从本地存储加载分组
 */
function loadGroups() {
    const saved = localStorage.getItem('commandGroups');
    if (saved) {
        commandGroups = JSON.parse(saved);
    }
    // 确保默认分组存在
    if (!commandGroups.includes('默认分组')) {
        commandGroups.unshift('默认分组');
    }
}

/**
 * 处理分组名称输入框的键盘事件
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleGroupNameKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addGroup();
    }
}

/**
 * 更新命令选择器
 */
function updateCommandSelector() {
    const selector = document.getElementById('select-command');
    
    // 清空现有选项
    selector.innerHTML = '<option value="">请选择要执行的命令</option>';
    
    // 添加命令选项
    commands.forEach(command => {
        const option = document.createElement('option');
        option.value = command.id;
        option.textContent = `${command.name} - ${command.description || '无描述'}`;
        selector.appendChild(option);
    });
}

/**
 * 加载选中的预配置命令到编辑框
 */
function loadSelectedCommand() {
    const selectedCommandId = document.getElementById('select-command').value;
    const presetCommandInput = document.getElementById('preset-command');
    
    if (!selectedCommandId) {
        presetCommandInput.value = '';
        presetCommandInput.placeholder = '选择预配置命令后可在此编辑';
        return;
    }
    
    const command = commands.find(cmd => cmd.id === selectedCommandId);
    if (command) {
        presetCommandInput.value = command.content;
        presetCommandInput.placeholder = `已加载: ${command.name}`;
        // 聚焦到输入框，方便用户编辑
        setTimeout(() => {
            presetCommandInput.focus();
            presetCommandInput.setSelectionRange(presetCommandInput.value.length, presetCommandInput.value.length);
        }, 100);
    }
}

/**
 * 统一的命令执行函数
 */
function executeUnifiedCommand() {
    let commandText = '';
    let commandName = '';
    
    // 根据当前激活的模式获取命令内容
    const quickMode = document.getElementById('quick-input-mode').classList.contains('active');
    
    if (quickMode) {
        // 快速输入模式
        const quickCommandInput = document.getElementById('quick-command');
        commandText = quickCommandInput.value.trim();
        commandName = '快速执行';
        
        if (!commandText) {
            alert('请输入要执行的命令！');
            quickCommandInput.focus();
            return;
        }
        
        // 清空输入框
        quickCommandInput.value = '';
    } else {
        // 预配置命令模式
        const presetCommandInput = document.getElementById('preset-command');
        commandText = presetCommandInput.value.trim();
        
        // 获取选中的命令名称
        const selectedCommandId = document.getElementById('select-command').value;
        if (selectedCommandId) {
            const selectedCommand = commands.find(cmd => cmd.id === selectedCommandId);
            commandName = selectedCommand ? selectedCommand.name : '预配置命令';
        } else {
            commandName = '自定义命令';
        }
        
        if (!commandText) {
            alert('请输入要执行的命令！');
            presetCommandInput.focus();
            return;
        }
    }
    
    // 创建命令对象
    const command = {
        id: 'unified-' + Date.now(),
        name: commandName,
        content: commandText,
        description: quickMode ? '快速执行的命令' : '预配置或编辑后的命令'
    };
    
    // 显示加载状态
    const outputElement = document.getElementById('command-output');
    outputElement.innerHTML = `<div class="loading"></div> 正在执行命令: ${commandText}...`;
    
    // 调用后端API执行真实命令
    executeRealCommand(command);
}

/**
 * 切换输入模式（快速输入 / 预配置命令）
 * @param {string} mode - 模式类型 ('quick' 或 'preset')
 */
function switchInputMode(mode) {
    // 移除所有标签页的活动状态
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 隐藏所有输入模式
    document.querySelectorAll('.input-mode').forEach(modeDiv => {
        modeDiv.classList.remove('active');
    });
    
    // 激活选中的标签页和对应的输入模式
    if (mode === 'quick') {
        document.getElementById('quick-mode-tab').classList.add('active');
        document.getElementById('quick-input-mode').classList.add('active');
        // 聚焦到快速输入框
        setTimeout(() => {
            document.getElementById('quick-command').focus();
        }, 100);
    } else if (mode === 'preset') {
        document.getElementById('preset-mode-tab').classList.add('active');
        document.getElementById('preset-input-mode').classList.add('active');
        // 聚焦到选择框
        setTimeout(() => {
            document.getElementById('select-command').focus();
        }, 100);
    }
}

/**
 * 刷新当前工作目录显示
 */
function refreshCurrentDirectory() {
    fetch('/api/current-directory')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('current-directory-display').textContent = data.currentDirectory;
            } else {
                document.getElementById('current-directory-display').textContent = '获取失败';
            }
        })
        .catch(error => {
            console.error('获取当前目录失败:', error);
            document.getElementById('current-directory-display').textContent = '获取失败';
        });
}

/**
 * 执行真实的系统命令
 * @param {Object} command - 命令对象
 */
function executeRealCommand(command) {
    const outputElement = document.getElementById('command-output');
    
    // 调用后端API执行命令
    fetch('/api/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            command: command.content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 执行成功
            let result = '';
            
            if (data.stdout) {
                result += data.stdout;
            }
            
            if (data.stderr) {
                result += data.stderr ? '\n错误输出:\n' + data.stderr : '';
            }
            
            if (!result.trim()) {
                result = '命令执行完成（无输出）';
            }
            
            // 显示当前工作目录
            if (data.currentDirectory) {
                result += `\n\n当前目录: ${data.currentDirectory}`;
            }
            
            result += `\n执行时间: ${formatDate(data.timestamp)}`;
            result += '\n状态: 成功';
            
            outputElement.textContent = result;
            
            // 如果是cd命令，刷新目录显示
            if (command.content.trim().startsWith('cd ')) {
                refreshCurrentDirectory();
            }
            
            // 添加到执行历史
            addToHistory(command, result);
        } else {
            // 执行失败
            const errorResult = `命令执行失败\n\n错误信息: ${data.error}\n执行时间: ${formatDate(data.timestamp)}\n状态: 失败`;
            outputElement.textContent = errorResult;
            
            // 添加到执行历史
            addToHistory(command, errorResult);
        }
    })
    .catch(error => {
        console.error('API调用失败:', error);
        const errorResult = `网络错误或服务器未启动\n\n错误信息: ${error.message}\n\n请确保：\n1. Node.js后端服务已启动 (npm start)\n2. 服务运行在 http://localhost:3000\n3. 网络连接正常`;
        outputElement.textContent = errorResult;
        
        // 添加到执行历史
        addToHistory(command, errorResult);
    });
}

/**
 * 添加到执行历史
 * @param {Object} command - 执行的命令
 * @param {string} result - 执行结果
 */
function addToHistory(command, result) {
    const historyItem = {
        id: Date.now().toString(),
        commandName: command.name,
        commandContent: command.content,
        result: result,
        executedAt: new Date().toISOString()
    };
    
    executionHistory.unshift(historyItem); // 添加到开头
    
    // 限制历史记录数量（最多保留50条）
    if (executionHistory.length > 50) {
        executionHistory = executionHistory.slice(0, 50);
    }
    
    // 保存到本地存储
    localStorage.setItem('executionHistory', JSON.stringify(executionHistory));
    
    // 重新渲染历史记录
    renderExecutionHistory();
}

/**
 * 渲染执行历史
 */
function renderExecutionHistory() {
    const container = document.getElementById('history-container');
    
    if (executionHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3em; margin-bottom: 20px; opacity: 0.5;">📋</div>
                <p>暂无执行历史</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = executionHistory.map(item => `
        <div class="history-item">
            <div class="history-time">${formatDate(item.executedAt)}</div>
            <div class="history-command">${escapeHtml(item.commandName)}: ${escapeHtml(item.commandContent)}</div>
        </div>
    `).join('');
}

/**
 * 保存命令到本地存储
 */
function saveCommands() {
    localStorage.setItem('terminalCommands', JSON.stringify(commands));
}

/**
 * 格式化日期
 * @param {string} dateString - ISO日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * HTML转义函数，防止XSS攻击
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 清空所有数据（调试用）
 */
function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        localStorage.removeItem('terminalCommands');
        localStorage.removeItem('executionHistory');
        commands = [];
        executionHistory = [];
        renderCommands();
        updateCommandSelector();
        renderExecutionHistory();
        alert('所有数据已清空！');
    }
}

/**
 * 获取危险命令黑名单
 */
function loadDangerousCommands() {
    fetch('/api/dangerous-commands')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('危险命令黑名单:', data.commands);
            // 在界面上显示危险命令提示
            displayDangerousCommands(data.commands);
        }
    })
    .catch(error => {
        console.warn('无法获取危险命令黑名单:', error.message);
    });
}

/**
 * 显示危险命令黑名单
 * @param {Array} commands - 危险命令数组
 */
function displayDangerousCommands(commands) {
    // 在命令配置表单下方添加提示信息
    const formElement = document.querySelector('.add-command-form');
    
    // 检查是否已经存在提示
    let existingTip = document.getElementById('dangerous-commands-tip');
    if (existingTip) {
        existingTip.remove();
    }
    
    const tipElement = document.createElement('div');
    tipElement.id = 'dangerous-commands-tip';
    tipElement.style.cssText = `
        margin-top: 15px;
        padding: 15px;
        background: #ffebee;
        border: 1px solid #f44336;
        border-radius: 8px;
        font-size: 14px;
        color: #c62828;
    `;
    
    tipElement.innerHTML = `
        <strong>🚫 安全警告:</strong> 以下命令被禁止执行，出于安全考虑：<br>
        <code style="background: white; padding: 2px 4px; border-radius: 3px; margin: 2px;">${commands.join('</code> <code style="background: white; padding: 2px 4px; border-radius: 3px; margin: 2px;">')}</code><br>
        <small style="margin-top: 8px; display: block;">💡 提示：除黑名单外的其他命令都可以执行</small>
    `;
    
    formElement.appendChild(tipElement);
}

/**
 * 检查后端服务状态
 */
function checkServerStatus() {
    fetch('/api/health')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ 后端服务运行正常');
            // 加载危险命令黑名单
            loadDangerousCommands();
        }
    })
    .catch(error => {
        console.warn('⚠️ 后端服务未启动或连接失败:', error.message);
        showServerWarning();
    });
}

/**
 * 显示服务器警告信息
 */
function showServerWarning() {
    const warningElement = document.createElement('div');
    warningElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 400px;
        font-size: 14px;
    `;
    
    warningElement.innerHTML = `
        <strong>⚠️ 后端服务未启动</strong><br>
        请在终端中运行以下命令启动服务：<br>
        <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; display: block; margin: 8px 0;">npm install && npm start</code>
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 16px; cursor: pointer;">×</button>
    `;
    
    document.body.appendChild(warningElement);
    
    // 5秒后自动隐藏
    setTimeout(() => {
        if (warningElement.parentElement) {
            warningElement.remove();
        }
    }, 8000);
}

// 页面加载时检查服务器状态
document.addEventListener('DOMContentLoaded', function() {
    renderCommands();
    updateCommandSelector();
    renderExecutionHistory();
    
    // 添加快速命令输入框的回车键事件监听
    const quickCommandInput = document.getElementById('quick-command');
    if (quickCommandInput) {
        quickCommandInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                executeQuickCommand();
            }
        });
    }
    
    // 检查后端服务状态
    setTimeout(checkServerStatus, 1000);
});

// 导出函数供全局使用
window.switchTab = switchTab;
window.addCommand = addCommand;
window.editCommand = editCommand;
window.deleteCommand = deleteCommand;
window.executeCommand = executeCommand;
window.executeQuickCommand = executeQuickCommand;
window.clearAllData = clearAllData;
window.checkServerStatus = checkServerStatus;