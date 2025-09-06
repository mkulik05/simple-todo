const taskForm = document.getElementById("taskForm");
const taskGrid = document.getElementById("tasks");
const filterSelect = document.getElementById("filterSelect");

const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const modalTitle = document.getElementById("modalTitle");
const submitBtn = document.getElementById("submitBtn");
const switchModeBtn = document.getElementById("switchModeBtn");
const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
const authMessage = document.getElementById("authMessage");
const closeModal = document.getElementById("closeModal");
const authInfo = document.getElementById("authInfo");
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");
const mainContent = document.getElementById("mainContent");

let isLoginMode = true;
let currentUser = null;
let socket = null;
let authToken = null;

const initializeSocket = () => {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io();
  
  socket.on('connect', () => {
    console.log('Connected to server');
    if (currentUser) {
      showMainContent();
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    if (error.message.includes('Authentication error')) {
      showAuthMessage('Ошибка аутентификации. Пожалуйста, войдите заново.');
      logout();
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
  
  socket.on('tasks:loaded', (tasks) => {
    displayTasks(tasks);
  });
  
  socket.on('task:created', (task) => {
    loadTasks();
  });
  
  socket.on('task:updated', (task) => {
    loadTasks();
  });
  
  socket.on('task:deleted', (data) => {
    loadTasks();
  });
};

const showAuthModal = () => {
  if (authModal) {
    authModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }
};

const hideAuthModal = () => {
  authModal.style.display = "none";
  document.body.style.overflow = "auto";
  authForm.reset();
  hideAuthMessage();
};

const showAuthMessage = (message, type = "error") => {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
  authMessage.style.display = "block";
};

const hideAuthMessage = () => {
  authMessage.style.display = "none";
};

const switchAuthMode = () => {
  isLoginMode = !isLoginMode;
  modalTitle.textContent = isLoginMode ? "Вход" : "Регистрация";
  submitBtn.textContent = isLoginMode ? "Войти" : "Зарегистрироваться";
  switchModeBtn.textContent = isLoginMode ? "Регистрация" : "Вход";
  confirmPasswordGroup.style.display = isLoginMode ? "none" : "block";
  hideAuthMessage();
};


const showMainContent = () => {
  authInfo.style.display = "flex";
  mainContent.style.display = "block";
  userInfo.textContent = `Привет, ${currentUser.username}!`;
  hideAuthModal();
};

const handleAuth = async (e) => {
  e.preventDefault();
  hideAuthMessage();
  
  const formData = new FormData(authForm);
  const username = formData.get("username");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  
  if (!isLoginMode && password !== confirmPassword) {
    showAuthMessage("Пароли не совпадают");
    return;
  }
  
  try {
    if (isLoginMode) {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        showAuthMessage(data.message || 'Ошибка входа');
        return;
      }
      const data = await resp.json();
      currentUser = data.user;
      initializeSocket();
      showMainContent();
    } else {
      const tempSocket = io();
      tempSocket.emit('auth:register', { username, password }, (response) => {
        if (response.error) {
          showAuthMessage(response.error);
          tempSocket.disconnect();
          return;
        }
        showAuthMessage("Регистрация успешна! Теперь войдите в систему.", "success");
        setTimeout(() => {
          switchAuthMode();
        }, 2000);
        tempSocket.disconnect();
      });
    }
    
  } catch (error) {
    console.error("Auth error:", error);
    showAuthMessage("Произошла ошибка при подключении к серверу");
  }
};

const logout = async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
    if (socket) socket.disconnect();
    currentUser = null;
    authToken = null;
    authInfo.style.display = "none";
    mainContent.style.display = "none";
    showAuthModal();
  } catch (error) {
    console.error("Logout error:", error);
  }
};

const displayTasks = (tasks) => {
  taskGrid.innerHTML = "";

  if (tasks.length === 0) {
    taskGrid.innerHTML = "<p>Нет задач</p>";
    return;
  }

  tasks.forEach(task => {
    const card = document.createElement("div");
    card.className = `task-card ${task.status === "done" ? "task-done" : "task-pending"}`;

    card.innerHTML = `
      <div class="task-header">
        <h3 class="task-title">${task.title}</h3>
        <span class="task-status ${task.status === "done" ? "status-done" : "status-pending"}">
          ${task.status === "done" ? "Выполнено" : "В ожидании"}
        </span>
      </div>
      <div class="task-details">
        <div class="task-info">
          <span class="task-date">До: ${new Date(task.dueDate).toLocaleDateString("ru-RU")}</span>
          ${task.files && task.files.length
            ? `<div class="task-files">${task.files.map((f, i) => `
                <a href="/uploads/${f.filename}" target="_blank" class="task-file">
                  📎 File${i + 1}
                </a>
              `).join("")}</div>`
            : ""}
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary" onclick="toggleStatus(${task.id})">
            ${task.status === "done" ? "Отменить" : "Выполнить"}
          </button>
          <button class="btn btn-secondary" onclick="deleteTask(${task.id})">Удалить</button>
        </div>
      </div>
    `;
    taskGrid.appendChild(card);
  });
};

const loadTasks = async () => {
  if (!socket) return;
  
  try {
    const status = filterSelect.value;
    socket.emit('tasks:filter', { status }, (response) => {
      if (response.error) {
        console.error("Error loading tasks:", response.error);
        return;
      }
      displayTasks(response.tasks);
    });
  } catch (error) {
    console.error("Error loading tasks:", error);
  }
};

const toggleStatus = async id => {
  if (!socket) return;
  
  try {
    socket.emit('task:toggleStatus', { taskId: id }, (response) => {
      if (response.error) {
        console.error("Error toggling status:", response.error);
        return;
      }
    });
  } catch (error) {
    console.error("Error toggling status:", error);
  }
};

const deleteTask = async id => {
  if (!socket) return;
  
  try {
    socket.emit('task:delete', { taskId: id }, (response) => {
      if (response.error) {
        console.error("Error deleting task:", response.error);
        return;
      }
    });
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};

taskForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!socket) return;
  
  try {
    const formData = new FormData(taskForm);
    const title = formData.get("title");
    const dueDate = formData.get("dueDate");
    const files = formData.getAll("file");
    
    let uploadedFiles = [];
    if (files.length > 0 && files[0].size > 0) {
      const uploadFormData = new FormData();
      files.forEach(file => {
        if (file.size > 0) {
          uploadFormData.append("file", file);
        }
      });
      
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData
      });
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        uploadedFiles = uploadResult.files;
      }
    }
    
    socket.emit('task:create', { 
      title, 
      dueDate, 
      files: uploadedFiles 
    }, (response) => {
      if (response.error) {
        console.error("Error creating task:", response.error);
        return;
      }
      taskForm.reset();
    });
  } catch (error) {
    console.error("Error creating task:", error);
  }
});

filterSelect.addEventListener("change", loadTasks);

authForm.addEventListener("submit", handleAuth);
switchModeBtn.addEventListener("click", switchAuthMode);
closeModal.addEventListener("click", hideAuthModal);
logoutBtn.addEventListener("click", logout);

window.addEventListener("click", (e) => {
  if (e.target === authModal) {
    hideAuthModal();
  }
});

const checkAuth = async () => {
  try {
    const resp = await fetch('/api/me');
    if (!resp.ok) {
      showAuthModal();
      return;
    }
    const data = await resp.json();
    currentUser = data.user;
    initializeSocket();
  } catch (e) {
    showAuthModal();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
