const pool = require('../db');

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Fetch user from DB
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // 3. Check if password matches (plaintext — NOT safe for prod)
    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 4. Check if user is inactive
    if (user.status.toLowerCase() !== 'active') {
      return res.status(403).json({ message: 'User is inactive. Please contact the administrator.' });
    }

    // 5. Remove password before responding
    delete user.password;

    // 6. Return safe user object
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        status: user.status,
        team_id: user.team_id,
        is_active: user.status.toLowerCase() === 'active'
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { loginUser };
