const { Client } = require('pg');

async function test() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tashgheel?schema=public"
    });
    
    try {
        await client.connect();
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log("Vector extension verified/installed.");
    } catch(err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}
test();
