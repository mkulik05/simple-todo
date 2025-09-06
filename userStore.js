const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const users = [];

const JWT_SECRET = process.env.JWT_SECRET || 'rhweriwjfioejwijfwioejfiw';
const JWT_EXPIRES_IN = '24h';

class UserStore {
  async register(username, password) {
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }

  async login(username, password) {
    const user = users.find(u => u.username === username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

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

  getUserById(id) {
    return users.find(user => user.id === id);
  }

  getUserByUsername(username) {
    return users.find(user => user.username === username);
  }

  getAllUsers() {
    return users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    }));
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new UserStore();
