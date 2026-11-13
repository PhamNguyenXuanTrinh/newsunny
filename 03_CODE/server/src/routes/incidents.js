const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const DECISION_ROLES = ['giam_doc','ke_toan'];
const MANAGE_ROLES = ['giam_doc','ke_toan','to_truong'];

async function getEmployeeCodeColumn(){
  const [cols]=await pool.query("SHOW COLUMNS FROM users");
  const names=cols.map(x=>x.Field);
  return ['code','employee_code','staff_code','user_code'].find(x=>names.includes(x))||null;
}

async function employeeCodeSQL(alias='u'){
  const col=await getEmployeeCodeColumn();
  return col?`${alias}.\`${col}\``:`${alias}.username`;
}

async function makeCode(){
  const [rows]=await pool.query("SELECT code FROM incidents WHERE code LIKE 'VP-%' ORDER BY id DESC LIMIT 1");
  let next=1;
  if(rows.length&&rows[0].code){
    const n=Number(String(rows[0].code).replace(/\D/g,''));
    if(Number.isFinite(n))next=n+1;
  }
  return `VP-${String(next).padStart(5,'0')}`;
}

router.get('/employees',auth,async(req,res)=>{
  try{
    const codeExpr=await employeeCodeSQL('u');
    const [rows]=await pool.query(`SELECT u.id,${codeExpr} AS employee_code,u.full_name,u.username,u.role,u.active FROM users u WHERE u.active=1 ORDER BY u.full_name ASC`);
    res.json({success:true,data:rows});
  }catch(err){
    console.error('[GET /incidents/employees]',err);
    res.status(500).json({success:false,error:err.message});
  }
});

router.get('/',auth,async(req,res)=>{
  try{
    const codeExpr=await employeeCodeSQL('u');
    const [rows]=await pool.query(`SELECT i.*,${codeExpr} AS employee_code,u.full_name AS user_name,u.username,d.full_name AS decision_by_name FROM incidents i LEFT JOIN users u ON u.id=i.user_id LEFT JOIN users d ON d.id=i.decision_by ORDER BY i.id DESC`);
    res.json({success:true,data:rows});
  }catch(err){
    console.error('[GET /incidents]',err);
    res.status(500).json({success:false,error:err.message});
  }
});

router.post('/',auth,async(req,res)=>{
  try{
    if(!MANAGE_ROLES.includes(req.user.role))return res.status(403).json({success:false,error:'Bạn không có quyền tạo phiếu vi phạm.'});
    const {user_id,violation_codes,evidence}=req.body;
    if(!user_id)return res.status(400).json({success:false,error:'Thiếu nhân viên.'});
    if(!Array.isArray(violation_codes)||!violation_codes.length)return res.status(400).json({success:false,error:'Phải chọn ít nhất một mã vi phạm.'});
    const [users]=await pool.query('SELECT id,full_name,username FROM users WHERE id=? LIMIT 1',[user_id]);
    if(!users.length)return res.status(404).json({success:false,error:'Không tìm thấy nhân viên.'});
    let code,result;
    for(let attempt=0;attempt<5;attempt++){
      try{
        code=await makeCode();
        [result]=await pool.query("INSERT INTO incidents (code,user_id,violation_codes,status,evidence,created_by) VALUES (?,?,?,'pending_explanation',?,?)",[code,user_id,JSON.stringify(violation_codes),evidence||null,req.user.id]);
        break;
      }catch(err){
        if(err.code!=='ER_DUP_ENTRY'||attempt===4)throw err;
      }
    }
    const codeExpr=await employeeCodeSQL('u');
    const [rows]=await pool.query(`SELECT i.*,${codeExpr} AS employee_code,u.full_name AS user_name,u.username FROM incidents i LEFT JOIN users u ON u.id=i.user_id WHERE i.id=?`,[result.insertId]);
    try{await logAudit(req.user.id,'CREATE','incidents',result.insertId,null,rows[0],null,req.ip);}catch(e){console.error('[AUDIT CREATE]',e.message);}
    res.status(201).json({success:true,data:rows[0]});
  }catch(err){
    console.error('[POST /incidents]',err);
    res.status(500).json({success:false,error:err.message});
  }
});

router.patch('/:id',auth,async(req,res)=>{
  try{
    if(!MANAGE_ROLES.includes(req.user.role))return res.status(403).json({success:false,error:'Bạn không có quyền sửa phiếu vi phạm.'});
    const [oldRows]=await pool.query('SELECT * FROM incidents WHERE id=? LIMIT 1',[req.params.id]);
    if(!oldRows.length)return res.status(404).json({success:false,error:'Không tìm thấy phiếu.'});
    const old=oldRows[0];
    if(!['new','pending_explanation'].includes(old.status))return res.status(400).json({success:false,error:'Phiếu đã được giải trình/xử lý nên không thể sửa.'});
    const user_id=req.body.user_id??old.user_id;
    const evidence=req.body.evidence??old.evidence;
    const violation_codes=req.body.violation_codes??old.violation_codes;
    const [users]=await pool.query('SELECT id FROM users WHERE id=? LIMIT 1',[user_id]);
    if(!users.length)return res.status(404).json({success:false,error:'Không tìm thấy nhân viên.'});
    let codes;
    if(Array.isArray(violation_codes))codes=JSON.stringify(violation_codes);
    else{
      try{const parsed=JSON.parse(violation_codes);codes=JSON.stringify(Array.isArray(parsed)?parsed:[parsed]);}
      catch{codes=JSON.stringify([violation_codes]);}
    }
    await pool.query('UPDATE incidents SET user_id=?,violation_codes=?,evidence=? WHERE id=?',[user_id,codes,evidence||null,req.params.id]);
    const codeExpr=await employeeCodeSQL('u');
    const [newRows]=await pool.query(`SELECT i.*,${codeExpr} AS employee_code,u.full_name AS user_name,u.username FROM incidents i LEFT JOIN users u ON u.id=i.user_id WHERE i.id=?`,[req.params.id]);
    try{await logAudit(req.user.id,'UPDATE','incidents',req.params.id,old,newRows[0],null,req.ip);}catch(e){console.error('[AUDIT UPDATE]',e.message);}
    res.json({success:true,data:newRows[0]});
  }catch(err){
    console.error('[PATCH /incidents/:id]',err);
    res.status(500).json({success:false,error:err.message});
  }
});

