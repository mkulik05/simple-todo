const taskStore = require('./taskStore');
const userStore = require('./userStore');

function requireAuth(context) {
  if (!context.user) {
    throw new Error('Authentication required');
  }
}

module.exports = {
  me: (args, context) => {
    return context.user || null;
  },

  tasks: ({ status }, context) => {
    requireAuth(context);
    // status may be undefined or one of 'pending' | 'done'
    return taskStore.getAll(status);
  },

  register: async ({ username, password }) => {
    const user = await userStore.register(username, password);
    return user;
  },

  login: async ({ username, password }) => {
    const result = await userStore.login(username, password);
    return { user: result.user, token: result.token };
  },

  createTask: ({ title, dueDate, files }, context) => {
    requireAuth(context);
    const task = taskStore.create({ title, dueDate, files: files || [] });
    return task;
  },

  toggleTask: ({ id }, context) => {
    requireAuth(context);
    const updated = taskStore.toggleStatus(Number(id));
    if (!updated) {
      throw new Error('Task not found');
    }
    return updated;
  },

  deleteTask: ({ id }, context) => {
    requireAuth(context);
    const success = taskStore.remove(Number(id));
    if (!success) {
      throw new Error('Task not found');
    }
    return true;
  }
};


