const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: "postgresql://u881780269_whatlify:Whatlify123!@46.202.158.245:5432/u881780269_whatlify"
  });
  
  try {
    const res = await pool.query("SELECT id, name, definition FROM workflows WHERE name LIKE '%Restaurant%' LIMIT 1");
    if (res.rows.length > 0) {
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log("No workflow found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
