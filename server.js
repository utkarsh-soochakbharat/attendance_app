import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import multer from 'multer';
import cron from 'node-cron';
import { sendEmployeeMonthlyReport, sendConsolidatedReport, testEmailConfig } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env (optional in packaged build)
dotenv.config({ path: path.join(__dirname, '.env') });

// Simple startup logger so we can see why packaged server exits
const serverLogPath = path.join(__dirname, 'server-startup-log.txt');
function log(...args) {
    try {
        fs.appendFileSync(
            serverLogPath,
            `${new Date().toISOString()} ${args.map(String).join(' ')}\n`
        );
    } catch {
        // ignore logging errors
    }
}
log('server.js starting. __dirname =', __dirname);

const app = express();
const PORT = process.env.PORT || 3001;
log('PORT from env:', process.env.PORT, 'Final PORT:', PORT);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Database with environment variable support
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'ovms.db');
const dataDir = path.dirname(dbPath);
const facesDir = path.join(dataDir, 'faces');
const photosDir = path.join(dataDir, 'photos');
const voicesDir = path.join(dataDir, 'voices');

// Ensure directories exist
fs.ensureDirSync(dataDir);
fs.ensureDirSync(facesDir);
fs.ensureDirSync(photosDir);
fs.ensureDirSync(voicesDir);

let db;
try {
    log('Initializing database at', dbPath);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    log('Database initialized OK');
    console.log('✅ Database initialized at:', dbPath);
} catch (err) {
    log('Database init FAILED:', err?.message || err);
    console.error('Database init failed', err);
    throw err;
}

// Create tables
log('Creating / migrating tables');
const schema = `
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    designation TEXT,
    office_id INTEGER,
    photo_path TEXT,
    face_descriptor_path TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES office_locations(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('check-in', 'check-out')) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    location TEXT,
    office_location_id INTEGER,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (office_location_id) REFERENCES office_locations(id)
  );

  CREATE TABLE IF NOT EXISTS office_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius INTEGER DEFAULT 300,
    start_time TEXT DEFAULT '09:00',
    end_time TEXT DEFAULT '18:00',
    voice_settings TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
`;

try {
    db.exec(schema);
    log('Schema created / ensured OK');
} catch (err) {
    log('Schema creation FAILED:', err?.message || err);
    console.error('Schema creation failed', err);
    throw err;
}

// Add 'voice_settings' column if it doesn't exist (for existing databases)
try {
    db.prepare("ALTER TABLE office_locations ADD COLUMN voice_settings TEXT").run();
} catch (err) {
    // Ignore error if column already exists
}
console.log('✅ Database schema created');

// Run migrations
try {
    const tableInfo = db.pragma('table_info(office_locations)');
    const hasStartTime = tableInfo.some(col => col.name === 'start_time');
    const hasEndTime = tableInfo.some(col => col.name === 'end_time');

    if (!hasStartTime) {
        console.log('Migrating: Adding start_time column...');
        db.prepare("ALTER TABLE office_locations ADD COLUMN start_time TEXT DEFAULT '09:00'").run();
    }
    if (!hasEndTime) {
        console.log('Migrating: Adding end_time column...');
        db.prepare("ALTER TABLE office_locations ADD COLUMN end_time TEXT DEFAULT '18:00'").run();
    }

    // Update existing records
    db.prepare("UPDATE office_locations SET start_time = '09:00' WHERE start_time IS NULL").run();
    db.prepare("UPDATE office_locations SET end_time = '18:00' WHERE end_time IS NULL").run();
} catch (error) {
    console.error('Migration error:', error);
}
// Multer Config for Voice Uploads
const voiceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, voicesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'voice-' + uniqueSuffix + ext);
    }
});
const uploadVoice = multer({ storage: voiceStorage });

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Resolve correct models directory in both dev and packaged builds
// - Dev: __dirname is project root → use ./public/models
// - Packaged: __dirname is .../resources/app.asar.unpacked
//   extraResources copies public/models → ../models
let modelsDir = path.join(__dirname, 'public/models');
if (!fs.existsSync(modelsDir)) {
    // Fallback for packaged app: one level up (resources/models)
    modelsDir = path.join(__dirname, '..', 'models');
}
log('Models directory:', modelsDir, 'exists:', fs.existsSync(modelsDir));
app.use('/models', express.static(modelsDir));

