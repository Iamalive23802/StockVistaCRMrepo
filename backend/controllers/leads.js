const pool = require('../db');
const multer = require('multer');
const Papa = require('papaparse');
const fetch = require('node-fetch');

const upload = multer({ storage: multer.memoryStorage() });

const normalizePhone = (p) => (p || '').replace(/\D/g, '').trim();

const getLeads = async (req, res) => {
  const { role, user_id } = req.query;

  try {
    let result;

    if (role === 'relationship_mgr') {
      result = await pool.query(
        `SELECT l.*, u.display_name AS assigned_user_name, u.role AS assigned_user_role
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         WHERE l.assigned_to = $1
         ORDER BY l.date DESC`,
        [user_id]
      );
    } else if (role === 'financial_manager') {
      result = await pool.query(
        `SELECT l.*, u.display_name AS assigned_user_name, u.role AS assigned_user_role
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         ORDER BY l.date DESC`
      );
    } else if (role === 'team_leader') {
      const teamRes = await pool.query(
        'SELECT team_id FROM users WHERE id = $1',
        [user_id]
      );
      const teamId = teamRes.rows[0]?.team_id;

      if (teamId) {
        result = await pool.query(
          `SELECT l.*, u.display_name AS assigned_user_name, u.role AS assigned_user_role
           FROM leads l
           LEFT JOIN users u ON l.assigned_to = u.id
           WHERE l.team_id = $1
           ORDER BY l.date DESC`,
          [teamId]
        );
      } else {
        result = { rows: [] };
      }
    } else if (role === 'admin') {
      result = await pool.query(
        `SELECT l.*, u.display_name AS assigned_user_name, u.role AS assigned_user_role
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         WHERE u.role = ANY('{relationship_mgr,financial_manager}')
         ORDER BY l.date DESC`
      );
    } else {
      result = await pool.query(
        `SELECT l.*, u.display_name AS assigned_user_name, u.role AS assigned_user_role
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         ORDER BY l.date DESC`
      );
        console.log(`✅ Super Admin fetched ${result.rows.length} leads`);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch leads:', err.message);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

const addLead = async (req, res) => {
  const {
    fullName,
    email,
    phone,
    altNumber,
    notes,
    deematAccountName,
    profession,
    stateName,
    capital,
    segment,
    team_id
  } = req.body;
  const { role, user_id } = req.query;

  if (!fullName || !email || !phone) {
    return res.status(400).json({ error: 'Full name, email, and phone are required' });
  }

  const phoneNorm = normalizePhone(phone);

  try {
    const existing = await pool.query('SELECT id FROM leads WHERE phone = $1', [phoneNorm]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Lead with this phone number already exists' });
    }

    let assignedTo = null;
    let finalTeamId = team_id;

  if (role === 'relationship_mgr' || role === 'financial_manager') {
    assignedTo = user_id;
    if (!finalTeamId) {
      const rm = await pool.query('SELECT team_id FROM users WHERE id = $1', [user_id]);
      finalTeamId = rm.rows[0]?.team_id || null;
    }
  }

    const safeTeamId = finalTeamId && finalTeamId.trim() !== '' ? finalTeamId : null;
    const safeAssignedTo = assignedTo && assignedTo.trim() !== '' ? assignedTo : null;

    const result = await pool.query(
      `INSERT INTO leads (full_name, email, phone, alt_number, notes, deemat_account_name, profession, state_name, capital, segment, team_id, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        fullName,
        email,
        phoneNorm,
        altNumber || '',
        notes || '',
        deematAccountName || '',
        profession || '',
        stateName || '',
        capital || '',
        segment || '',
        safeTeamId,
        safeAssignedTo
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to add lead:', err.message);
    res.status(500).json({ error: 'Failed to add lead' });
  }
};

const updateLead = async (req, res) => {
  const { id } = req.params;
  const {
    fullName, email, phone, alt_number, notes, deemat_account_name,
    profession, state_name, capital, segment, gender, dob, age,
    pan_card_number, aadhar_card_number, payment_history, status,
    team_id, assigned_to
  } = req.body;

  try {
    console.log('Updating lead ID:', id);
    console.log('Payload:', req.body); // ✅ log the full payload

    if (!fullName || !email || !phone || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
  `UPDATE leads SET
    full_name = $1, email = $2, phone = $3, alt_number = $4, notes = $5,
    deemat_account_name = $6, profession = $7, state_name = $8, capital = $9,
    segment = $10, gender = $11, dob = $12, age = $13, pan_card_number = $14,
    aadhar_card_number = $15, payment_history = $16, status = $17, 
    team_id = $18, assigned_to = $19
   WHERE id = $20 RETURNING *`,
  [
    fullName,
    email,
    phone,
    alt_number || '',
    notes || '',
    deemat_account_name || '',
    profession || '',
    state_name || '',
    capital || '',
    segment || '',
    gender || '',
    dob?.trim() === '' ? null : dob, 
    isNaN(Number(age)) ? null : Number(age), 
    pan_card_number || '',
    aadhar_card_number || '',
    payment_history || '',
    status,
    team_id || null,
    assigned_to || null,
    id
  ]
);

    console.log('Update success:', result.rows[0]);
    res.json(result.rows[0]);

  } catch (err) {
    console.error('[❌ updateLead Error]', err); 
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

const assignLead = async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  if (!assigned_to) {
    return res.status(400).json({ error: 'Missing assigned_to value' });
  }

  try {
    const userRes = await pool.query(
      'SELECT team_id FROM users WHERE id = $1',
      [assigned_to]
    );
    const userTeamId = userRes.rows[0]?.team_id || null;

    const result = await pool.query(
      `UPDATE leads
       SET assigned_to = $1,
           team_id = COALESCE(team_id, $2)
       WHERE id = $3
       RETURNING *`,
      [assigned_to, userTeamId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead assigned successfully', lead: result.rows[0] });
  } catch (err) {
    console.error('❌ Failed to assign lead:', err.message);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
};

const deleteLead = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM leads WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('❌ Failed to delete lead:', err.message);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
};

const uploadLeads = [
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const totalParsed = data.length;
    let validCount = 0;

    const client = await pool.connect();
    try {
      const existingPhonesRes = await client.query('SELECT phone FROM leads');
      const existingPhones = new Set(existingPhonesRes.rows.map(r => normalizePhone(r.phone)));
      const sheetPhones = new Set();

      await client.query('BEGIN');
      for (const row of data) {
        const fullName = row['Full Name'] || row.fullName || '';
        const email = row['Email'] || row.email || '';
        const phone = normalizePhone(row['Phone'] || row.phone || '');
        const altNumber = row['Alternate Number'] || row.altNumber || '';
        const notes = row['Notes'] || row.notes || '';
        const deematAccountName = row['Deemat Account Name'] || row.deematAccountName || '';
        const profession = row['Profession'] || row.profession || '';
        const stateName = row['State Name'] || row.stateName || '';
        const capital = row['Capital'] || row.capital || '';
        const segment = row['Segment'] || row.segment || '';
        const team_id = row['Team ID'] || row.team_id || null;

        const safeTeamId = team_id && team_id.trim() !== '' ? team_id : null;

        if (!fullName || !email || !phone) continue;
        if (existingPhones.has(phone)) continue;
        if (sheetPhones.has(phone)) continue;

        validCount++;

        await client.query(
          `INSERT INTO leads (full_name, email, phone, alt_number, notes, deemat_account_name, profession, state_name, capital, segment, team_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            fullName,
            email,
            phone,
            altNumber,
            notes,
            deematAccountName,
            profession,
            stateName,
            capital,
            segment,
            safeTeamId
          ]
        );

        sheetPhones.add(phone);
      }
      await client.query('COMMIT');
      console.log(`📊 Parsed: ${totalParsed}, ✅ Inserted: ${validCount}`);
      res.status(201).json({
        message: 'Leads uploaded successfully (duplicates skipped)',
        totalParsed,
        validInserted: validCount
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to upload leads:', err.message);
      res.status(500).json({ error: 'Failed to upload leads' });
    } finally {
      client.release();
    }
  }
];

const googleSheetsUpload = async (req, res) => {
  const { sheetLink } = req.body;

  if (!sheetLink || !sheetLink.includes('docs.google.com/spreadsheets')) {
    return res.status(400).json({ error: 'Invalid Google Sheets link' });
  }

  try {
    const match = sheetLink.match(/\/d\/(.*?)\//);
    if (!match) {
      return res.status(400).json({ error: 'Could not parse Google Sheets link' });
    }

    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch data from Google Sheets');
    }

    const csvData = await response.text();
    const { data } = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const totalParsed = data.length;
    let validCount = 0;

    const client = await pool.connect();
    try {
      const existingPhonesRes = await client.query('SELECT phone FROM leads');
      const existingPhones = new Set(existingPhonesRes.rows.map(r => normalizePhone(r.phone)));
      const sheetPhones = new Set();

      await client.query('BEGIN');
      for (const row of data) {
        const fullName = row['Full Name'] || row.fullName || '';
        const email = row['Email'] || row.email || '';
        const phone = normalizePhone(row['Phone'] || row.phone || '');
        const altNumber = row['Alternate Number'] || row.altNumber || '';
        const notes = row['Notes'] || row.notes || '';
        const deematAccountName = row['Deemat Account Name'] || row.deematAccountName || '';
        const profession = row['Profession'] || row.profession || '';
        const stateName = row['State Name'] || row.stateName || '';
        const capital = row['Capital'] || row.capital || '';
        const segment = row['Segment'] || row.segment || '';
        const team_id = row['Team ID'] || row.team_id || null;

        const safeTeamId = team_id && team_id.trim() !== '' ? team_id : null;

        if (!fullName || !email || !phone) continue;
        if (existingPhones.has(phone)) continue;
        if (sheetPhones.has(phone)) continue;

        validCount++;

        await client.query(
          `INSERT INTO leads (full_name, email, phone, alt_number, notes, deemat_account_name, profession, state_name, capital, segment, team_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            fullName,
            email,
            phone,
            altNumber,
            notes,
            deematAccountName,
            profession,
            stateName,
            capital,
            segment,
            safeTeamId
          ]
        );

        sheetPhones.add(phone);
      }
      await client.query('COMMIT');
      console.log(`📊 Parsed: ${totalParsed}, ✅ Inserted: ${validCount}`);
      res.status(201).json({
        message: 'Leads uploaded successfully (duplicates skipped)',
        totalParsed,
        validInserted: validCount
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to upload leads from Google Sheets:', err.message);
      res.status(500).json({ error: 'Failed to upload leads from Google Sheets' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Google Sheets upload error:', err.message);
    res.status(500).json({ error: 'Failed to process Google Sheets link' });
  }
};

module.exports = {
  getLeads,
  addLead,
  updateLead,
  deleteLead,
  uploadLeads,
  assignLead,
  googleSheetsUpload
};
