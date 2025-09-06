const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// In-memory user storage (in production, use a database)
const users = [];

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'rhweriwjfioejwijfwioejfiw';
const JWT_EXPIRES_IN = '24h';

class UserStore {
  // Register a new user
  async register(username, password) {
    // Check if user already exists
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }

  // Authenticate user login
  async login(username, password) {
    // Find user by username
    const user = users.find(u => u.username === username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
      token
    };
  }

  // Get user by ID
  getUserById(id) {
    return users.find(user => user.id === id);
  }

  // Get user by username
  getUserByUsername(username) {
    return users.find(user => user.username === username);
  }

  // Get all users (for debugging)
  getAllUsers() {
    return users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    }));
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new UserStore();
