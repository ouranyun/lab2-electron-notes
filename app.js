document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const taskCount = document.getElementById('taskCount');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const dateElement = document.querySelector('.date');
    const historyBtn = document.getElementById('historyBtn');
    const historyModal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const closeModalBtn = document.querySelector('.close-btn');

    // 当前过滤状态
    let currentFilter = 'all';

    // 初始化
    init();

    // 历史记录模态框事件监听
    historyBtn.addEventListener('click', showHistory);
    closeHistoryBtn.addEventListener('click', hideHistory);
    closeModalBtn.addEventListener('click', hideHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            hideHistory();
        }
    });

    function init() {
        // 加载本地存储的任务
        loadTasks();
        // 更新任务计数
        updateTaskCount();
        // 设置当前日期
        setCurrentDate();
        // 添加事件监听器
        addEventListeners();
    }

    function addEventListeners() {
        // 添加任务按钮点击事件
        addTaskBtn.addEventListener('click', addTask);
        // 输入框回车事件
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
        // 清除已完成按钮点击事件
        clearCompletedBtn.addEventListener('click', clearCompletedTasks);
        // 过滤按钮点击事件
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => filterTasks(btn.dataset.filter));
        });
    }

    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;

        // 创建新任务对象
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };

        // 添加到任务列表
        const tasks = getTasks();
        tasks.push(task);
        saveTasks(tasks);

        // 清空输入框
        taskInput.value = '';

        // 重新加载任务
        loadTasks();

        // 更新任务计数
        updateTaskCount();
    }

    function loadTasks() {
        // 清空任务列表
        taskList.innerHTML = '';

        // 获取任务并根据当前过滤条件筛选
        const tasks = getTasks();
        let filteredTasks = tasks;

        if (currentFilter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }

        // 渲染任务
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.classList.add('task-item');
            if (task.completed) {
                taskItem.classList.add('task-completed');
            }

            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${escapeHtml(task.text)}</span>
                <button class="delete-btn" data-id="${task.id}"><i class="fas fa-times"></i></button>
            `;

            taskList.appendChild(taskItem);
        });

        // 为新添加的任务添加事件监听器
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', toggleTaskStatus);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', deleteTask);
        });
    }

    function toggleTaskStatus(e) {
        const taskId = parseInt(e.target.dataset.id);
        const tasks = getTasks();

        // 更新任务状态
        const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });

        saveTasks(updatedTasks);

        // 重新加载任务
        loadTasks();

        // 更新任务计数
        updateTaskCount();
    }

    function deleteTask(e) {
        const taskId = parseInt(e.target.closest('.delete-btn').dataset.id);
        const tasks = getTasks();

        // 找到要删除的任务
        const deletedTask = tasks.find(task => task.id === taskId);

        // 过滤掉要删除的任务
        const updatedTasks = tasks.filter(task => task.id !== taskId);

        saveTasks(updatedTasks);

        // 将删除的任务添加到历史记录
        if (deletedTask) {
            addToHistory(deletedTask);
        }

        // 重新加载任务
        loadTasks();

        // 更新任务计数
        updateTaskCount();
    }

    // 显示历史记录
    function showHistory() {
        historyModal.style.display = 'block';
        loadHistory();
    }

    // 隐藏历史记录
    function hideHistory() {
        historyModal.style.display = 'none';
    }

    // 加载历史记录
    function loadHistory() {
        historyList.innerHTML = '';
        const history = getHistory();

        if (history.length === 0) {
            historyList.innerHTML = '<li class="no-history">没有历史记录</li>';
            return;
        }

        // 按删除时间倒序排列
        history.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
            .forEach(item => {
                const historyItem = document.createElement('li');
                historyItem.classList.add('history-item');

                // 格式化删除时间
                const deletedDate = new Date(item.deletedAt);
                const formattedDate = deletedDate.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                historyItem.innerHTML = `
                    <span class="history-text">${escapeHtml(item.text)}</span>
                    <span class="history-date">${formattedDate}</span>
                `;

                historyList.appendChild(historyItem);
            });
    }

    // 添加到历史记录
    function addToHistory(task) {
        const history = getHistory();
        const historyItem = {
            id: Date.now(),
            text: task.text,
            deletedAt: new Date().toISOString()
        };

        history.push(historyItem);
        saveHistory(history);
    }

    // 清空历史记录
    function clearHistory() {
        if (confirm('确定要清空所有历史记录吗？')) {
            localStorage.removeItem('todoHistory');
            loadHistory();
        }
    }

    // 获取历史记录
    function getHistory() {
        const history = localStorage.getItem('todoHistory');
        return history ? JSON.parse(history) : [];
    }

    // 保存历史记录
    function saveHistory(history) {
        localStorage.setItem('todoHistory', JSON.stringify(history));
    }

    function filterTasks(filter) {
        currentFilter = filter;

        // 更新过滤按钮状态
        filterBtns.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 重新加载任务
        loadTasks();
    }

    function clearCompletedTasks() {
        const tasks = getTasks();

        // 过滤掉已完成的任务
        const updatedTasks = tasks.filter(task => !task.completed);

        saveTasks(updatedTasks);

        // 重新加载任务
        loadTasks();

        // 更新任务计数
        updateTaskCount();
    }

    function updateTaskCount() {
        const tasks = getTasks();
        const activeTasks = tasks.filter(task => !task.completed);

        taskCount.textContent = `${activeTasks.length} 个任务`;
    }

    function setCurrentDate() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        dateElement.textContent = now.toLocaleDateString('zh-CN', options);
    }

    function getTasks() {
        const tasks = localStorage.getItem('todoTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    function saveTasks(tasks) {
        localStorage.setItem('todoTasks', JSON.stringify(tasks));
    }

    function escapeHtml(text) {
        // 防止XSS攻击的HTML转义
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});