const express = require("express");
const router = express.Router();
const OrderItem = require("../models/OrderItem");

const authMod = require("../middleware/auth");
let authenticate = authMod.authenticate || authMod.authMiddleware || authMod.verifyToken || authMod.default || authMod; if(typeof authenticate !== "function") { const funcs = Object.values(authMod).filter(v=>typeof v==="function"); if(funcs.length>0) authenticate = funcs[0]; }

const rbacMod = require("../middleware/rbac");
let authorize = rbacMod.authorize || rbacMod.checkRole || rbacMod.requireRole || rbacMod.default || rbacMod; if(typeof authorize !== "function") { const funcs = Object.values(rbacMod).filter(v=>typeof v==="function"); if(funcs.length>0) authorize = funcs[0]; }

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const data = await OrderItem.findAll(req.query);
    res.json({ success: true, data, count: data.length });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await OrderItem.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Order item not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", authorize(["ADMIN", "MANAGER", "SALES", "WAREHOUSE"]), async (req, res, next) => {
  try {
    const id = await OrderItem.create(req.body);
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
});

router.put("/:id", authorize(["ADMIN", "MANAGER", "SALES"]), async (req, res, next) => {
  try {
    const ok = await OrderItem.update(req.params.id, req.body);
    if (!ok) return res.status(404).json({ success: false, message: "Order item not found" });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete("/:id", authorize(["ADMIN", "MANAGER"]), async (req, res, next) => {
  try {
    const ok = await OrderItem.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Order item not found" });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

