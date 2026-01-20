import { app, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
let db = null;
function initDB() {
  if (db) return db;
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "ovms.db");
  console.log("Initializing Database at:", dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
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
  try {
    const tableInfo = db.pragma("table_info(visitors)");
    const hasPhoto = tableInfo.some((col) => col.name === "photo");
    if (!hasPhoto) {
      console.log("Migrating database: Adding photo column to visitors table...");
      db.prepare("ALTER TABLE visitors ADD COLUMN photo TEXT").run();
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get();
    if (!tables) {
      console.log("Migrating database: Creating employees table...");
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
    console.error("Employee table migration failed:", error);
  }
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'").get();
    if (!tables) {
      console.log("Migrating database: Creating attendance table...");
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
    console.error("Attendance table migration failed:", error);
  }
  try {
    const tableInfo = db.pragma("table_info(employees)");
    const hasOfficeId = tableInfo.some((col) => col.name === "office_id");
    if (!hasOfficeId) {
      console.log("Migrating database: Adding office_id column to employees table...");
      db.prepare("ALTER TABLE employees ADD COLUMN office_id INTEGER").run();
    }
  } catch (error) {
    console.error("Office ID migration failed:", error);
  }
  try {
    const tableInfo = db.pragma("table_info(attendance)");
    const hasOfficeId = tableInfo.some((col) => col.name === "office_id");
    if (!hasOfficeId) {
      console.log("Migrating database: Adding office_id column to attendance table...");
      db.prepare("ALTER TABLE attendance ADD COLUMN office_id INTEGER").run();
    }
  } catch (error) {
    console.error("Attendance office_id migration failed:", error);
  }
  try {
    const tableInfo = db.pragma("table_info(office_locations)");
    const hasStartTime = tableInfo.some((col) => col.name === "start_time");
    const hasEndTime = tableInfo.some((col) => col.name === "end_time");
    if (!hasStartTime) {
      console.log("Migrating database: Adding start_time column to office_locations table...");
      db.prepare("ALTER TABLE office_locations ADD COLUMN start_time TEXT DEFAULT '09:00'").run();
    }
    if (!hasEndTime) {
      console.log("Migrating database: Adding end_time column to office_locations table...");
      db.prepare("ALTER TABLE office_locations ADD COLUMN end_time TEXT DEFAULT '18:00'").run();
    }
    console.log("Migrating database: Updating existing office locations with default hours...");
    db.prepare("UPDATE office_locations SET start_time = '09:00' WHERE start_time IS NULL").run();
    db.prepare("UPDATE office_locations SET end_time = '18:00' WHERE end_time IS NULL").run();
  } catch (error) {
    console.error("Office hours migration failed:", error);
  }
  const checkAdmin = db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get();
  if (checkAdmin.count === 0) {
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
    console.log("Default admin user created.");
  }
  const checkOffice = db.prepare("SELECT count(*) as count FROM office_locations").get();
  if (checkOffice.count === 0) {
    db.prepare(`
      INSERT INTO office_locations (name, latitude, longitude, radius, start_time, end_time, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("Head Office", 28.62884, 77.37633, 300, "09:00", "18:00", 1);
    console.log("Default office location created.");
  }
  return db;
}
function getDB() {
  if (!db) {
    throw new Error("Database not initialized. Call initDB() first.");
  }
  return db;
}
function setupIPC() {
  ipcMain.handle("get-visitors", () => {
    const db2 = getDB();
    return db2.prepare("SELECT * FROM visitors ORDER BY check_in_time DESC").all();
  });
  ipcMain.handle("add-visitor", (_event, visitor) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare(`
        INSERT INTO visitors (name, phone, email, company, host_employee, purpose, photo, status, check_in_time)
        VALUES (@name, @phone, @email, @company, @host_employee, @purpose, @photo, 'checked_in', datetime('now', 'localtime'))
        `);
      const info = stmt.run(visitor);
      return { success: true, id: info.lastInsertRowid };
    } catch (error) {
      console.error("Failed to add visitor:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("checkout-visitor", (_event, id) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare(`
            UPDATE visitors 
            SET status = 'checked_out', check_out_time = datetime('now', 'localtime') 
            WHERE id = ?
          `);
      stmt.run(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-dashboard-stats", () => {
    const db2 = getDB();
    const visitorCount = db2.prepare("SELECT COUNT(*) as count FROM visitors WHERE date(check_in_time) = date('now')").get();
    const activeCount = db2.prepare("SELECT COUNT(*) as count FROM visitors WHERE status = 'checked_in'").get();
    return {
      todayVisitors: visitorCount.count,
      activeVisitors: activeCount.count
    };
  });
  ipcMain.handle("get-appointments", () => {
    const db2 = getDB();
    return db2.prepare("SELECT * FROM appointments ORDER BY visit_time ASC").all();
  });
  ipcMain.handle("add-appointment", (_event, appointment) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare(`
                INSERT INTO appointments (visitor_name, visitor_phone, host_employee, visit_time, purpose, status)
                VALUES (@visitor_name, @visitor_phone, @host_employee, @visit_time, @purpose, 'pending')
            `);
      const info = stmt.run(appointment);
      return { success: true, id: info.lastInsertRowid };
    } catch (error) {
      console.error("Failed to add appointment:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("update-appointment-status", (_event, { id, status }) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare("UPDATE appointments SET status = ? WHERE id = ?");
      stmt.run(status, id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-employees", () => {
    const db2 = getDB();
    try {
      return db2.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name ASC").all();
    } catch (error) {
      console.log("Employees table not found, returning empty array");
      return [];
    }
  });
  ipcMain.handle("add-employee", (_event, employee) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare(`
                INSERT INTO employees (employee_id, name, email, phone, department, designation, photo, face_descriptor, status, office_id)
                VALUES (@employee_id, @name, @email, @phone, @department, @designation, @photo, @face_descriptor, 'active', @office_id)
            `);
      const info = stmt.run(employee);
      return { success: true, id: info.lastInsertRowid };
    } catch (error) {
      console.error("Failed to add employee:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-employee-by-id", (_event, employeeId) => {
    const db2 = getDB();
    return db2.prepare("SELECT * FROM employees WHERE employee_id = ?").get(employeeId);
  });
  ipcMain.handle("check-in-employee", (_event, employeeId) => {
    const db2 = getDB();
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const existing = db2.prepare(`
                SELECT * FROM attendance 
                WHERE employee_id = ? AND date = ? AND check_out_time IS NULL
            `).get(employeeId, today);
      if (existing) {
        return { success: false, error: "Already checked in today" };
      }
      const stmt = db2.prepare(`
                INSERT INTO attendance (employee_id, check_in_time, date, status, office_id)
                VALUES (?, datetime('now', 'localtime'), date('now'), 'present', 
                    (SELECT office_id FROM employees WHERE employee_id = ?))
            `);
      const info = stmt.run(employeeId, employeeId);
      return { success: true, id: info.lastInsertRowid };
    } catch (error) {
      console.error("Failed to check in employee:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("check-out-employee", (_event, employeeId) => {
    const db2 = getDB();
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const stmt = db2.prepare(`
                UPDATE attendance 
                SET check_out_time = datetime('now', 'localtime') 
                WHERE employee_id = ? AND date = ? AND check_out_time IS NULL
            `);
      const info = stmt.run(employeeId, today);
      if (info.changes === 0) {
        return { success: false, error: "No active check-in found for today" };
      }
      return { success: true };
    } catch (error) {
      console.error("Failed to check out employee:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-attendance", (_event, filters) => {
    const db2 = getDB();
    let query = `
            SELECT a.*, e.name, e.department, e.designation 
            FROM attendance a 
            JOIN employees e ON a.employee_id = e.employee_id
        `;
    const params = [];
    if (filters == null ? void 0 : filters.date) {
      query += " WHERE a.date = ?";
      params.push(filters.date);
    } else if ((filters == null ? void 0 : filters.startDate) && (filters == null ? void 0 : filters.endDate)) {
      query += " WHERE a.date BETWEEN ? AND ?";
      params.push(filters.startDate, filters.endDate);
    }
    query += " ORDER BY a.check_in_time DESC";
    return db2.prepare(query).all(...params);
  });
  ipcMain.handle("get-today-attendance", () => {
    const db2 = getDB();
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return db2.prepare(`
                SELECT a.*, e.name, e.department, e.designation, e.photo
                FROM attendance a 
                JOIN employees e ON a.employee_id = e.employee_id
                WHERE a.date = ?
                ORDER BY a.check_in_time DESC
            `).all(today);
    } catch (error) {
      console.log("Attendance table not found, returning empty array");
      return [];
    }
  });
  ipcMain.handle("get-office-locations", () => {
    const db2 = getDB();
    try {
      return db2.prepare("SELECT * FROM office_locations WHERE is_active = 1 ORDER BY name ASC").all();
    } catch (error) {
      console.log("Office locations table not found, returning empty array");
      return [];
    }
  });
  ipcMain.handle("add-office-location", (_event, office) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare(`
                INSERT INTO office_locations (name, latitude, longitude, radius, start_time, end_time, is_active)
                VALUES (@name, @latitude, @longitude, @radius, @start_time, @end_time, 1)
            `);
      const info = stmt.run(office);
      return { success: true, id: info.lastInsertRowid };
    } catch (error) {
      console.error("Failed to add office location:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("update-office-location", (_event, { id, ...office }) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare(`
                UPDATE office_locations 
                SET name = @name, latitude = @latitude, longitude = @longitude, radius = @radius, 
                    start_time = @start_time, end_time = @end_time
                WHERE id = @id
            `);
      stmt.run({ id, ...office });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("delete-office-location", (_event, id) => {
    const db2 = getDB();
    try {
      const stmt = db2.prepare("UPDATE office_locations SET is_active = 0 WHERE id = ?");
      stmt.run(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions = ["geolocation", "media"];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  initDB();
  setupIPC();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
