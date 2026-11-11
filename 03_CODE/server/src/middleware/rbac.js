const PERMS = {
  users: { giam_doc: 'rw' },
  partners: { giam_doc: 'rw', ke_toan: 'rw', ctv: 'own' },
  items: { giam_doc: 'rw', ke_toan: 'rw', to_truong: 'r', cong_nhan: 'r' },
  orders: { giam_doc: 'rw', ke_toan: 'rw', ctv: 'own' },
  stock_ledger: { giam_doc: 'rw', ke_toan: 'rw', to_truong: 'r' }
};

const allow = (resource) => {
  return (req, res, next) => {
    const role = req.user.role;
    const perm = PERMS[resource]?.[role];
    if (!perm || perm === 'none') return res.status(403).json({ error: 'Không có quyền' });
    if (perm === 'own') req.scope = 'own';
    if (perm === 'team') req.scope = 'team';
    if (perm === 'approve') req.needsApproval = true;
    next();
  };
};
module.exports = { allow };
