require('dotenv').config();
const { pool } = require('./src/config/db');

const TABLES = [
  'users',
  'partners',
  'items',
  'orders',
  'order_items',
  'payments',
  'stock_ledger',
  'tasks',
  'attendance',
  'payrolls',
  'costs',
  'marketing',
  'assets',
  'shift_reports',
  'incidents',
  'sop_docs',
  'audit_logs',
  'ai_conversations'
];

function parseEnum(type) {
  const m = String(type || '').match(/^enum\((.*)\)$/i);
  if (!m) return null;

  return m[1]
    .split(',')
    .map(x => x.trim())
    .map(x => x.replace(/^'(.*)'$/, '$1').replace(/''/g, "'"));
}

function parseSet(type) {
  const m = String(type || '').match(/^set\((.*)\)$/i);
  if (!m) return null;

  return m[1]
    .split(',')
    .map(x => x.trim())
    .map(x => x.replace(/^'(.*)'$/, '$1').replace(/''/g, "'"));
}

(async () => {
  try {
    const [dbRows] = await pool.query('SELECT DATABASE() AS db');
    console.log('');
    console.log('======================================================');
    console.log('SUNNY - KIEM TRA TOAN BO SCHEMA PHUC VU SEED');
    console.log('DATABASE:', dbRows[0]?.db);
    console.log('======================================================');

    const report = {};

    for (const table of TABLES) {
      const [exists] = await pool.query('SHOW TABLES LIKE ?', [table]);

      if (!exists.length) {
        console.log('');
        console.log(`### ${table}`);
        console.log('KHONG TON TAI');
        report[table] = { exists: false };
        continue;
      }

      const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);

      report[table] = {
        exists: true,
        columns: {}
      };

      console.log('');
      console.log('======================================================');
      console.log(`TABLE: ${table}`);
      console.log('======================================================');

      for (const col of cols) {
        const enumValues = parseEnum(col.Type);
        const setValues = parseSet(col.Type);

        report[table].columns[col.Field] = {
          type: col.Type,
          nullable: col.Null === 'YES',
          key: col.Key,
          default: col.Default,
          extra: col.Extra,
          enumValues,
          setValues
        };

        console.log(
          `${col.Field.padEnd(24)} | ${String(col.Type).padEnd(34)} | NULL=${col.Null} | DEFAULT=${col.Default === null ? 'NULL' : col.Default} | KEY=${col.Key || '-'} | EXTRA=${col.Extra || '-'}`
        );

        if (enumValues) {
          console.log(`   >>> ENUM = [ ${enumValues.map(v => `'${v}'`).join(', ')} ]`);
        }

        if (setValues) {
          console.log(`   >>> SET  = [ ${setValues.map(v => `'${v}'`).join(', ')} ]`);
        }
      }

      const required = cols.filter(c =>
        c.Null === 'NO' &&
        c.Default === null &&
        !String(c.Extra || '').toLowerCase().includes('auto_increment')
      );

      if (required.length) {
        console.log('');
        console.log('BAT BUOC PHAI CO GIA TRI:');
        required.forEach(c => {
          console.log(`   - ${c.Field} (${c.Type})`);
        });
      }
    }

    const fs = require('fs');
    fs.writeFileSync(
      './SUNNY_SCHEMA_FOR_SEED.json',
      JSON.stringify(report, null, 2),
      'utf8'
    );

    console.log('');
    console.log('======================================================');
    console.log('CAC ENUM TIM DUOC');
    console.log('======================================================');

    for (const [table, info] of Object.entries(report)) {
      if (!info.exists) continue;

      for (const [column, detail] of Object.entries(info.columns)) {
        if (detail.enumValues) {
          console.log(
            `${table}.${column} = ${JSON.stringify(detail.enumValues)}`
          );
        }

        if (detail.setValues) {
          console.log(
            `${table}.${column} [SET] = ${JSON.stringify(detail.setValues)}`
          );
        }
      }
    }

    console.log('');
    console.log('======================================================');
    console.log('DA TAO FILE:');
    console.log('D:\\SUNNY_AI_PROJECT\\03_CODE\\server\\SUNNY_SCHEMA_FOR_SEED.json');
    console.log('======================================================');
  } catch (err) {
    console.error('');
    console.error('LOI KIEM TRA SCHEMA:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {}
  }
})();
