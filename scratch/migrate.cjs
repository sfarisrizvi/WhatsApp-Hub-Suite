require('dotenv').config();
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { drizzle } = require('drizzle-orm/node-postgres');
const pg = require('pg');

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env!");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log("Applying database migrations programmatically...");

migrate(db, { migrationsFolder: './migrations' })
  .then(() => {
    console.log("Database schema successfully synced!");
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration execution failed:", err);
    pool.end();
    process.exit(1);
  });
