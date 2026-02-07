# Quick Face Auth Integration Script
# This script adds the necessary imports and state for face authentication
# Manual steps still needed: wrap return JSX with auth modal and conditional rendering

Write-Host "Adding face auth to EmployeeRegistration.tsx and OfficeManagement.tsx..."

# EmployeeRegistration.tsx
$empRegPath = "c:\UtkarshSohane\SBharat\visitor-management-system\src\pages\EmployeeRegistration.tsx"
$content = Get-Content $empRegPath -Raw

# Add imports if not present
if ($content -notmatch "useNavigate") {
    $content = $content -replace "import React, { useState, useRef, useEffect } from 'react';", "import React, { useState, useRef, useEffect } from 'react';`r`nimport { useNavigate } from 'react-router-dom';"
}
if ($content -notmatch "FaceAuthModal") {
    $content = $content -replace "import api from '../utils/api';", "import api from '../utils/api';`r`nimport FaceAuthModal from '../components/FaceAuthModal';"
}

# Add state variables after existing useState declarations
if ($content -notmatch "isAuthenticated") {
    $content = $content -replace "(\s+const \[stream, setStream\] = useState<MediaStream \| null>\(null\);)", "`$1`r`n    const navigate = useNavigate();`r`n    const [isAuthenticated, setIsAuthenticated] = useState(false);`r`n    const [showAuthModal, setShowAuthModal] = useState(true);`r`n    const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);"
}

Set-Content $empRegPath -Value $content -NoNewline

# OfficeManagement.tsx
$officePath = "c:\UtkarshSohane\SBharat\visitor-management-system\src\pages\OfficeManagement.tsx"
$content2 = Get-Content $officePath -Raw

# Add imports if not present
if ($content2 -notmatch "useNavigate") {
    $content2 = $content2 -replace "import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';`r`nimport { useNavigate } from 'react-router-dom';"
}
if ($content2 -notmatch "FaceAuthModal") {
    $content2 = $content2 -replace "import api from '../utils/api';", "import api from '../utils/api';`r`nimport FaceAuthModal from '../components/FaceAuthModal';"
}

# Add state variables
if ($content2 -notmatch "isAuthenticated") {
    $content2 = $content2 -replace "(\s+const \[showModal, setShowModal\] = useState\(false\);)", "`$1`r`n    const navigate = useNavigate();`r`n    const [isAuthenticated, setIsAuthenticated] = useState(false);`r`n    const [showAuthModal, setShowAuthModal] = useState(true);`r`n    const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);"
}

Set-Content $officePath -Value $content2 -NoNewline

Write-Host "✅ Imports and state added!"
Write-Host ""
Write-Host "⚠️ MANUAL STEPS REQUIRED:"
Write-Host "1. Open EmployeeRegistration.tsx"
Write-Host "2. Wrap the return JSX with FaceAuthModal (see Appointments.tsx for example)"
Write-Host "3. Open OfficeManagement.tsx"
Write-Host "4. Wrap the return JSX with FaceAuthModal (see Appointments.tsx for example)"
Write-Host ""
Write-Host "Example pattern:"
Write-Host @"
<FaceAuthModal
    isOpen={showAuthModal}
    onClose={() => navigate('/')}
    onAuthenticated={(employee) => {
        setAuthenticatedUser(employee);
        setIsAuthenticated(true);
        setShowAuthModal(false);
    }}
    requiredRoles={['HR', 'Founder', 'Manager']}
    title="Page Title - Authentication Required"
/>

{!isAuthenticated ? (
    <div>Please authenticate...</div>
) : (
    <>
        {/* Your existing content here */}
    </>
)}
"@
