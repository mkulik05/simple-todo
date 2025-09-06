const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("./upload");
const path = require("path");
const taskStore = require("./taskStore");
const userStore = require("./userStore");
const { authMiddleware } = require("./authMiddleware");
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));


const connectedUsers = new Map();


const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {

      return next();
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rhweriwjfioejwijfwioejfiw');
    const user = await userStore.getUserById(decoded.id);
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.userId = user.id;
    socket.username = user.username;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};


io.use(authenticateSocket);


io.on('connection', (socket) => {
  if (socket.userId) {
    console.log(`User ${socket.username} connected`);

    connectedUsers.set(socket.userId, socket);

    socket.emit('tasks:loaded', taskStore.getAll());
  } else {
    console.log('Unauthenticated user connected');
  }
  

  socket.on('auth:register', async (data, callback) => {
    try {
      const { username, password } = data;
      
      if (!username || !password) {
        return callback({ error: "Username and password are required" });
      }
      
      if (password.length < 6) {
        return callback({ error: "Password must be at least 6 characters long" });
      }
      
      const user = await userStore.register(username, password);
      callback({ message: "User registered successfully", user });
    } catch (error) {
      callback({ error: error.message });
    }
  });
  

  socket.on('auth:login', async (data, callback) => {
    try {
      const { username, password } = data;
      
      if (!username || !password) {
        return callback({ error: "Username and password are required" });
      }
      
      const result = await userStore.login(username, password);
      

      socket.userId = result.user.id;
      socket.username = result.user.username;
      connectedUsers.set(socket.userId, socket);
      
      callback({ 
        message: "Login successful", 
        user: result.user,
        token: result.token
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });
  

  socket.on('auth:logout', (callback) => {
    connectedUsers.delete(socket.userId);
    socket.disconnect();
    callback({ message: "Logout successful" });
  });
  

  socket.on('task:create', async (data, callback) => {
    if (!socket.userId) {
      return callback({ error: "Authentication required" });
    }
    
    try {
      const { title, dueDate, files } = data;
      
      if (!title || !dueDate) {
        return callback({ error: "Title and dueDate required" });
      }
      
      const task = taskStore.create({ title, dueDate, files });
      

      io.emit('task:created', task);
      callback({ success: true, task });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('task:toggleStatus', (data, callback) => {
    if (!socket.userId) {
      return callback({ error: "Authentication required" });
    }
    
    try {
      const { taskId } = data;
      const updated = taskStore.toggleStatus(Number(taskId));
      
      if (!updated) {
        return callback({ error: "Task not found" });
      }

      io.emit('task:updated', updated);
      callback({ success: true, task: updated });
    } catch (error) {
      callback({ error: error.message });
    }
  });
  
  socket.on('task:delete', (data, callback) => {
    if (!socket.userId) {
      return callback({ error: "Authentication required" });
    }
    
    try {
      const { taskId } = data;
      const deleted = taskStore.remove(Number(taskId));
      
      if (!deleted) {
        return callback({ error: "Task not found" });
      }
      

      io.emit('task:deleted', { taskId: Number(taskId) });
      callback({ success: true });
    } catch (error) {
      callback({ error: error.message });
    }
  });
  

  socket.on('tasks:filter', (data, callback) => {
    if (!socket.userId) {
      return callback({ error: "Authentication required" });
    }
    
    try {
      const { status } = data;
      const tasks = taskStore.getAll(status);
      callback({ tasks });
    } catch (error) {
      callback({ error: error.message });
    }
  });
  

  socket.on('disconnect', () => {
    console.log(`User ${socket.username} disconnected`);
    connectedUsers.delete(socket.userId);
  });
});


app.post("/api/upload", multer.array("file", 10), (req, res) => {
  const files = (req.files || []).map(f => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    mimeType: f.mimetype
  }));
  res.json({ files });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
