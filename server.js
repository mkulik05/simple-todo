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


const parseCookieHeader = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const authenticateSocket = async (socket, next) => {
  try {
    // Read token from cookies first; fallback to auth payload for backward compatibility
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const token = cookies.token || socket.handshake.auth.token;
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

    socket.emit('tasks:loaded', taskStore.getAll(socket.userId));
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
      
      const task = taskStore.create(socket.userId, { title, dueDate, files });
      

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
      const updated = taskStore.toggleStatus(socket.userId, Number(taskId));
      
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
      const deleted = taskStore.remove(socket.userId, Number(taskId));
      
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
      const tasks = taskStore.getAll(socket.userId, status);
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

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const result = await userStore.login(username, password);
    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    return res.json({ user: result.user });
  } catch (e) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/me', (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const decoded = userStore.verifyToken(token);
    const user = userStore.getUserById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    return res.json({ user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out' });
});