router.delete('/:id',auth,async(req,res)=>{
  try{
    if(!MANAGE_ROLES.includes(req.user.role))return res.status(403).json({success:false,error:'Bạn không có quyền xóa phiếu vi phạm.'});
    const [rows]=await pool.query('SELECT * FROM incidents WHERE id=? LIMIT 1',[req.params.id]);
    if(!rows.length)return res.status(404).json({success:false,error:'Không tìm thấy phiếu.'});
    const old=rows[0];
    if(!['new','pending_explanation'].includes(old.status))return res.status(400).json({success:false,error:'Chỉ được xóa phiếu chưa giải trình.'});
    await pool.query('DELETE FROM incidents WHERE id=?',[req.params.id]);
    try{await logAudit(req.user.id,'DELETE','incidents',req.params.id,old,null,null,req.ip);}catch(e){console.error('[AUDIT DELETE]',e.message);}
    res.json({success:true,message:'Đã xóa phiếu vi phạm.'});
  }catch(err){
    console.error('[DELETE /incidents/:id]',err);
    res.status(500).json({success:false,error:err.message});
  }
});

router.patch('/:id/explain',auth,async(req,res)=>{
  try{
    const {explanation}=req.body;
    if(!explanation||!String(explanation).trim())return res.status(400).json({success:false,error:'Nội dung giải trình không được để trống.'});
    const [rows]=await pool.query('SELECT * FROM incidents WHERE id=? LIMIT 1',[req.params.id]);
    if(!rows.length)return res.status(404).json({success:false,error:'Không tìm thấy phiếu.'});
    const old=rows[0];
    if(old.status!=='pending_explanation')return res.status(400).json({success:false,error:'Phiếu này không ở trạng thái chờ giải trình.'});
    if(req.user.role==='cong_nhan'&&Number(old.user_id)!==Number(req.user.id))return res.status(403).json({success:false,error:'Bạn chỉ được giải trình phiếu của chính mình.'});
    await pool.query("UPDATE incidents SET explanation=?,status='explained' WHERE id=?",[String(explanation).trim(),req.params.id]);
    const [updated]=await pool.query('SELECT * FROM incidents WHERE id=?',[req.params.id]);
    try{await logAudit(req.user.id,'EXPLAIN','incidents',req.params.id,old,updated[0],null,req.ip);}catch(e){console.error('[AUDIT EXPLAIN]',e.message);}
    res.json({success:true,data:updated[0]});
  }catch(err){
    console.error('[PATCH /incidents/:id/explain]',err);
    res.status(500).json({success:false,error:err.message});
  }
});

router.patch('/:id/decide',auth,async(req,res)=>{
  try{
    if(!DECISION_ROLES.includes(req.user.role))return res.status(403).json({success:false,error:'Bạn không có quyền ra quyết định.'});
    const {decision,note}=req.body;
    if(!['approve','reject'].includes(decision))return res.status(400).json({success:false,error:'Quyết định không hợp lệ.'});
    if(!note||!String(note).trim())return res.status(400).json({success:false,error:'Phải nhập lý do quyết định.'});
    const [rows]=await pool.query('SELECT * FROM incidents WHERE id=? LIMIT 1',[req.params.id]);
    if(!rows.length)return res.status(404).json({success:false,error:'Không tìm thấy phiếu.'});
    const old=rows[0];
    if(old.status!=='explained')return res.status(400).json({success:false,error:'Chỉ được quyết định sau khi nhân viên đã giải trình.'});
    const status=decision==='approve'?'approved':'rejected';
    await pool.query('UPDATE incidents SET status=?,decision_by=?,decision_note=?,decision_at=NOW() WHERE id=?',[status,req.user.id,String(note).trim(),req.params.id]);
    const [updated]=await pool.query('SELECT * FROM incidents WHERE id=?',[req.params.id]);
    try{await logAudit(req.user.id,'DECIDE','incidents',req.params.id,old,updated[0],null,req.ip);}catch(e){console.error('[AUDIT DECIDE]',e.message);}
    res.json({success:true,data:updated[0]});
  }catch(err){
    console.error('[PATCH /incidents/:id/decide]',err);
    res.status(500).json({success:false,error:err.message});
  }
});

module.exports=router;
