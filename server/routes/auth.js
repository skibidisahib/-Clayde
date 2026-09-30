import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/init.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register', (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);

  db.run(
    `INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`,
    [email, hashedPassword, name, role || 'creator'],
    function (err) {
      if (err) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const token = jwt.sign({ user_id: this.lastID, email }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.json({
        message: 'User registered successfully',
        user_id: this.lastID,
        token,
      });
    }
  );
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const isValidPassword = bcryptjs.compareSync(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ user_id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Login successful',
      user_id: user.id,
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });
});

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user_id = decoded.user_id;
    next();
  });
}

export default router;
