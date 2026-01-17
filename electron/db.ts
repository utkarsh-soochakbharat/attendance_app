import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function initDB(): Database.Database {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ovms.db');

  console.log('Initializing Database at:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff' CHECK(role IN ('admin', 'staff'))
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      company TEXT,
      host_employee TEXT,
      purpose TEXT,
      check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      check_out_time DATETIME,
      photo TEXT,
      status TEXT DEFAULT 'checked_in' CHECK(status IN ('checked_in', 'checked_out'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_name TEXT NOT NULL,
      visitor_phone TEXT,
      host_employee TEXT NOT NULL,
      visit_time DATETIME NOT NULL,
      purpose TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      department TEXT,
      designation TEXT,
      photo TEXT,
      face_descriptor TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      check_in_time DATETIME DEFAULT (datetime('now', 'localtime')),
      check_out_time DATETIME,
      date DATE DEFAULT (date('now')),
      status TEXT DEFAULT 'present' CHECK(status IN ('present', 'absent', 'half_day')),
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    );

    CREATE TABLE IF NOT EXISTS office_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius INTEGER DEFAULT 300,
      start_time TEXT DEFAULT '09:00',
      end_time TEXT DEFAULT '18:00',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(schema);

  // MIGRATION: Add photo column if missing
  try {
    const tableInfo = db.pragma('table_info(visitors)') as any[];
    const hasPhoto = tableInfo.some(col => col.name === 'photo');
    if (!hasPhoto) {
      console.log('Migrating database: Adding photo column to visitors table...');
      db.prepare('ALTER TABLE visitors ADD COLUMN photo TEXT').run();
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }

  // MIGRATION: Create employees table if missing
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get();
    if (!tables) {
      console.log('Migrating database: Creating employees table...');
      db.exec(`
        CREATE TABLE employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          department TEXT,
          designation TEXT,
          photo TEXT,
          face_descriptor TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  } catch (error) {
    console.error('Employee table migration failed:', error);
  }

  // MIGRATION: Create attendance table if missing
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'").get();
    if (!tables) {
      console.log('Migrating database: Creating attendance table...');
      db.exec(`
        CREATE TABLE attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL,
          check_in_time DATETIME DEFAULT (datetime('now', 'localtime')),
          check_out_time DATETIME,
          date DATE DEFAULT (date('now')),
          status TEXT DEFAULT 'present' CHECK(status IN ('present', 'absent', 'half_day')),
          FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        );
      `);
    }
  } catch (error) {
    console.error('Attendance table migration failed:', error);
  }

  // MIGRATION: Add office_id to employees table
  try {
    const tableInfo = db.pragma('table_info(employees)') as any[];
    const hasOfficeId = tableInfo.some(col => col.name === 'office_id');
    if (!hasOfficeId) {
      console.log('Migrating database: Adding office_id column to employees table...');
      db.prepare('ALTER TABLE employees ADD COLUMN office_id INTEGER').run();
    }
  } catch (error) {
    console.error('Office ID migration failed:', error);
  }

  // MIGRATION: Add office_id to attendance table
  try {
    const tableInfo = db.pragma('table_info(attendance)') as any[];
    const hasOfficeId = tableInfo.some(col => col.name === 'office_id');
    if (!hasOfficeId) {
      console.log('Migrating database: Adding office_id column to attendance table...');
      db.prepare('ALTER TABLE attendance ADD COLUMN office_id INTEGER').run();
    }
  } catch (error) {
    console.error('Attendance office_id migration failed:', error);
  }

  // MIGRATION: Add office hours to office_locations table
  try {
    const tableInfo = db.pragma('table_info(office_locations)') as any[];
    const hasStartTime = tableInfo.some(col => col.name === 'start_time');
    const hasEndTime = tableInfo.some(col => col.name === 'end_time');

    if (!hasStartTime) {
      console.log('Migrating database: Adding start_time column to office_locations table...');
      db.prepare("ALTER TABLE office_locations ADD COLUMN start_time TEXT DEFAULT '09:00'").run();
    }
    if (!hasEndTime) {
      console.log('Migrating database: Adding end_time column to office_locations table...');
      db.prepare("ALTER TABLE office_locations ADD COLUMN end_time TEXT DEFAULT '18:00'").run();
    }

    // CRITICAL FIX: Update existing records that have NULL values
    console.log('Migrating database: Updating existing office locations with default hours...');
    db.prepare("UPDATE office_locations SET start_time = '09:00' WHERE start_time IS NULL").run();
    db.prepare("UPDATE office_locations SET end_time = '18:00' WHERE end_time IS NULL").run();
  } catch (error) {
    console.error('Office hours migration failed:', error);
  }

  // Seed initial Admin if not exists
  const checkAdmin = db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  if (checkAdmin.count === 0) {
    // Default admin: admin / admin123 (In production use bcrypt!)
    // For prototype simple text match or simple hash
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run('admin', 'admin123', 'admin');
    console.log('Default admin user created.');
  }

  // Seed default office location if not exists
  const checkOffice = db.prepare("SELECT count(*) as count FROM office_locations").get() as { count: number };
  if (checkOffice.count === 0) {
    db.prepare(`
      INSERT INTO office_locations (name, latitude, longitude, radius, start_time, end_time, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Head Office', 28.62884, 77.37633, 300, '09:00', '18:00', 1);
    console.log('Default office location created.');
  }

  return db;
}

export function getDB(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}
