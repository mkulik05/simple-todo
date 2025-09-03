const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
};

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  log("info", "Uploads directory created", { path: uploadsDir });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeName = base.replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${Date.now()}_${safeName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
}).array("file", 10);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadsDir));

let tasks = [];

app.get("/", (req, res) => {
  const filter = req.query.status || "all";
  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
  res.render("index", { tasks: filtered, filter });
});

app.post("/add", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      log("error", "File upload failed", { error: err.message });
      return res.status(400).send("Upload error: " + err.message);
    }

    const { title, dueDate } = req.body;
    if (!title?.trim()) return res.status(400).send("Title is required");
    if (!dueDate) return res.status(400).send("Due date is required");

    const filesInfo = (req.files || []).map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
      path: f.path
    }));

    const newTask = {
      id: Date.now(),
      title: title.trim(),
      status: "pending",
      dueDate,
      files: filesInfo.map(f => f.filename),
      fileInfo: filesInfo,
      createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    log("info", "Task created", { taskId: newTask.id, fileCount: filesInfo.length });

    res.redirect("/");
  });
});

app.post("/update/:id", (req, res) => {
  const { id } = req.params;
  const task = tasks.find(t => t.id == id);
  if (task) {
    task.status = task.status === "pending" ? "done" : "pending";
    task.updatedAt = new Date().toISOString();
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  log("info", `Server running on http://localhost:${PORT}`);
});
