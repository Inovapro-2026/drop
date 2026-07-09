import pg from "pg";
import "dotenv/config";

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await client.connect();
    console.log("Connected successfully!");
    
    // Let's query the tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in DB:", tablesRes.rows.map(r => r.table_name));

    // For each table, describe columns
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      console.log(`Columns for ${tableName}:`, colsRes.rows);
    }
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.end();
  }
}

main();
