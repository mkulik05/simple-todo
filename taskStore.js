let tasks = [];

module.exports = {
  getAll: (status) => {
    if (!status || status === "all") return tasks;
    return tasks.filter(t => t.status === status);
  },
  create: ({ title, dueDate, files }) => {
    const newTask = {
      id: Date.now(),
      title: title.trim(),
      dueDate,
      status: "pending",
      files,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    return newTask;
  },
  toggleStatus: (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return null;
    task.status = task.status === "pending" ? "done" : "pending";
    task.updatedAt = new Date().toISOString();
    return task;
  },
  remove: (id) => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    tasks.splice(idx, 1);
    return true;
  }
};
