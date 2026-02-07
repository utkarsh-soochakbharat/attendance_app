import nodemailer from 'nodemailer';
import XLSX from 'xlsx';

// Create reusable transporter
let transporter = null;

function getTransporter() {
    if (!transporter) {
        // Create config dynamically to ensure env vars are loaded
        const emailConfig = {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        };

        transporter = nodemailer.createTransport(emailConfig);
    }
    return transporter;
}

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Format time for display
function formatTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Calculate total hours worked
function calculateHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '-';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Generate HTML for individual employee monthly report
function generateEmployeeAttendanceHTML(employee, attendanceData, month, year) {
    const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Calculate statistics
    const dates = Object.keys(attendanceData);
    const totalDays = dates.length;
    const presentDays = dates.filter(date => attendanceData[date].check_in).length;
    const absentDays = totalDays - presentDays;

    let totalHours = 0;
    dates.forEach(date => {
        const record = attendanceData[date];
        if (record.check_in && record.check_out) {
            const diff = new Date(record.check_out) - new Date(record.check_in);
            totalHours += diff / (1000 * 60 * 60);
        }
    });

    // Generate table rows
    const rows = dates.sort().map(date => {
        const record = attendanceData[date];
        const hours = calculateHours(record.check_in, record.check_out);

        return `
            <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatDate(date)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatTime(record.check_in)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatTime(record.check_out)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${hours}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">
                    <span style="padding: 4px 8px; border-radius: 4px; background: ${record.check_in ? '#10b981' : '#ef4444'}; color: white; font-size: 12px;">
                        ${record.check_in ? 'Present' : 'Absent'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .stats { display: flex; gap: 20px; margin-bottom: 30px; }
        .stat-card { flex: 1; background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
        .stat-label { color: #6b7280; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .footer { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Monthly Attendance Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${monthName}</p>
        </div>

        <div style="margin-bottom: 20px;">
            <h2 style="color: #667eea;">Employee Details</h2>
            <p><strong>Name:</strong> ${employee.name}</p>
            <p><strong>Employee ID:</strong> ${employee.id}</p>
            <p><strong>Department:</strong> ${employee.department || 'N/A'}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${presentDays}</div>
                <div class="stat-label">Days Present</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${absentDays}</div>
                <div class="stat-label">Days Absent</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalHours.toFixed(1)}h</div>
                <div class="stat-label">Total Hours</div>
            </div>
        </div>

        <h2 style="color: #667eea;">Daily Attendance</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <div class="footer">
            <p>This is an automated report generated by the Visitor Management System.</p>
            <p>For any queries, please contact HR department.</p>
        </div>
    </div>
</body>
</html>
    `;
}

// Generate HTML for consolidated HR report
function generateConsolidatedReportHTML(allEmployeesData, month, year) {
    const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const rows = allEmployeesData.map(empData => {
        const dates = Object.keys(empData.attendance);
        const presentDays = dates.filter(date => empData.attendance[date].check_in).length;
        const totalDays = dates.length;
        const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0';

        let totalHours = 0;
        dates.forEach(date => {
            const record = empData.attendance[date];
            if (record.check_in && record.check_out) {
                const diff = new Date(record.check_out) - new Date(record.check_in);
                totalHours += diff / (1000 * 60 * 60);
            }
        });

        return `
            <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${empData.employee.id}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${empData.employee.name}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${empData.employee.department || 'N/A'}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${presentDays}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${totalDays - presentDays}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${totalHours.toFixed(1)}h</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">
                    <span style="padding: 4px 8px; border-radius: 4px; background: ${attendanceRate >= 80 ? '#10b981' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444'}; color: white; font-size: 12px;">
                        ${attendanceRate}%
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .footer { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Consolidated Attendance Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${monthName} - All Employees</p>
        </div>

        <h2 style="color: #667eea;">Employee Attendance Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th style="text-align: center;">Present</th>
                    <th style="text-align: center;">Absent</th>
                    <th style="text-align: center;">Total Hours</th>
                    <th style="text-align: center;">Attendance %</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <div class="footer">
            <p>This is an automated consolidated report generated by the Visitor Management System.</p>
            <p>Total Employees: ${allEmployeesData.length}</p>
        </div>
    </div>
</body>
</html>
    `;
}

// Generate CSV for individual employee
function generateEmployeeCSV(employee, attendanceData, month, year) {
    const lines = [];
    const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Header
    lines.push(`Employee: ${employee.name}`);
    lines.push('Date,In Time,Out Time,Status');
    lines.push('----------------------------------------');

    // Get all dates in the month
    const dates = Object.keys(attendanceData).sort();

    dates.forEach(date => {
        const record = attendanceData[date];
        const dateFormatted = new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
        });

        const inTime = record.check_in
            ? new Date(record.check_in).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
            : '--';

        const outTime = record.check_out
            ? new Date(record.check_out).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
            : '--';

        const status = record.check_in ? 'Present' : 'Absent';

        lines.push(`${dateFormatted},${inTime},${outTime},${status}`);
    });

    return lines.join('\n');
}
function generateEmployeeExcel(employee, attendanceData, month, year) {
    const sheetData = [];

    // Header row
    sheetData.push([
        'Date',
        'Check-In',
        'Check-Out',
        'Hours',
        'Status'
    ]);

    const dates = Object.keys(attendanceData).sort();

    dates.forEach(date => {
        const record = attendanceData[date];

        const checkIn = record.check_in
            ? new Date(record.check_in).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
            : '';

        const checkOut = record.check_out
            ? new Date(record.check_out).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
            : '';

        const hours = calculateHours(record.check_in, record.check_out);
        const status = record.check_in ? 'Present' : 'Absent';

        sheetData.push([
            formatDate(date),
            checkIn,
            checkOut,
            hours,
            status
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    return XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx'
    });
}


// Send individual employee monthly attendance email
export async function sendEmployeeMonthlyReport(employee, attendanceData, month, year) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials not configured. Skipping email send.');
        return { success: false, error: 'Email not configured' };
    }

    if (!employee.email) {
        console.warn(`No email address for employee ${employee.name}`);
        return { success: false, error: 'No email address' };
    }

    try {
        const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        const html = generateEmployeeAttendanceHTML(employee, attendanceData, month, year);

        // Generate Excel attachment
        const excelBuffer = generateEmployeeExcel(employee, attendanceData, month, year);

        const mailOptions = {
            from: `"Visitor Management System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: employee.email,
            subject: `Monthly Attendance Report - ${monthName}`,
            html: html,
            attachments: [
                {
                    filename: `Attendance_${employee.name.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.xlsx`,
                    content: excelBuffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        };

        const info = await getTransporter().sendMail(mailOptions);
        console.log(`✅ Email sent to ${employee.name} (${employee.email}): ${info.messageId}`);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${employee.name}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Send consolidated report to HR/Founder
export async function sendConsolidatedReport(hrEmployee, allEmployeesData, month, year) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials not configured. Skipping email send.');
        return { success: false, error: 'Email not configured' };
    }

    if (!hrEmployee.email) {
        console.warn(`No email address for HR ${hrEmployee.name}`);
        return { success: false, error: 'No email address' };
    }

    try {
        const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        const html = generateConsolidatedReportHTML(allEmployeesData, month, year);

        const mailOptions = {
            from: `"Visitor Management System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: hrEmployee.email,
            subject: `Consolidated Attendance Report - ${monthName}`,
            html: html
        };

        const info = await getTransporter().sendMail(mailOptions);
        console.log(`✅ Consolidated report sent to ${hrEmployee.name} (${hrEmployee.email}): ${info.messageId}`);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send consolidated report to ${hrEmployee.name}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Test email configuration
export async function testEmailConfig() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials not configured');
    }

    try {
        await getTransporter().verify();
        console.log('✅ Email configuration is valid');
        return true;
    } catch (error) {
        console.error('❌ Email configuration error:', error.message);
        throw error;
    }
}
