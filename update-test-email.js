// Quick script to update test employee email
import Database from 'better-sqlite3';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your email address: ', (email) => {
    const db = new Database('./visitor_management.db');

    try {
        db.prepare('UPDATE employees SET email = ? WHERE employee_id = ?')
            .run(email, 'TEST001');

        const employee = db.prepare('SELECT * FROM employees WHERE employee_id = ?')
            .get('TEST001');

        console.log('\n✅ Email updated successfully!');
        console.log(`   Employee: ${employee.name}`);
        console.log(`   New Email: ${employee.email}`);
        console.log(`   Employee ID: ${employee.employee_id}\n`);
        console.log('🎯 Now you can send a test email to this address!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        db.close();
        rl.close();
    }
});
