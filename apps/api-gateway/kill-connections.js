const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_nFY3EulQZ6dc@ep-weathered-credit-aqlu1kv0.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&options=-c%20statement_timeout=30000";

async function killIdleConnections() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected directly via pg. Killing idle connections...');
    const result = await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
        AND pid <> pg_backend_pid()
        AND state IN ('idle', 'idle in transaction');
    `);
    console.log(`Successfully terminated ${result.rowCount} idle connections.`);
  } catch (err) {
    console.error('Failed to terminate connections:', err);
  } finally {
    await client.end();
  }
}

killIdleConnections();
