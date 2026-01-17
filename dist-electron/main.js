import { app as m, ipcMain as r, BrowserWindow as _ } from "electron";
import { fileURLToPath as A } from "node:url";
import d from "node:path";
import N from "better-sqlite3";
let a = null;
function I() {
  if (a) return a;
  const n = m.getPath("userData"), e = d.join(n, "ovms.db");
  console.log("Initializing Database at:", e), a = new N(e), a.pragma("journal_mode = WAL"), a.exec(`
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
  `);
  try {
    a.pragma("table_info(visitors)").some((T) => T.name === "photo") || (console.log("Migrating database: Adding photo column to visitors table..."), a.prepare("ALTER TABLE visitors ADD COLUMN photo TEXT").run());
  } catch (s) {
    console.error("Migration failed:", s);
  }
  try {
    a.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get() || (console.log("Migrating database: Creating employees table..."), a.exec(`
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
      `));
  } catch (s) {
    console.error("Employee table migration failed:", s);
  }
  try {
    a.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'").get() || (console.log("Migrating database: Creating attendance table..."), a.exec(`
        CREATE TABLE attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL,
          check_in_time DATETIME DEFAULT (datetime('now', 'localtime')),
          check_out_time DATETIME,
          date DATE DEFAULT (date('now')),
          status TEXT DEFAULT 'present' CHECK(status IN ('present', 'absent', 'half_day')),
          FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        );
      `));
  } catch (s) {
    console.error("Attendance table migration failed:", s);
  }
  try {
    a.pragma("table_info(employees)").some((T) => T.name === "office_id") || (console.log("Migrating database: Adding office_id column to employees table..."), a.prepare("ALTER TABLE employees ADD COLUMN office_id INTEGER").run());
  } catch (s) {
    console.error("Office ID migration failed:", s);
  }
  try {
    a.pragma("table_info(attendance)").some((T) => T.name === "office_id") || (console.log("Migrating database: Adding office_id column to attendance table..."), a.prepare("ALTER TABLE attendance ADD COLUMN office_id INTEGER").run());
  } catch (s) {
    console.error("Attendance office_id migration failed:", s);
  }
  try {
    const s = a.pragma("table_info(office_locations)"), l = s.some((p) => p.name === "start_time"), T = s.some((p) => p.name === "end_time");
    l || (console.log("Migrating database: Adding start_time column to office_locations table..."), a.prepare("ALTER TABLE office_locations ADD COLUMN start_time TEXT DEFAULT '09:00'").run()), T || (console.log("Migrating database: Adding end_time column to office_locations table..."), a.prepare("ALTER TABLE office_locations ADD COLUMN end_time TEXT DEFAULT '18:00'").run()), console.log("Migrating database: Updating existing office locations with default hours..."), a.prepare("UPDATE office_locations SET start_time = '09:00' WHERE start_time IS NULL").run(), a.prepare("UPDATE office_locations SET end_time = '18:00' WHERE end_time IS NULL").run();
  } catch (s) {
    console.error("Office hours migration failed:", s);
  }
  return a.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get().count === 0 && (a.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin"), console.log("Default admin user created.")), a.prepare("SELECT count(*) as count FROM office_locations").get().count === 0 && (a.prepare(`
      INSERT INTO office_locations (name, latitude, longitude, radius, start_time, end_time, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("Head Office", 28.62884, 77.37633, 300, "09:00", "18:00", 1), console.log("Default office location created.")), a;
}
function i() {
  if (!a)
    throw new Error("Database not initialized. Call initDB() first.");
  return a;
}
function L() {
  r.handle("get-visitors", () => i().prepare("SELECT * FROM visitors ORDER BY check_in_time DESC").all()), r.handle("add-visitor", (n, e) => {
    const o = i();
    try {
      return { success: !0, id: o.prepare(`
        INSERT INTO visitors (name, phone, email, company, host_employee, purpose, photo, status, check_in_time)
        VALUES (@name, @phone, @email, @company, @host_employee, @purpose, @photo, 'checked_in', datetime('now', 'localtime'))
        `).run(e).lastInsertRowid };
    } catch (t) {
      return console.error("Failed to add visitor:", t), { success: !1, error: t.message };
    }
  }), r.handle("checkout-visitor", (n, e) => {
    const o = i();
    try {
      return o.prepare(`
            UPDATE visitors 
            SET status = 'checked_out', check_out_time = datetime('now', 'localtime') 
            WHERE id = ?
          `).run(e), { success: !0 };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  }), r.handle("get-dashboard-stats", () => {
    const n = i(), e = n.prepare("SELECT COUNT(*) as count FROM visitors WHERE date(check_in_time) = date('now')").get(), o = n.prepare("SELECT COUNT(*) as count FROM visitors WHERE status = 'checked_in'").get();
    return {
      todayVisitors: e.count,
      activeVisitors: o.count
    };
  }), r.handle("get-appointments", () => i().prepare("SELECT * FROM appointments ORDER BY visit_time ASC").all()), r.handle("add-appointment", (n, e) => {
    const o = i();
    try {
      return { success: !0, id: o.prepare(`
                INSERT INTO appointments (visitor_name, visitor_phone, host_employee, visit_time, purpose, status)
                VALUES (@visitor_name, @visitor_phone, @host_employee, @visit_time, @purpose, 'pending')
            `).run(e).lastInsertRowid };
    } catch (t) {
      return console.error("Failed to add appointment:", t), { success: !1, error: t.message };
    }
  }), r.handle("update-appointment-status", (n, { id: e, status: o }) => {
    const t = i();
    try {
      return t.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(o, e), { success: !0 };
    } catch (c) {
      return { success: !1, error: c.message };
    }
  }), r.handle("get-employees", () => {
    const n = i();
    try {
      return n.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name ASC").all();
    } catch {
      return console.log("Employees table not found, returning empty array"), [];
    }
  }), r.handle("add-employee", (n, e) => {
    const o = i();
    try {
      return { success: !0, id: o.prepare(`
                INSERT INTO employees (employee_id, name, email, phone, department, designation, photo, face_descriptor, status, office_id)
                VALUES (@employee_id, @name, @email, @phone, @department, @designation, @photo, @face_descriptor, 'active', @office_id)
            `).run(e).lastInsertRowid };
    } catch (t) {
      return console.error("Failed to add employee:", t), { success: !1, error: t.message };
    }
  }), r.handle("get-employee-by-id", (n, e) => i().prepare("SELECT * FROM employees WHERE employee_id = ?").get(e)), r.handle("check-in-employee", (n, e) => {
    const o = i();
    try {
      const t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return o.prepare(`
                SELECT * FROM attendance 
                WHERE employee_id = ? AND date = ? AND check_out_time IS NULL
            `).get(e, t) ? { success: !1, error: "Already checked in today" } : { success: !0, id: o.prepare(`
                INSERT INTO attendance (employee_id, check_in_time, date, status, office_id)
                VALUES (?, datetime('now', 'localtime'), date('now'), 'present', 
                    (SELECT office_id FROM employees WHERE employee_id = ?))
            `).run(e, e).lastInsertRowid };
    } catch (t) {
      return console.error("Failed to check in employee:", t), { success: !1, error: t.message };
    }
  }), r.handle("check-out-employee", (n, e) => {
    const o = i();
    try {
      const t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return o.prepare(`
                UPDATE attendance 
                SET check_out_time = datetime('now', 'localtime') 
                WHERE employee_id = ? AND date = ? AND check_out_time IS NULL
            `).run(e, t).changes === 0 ? { success: !1, error: "No active check-in found for today" } : { success: !0 };
    } catch (t) {
      return console.error("Failed to check out employee:", t), { success: !1, error: t.message };
    }
  }), r.handle("get-attendance", (n, e) => {
    const o = i();
    let t = `
            SELECT a.*, e.name, e.department, e.designation 
            FROM attendance a 
            JOIN employees e ON a.employee_id = e.employee_id
        `;
    const c = [];
    return e != null && e.date ? (t += " WHERE a.date = ?", c.push(e.date)) : e != null && e.startDate && (e != null && e.endDate) && (t += " WHERE a.date BETWEEN ? AND ?", c.push(e.startDate, e.endDate)), t += " ORDER BY a.check_in_time DESC", o.prepare(t).all(...c);
  }), r.handle("get-today-attendance", () => {
    const n = i();
    try {
      const e = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return n.prepare(`
                SELECT a.*, e.name, e.department, e.designation, e.photo
                FROM attendance a 
                JOIN employees e ON a.employee_id = e.employee_id
                WHERE a.date = ?
                ORDER BY a.check_in_time DESC
            `).all(e);
    } catch {
      return console.log("Attendance table not found, returning empty array"), [];
    }
  }), r.handle("get-office-locations", () => {
    const n = i();
    try {
      return n.prepare("SELECT * FROM office_locations WHERE is_active = 1 ORDER BY name ASC").all();
    } catch {
      return console.log("Office locations table not found, returning empty array"), [];
    }
  }), r.handle("add-office-location", (n, e) => {
    const o = i();
    try {
      return { success: !0, id: o.prepare(`
                INSERT INTO office_locations (name, latitude, longitude, radius, start_time, end_time, is_active)
                VALUES (@name, @latitude, @longitude, @radius, @start_time, @end_time, 1)
            `).run(e).lastInsertRowid };
    } catch (t) {
      return console.error("Failed to add office location:", t), { success: !1, error: t.message };
    }
  }), r.handle("update-office-location", (n, { id: e, ...o }) => {
    const t = i();
    try {
      return t.prepare(`
                UPDATE office_locations 
                SET name = @name, latitude = @latitude, longitude = @longitude, radius = @radius, 
                    start_time = @start_time, end_time = @end_time
                WHERE id = @id
            `).run({ id: e, ...o }), { success: !0 };
    } catch (c) {
      return { success: !1, error: c.message };
    }
  }), r.handle("delete-office-location", (n, e) => {
    const o = i();
    try {
      return o.prepare("UPDATE office_locations SET is_active = 0 WHERE id = ?").run(e), { success: !0 };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  });
}
const f = d.dirname(A(import.meta.url));
process.env.APP_ROOT = d.join(f, "..");
const u = process.env.VITE_DEV_SERVER_URL, U = d.join(process.env.APP_ROOT, "dist-electron"), R = d.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = u ? d.join(process.env.APP_ROOT, "public") : R;
let E;
function h() {
  E = new _({
    width: 1200,
    height: 800,
    show: !0,
    icon: d.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: d.join(f, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), E.webContents.session.setPermissionRequestHandler((n, e, o) => {
    ["geolocation", "media"].includes(e) ? o(!0) : o(!1);
  }), E.webContents.on("did-finish-load", () => {
    E == null || E.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), u ? E.loadURL(u) : E.loadFile(d.join(R, "index.html"));
}
m.on("window-all-closed", () => {
  process.platform !== "darwin" && (m.quit(), E = null);
});
m.on("activate", () => {
  _.getAllWindows().length === 0 && h();
});
m.whenReady().then(() => {
  I(), L(), h();
});
export {
  U as MAIN_DIST,
  R as RENDERER_DIST,
  u as VITE_DEV_SERVER_URL
};
