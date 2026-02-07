// Utility to generate CSV in the format: Employee name, then Date | In Time | Out Time | Status
export function generateAttendanceCSV(attendanceData: any[]) {
    const lines: string[] = [];

    // Group by employee
    const employeeMap = new Map();

    attendanceData.forEach(record => {
        const key = record.employee_id;
        if (!employeeMap.has(key)) {
            employeeMap.set(key, {
                employee_id: record.employee_id,
                name: record.name,
                records: []
            });
        }
        employeeMap.get(key).records.push(record);
    });

    // Sort employees by name
    const employees = Array.from(employeeMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    // Generate CSV for each employee
    employees.forEach((employee, index) => {
        // Add employee header
        lines.push(`Employee: ${employee.name}`);
        lines.push('Date,In Time,Out Time,Status');
        lines.push('----------------------------------------');

        // Group records by date
        const dateMap = new Map();
        employee.records.forEach((record: any) => {
            const date = new Date(record.timestamp).toISOString().split('T')[0];
            if (!dateMap.has(date)) {
                dateMap.set(date, { checkIn: null, checkOut: null });
            }
            if (record.type === 'check-in') {
                dateMap.get(date).checkIn = record.timestamp;
            } else if (record.type === 'check-out') {
                dateMap.get(date).checkOut = record.timestamp;
            }
        });

        // Sort dates
        const sortedDates = Array.from(dateMap.keys()).sort();

        // Add records
        sortedDates.forEach(date => {
            const record = dateMap.get(date);
            const dateFormatted = new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short'
            });

            const inTime = record.checkIn
                ? new Date(record.checkIn).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })
                : '--';

            const outTime = record.checkOut
                ? new Date(record.checkOut).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })
                : '--';

            const status = record.checkIn ? 'Present' : 'Absent';

            lines.push(`${dateFormatted},${inTime},${outTime},${status}`);
        });

        // Add blank line between employees (except last)
        if (index < employees.length - 1) {
            lines.push('');
            lines.push('');
        }
    });

    return lines.join('\n');
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
