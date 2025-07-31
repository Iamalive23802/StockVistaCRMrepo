const { query } = require('../db');

const normalizePhone = (p) => (p || '').replace(/\D/g, '').trim();

// Get all users with team name
const getAllUsers = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*, t.name AS team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      ORDER BY u.display_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[❌ getAllUsers Error]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const addUser = async (req, res) => {
  const {
    displayName,
    email,
    phoneNumber,
    password,
    role,
    status,
    team_id
  } = req.body;

  try {
    const phoneNorm = normalizePhone(phoneNumber);
    const existing = await query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phoneNorm]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this phone number already exists' });
    }

    const safeTeamId = team_id?.trim() === '' ? null : team_id;

    const result = await query(
      `INSERT INTO users
        (display_name, email, phone_number, password, role, status, team_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [displayName, email, phoneNorm, password, role, status, safeTeamId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[❌ addUser Error]', err);
    res.status(500).json({ error: 'Failed to add user' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    displayName,
    email,
    phoneNumber,
    password,
    role,
    status,
    team_id
  } = req.body;

  try {
    const phoneNorm = normalizePhone(phoneNumber);
    const existing = await query(
      'SELECT id FROM users WHERE phone_number = $1 AND id <> $2',
      [phoneNorm, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this phone number already exists' });
    }

    const safeTeamId = team_id?.trim() === '' ? null : team_id;

    const result = await query(
      `UPDATE users SET
        display_name = $1,
        email = $2,
        phone_number = $3,
        password = $4,
        role = $5,
        status = $6,
        team_id = $7
       WHERE id = $8 RETURNING *`,
      [displayName, email, phoneNorm, password, role, status, safeTeamId, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[❌ updateUser Error]', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user by ID
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('[❌ deleteUser Error]', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// ✅ Bulk inactivate users (best practice)
const bulkInactivateUsers = async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds must be a non-empty array' });
  }

  try {
    const placeholders = userIds.map((_, idx) => `$${idx + 1}`).join(',');
    const queryText = `UPDATE users SET status = 'Inactive' WHERE id IN (${placeholders})`;
    await query(queryText, userIds);
    res.json({ success: true, updatedCount: userIds.length });
  } catch (err) {
    console.error('[❌ bulkInactivateUsers Error]', err);
    res.status(500).json({ error: 'Failed to inactivate users' });
  }
};

// Export all
module.exports = {
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  bulkInactivateUsers
};
