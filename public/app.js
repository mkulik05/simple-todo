const taskForm = document.getElementById("taskForm");
const taskGrid = document.getElementById("tasks");
const filterSelect = document.getElementById("filterSelect");

const loadTasks = async () => {
  const status = filterSelect.value;
  const res = await fetch(`/api/tasks?status=${status}`);
  const tasks = await res.json();
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

const toggleStatus = async id => {
  await fetch(`/api/tasks/${id}/status`, { method: "PUT" });
  loadTasks();
};

const deleteTask = async id => {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  loadTasks();
};

taskForm.addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(taskForm);
  await fetch("/api/tasks", { method: "POST", body: formData });
  taskForm.reset();
  loadTasks();
});

filterSelect.addEventListener("change", loadTasks);

loadTasks();
