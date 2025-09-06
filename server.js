const express = require("express");
const multer = require("./upload");
const path = require("path");
const taskStore = require("./taskStore");
const userStore = require("./userStore");
const { authMiddleware } = require("./authMiddleware");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }
    
    const user = await userStore.register(username, password);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    const result = await userStore.login(username, password);
    
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });
    
    res.status(200).json({ 
      message: "Login successful", 
      user: result.user 
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: "Logout successful" });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.status(200).json({ user: req.user });
});

app.get("/api/tasks", authMiddleware, (req, res) => {
  const { status } = req.query;
  const tasks = taskStore.getAll(req.user.id, status);
  res.status(200).json(tasks);
});

app.post("/api/tasks", authMiddleware, multer.array("file", 10), (req, res) => {
  const { title, dueDate } = req.body;
  if (!title || !dueDate) return res.status(400).json({ error: "Title and dueDate required" });

  const files = (req.files || []).map(f => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    mimeType: f.mimetype
  }));

  const task = taskStore.create(req.user.id, { title, dueDate, files });
  res.status(201).json(task);
});

app.put("/api/tasks/:id/status", authMiddleware, (req, res) => {
  const updated = taskStore.toggleStatus(req.user.id, Number(req.params.id));
  if (!updated) return res.status(404).json({ error: "Task not found" });
  res.status(200).json(updated);
});

app.delete("/api/tasks/:id", authMiddleware, (req, res) => {
  const deleted = taskStore.remove(req.user.id, Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: "Task not found" });
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
