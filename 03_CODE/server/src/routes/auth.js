const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { comparePassword } = require('../utils/password');
const auth = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);
    if (!user) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });

    const token = jwt.sign(
      { id: user.id, role: user.role, team_id: user.team_id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ token, role: user.role, name: user.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
