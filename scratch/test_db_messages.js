const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = '/home/u881780269/domains/whatlify.com/public_html/.builds/config/.env';
if (!fs.existsSync(envPath)) {
  console.error("Env file not found at:", envPath);
  process.exit(1);
}
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.slice('DATABASE_URL='.length).trim();
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) dbUrl = dbUrl.slice(1, -1);
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) dbUrl = dbUrl.slice(1, -1);
    break;
  }
}

if (!dbUrl) {
  console.error("DATABASE_URL not found in env");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const res = await pool.query('SELECT id, is_from_contact, content, created_at FROM messages ORDER BY created_at DESC LIMIT 5');
    console.log("LATEST_MESSAGES:", JSON.stringify(res.rows, null, 2));
    
    const runs = await pool.query('SELECT id, workflow_id, status, error_message, started_at FROM workflow_runs ORDER BY started_at DESC LIMIT 5');
    console.log("LATEST_RUNS:", JSON.stringify(runs.rows, null, 2));

    const logs = await pool.query('SELECT id, run_id, node_id, status, error_message, started_at FROM workflow_node_logs ORDER BY started_at DESC LIMIT 10');
    console.log("LATEST_NODE_LOGS:", JSON.stringify(logs.rows, null, 2));
  } catch (e) {
    console.error("Query Error:", e.message);
  }
  await pool.end();
}

check();
