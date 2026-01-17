import { ipcMain } from 'electron';
import { getDB } from './db';

export function setupIPC() {
    // Visitor Handlers
    ipcMain.handle('get-visitors', () => {
        const db = getDB();
        return db.prepare('SELECT * FROM visitors ORDER BY check_in_time DESC').all();
    });

    ipcMain.handle('add-visitor', (_event, visitor) => {
        const db = getDB();
        try {
            const stmt = db.prepare(`
        INSERT INTO visitors (name, phone, email, company, host_employee, purpose, photo, status, check_in_time)
        VALUES (@name, @phone, @email, @company, @host_employee, @purpose, @photo, 'checked_in', datetime('now', 'localtime'))
        `);
            const info = stmt.run(visitor);
            return { success: true, id: info.lastInsertRowid };
        } catch (error: any) {
            console.error('Failed to add visitor:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('checkout-visitor', (_event, id) => {
        const db = getDB();
        try {
            const stmt = db.prepare(`
            UPDATE visitors 
            SET status = 'checked_out', check_out_time = datetime('now', 'localtime') 
            WHERE id = ?
          `);
            stmt.run(id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Dashboard Stats
    ipcMain.handle('get-dashboard-stats', () => {
        const db = getDB();
        const visitorCount = db.prepare("SELECT COUNT(*) as count FROM visitors WHERE date(check_in_time) = date('now')").get() as { count: number };
        const activeCount = db.prepare("SELECT COUNT(*) as count FROM visitors WHERE status = 'checked_in'").get() as { count: number };
        return {
            todayVisitors: visitorCount.count,
            activeVisitors: activeCount.count
        };
    });

    // Appointment Handlers
    ipcMain.handle('get-appointments', () => {
        const db = getDB();
        return db.prepare('SELECT * FROM appointments ORDER BY visit_time ASC').all();
    });

    ipcMain.handle('add-appointment', (_event, appointment) => {
        const db = getDB();
        try {
            const stmt = db.prepare(`
                INSERT INTO appointments (visitor_name, visitor_phone, host_employee, visit_time, purpose, status)
                VALUES (@visitor_name, @visitor_phone, @host_employee, @visit_time, @purpose, 'pending')
            `);
            const info = stmt.run(appointment);
            return { success: true, id: info.lastInsertRowid };
        } catch (error: any) {
            console.error('Failed to add appointment:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-appointment-status', (_event, { id, status }) => {
        const db = getDB();
        try {
            const stmt = db.prepare('UPDATE appointments SET status = ? WHERE id = ?');
            stmt.run(status, id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Employee Handlers
    ipcMain.handle('get-employees', () => {
        const db = getDB();
        try {
            return db.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name ASC").all();
        } catch (error: any) {
            // Table might not exist yet
            console.log('Employees table not found, returning empty array');
            return [];
        }
    });

    ipcMain.handle('add-employee', (_event, employee) => {
        const db = getDB();
        try {
            const stmt = db.prepare(`
                INSERT INTO employees (employee_id, name, email, phone, department, designation, photo, face_descriptor, status, office_id)
                VALUES (@employee_id, @name, @email, @phone, @department, @designation, @photo, @face_descriptor, 'active', @office_id)
            `);
            const info = stmt.run(employee);
            return { success: true, id: info.lastInsertRowid };
        } catch (error: any) {
            console.error('Failed to add employee:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-employee-by-id', (_event, employeeId) => {
        const db = getDB();
        return db.prepare('SELECT * FROM employees WHERE employee_id = ?').get(employeeId);
    });

    // Attendance Handlers
    ipcMain.handle('check-in-employee', (_event, employeeId) => {
        const db = getDB();
        try {
            // Check if already checked in today
            const today = new Date().toISOString().split('T')[0];
            const existing = db.prepare(`
                SELECT * FROM attendance 
                WHERE employee_id = ? AND date = ? AND check_out_time IS NULL
            `).get(employeeId, today);

            if (existing) {
                return { success: false, error: 'Already checked in today' };
            }

            const stmt = db.prepare(`
                INSERT INTO attendance (employee_id, check_in_time, date, status, office_id)
                VALUES (?, datetime('now', 'localtime'), date('now'), 'present', 
                    (SELECT office_id FROM employees WHERE employee_id = ?))
            `);
            const info = stmt.run(employeeId, employeeId);
            return { success: true, id: info.lastInsertRowid };
        } catch (error: any) {
            console.error('Failed to check in employee:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('check-out-employee', (_event, employeeId) => {
        const db = getDB();
        try {
            const today = new Date().toISOString().split('T')[0];
            const stmt = db.prepare(`
                UPDATE attendance 
                SET check_out_time = datetime('now', 'localtime') 
                WHERE employee_id = ? AND date = ? AND check_out_time IS NULL
            `);
            const info = stmt.run(employeeId, today);

            if (info.changes === 0) {
                return { success: false, error: 'No active check-in found for today' };
            }

            return { success: true };
        } catch (error: any) {
            console.error('Failed to check out employee:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-attendance', (_event, filters) => {
        const db = getDB();
        let query = `
            SELECT a.*, e.name, e.department, e.designation 
            FROM attendance a 
            JOIN employees e ON a.employee_id = e.employee_id
        `;
        const params: any[] = [];

        if (filters?.date) {
            query += ' WHERE a.date = ?';
            params.push(filters.date);
        } else if (filters?.startDate && filters?.endDate) {
            query += ' WHERE a.date BETWEEN ? AND ?';
            params.push(filters.startDate, filters.endDate);
        }

        query += ' ORDER BY a.check_in_time DESC';

        return db.prepare(query).all(...params);
    });

    ipcMain.handle('get-today-attendance', () => {
        const db = getDB();
        try {
            const today = new Date().toISOString().split('T')[0];
            return db.prepare(`
                SELECT a.*, e.name, e.department, e.designation, e.photo
                FROM attendance a 
                JOIN employees e ON a.employee_id = e.employee_id
                WHERE a.date = ?
                ORDER BY a.check_in_time DESC
            `).all(today);
        } catch (error: any) {
            console.log('Attendance table not found, returning empty array');
            return []
        }
    });

    // Office Location Handlers
    ipcMain.handle('get-office-locations', () => {
        const db = getDB();
        try {
            return db.prepare('SELECT * FROM office_locations WHERE is_active = 1 ORDER BY name ASC').all();
        } catch (error: any) {
            console.log('Office locations table not found, returning empty array');
            return [];
        }
    });

    ipcMain.handle('add-office-location', (_event, office) => {
        const db = getDB();
        try {
            const stmt = db.prepare(`
                INSERT INTO office_locations (name, latitude, longitude, radius, start_time, end_time, is_active)
                VALUES (@name, @latitude, @longitude, @radius, @start_time, @end_time, 1)
            `);
            const info = stmt.run(office);
            return { success: true, id: info.lastInsertRowid };
        } catch (error: any) {
            console.error('Failed to add office location:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-office-location', (_event, { id, ...office }) => {
        const db = getDB();
        try {
            const stmt = db.prepare(`
                UPDATE office_locations 
                SET name = @name, latitude = @latitude, longitude = @longitude, radius = @radius, 
                    start_time = @start_time, end_time = @end_time
                WHERE id = @id
            `);
            stmt.run({ id, ...office });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('delete-office-location', (_event, id) => {
        const db = getDB();
        try {
            const stmt = db.prepare('UPDATE office_locations SET is_active = 0 WHERE id = ?');
            stmt.run(id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
}
