const express = require("express");
const http = require("http");
const multer = require("./upload");
const path = require("path");
const cookieParser = require("cookie-parser");
const { graphqlHTTP } = require('express-graphql');
const schema = require('./schema');
const resolvers = require('./resolvers');
const userStore = require('./userStore');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// Simple auth context middleware for GraphQL
function buildContext(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { user: null };
  }
  try {
    const decoded = userStore.verifyToken(token);
    const user = userStore.getUserById(decoded.id);
    if (!user) return { user: null };
    return { user: { id: user.id, username: user.username, createdAt: user.createdAt } };
  } catch (e) {
    return { user: null };
  }
}

app.use('/graphql', graphqlHTTP((req) => ({
  schema,
  rootValue: resolvers,
  context: buildContext(req),
  graphiql: true
})));

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