app.use('/assets', express.static(path.join(__dirname, 'dist/assets')));
app.use('/photos', express.static(photosDir));
app.use('/voices', express.static(voicesDir)); // Serve voice files
// ==========================================
// API ENDPOINTS
// ==========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all employees
app.get('/api/employees', (req, res) => {
    try {
        const employees = db.prepare('SELECT * FROM employees ORDER BY created_at DESC').all();

        // Enrich with face descriptors
        const enrichedEmployees = employees.map(emp => {
            if (emp.face_descriptor_path && fs.existsSync(emp.face_descriptor_path)) {
                try {
                    const descriptorData = fs.readFileSync(emp.face_descriptor_path, 'utf-8');
                    // face-api.js needs the descriptor as an array/object, not string path
                    return { ...emp, face_descriptor: JSON.parse(descriptorData) };
                } catch (err) {
                    console.error(`Failed to load face descriptor for employee ${emp.id}:`, err);
                    return emp;
                }
            }
            return emp;
        });

        res.json(enrichedEmployees);
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Register employee
app.post('/api/register-employee', (req, res) => {
    try {
        const { employee_id, name, email, phone, department, designation, office_id, photo, face_descriptor } = req.body;

        // Check if employee ID already exists
        const existing = db.prepare('SELECT id FROM employees WHERE employee_id = ?').get(employee_id);
        if (existing) {
            return res.json({ success: false, error: 'Employee ID already exists' });
        }

        // Save face descriptor
        const facePath = path.join(facesDir, `${employee_id}.json`);
        fs.writeFileSync(facePath, face_descriptor);

        // Save photo
        const photoPath = path.join(photosDir, `${employee_id}.jpg`);

        // Convert base64 to image file
        if (photo) {
            const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(photoPath, Buffer.from(base64Data, 'base64'));
        }

        // Insert employee
        const stmt = db.prepare(`
            INSERT INTO employees (employee_id, name, email, phone, department, designation, office_id, photo_path, face_descriptor_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(employee_id, name, email || null, phone || null, department || null, designation || null, office_id || null, photoPath, facePath);

        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark attendance
app.post('/api/mark-attendance', (req, res) => {
    try {
        const { employeeId, type, location, officeLocationId } = req.body;

        const stmt = db.prepare(`
            INSERT INTO attendance (employee_id, type, location, office_location_id)
            VALUES (?, ?, ?, ?)
        `);
        const info = stmt.run(employeeId, type, JSON.stringify(location), officeLocationId);

        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get attendance records
app.get('/api/attendance', (req, res) => {
    try {
        const records = db.prepare(`
            SELECT a.*, e.name, e.employee_id
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            ORDER BY a.timestamp DESC
        `).all();
        res.json(records);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Upload voice file
app.post('/api/upload-voice', uploadVoice.single('voice'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Return relative path for frontend access
        const filePath = `/voices/${req.file.filename}`;
        res.json({ success: true, path: filePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get office locations
app.get('/api/office-locations', (req, res) => {
    try {
        const locations = db.prepare('SELECT * FROM office_locations WHERE is_active = 1').all();
        // Parse voice_settings for frontend
        const parsedLocations = locations.map(loc => ({
            ...loc,
            voice_settings: loc.voice_settings ? JSON.parse(loc.voice_settings) : null
        }));
        res.json(parsedLocations);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add office location
app.post('/api/add-office-location', (req, res) => {
    try {
        const { name, latitude, longitude, radius, start_time, end_time, voice_settings } = req.body;

        const stmt = db.prepare(`
            INSERT INTO office_locations (name, latitude, longitude, radius, start_time, end_time, voice_settings, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);
        const info = stmt.run(name, latitude, longitude, radius, start_time, end_time,
            voice_settings ? JSON.stringify(voice_settings) : null
        );

        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update office location
app.put('/api/update-office-location', (req, res) => {
    try {
        const { id, name, latitude, longitude, radius, start_time, end_time, voice_settings } = req.body;

        const stmt = db.prepare(`
            UPDATE office_locations 
            SET name = ?, latitude = ?, longitude = ?, radius = ?, start_time = ?, end_time = ?, voice_settings = ?
            WHERE id = ?
        `);
        stmt.run(name, latitude, longitude, radius, start_time, end_time,
            voice_settings ? JSON.stringify(voice_settings) : null,
            id
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete office location
app.delete('/api/delete-office-location/:id', (req, res) => {
    try {
        const stmt = db.prepare('UPDATE office_locations SET is_active = 0 WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get visitors
app.get('/api/visitors', (req, res) => {
    try {
        const visitors = db.prepare('SELECT * FROM visitors ORDER BY check_in_time DESC').all();
        res.json(visitors);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add visitor
// Add visitor
app.post('/api/add-visitor', (req, res) => {
    try {
        const { name, email, phone, purpose, host_employee, photo } = req.body;

        const stmt = db.prepare(`
            INSERT INTO visitors (name, email, phone, purpose, host_employee, photo, check_in_time)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        const info = stmt.run(name, email, phone, purpose, host_employee, photo);

        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Checkout visitor
app.put('/api/checkout-visitor/:id', (req, res) => {
    try {
        const stmt = db.prepare(`
            UPDATE visitors 
            SET status = 'checked_out', check_out_time = datetime('now') 
            WHERE id = ?
        `);
        stmt.run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// APPOINTMENTS
// ==========================================

// Get appointments
app.get('/api/appointments', (req, res) => {
    try {
        const appointments = db.prepare('SELECT * FROM appointments ORDER BY visit_time ASC').all();
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add appointment
app.post('/api/add-appointment', (req, res) => {
    try {
        const { visitor_name, visitor_phone, host_employee, visit_time, purpose } = req.body;
        const stmt = db.prepare(`
            INSERT INTO appointments (visitor_name, visitor_phone, host_employee, visit_time, purpose)
            VALUES (?, ?, ?, ?, ?)
        `);
        const info = stmt.run(visitor_name, visitor_phone, host_employee, visit_time, purpose);
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update appointment status
app.put('/api/update-appointment-status', (req, res) => {
    try {
        const { id, status } = req.body;
        const stmt = db.prepare('UPDATE appointments SET status = ? WHERE id = ?');
        stmt.run(status, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// EMPLOYEE CHECK-IN/OUT
// ==========================================

// Get today's attendance (UTC-based)
app.get('/api/today-attendance', (req, res) => {
    try {
        const records = db.prepare(`
            SELECT 
                a.id,
                a.type,
                a.timestamp,
                a.location,
                a.office_location_id,
                e.employee_id AS employee_id,
                e.name,
                e.department
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE DATE(a.timestamp) = DATE('now')
            ORDER BY a.timestamp DESC
        `).all();
        res.json(records);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check-in employee
app.post('/api/check-in-employee', (req, res) => {
    try {
        const { employeeId } = req.body;
        const employee = db.prepare('SELECT id, office_id FROM employees WHERE employee_id = ?').get(employeeId);

        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }

        const stmt = db.prepare(`
            INSERT INTO attendance (employee_id, type, office_location_id, timestamp)
            VALUES (?, 'check-in', ?, datetime('now'))
        `);
        stmt.run(employee.id, employee.office_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check-out employee
app.post('/api/check-out-employee', (req, res) => {
    try {
        const { employeeId } = req.body;
        const employee = db.prepare('SELECT id, office_id FROM employees WHERE employee_id = ?').get(employeeId);

        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }

        const stmt = db.prepare(`
            INSERT INTO attendance (employee_id, type, office_location_id, timestamp)
            VALUES (?, 'check-out', ?, datetime('now'))
        `);
        stmt.run(employee.id, employee.office_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Dashboard stats
app.get('/api/dashboard-stats', (req, res) => {
    try {
        const todayVisitors = db.prepare(`
            SELECT COUNT(*) as count 
            FROM visitors 
            WHERE DATE(check_in_time) = DATE('now')
        `).get();

        const activeVisitors = db.prepare(`
            SELECT COUNT(*) as count 
            FROM visitors 
            WHERE status = 'checked_in'
        `).get();

        res.json({
            todayVisitors: todayVisitors.count,
            activeVisitors: activeVisitors.count
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API server is running' });
});

// ==========================================
// MONTHLY ATTENDANCE & EMAIL
// ==========================================

// Get monthly attendance for a specific employee
app.get('/api/monthly-attendance/:employeeId', (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;

        const employee = db.prepare('SELECT * FROM employees WHERE employee_id = ?').get(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }

        // Get attendance for the specified month
        const records = db.prepare(`
            SELECT 
                a.type,
                a.timestamp,
                DATE(a.timestamp) as date
            FROM attendance a
            WHERE a.employee_id = ?
            AND strftime('%m', a.timestamp) = ?
            AND strftime('%Y', a.timestamp) = ?
            ORDER BY a.timestamp ASC
        `).all(employee.id, month, year);

        // Group by date
        const dailyAttendance = {};
        records.forEach(record => {
            if (!dailyAttendance[record.date]) {
                dailyAttendance[record.date] = { check_in: null, check_out: null };
            }
            if (record.type === 'check-in' && !dailyAttendance[record.date].check_in) {
                dailyAttendance[record.date].check_in = record.timestamp;
            }
            if (record.type === 'check-out') {
                dailyAttendance[record.date].check_out = record.timestamp;
            }
        });

        res.json({
            employee: {
                id: employee.employee_id,
                name: employee.name,
                email: employee.email,
                department: employee.department
            },
            attendance: dailyAttendance
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all employees monthly attendance (for HR/Founder)
app.get('/api/all-monthly-attendance', (req, res) => {
    try {
        const { month, year } = req.query;

        const employees = db.prepare('SELECT * FROM employees WHERE is_active = 1').all();
        const allAttendance = [];

        employees.forEach(employee => {
            const records = db.prepare(`
                SELECT 
                    a.type,
                    a.timestamp,
                    DATE(a.timestamp) as date
                FROM attendance a
                WHERE a.employee_id = ?
                AND strftime('%m', a.timestamp) = ?
                AND strftime('%Y', a.timestamp) = ?
                ORDER BY a.timestamp ASC
            `).all(employee.id, month, year);

            const dailyAttendance = {};
            records.forEach(record => {
                if (!dailyAttendance[record.date]) {
                    dailyAttendance[record.date] = { check_in: null, check_out: null };
                }
                if (record.type === 'check-in' && !dailyAttendance[record.date].check_in) {
                    dailyAttendance[record.date].check_in = record.timestamp;
                }
                if (record.type === 'check-out') {
                    dailyAttendance[record.date].check_out = record.timestamp;
                }
            });

            allAttendance.push({
                employee: {
                    id: employee.employee_id,
                    name: employee.name,
                    email: employee.email,
                    department: employee.department
                },
                attendance: dailyAttendance
            });
        });

        res.json(allAttendance);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send monthly attendance email
app.post('/api/send-monthly-attendance', async (req, res) => {
    try {
        const { employeeId, month, year, sendToAll } = req.body;

        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'Month and year are required' });
        }

        const results = [];

        if (sendToAll) {
            // Send to all employees
            const employees = db.prepare('SELECT * FROM employees WHERE is_active = 1').all();

            for (const employee of employees) {
                // Get attendance data
                const records = db.prepare(`
                    SELECT 
                        a.type,
                        a.timestamp,
                        DATE(a.timestamp) as date
                    FROM attendance a
                    WHERE a.employee_id = ?
                    AND strftime('%m', a.timestamp) = ?
                    AND strftime('%Y', a.timestamp) = ?
                    ORDER BY a.timestamp ASC
                `).all(employee.id, month, year);

                // Group by date
                const dailyAttendance = {};
                records.forEach(record => {
                    if (!dailyAttendance[record.date]) {
                        dailyAttendance[record.date] = { check_in: null, check_out: null };
                    }
                    if (record.type === 'check-in' && !dailyAttendance[record.date].check_in) {
                        dailyAttendance[record.date].check_in = record.timestamp;
                    }
                    if (record.type === 'check-out') {
                        dailyAttendance[record.date].check_out = record.timestamp;
                    }
                });

                // Send email
                const result = await sendEmployeeMonthlyReport(
                    {
                        id: employee.employee_id,
                        name: employee.name,
                        email: employee.email,
                        department: employee.department
                    },
                    dailyAttendance,
                    month,
                    year
                );

                results.push({
                    employee: employee.name,
                    email: employee.email,
                    ...result
                });
            }

            // Send consolidated report to HR/Founder
            const hrEmployees = employees.filter(e =>
                e.designation?.toLowerCase().includes('hr') ||
                e.designation?.toLowerCase().includes('founder')
            );

            if (hrEmployees.length > 0) {
                // Get all employees data for consolidated report
                const allEmployeesData = employees.map(employee => {
                    const records = db.prepare(`
                        SELECT 
                            a.type,
                            a.timestamp,
                            DATE(a.timestamp) as date
                        FROM attendance a
                        WHERE a.employee_id = ?
                        AND strftime('%m', a.timestamp) = ?
                        AND strftime('%Y', a.timestamp) = ?
                        ORDER BY a.timestamp ASC
                    `).all(employee.id, month, year);

                    const dailyAttendance = {};
                    records.forEach(record => {
                        if (!dailyAttendance[record.date]) {
                            dailyAttendance[record.date] = { check_in: null, check_out: null };
                        }
                        if (record.type === 'check-in' && !dailyAttendance[record.date].check_in) {
                            dailyAttendance[record.date].check_in = record.timestamp;
                        }
                        if (record.type === 'check-out') {
                            dailyAttendance[record.date].check_out = record.timestamp;
                        }
                    });

                    return {
                        employee: {
                            id: employee.employee_id,
                            name: employee.name,
                            email: employee.email,
                            department: employee.department
                        },
                        attendance: dailyAttendance
                    };
                });

                for (const hrEmployee of hrEmployees) {
                    const result = await sendConsolidatedReport(
                        {
                            id: hrEmployee.employee_id,
                            name: hrEmployee.name,
                            email: hrEmployee.email,
                            department: hrEmployee.department
                        },
                        allEmployeesData,
                        month,
                        year
                    );

                    results.push({
                        employee: `${hrEmployee.name} (Consolidated)`,
                        email: hrEmployee.email,
                        ...result
                    });
                }
            }

            res.json({
                success: true,
                message: `Sent ${results.length} emails`,
                results: results
            });

        } else if (employeeId) {
            // Send to specific employee
            const employee = db.prepare('SELECT * FROM employees WHERE employee_id = ?').get(employeeId);

            if (!employee) {
                return res.status(404).json({ success: false, error: 'Employee not found' });
            }

            // Get attendance data
            const records = db.prepare(`
                SELECT 
                    a.type,
                    a.timestamp,
                    DATE(a.timestamp) as date
                FROM attendance a
                WHERE a.employee_id = ?
                AND strftime('%m', a.timestamp) = ?
                AND strftime('%Y', a.timestamp) = ?
                ORDER BY a.timestamp ASC
            `).all(employee.id, month, year);

            // Group by date
            const dailyAttendance = {};
            records.forEach(record => {
                if (!dailyAttendance[record.date]) {
                    dailyAttendance[record.date] = { check_in: null, check_out: null };
                }
                if (record.type === 'check-in' && !dailyAttendance[record.date].check_in) {
                    dailyAttendance[record.date].check_in = record.timestamp;
                }
                if (record.type === 'check-out') {
                    dailyAttendance[record.date].check_out = record.timestamp;
                }
            });

            // Send email
            const result = await sendEmployeeMonthlyReport(
                {
                    id: employee.employee_id,
                    name: employee.name,
                    email: employee.email,
                    department: employee.department
                },
                dailyAttendance,
                month,
                year
            );

            res.json({
                success: result.success,
                message: result.success ? 'Email sent successfully' : 'Failed to send email',
                error: result.error
            });

        } else {
            res.status(400).json({ success: false, error: 'Either employeeId or sendToAll must be specified' });
        }

    } catch (error) {
        console.error('Error sending monthly attendance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Catch‑all route for SPA support
app.use((req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // If the build hasn't been run yet, return a simple JSON response
        res.status(200).json({ message: 'Frontend not built – run `npm run build` locally.' });
    }
});

// Start server with error handling
try {
    app.listen(PORT, '0.0.0.0', async () => {
        log('✅ Server started successfully on port', PORT);
        console.log(`🚀 API Server running on http://0.0.0.0:${PORT}`);
        console.log(`Database: ${dbPath}`);
        console.log(`\n📡 Available endpoints:`);
        console.log(`   GET  /api/health`);
        console.log(`   GET  /api/employees`);
        console.log(`   POST /api/register-employee`);
        console.log(`   GET  /api/attendance`);
        console.log(`   POST /api/mark-attendance`);
        console.log(`   GET  /api/office-locations`);
        console.log(`   POST /api/add-office-location`);
        console.log(`   PUT  /api/update-office-location`);
        console.log(`   DELETE /api/delete-office-location/:id`);
        console.log(`   GET  /api/visitors`);
        console.log(`   POST /api/add-visitor`);
        console.log(`   POST /api/send-monthly-attendance`);
        console.log(``);

        // Test email configuration on startup
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await testEmailConfig();
                console.log(`📧 Email service configured and ready`);
            } else {
                console.log(`⚠️  Email service not configured (set EMAIL_USER and EMAIL_PASS)`);
            }
        } catch (error) {
            console.log(`⚠️  Email configuration error: ${error.message}`);
        }

        // Setup automated monthly attendance email scheduler
        // Runs at 11:59 PM on days 28-31 of every month
        // Only sends if tomorrow is the 1st (meaning today is the last day of the month)
        cron.schedule('59 23 28-31 * *', async () => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Only run if tomorrow is the 1st (meaning today is last day of month)
            if (tomorrow.getDate() === 1) {
                console.log('📧 Starting automated monthly attendance email send...');

                const month = String(today.getMonth() + 1).padStart(2, '0');
                const year = String(today.getFullYear());

                try {
                    // Send to all employees
                    const employees = db.prepare('SELECT * FROM employees WHERE is_active = 1').all();
                    let successCount = 0;
                    let failCount = 0;

                    for (const employee of employees) {
                        const records = db.prepare(`
                        SELECT a.type, a.timestamp, DATE(a.timestamp) as date
                        FROM attendance a
                        WHERE a.employee_id = ?
                        AND strftime('%m', a.timestamp) = ?
                        AND strftime('%Y', a.timestamp) = ?
                        ORDER BY a.timestamp ASC
                    `).all(employee.id, month, year);

                        const dailyAttendance = {};
                        records.forEach(record => {
                            if (!dailyAttendance[record.date]) {
                                dailyAttendance[record.date] = { check_in: null, check_out: null };
                            }
                            if (record.type === 'check-in' && !dailyAttendance[record.date].check_in) {
                                dailyAttendance[record.date].check_in = record.timestamp;
                            }
                            if (record.type === 'check-out') {
                                dailyAttendance[record.date].check_out = record.timestamp;
                            }
                        });

                        const result = await sendEmployeeMonthlyReport(
                            { id: employee.employee_id, name: employee.name, email: employee.email, department: employee.department },
                            dailyAttendance, month, year
                        );
                        if (result.success) successCount++; else failCount++;
                    }

                    // Send consolidated to HR/Founder
                    const hrEmployees = employees.filter(e =>
                        e.designation?.toLowerCase().includes('hr') || e.designation?.toLowerCase().includes('founder')
                    );

                    if (hrEmployees.length > 0) {
                        const allEmployeesData = employees.map(employee => {
                            const records = db.prepare(`
                            SELECT a.type, a.timestamp, DATE(a.timestamp) as date
                            FROM attendance a WHERE a.employee_id = ?
                            AND strftime('%m', a.timestamp) = ? AND strftime('%Y', a.timestamp) = ?
                        `).all(employee.id, month, year);
                            const dailyAttendance = {};
                            records.forEach(record => {
                                if (!dailyAttendance[record.date]) dailyAttendance[record.date] = { check_in: null, check_out: null };
                                if (record.type === 'check-in' && !dailyAttendance[record.date].check_in) dailyAttendance[record.date].check_in = record.timestamp;
                                if (record.type === 'check-out') dailyAttendance[record.date].check_out = record.timestamp;
                            });
                            return { employee: { id: employee.employee_id, name: employee.name, email: employee.email, department: employee.department }, attendance: dailyAttendance };
                        });

                        for (const hrEmployee of hrEmployees) {
                            const result = await sendConsolidatedReport(
                                { id: hrEmployee.employee_id, name: hrEmployee.name, email: hrEmployee.email, department: hrEmployee.department },
                                allEmployeesData, month, year
                            );
                            if (result.success) successCount++; else failCount++;
                        }
                    }

                    console.log(`✅ Monthly emails sent! Success: ${successCount}, Failed: ${failCount}`);
                } catch (error) {
                    console.error('❌ Error in automated monthly email:', error);
                }
            }
        }, { timezone: "Asia/Kolkata" });

        console.log(`⏰ Automated monthly email scheduler activated (IST timezone)`);
    }).on('error', (err) => {
        log('❌ Server failed to start:', err.message || err);
        console.error('❌ Server failed to start:', err);
        process.exit(1);
    });
} catch (error) {
    log('❌ Fatal error starting server:', error.message || error);
    console.error('❌ Fatal error starting server:', error);
    process.exit(1);
}

export default app;
