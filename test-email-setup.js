// Ultra-simple test script - just add employee and attendance
import Database from 'better-sqlite3';

const db = new Database('./visitor_management.db');

console.log('Setting up test data...\n');

try {
    // 1. Create test employee
    const employeeId = 'TEST001';
    let employee = db.prepare('SELECT * FROM employees WHERE employee_id = ?').get(employeeId);

    if (!employee) {
        db.prepare(`
            INSERT INTO employees (employee_id, name, email, phone, department, designation, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(employeeId, 'Test Employee', 'myname@companyname.com', '1234567890', 'IT', 'Developer', 1);

        employee = db.prepare('SELECT * FROM employees WHERE employee_id = ?').get(employeeId);
        console.log('✅ Test employee created');
    } else {
        console.log('✅ Test employee exists');
    }

    console.log(`   Name: ${employee.name}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   ID: ${employee.employee_id}\n`);

    // 2. Add attendance for last 5 days
    console.log('📅 Adding attendance records...\n');

    for (let i = 5; i >= 1; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const checkIn = new Date(date);
        checkIn.setHours(9, 0, 0, 0);

        const checkOut = new Date(date);
        checkOut.setHours(18, 0, 0, 0);

        const format = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

        // Check if exists
        const exists = db.prepare(`
            SELECT * FROM attendance 
            WHERE employee_id = ? AND DATE(timestamp) = DATE(?)
        `).get(employee.id, format(checkIn));

        if (!exists) {
            // Insert without office_location_id (it's nullable)
            db.prepare(`
                INSERT INTO attendance (employee_id, type, timestamp)
                VALUES (?, ?, ?)
            `).run(employee.id, 'check-in', format(checkIn));

            db.prepare(`
                INSERT INTO attendance (employee_id, type, timestamp)
                VALUES (?, ?, ?)
            `).run(employee.id, 'check-out', format(checkOut));

            console.log(`   ✅ ${format(checkIn).split(' ')[0]} - 9:00 AM to 6:00 PM`);
        }
    }

    // 3. Show summary
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());

    const count = db.prepare(`
        SELECT COUNT(*) as count FROM attendance 
        WHERE employee_id = ? 
        AND strftime('%m', timestamp) = ?
        AND strftime('%Y', timestamp) = ?
    `).get(employee.id, month, year);

    console.log('\n✅ Setup complete!\n');
    console.log('Summary:');
    console.log(`   Employee: ${employee.name} (${employee.employee_id})`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Attendance records this month: ${count.count}`);
    console.log(`   Month: ${month}/${year}\n`);

    console.log('🎯 Next: Update .env with your email credentials, then send test email:\n');
    console.log(`curl -X POST http://localhost:3001/api/send-monthly-attendance -H "Content-Type: application/json" -d "{\\"employeeId\\": \\"${employee.employee_id}\\", \\"month\\": \\"${month}\\", \\"year\\": \\"${year}\\"}"\n`);

    console.log('Or use this PowerShell command:\n');
    console.log(`Invoke-RestMethod -Uri "http://localhost:3001/api/send-monthly-attendance" -Method POST -ContentType "application/json" -Body '{\\"employeeId\\": \\"${employee.employee_id}\\", \\"month\\": \\"${month}\\", \\"year\\": \\"${year}\\"}'\n`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
} finally {
    db.close();
}
