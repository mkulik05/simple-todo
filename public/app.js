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
    const endpoint = isLoginMode ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      if (isLoginMode) {
        currentUser = data.user;
        showMainContent();
        loadTasks();
      } else {
        showAuthMessage("Регистрация успешна! Теперь войдите в систему.", "success");
        setTimeout(() => {
          switchAuthMode();
        }, 2000);
      }
    } else {
      showAuthMessage(data.error || "Произошла ошибка");
    }
  } catch (error) {
    console.error("Auth error:", error);
    showAuthMessage("Произошла ошибка при подключении к серверу");
  }
};

const logout = async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
    currentUser = null;
    authInfo.style.display = "none";
    mainContent.style.display = "none";
    showAuthModal();
  } catch (error) {
    console.error("Logout error:", error);
  }
};

const authenticatedFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });
  
  if (res.status === 401) {
    currentUser = null;
    authInfo.style.display = "none";
    mainContent.style.display = "none";
    showAuthModal();
    throw new Error("Unauthorized");
  }
  
  return res;
};

const loadTasks = async () => {
  try {
    const status = filterSelect.value;
    const res = await authenticatedFetch(`/api/tasks?status=${status}`);
    const tasks = await res.json();
    displayTasks(tasks);
  } catch (error) {
    console.error("Error loading tasks:", error);
  }
};

const toggleStatus = async id => {
  try {
    await authenticatedFetch(`/api/tasks/${id}/status`, { method: "PUT" });
    loadTasks();
  } catch (error) {
    console.error("Error toggling status:", error);
  }
};

const deleteTask = async id => {
  try {
    await authenticatedFetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};

taskForm.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const formData = new FormData(taskForm);
    await authenticatedFetch("/api/tasks", { method: "POST", body: formData });
    taskForm.reset();
    loadTasks();
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

const checkAuthStatus = async () => {
  try {
    const userRes = await fetch('/api/me', {
      credentials: 'include'
    });
    
    if (userRes.ok) {
      const userData = await userRes.json();
      currentUser = userData.user;
      
      const status = filterSelect.value;
      const tasksRes = await fetch(`/api/tasks?status=${status}`, {
        credentials: 'include'
      });
      
      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        showMainContent();
        displayTasks(tasks);
      } else {
        showMainContent();
        displayTasks([]);
      }
    } else if (userRes.status === 401) {
      // User is not authenticated, show auth modal
      showAuthModal();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showAuthModal();
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

document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
});
