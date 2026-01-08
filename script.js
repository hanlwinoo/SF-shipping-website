// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD123abc456def789ghi",
    authDomain: "logstic-system.firebaseapp.com",
    databaseURL: "https://logstic-system-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "logstic-system",
    storageBucket: "logstic-system.appspot.com",
    messagingSenderId: "929186977018",
    appId: "1:929186977018:web:342a2cf9454f03c8e0a543"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Admin credentials
const ADMIN_USERNAME = "hanlwinoo";
const ADMIN_PASSWORD = "1500love";

// Global variables
let currentTrackingNumber = '';

// Check current page
const currentPage = window.location.pathname.split("/").pop();

// Check URL parameters for QR code tracking
if (window.location.search.includes('track=')) {
    const params = new URLSearchParams(window.location.search);
    const trackingNumber = params.get('track');
    const confirmationCode = params.get('code');
    
    if (trackingNumber && confirmationCode) {
        // Auto-track from QR code
        localStorage.setItem('autoTrack', JSON.stringify({ trackingNumber, confirmationCode }));
    }
}

// Index Page Logic
if (currentPage === "index.html" || currentPage === "" || currentPage.includes("index")) {
    initializeIndexPage();
}

// Admin Page Logic
if (currentPage === "admin.html" || currentPage.includes("admin")) {
    initializeAdminPage();
}

