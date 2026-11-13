const express = require('express'); const router = express.Router();
const { Attendance } = require('../models/HrModels');
const auth = require('../middleware/auth');
const { scanAndCreateIncidents } = require('../services/incidentScanner');

router.post('/check-in', auth, async (req, res) => {
  try { await Attendance.checkIn(req.user.id, req.body.shift); res.json({ success: true, message: 'Check-in thành công' }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
router.post('/check-out', auth, async (req, res) => {
  try { 
    await Attendance.checkOut(req.user.id); 
    await scanAndCreateIncidents(new Date().toISOString().split('T')[0]);
    res.json({ success: true, message: 'Check-out thành công' }); 
  }
  catch (err) { res.status(400).json({ error: err.message }); }
});
router.get('/', auth, async (req, res) => {
  const period = req.query.period || new Date().toISOString().slice(0, 7); // YYYY-MM
  const data = await Attendance.getByMonth(req.query.user_id || req.user.id, period);
  res.json({ success: true, data });
});
module.exports = router;

