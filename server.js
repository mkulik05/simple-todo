const express = require("express");
const multer = require("./upload");
const path = require("path");
const taskStore = require("./taskStore");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/tasks", (req, res) => {
  const { status } = req.query;
  const tasks = taskStore.getAll(status);
  res.status(200).json(tasks);
});

app.post("/api/tasks", multer.array("file", 10), (req, res) => {
  const { title, dueDate } = req.body;
  if (!title || !dueDate) return res.status(400).json({ error: "Title and dueDate required" });

  const files = (req.files || []).map(f => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    mimeType: f.mimetype
  }));

  const task = taskStore.create({ title, dueDate, files });
  res.status(201).json(task);
});

app.put("/api/tasks/:id/status", (req, res) => {
  const updated = taskStore.toggleStatus(Number(req.params.id));
  if (!updated) return res.status(404).json({ error: "Task not found" });
  res.status(200).json(updated);
});

app.delete("/api/tasks/:id", (req, res) => {
  const deleted = taskStore.remove(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: "Task not found" });
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
