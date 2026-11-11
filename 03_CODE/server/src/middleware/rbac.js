const PERMS = { users: { giam_doc: 'rw' } };
const allow = (resource) => {
  return (req, res, next) => {
    const role = req.user.role;
    const perm = PERMS[resource]?.[role];
    if (!perm || perm === 'none') return res.status(403).json({ error: 'Không có quyền' });
    next();
  };
};
module.exports = { allow };
