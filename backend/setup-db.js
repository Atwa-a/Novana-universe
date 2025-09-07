const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  let connection;

  try {
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 3306, 
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'novana';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' ready`);

    // Use the database
    await connection.query(`USE \`${dbName}\``);

    // Read and execute the SQL schema
    const sqlPath = path.join(__dirname, 'db.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL by semicolons and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
          console.log('✅ Executed SQL statement');
        } catch (err) {
          if (err.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('ℹ️  Table already exists, skipping');
          } else {
            console.error('❌ Error executing statement:', err.message);
          }
        }
      }
    }

    console.log('✅ Database setup completed successfully!');

    // Test the tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Available tables:', tables.map(row => Object.values(row)[0]));

  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
