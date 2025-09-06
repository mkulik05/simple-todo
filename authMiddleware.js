const userStore = require('./userStore');

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }

  try {
    const decoded = userStore.verifyToken(token);
    const user = userStore.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }
    
    req.user = {
      id: user.id,
      username: user.username
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
}

module.exports = { authMiddleware };
