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
let authToken = null;

const graphqlRequest = async (query, variables = {}) => {
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(json.errors[0].message || 'GraphQL error');
  }
  return json.data;
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
      const data = await graphqlRequest(
        `mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) { user { id username createdAt } token }
        }`,
        { username, password }
      );
      currentUser = data.login.user;
      authToken = data.login.token;
      localStorage.setItem('authToken', authToken);
      showMainContent();
      await loadTasks();
    } else {
      await graphqlRequest(
        `mutation Register($username: String!, $password: String!) { register(username: $username, password: $password) { id username } }`,
        { username, password }
      );
      showAuthMessage("Регистрация успешна! Теперь войдите в систему.", "success");
      setTimeout(() => {
        switchAuthMode();
      }, 2000);
    }
  } catch (error) {
    console.error("Auth error:", error);
    showAuthMessage("Произошла ошибка при подключении к серверу");
  }
};

const logout = async () => {
  try {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
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
  try {
    const status = filterSelect.value;
    const data = await graphqlRequest(
      `query Tasks($status: TaskStatus) { tasks(status: $status) { id title dueDate status files { filename originalName size mimeType } } }`,
      { status: status === 'all' ? null : status }
    );
    displayTasks(data.tasks);
  } catch (error) {
    console.error("Error loading tasks:", error);
  }
};

const toggleStatus = async id => {
  try {
    await graphqlRequest(
      `mutation Toggle($id: ID!) { toggleTask(id: $id) { id status } }`,
      { id: String(id) }
    );
    await loadTasks();
  } catch (error) {
    console.error("Error toggling status:", error);
  }
};

const deleteTask = async id => {
  try {
    await graphqlRequest(
      `mutation Delete($id: ID!) { deleteTask(id: $id) }`,
      { id: String(id) }
    );
    await loadTasks();
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};

taskForm.addEventListener("submit", async e => {
  e.preventDefault();
  
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
    
    await graphqlRequest(
      `mutation Create($title: String!, $dueDate: String!, $files: [FileInput!]) { createTask(title: $title, dueDate: $dueDate, files: $files) { id } }`,
      { title, dueDate, files: uploadedFiles }
    );
    taskForm.reset();
    await loadTasks();
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

const checkAuthToken = async () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    authToken = token;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUser = { id: payload.id, username: payload.username };
    } catch (error) {
      console.error('Error decoding token:', error);
      localStorage.removeItem('authToken');
      showAuthModal();
      return;
    }
    showMainContent();
    await loadTasks();
  } else {
    showAuthModal();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuthToken();
});
