let tasksByUser = {};

module.exports = {
  getAll: (userId, status) => {
    const userTasks = tasksByUser[userId] || [];
    if (!status || status === "all") return userTasks;
    return userTasks.filter(t => t.status === status);
  },

  create: (userId, { title, dueDate, files }) => {
    const newTask = {
      id: Date.now(),
      title: title.trim(),
      dueDate,
      status: "pending",
      files,
      createdAt: new Date().toISOString()
    };

    if (!tasksByUser[userId]) {
      tasksByUser[userId] = [];
    }
    tasksByUser[userId].push(newTask);
    return newTask;
  },

  toggleStatus: (userId, id) => {
    const userTasks = tasksByUser[userId] || [];
    const task = userTasks.find(t => t.id === id);
    if (!task) return null;

    task.status = task.status === "pending" ? "done" : "pending";
    task.updatedAt = new Date().toISOString();
    return task;
  },

  remove: (userId, id) => {
    const userTasks = tasksByUser[userId] || [];
    const idx = userTasks.findIndex(t => t.id === id);
    if (idx === -1) return false;

    userTasks.splice(idx, 1);
    return true;
  }
};