function initializeIndexPage() {
    console.log("Initializing Index Page with QR System...");
    
    // DOM Elements
    const trackingNumberInput = document.getElementById('trackingNumber');
    const confirmationCodeInput = document.getElementById('confirmationCode');
    const trackButton = document.getElementById('trackButton');
    const resultSection = document.getElementById('resultSection');
    const errorMessage = document.getElementById('errorMessage');
    const adminLogo = document.getElementById('adminLogo');
    const loginModal = document.getElementById('loginModal');
    const qrModal = document.getElementById('qrModal');
    const closeModal = document.querySelectorAll('.close');
    const loginButton = document.getElementById('loginButton');
    const newSearchButton = document.getElementById('newSearchButton');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    const downloadQRBtn = document.getElementById('downloadQRBtn');

    // Double click handler for logo
    let logoClickCount = 0;
    let logoClickTimer;

    if (adminLogo) {
        adminLogo.addEventListener('click', function() {
            logoClickCount++;
            
            if (logoClickCount === 1) {
                logoClickTimer = setTimeout(() => {
                    logoClickCount = 0;
                }, 500);
            } else if (logoClickCount === 2) {
                clearTimeout(logoClickTimer);
                logoClickCount = 0;
                console.log("Logo double clicked, opening admin login...");
                openLoginModal();
            }
        });
    }

    // Check for auto-track from QR code
    window.addEventListener('load', function() {
        const autoTrack = localStorage.getItem('autoTrack');
        if (autoTrack) {
            const { trackingNumber, confirmationCode } = JSON.parse(autoTrack);
            trackingNumberInput.value = trackingNumber;
            confirmationCodeInput.value = confirmationCode;
            trackShipment();
            localStorage.removeItem('autoTrack');
        }
        
        if (trackingNumberInput) {
            trackingNumberInput.focus();
        }
    });

    // Tracking function
    async function trackShipment() {
        const trackingNumber = trackingNumberInput.value.trim().toUpperCase();
        const confirmationCode = confirmationCodeInput.value.trim().toUpperCase();

        // Reset errors
        errorMessage.style.display = 'none';
        resultSection.style.display = 'none';

        // Validation
        if (!trackingNumber || !confirmationCode) {
            showError("Please enter both tracking number and confirmation code.");
            return;
        }

        if (!trackingNumber.match(/^SF\d{9}$/)) {
            showError("Invalid tracking number format. Please use SF followed by 9 digits.");
            return;
        }

        if (!confirmationCode.match(/^[A-Z0-9]{4}$/)) {
            showError("Invalid confirmation code format. Please enter exactly 4 letters/numbers.");
            return;
        }

        try {
            trackButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracking...';
            trackButton.disabled = true;

            const shipmentRef = database.ref('shipments/' + trackingNumber);
            const snapshot = await shipmentRef.once('value');

            if (!snapshot.exists()) {
                showError("Shipment not found. Please check your tracking number.");
                trackButton.innerHTML = '<i class="fas fa-search"></i> Track Shipment';
                trackButton.disabled = false;
                return;
            }

            const shipment = snapshot.val();

            if (!shipment.confirmationCode || shipment.confirmationCode !== confirmationCode) {
                showError("Invalid confirmation code. Please check and try again.");
                trackButton.innerHTML = '<i class="fas fa-search"></i> Track Shipment';
                trackButton.disabled = false;
                return;
            }

            // Display shipment information
            displayShipmentInfo(shipment, trackingNumber);
            resultSection.style.display = 'block';

            // Listen for real-time updates
            shipmentRef.on('value', (snap) => {
                if (snap.exists()) {
                    displayShipmentInfo(snap.val(), trackingNumber);
                }
            });

            trackButton.innerHTML = '<i class="fas fa-search"></i> Track Shipment';
            trackButton.disabled = false;

        } catch (error) {
            console.error("Tracking error:", error);
            showError("An error occurred while tracking your shipment. Please try again.");
            trackButton.innerHTML = '<i class="fas fa-search"></i> Track Shipment';
            trackButton.disabled = false;
        }
    }

    function displayShipmentInfo(shipment, trackingNumber) {
        // Update basic info
        document.getElementById('displayTrackingNumber').textContent = trackingNumber;
        document.getElementById('displayStatus').textContent = shipment.status || 'Pending';
        document.getElementById('displayOrigin').textContent = shipment.origin || 'Not specified';
        document.getElementById('displayDestination').textContent = shipment.destination || 'Not specified';
        document.getElementById('displayConfirmationCode').textContent = shipment.confirmationCode || 'N/A';
        document.getElementById('displaySenderName').textContent = shipment.sender?.name || 'Not specified';
        
        // Update receiver details
        document.getElementById('displayReceiverName').textContent = shipment.receiver?.name || 'Not specified';
        document.getElementById('displayReceiverAddress').textContent = shipment.receiver?.address || 'Not specified';
        document.getElementById('displayReceiverPhone').textContent = shipment.receiver?.phone || 'Not specified';
        
        // Update status badge color
        const statusElement = document.getElementById('displayStatus');
        statusElement.className = 'value status';
        const status = shipment.status || '';
        if (status.includes('Pending')) statusElement.classList.add('status-pending');
        else if (status.includes('Transit')) statusElement.classList.add('status-in-transit');
        else if (status.includes('Customs')) statusElement.classList.add('status-customs');
        else if (status.includes('Delivered')) statusElement.classList.add('status-delivered');
        else statusElement.classList.add('status-pending');
        
        // Update tracking timeline
        const timelineElement = document.getElementById('trackingTimeline');
        timelineElement.innerHTML = '';
        
        const trackingHistory = shipment.trackingHistory || [];
        
        if (trackingHistory.length === 0) {
            const defaultItem = document.createElement('div');
            defaultItem.className = 'timeline-item';
            defaultItem.innerHTML = `
                <div class="timeline-date">${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</div>
                <div class="timeline-content">Shipment created</div>
                <div class="timeline-location">${shipment.origin || 'Origin'}</div>
            `;
            timelineElement.appendChild(defaultItem);
        } else {
            trackingHistory.forEach((event, index) => {
                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';
                timelineItem.innerHTML = `
                    <div class="timeline-date">${event.date || new Date().toLocaleDateString()}</div>
                    <div class="timeline-content">${event.description || 'Tracking update'}</div>
                    <div class="timeline-location">${event.location || 'Location not specified'}</div>
                `;
                timelineElement.appendChild(timelineItem);
            });
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function newSearch() {
        trackingNumberInput.value = '';
        confirmationCodeInput.value = '';
        resultSection.style.display = 'none';
        errorMessage.style.display = 'none';
        trackingNumberInput.focus();
    }

    // Admin login functions
    function openLoginModal() {
        console.log("Opening login modal...");
        loginModal.style.display = 'block';
        usernameInput.value = '';
        passwordInput.value = '';
        usernameError.textContent = '';
        passwordError.textContent = '';
        setTimeout(() => usernameInput.focus(), 100);
    }

    function closeAllModals() {
        loginModal.style.display = 'none';
        qrModal.style.display = 'none';
    }

    function loginToAdmin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        console.log("Login attempt:", username);
        
        // Reset errors
        usernameError.textContent = '';
        passwordError.textContent = '';
        
        let hasError = false;
        
        if (username !== ADMIN_USERNAME) {
            usernameError.textContent = "Incorrect username";
            hasError = true;
        }
        
        if (password !== ADMIN_PASSWORD) {
            passwordError.textContent = "Incorrect password";
            hasError = true;
        }
        
        if (!hasError) {
            console.log("Login successful, redirecting to admin...");
            localStorage.setItem('sfAdminAuth', 'true');
            window.location.href = 'admin.html';
        } else {
            console.log("Login failed");
        }
    }

    // QR Code functions
    function generateQRCode(trackingNumber, confirmationCode) {
        const websiteURL = window.location.origin + window.location.pathname;
        const qrData = `${websiteURL}?track=${trackingNumber}&code=${confirmationCode}`;
        
        // Clear previous QR code
        document.getElementById('qrcode').innerHTML = '';
        
        // Generate new QR code
        QRCode.toCanvas(document.getElementById('qrcode'), qrData, {
            width: 200,
            height: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(error) {
            if (error) {
                console.error("QR Code generation error:", error);
                alert("Error generating QR code. Please try again.");
            }
        });
        
        // Update tracking number display
        document.getElementById('qrTrackingNumber').textContent = trackingNumber;
        
        // Set up download button
        downloadQRBtn.onclick = function() {
            downloadQRCode(trackingNumber);
        };
        
        // Show modal
        qrModal.style.display = 'block';
    }

    function downloadQRCode(trackingNumber) {
        const canvas = document.querySelector('#qrcode canvas');
        if (!canvas) {
            alert("QR code not generated yet.");
            return;
        }
        
        const link = document.createElement('a');
        link.download = `SF-Shipping-${trackingNumber}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Event listeners
    if (trackButton) trackButton.addEventListener('click', trackShipment);
    if (newSearchButton) newSearchButton.addEventListener('click', newSearch);
    if (loginButton) loginButton.addEventListener('click', loginToAdmin);
    if (downloadQRBtn) {
        downloadQRBtn.addEventListener('click', function() {
            if (currentTrackingNumber) {
                downloadQRCode(currentTrackingNumber);
            }
        });
    }

    // Close modal buttons
    closeModal.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === loginModal || event.target === qrModal) {
            closeAllModals();
        }
    });

    // Enter key support
    if (trackingNumberInput) {
        trackingNumberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmationCodeInput.focus();
            }
        });
    }

    if (confirmationCodeInput) {
        confirmationCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                trackShipment();
            }
        });
    }

    // Make QR function globally available
    window.generateQRCode = generateQRCode;
}

function initializeAdminPage() {
    console.log("Initializing Admin Page with QR System...");
    
    // Check authentication FIRST
    checkAdminAuth();
    
    // Then initialize the rest
    setupAdminPage();
}

function checkAdminAuth() {
    const isAuthenticated = localStorage.getItem('sfAdminAuth') === 'true';
    
    if (!isAuthenticated) {
        console.log("Not authenticated, redirecting to index...");
        window.location.href = 'index.html';
        return false;
    }
    
    console.log("Admin authenticated");
    return true;
}

function setupAdminPage() {
    // Admin page elements and functionality
    const shippingForm = document.getElementById('shippingForm');
    const shippingTableBody = document.getElementById('shippingTableBody');
    const addShippingTab = document.getElementById('addShippingTab');
    const manageShippingTab = document.getElementById('manageShippingTab');
    const addShippingContent = document.getElementById('addShippingContent');
    const manageShippingContent = document.getElementById('manageShippingContent');
    const logoutBtn = document.getElementById('logoutBtn');

    // Generate tracking number
    function generateTrackingNumber() {
        const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
        return 'SF' + randomDigits;
    }

    // Generate confirmation code
    function generateConfirmationCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Add new shipping
    async function addShipping(event) {
        event.preventDefault();
        
        const senderName = document.getElementById('senderName').value.trim();
        const receiverName = document.getElementById('receiverName').value.trim();
        const receiverAddress = document.getElementById('receiverAddress').value.trim();
        const receiverPhone = document.getElementById('receiverPhone').value.trim();
        const origin = document.getElementById('origin').value;
        const destination = document.getElementById('destination').value;

        // Validation
        if (!senderName || !receiverName || !receiverAddress || !receiverPhone || !origin || !destination) {
            alert('Please fill in all required fields.');
            return;
        }

        if (origin === destination) {
            alert('Origin and destination cannot be the same.');
            return;
        }

        const trackingNumber = generateTrackingNumber();
        const confirmationCode = generateConfirmationCode();
        const timestamp = new Date().toISOString();

        // Determine if customs clearance is needed
        const aseanCountries = ['thailand', 'vietnam', 'philippines', 'singapore', 'malaysia'];
        const requiresCustoms = !(aseanCountries.includes(origin.toLowerCase()) && 
                                 aseanCountries.includes(destination.toLowerCase()));

        const shipmentData = {
            trackingNumber: trackingNumber,
            confirmationCode: confirmationCode,
            sender: { 
                name: senderName 
            },
            receiver: {
                name: receiverName,
                address: receiverAddress,
                phone: receiverPhone
            },
            origin: origin,
            destination: destination,
            status: 'Pending Pickup',
            createdAt: timestamp,
            updatedAt: timestamp,
            requiresCustoms: requiresCustoms,
            trackingHistory: [{
                date: new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                description: 'Shipment created and registered in system',
                location: origin
            }]
        };

        try {
            const submitBtn = shippingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;

            await database.ref('shipments/' + trackingNumber).set(shipmentData);
            
            // Clear form
            shippingForm.reset();
            
            // Show success message with QR option
            const showQR = confirm(`✅ Shipment added successfully!\n\n📦 Tracking Number: ${trackingNumber}\n🔑 Confirmation Code: ${confirmationCode}\n\nDo you want to generate QR code for this shipment?`);
            
            if (showQR) {
                generateQRCodeForAdmin(trackingNumber, confirmationCode);
            }
            
            // Refresh table if we're on manage tab
            if (manageShippingTab.classList.contains('active')) {
                await loadShipments();
            }
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
        } catch (error) {
            console.error('Error adding shipment:', error);
            alert('❌ Error adding shipment. Please try again.');
            const submitBtn = shippingForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Create Shipment';
            submitBtn.disabled = false;
        }
    }

    // Load shipments for management
    async function loadShipments() {
        try {
            shippingTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px;">
                        <div class="loading" style="margin: 0 auto;"></div>
                        <p style="margin-top: 10px; color: #666;">Loading shipments...</p>
                    </td>
                </tr>
            `;

            const snapshot = await database.ref('shipments').once('value');
            const shipments = snapshot.val();
            
            shippingTableBody.innerHTML = '';
            
            if (!shipments) {
                shippingTableBody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                            <p>No shipments found</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Convert object to array and sort by date (newest first)
            const shipmentsArray = Object.entries(shipments).map(([trackingNumber, shipment]) => ({
                trackingNumber,
                ...shipment
            })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            shipmentsArray.forEach((shipment, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <strong style="color: #1a2980;">${shipment.trackingNumber}</strong>
                        <br><small style="color: #666;">Code: ${shipment.confirmationCode}</small>
                    </td>
                    <td>${shipment.sender?.name || 'N/A'}</td>
                    <td>
                        <strong>${shipment.receiver?.name || 'N/A'}</strong>
                        <br><small>${shipment.receiver?.phone || ''}</small>
                    </td>
                    <td>${shipment.receiver?.phone || 'N/A'}</td>
                    <td>
                        <span class="flag-icon">${getCountryFlag(shipment.origin)}</span>
                        ${shipment.origin || 'N/A'}
                    </td>
                    <td>
                        <span class="flag-icon">${getCountryFlag(shipment.destination)}</span>
                        ${shipment.destination || 'N/A'}
                    </td>
                    <td>
                        <span class="status-badge ${getStatusClass(shipment.status)}">
                            ${shipment.status || 'Pending'}
                        </span>
                    </td>
                    <td>${formatDate(shipment.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="showUpdateModal('${shipment.trackingNumber}')">
                                <i class="fas fa-sync-alt"></i> Update
                            </button>
                            <button class="btn btn-success btn-sm" onclick="generateQRCodeForAdmin('${shipment.trackingNumber}', '${shipment.confirmationCode}')">
                                <i class="fas fa-qrcode"></i> Generate QR
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteShipment('${shipment.trackingNumber}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                `;
                shippingTableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error loading shipments:', error);
            shippingTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>Error loading shipments. Please refresh the page.</p>
                    </td>
                </tr>
            `;
        }
    }

    function getCountryFlag(country) {
        if (!country) return '🏳️';
        const flags = {
            'Malaysia': '🇲🇾',
            'Singapore': '🇸🇬',
            'Australia': '🇦🇺',
            'Canada': '🇨🇦',
            'USA': '🇺🇸',
            'United States': '🇺🇸',
            'New Zealand': '🇳🇿',
            'Philippines': '🇵🇭',
            'Vietnam': '🇻🇳',
            'Thailand': '🇹🇭'
        };
        return flags[country] || '🏳️';
    }

    function getStatusClass(status) {
        if (!status) return 'status-pending';
        if (status.includes('Pending')) return 'status-pending';
        if (status.includes('Transit')) return 'status-in-transit';
        if (status.includes('Customs')) return 'status-customs';
        if (status.includes('Delivered')) return 'status-delivered';
        return 'status-pending';
    }

    // QR Code generation for admin
    window.generateQRCodeForAdmin = function(trackingNumber, confirmationCode) {
        const websiteURL = window.location.origin.replace('/admin.html', '/index.html');
        const qrData = `${websiteURL}?track=${trackingNumber}&code=${confirmationCode}`;
        
        // Create QR code modal
        const modalHTML = `
            <div id="adminQRModal" class="modal" style="display: block; z-index: 2000;">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-qrcode"></i> QR Code for ${trackingNumber}</h2>
                        <span class="close" onclick="closeAdminQRModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="qr-code-container">
                            <div id="adminQRCode"></div>
                            <div class="qr-info">
                                <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                                <p><strong>Confirmation Code:</strong> ${confirmationCode}</p>
                                <p><strong>Scan Instructions:</strong> Customer can scan this QR code with any QR scanner app</p>
                            </div>
                        </div>
                        <div class="form-actions" style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" onclick="downloadAdminQRCode('${trackingNumber}')">
                                <i class="fas fa-download"></i> Download QR
                            </button>
                            <button class="btn btn-secondary" onclick="closeAdminQRModal()">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                        <p class="hint" style="text-align: center; margin-top: 15px; color: #666;">
                            <i class="fas fa-info-circle"></i> When scanned, this QR code will automatically open the tracking page with pre-filled details
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Generate QR code
        setTimeout(() => {
            QRCode.toCanvas(document.getElementById('adminQRCode'), qrData, {
                width: 200,
                height: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        }, 100);
    };

    // Close admin QR modal
    window.closeAdminQRModal = function() {
        const modal = document.getElementById('adminQRModal');
        if (modal) {
            modal.remove();
        }
    };

    // Download admin QR code
    window.downloadAdminQRCode = function(trackingNumber) {
        const canvas = document.querySelector('#adminQRCode canvas');
        if (!canvas) {
            alert("QR code not generated yet.");
            return;
        }
        
        const link = document.createElement('a');
        link.download = `SF-Shipping-${trackingNumber}-QR.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // Update shipment status
    window.showUpdateModal = async function(trackingNumber) {
        // Existing update modal code (same as before)
        // ... [keep your existing update modal code]
    };

    // Delete shipment
    window.deleteShipment = async function(trackingNumber) {
        if (!trackingNumber) return;
        
        const confirmDelete = confirm(`Are you sure you want to delete shipment ${trackingNumber}?\n\nThis action cannot be undone!`);
        
        if (!confirmDelete) return;
        
        try {
            await database.ref('shipments/' + trackingNumber).remove();
            
            alert(`✅ Shipment ${trackingNumber} has been deleted successfully.`);
            
            // Refresh the table
            await loadShipments();
            
        } catch (error) {
            console.error('Error deleting shipment:', error);
            alert('❌ Error deleting shipment. Please try again.');
        }
    };

    // Tab switching
    addShippingTab.addEventListener('click', () => {
        addShippingTab.classList.add('active');
        manageShippingTab.classList.remove('active');
        addShippingContent.classList.add('active');
        manageShippingContent.classList.remove('active');
    });

    manageShippingTab.addEventListener('click', () => {
        manageShippingTab.classList.add('active');
        addShippingTab.classList.remove('active');
        manageShippingContent.classList.add('active');
        addShippingContent.classList.remove('active');
        loadShipments();
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('sfAdminAuth');
        window.location.href = 'index.html';
    });

    // Initialize admin page
    if (shippingForm) {
        shippingForm.addEventListener('submit', addShipping);
    }
    
    // Load shipments if on manage tab
    if (manageShippingTab.classList.contains('active')) {
        loadShipments();
    }
    
    // Auto-refresh shipments every 30 seconds if on manage tab
    setInterval(() => {
        if (manageShippingTab && manageShippingTab.classList.contains('active')) {
            loadShipments();
        }
    }, 30000);
          }
