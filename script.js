// Firebase configuration
const firebaseConfig = {  apiKey: "AIzaSyCR6pogNfCUJSradGjPYIRc1_LJuDc2GoM",  authDomain: "logstic-system-5fcac.firebaseapp.com",  databaseURL: "https://logstic-system-5fcac-default-rtdb.asia-southeast1.firebasedatabase.app",  projectId: "logstic-system-5fcac",  storageBucket: "logstic-system-5fcac.firebasestorage.app",  messagingSenderId: "1048996922654",  appId: "1:1048996922654:web:9a2cc5abf5bfc43e68b50f"};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Admin credentials
const ADMIN_USERNAME = "hanlwinoo";
const ADMIN_PASSWORD = "1500love";

// Check current page
const currentPage = window.location.pathname.split("/").pop();

// Double click tracking for logo
let logoClickCount = 0;
let logoClickTimer;

// Index Page Logic
if (currentPage === "index.html" || currentPage === "" || currentPage.includes("index") || currentPage === "track.html") {
    initializeIndexPage();
}

// Admin Page Logic
if (currentPage === "admin.html" || currentPage.includes("admin")) {
    initializeAdminPage();
}

function initializeIndexPage() {
    console.log("Initializing Index Page...");
    
    // DOM Elements
    const trackingNumberInput = document.getElementById('trackingNumber');
    const confirmationCodeInput = document.getElementById('confirmationCode');
    const trackButton = document.getElementById('trackButton');
    const resultSection = document.getElementById('resultSection');
    const errorMessage = document.getElementById('errorMessage');
    const adminLogo = document.getElementById('adminLogo');
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.querySelector('.close');
    const loginButton = document.getElementById('loginButton');
    const newSearchButton = document.getElementById('newSearchButton');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');

    // Check if elements exist
    if (!adminLogo) {
        console.error("Admin logo element not found!");
        return;
    }

    // Double click handler for logo
    adminLogo.addEventListener('click', handleLogoClick);

    function handleLogoClick() {
        logoClickCount++;
        
        if (logoClickCount === 1) {
            // First click - start timer
            logoClickTimer = setTimeout(() => {
                logoClickCount = 0; // Reset if not double clicked
            }, 500); // 500ms window for double click
        } else if (logoClickCount === 2) {
            // Double clicked
            clearTimeout(logoClickTimer);
            logoClickCount = 0;
            console.log("Logo double clicked, opening admin login...");
            openLoginModal();
        }
    }

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
            // Add default tracking entry
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

    function closeLoginModal() {
        loginModal.style.display = 'none';
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
            // Set a flag in localStorage for admin access
            localStorage.setItem('sfAdminAuth', 'true');
            // Redirect to admin page
            window.location.href = 'admin.html';
        } else {
            console.log("Login failed");
        }
    }

    // Event listeners for index page
    if (trackButton) trackButton.addEventListener('click', trackShipment);
    if (newSearchButton) newSearchButton.addEventListener('click', newSearch);
    if (closeModal) closeModal.addEventListener('click', closeLoginModal);
    if (loginButton) loginButton.addEventListener('click', loginToAdmin);

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            closeLoginModal();
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

    // Focus on tracking number when page loads
    window.addEventListener('load', () => {
        if (trackingNumberInput) {
            trackingNumberInput.focus();
        }
    });
}

function initializeAdminPage() {
    console.log("Initializing Admin Page...");
    
    // Check authentication FIRST
    checkAdminAuth();
    
    // Then initialize the rest
    setupAdminPage();
}

function checkAdminAuth() {
    const isAuthenticated = localStorage.getItem('sfAdminAuth') === 'true';
    
    if (!isAuthenticated) {
        console.log("Not authenticated, redirecting to index...");
        // Redirect to index page
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
            
            // Show success message
            alert(`✅ Shipment added successfully!\n\n📦 Tracking Number: ${trackingNumber}\n🔑 Confirmation Code: ${confirmationCode}\n\nPlease provide these details to the customer.`);
            
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
                        <button class="btn btn-primary btn-sm" onclick="showUpdateModal('${shipment.trackingNumber}')">
                            <i class="fas fa-sync-alt"></i> Update
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteShipment('${shipment.trackingNumber}')" style="margin-top: 5px;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
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

    // Show update modal
    window.showUpdateModal = async function(trackingNumber) {
        if (!trackingNumber) return;
        
        try {
            const shipmentRef = database.ref('shipments/' + trackingNumber);
            const snapshot = await shipmentRef.once('value');
            const shipment = snapshot.val();
            
            if (!shipment) {
                alert('Shipment not found!');
                return;
            }
            
            // Create update modal HTML
            const modalHTML = `
                <div id="updateModal" class="modal" style="display: block;">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-edit"></i> Update Shipment: ${trackingNumber}</h2>
                            <span class="close" onclick="closeUpdateModal()">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="updateStatus"><i class="fas fa-truck"></i> Status</label>
                                <select id="updateStatus" class="form-control">
                                    <option value="Pending Pickup" ${shipment.status === 'Pending Pickup' ? 'selected' : ''}>Pending Pickup</option>
                                    <option value="Picked Up" ${shipment.status === 'Picked Up' ? 'selected' : ''}>Picked Up</option>
                                    <option value="In Transit to Hub" ${shipment.status === 'In Transit to Hub' ? 'selected' : ''}>In Transit to Hub</option>
                                    <option value="Arrived at Hub" ${shipment.status === 'Arrived at Hub' ? 'selected' : ''}>Arrived at Hub</option>
                                    <option value="Arrived at Customs" ${shipment.status === 'Arrived at Customs' ? 'selected' : ''}>Arrived at Customs</option>
                                    <option value="Customs Clearance in Progress" ${shipment.status === 'Customs Clearance in Progress' ? 'selected' : ''}>Customs Clearance in Progress</option>
                                    <option value="Cleared Customs" ${shipment.status === 'Cleared Customs' ? 'selected' : ''}>Cleared Customs</option>
                                    <option value="Departed from Hub" ${shipment.status === 'Departed from Hub' ? 'selected' : ''}>Departed from Hub</option>
                                    <option value="In Transit to Destination" ${shipment.status === 'In Transit to Destination' ? 'selected' : ''}>In Transit to Destination</option>
                                    <option value="Arrived at Destination Hub" ${shipment.status === 'Arrived at Destination Hub' ? 'selected' : ''}>Arrived at Destination Hub</option>
                                    <option value="Out for Delivery" ${shipment.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                                    <option value="Delivered" ${shipment.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="updateLocation"><i class="fas fa-map-marker-alt"></i> Current Location</label>
                                <input type="text" id="updateLocation" class="form-control" placeholder="Enter current location" value="${getDefaultLocation(shipment)}">
                            </div>
                            
                            <div class="form-group">
                                <label for="updateDescription"><i class="fas fa-comment"></i> Update Description</label>
                                <textarea id="updateDescription" class="form-control" rows="3" placeholder="Enter update description"></textarea>
                            </div>
                            
                            <div class="form-actions" style="margin-top: 20px;">
                                <button class="btn btn-primary" onclick="confirmUpdate('${trackingNumber}')">
                                    <i class="fas fa-check"></i> OK - Update Shipment
                                </button>
                                <button class="btn btn-secondary" onclick="closeUpdateModal()">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
        } catch (error) {
            console.error('Error showing update modal:', error);
            alert('❌ Error loading shipment details.');
        }
    }

    function getDefaultLocation(shipment) {
        const status = shipment.status || '';
        if (status.includes('Customs')) return 'Customs Facility';
        if (status === 'Delivered') return shipment.destination || 'Destination';
        if (status.includes('Hub')) return 'Distribution Hub';
        if (status.includes('Transit')) return 'In Transit';
        if (status === 'Picked Up') return shipment.origin || 'Origin';
        return shipment.origin || '';
    }

    // Close update modal
    window.closeUpdateModal = function() {
        const modal = document.getElementById('updateModal');
        if (modal) {
            modal.remove();
        }
    }

    // Confirm update
    window.confirmUpdate = async function(trackingNumber) {
        try {
            const status = document.getElementById('updateStatus').value;
            const location = document.getElementById('updateLocation').value.trim();
            const description = document.getElementById('updateDescription').value.trim();
            
            if (!location) {
                alert('Please enter current location.');
                return;
            }
            
            if (!description) {
                alert('Please enter update description.');
                return;
            }
            
            const shipmentRef = database.ref('shipments/' + trackingNumber);
            const snapshot = await shipmentRef.once('value');
            const shipment = snapshot.val();
            
            if (!shipment) {
                alert('Shipment not found!');
                return;
            }
            
            // Add to tracking history
            const newEvent = {
                date: new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                description: description,
                location: location
            };
            
            const updatedData = {
                status: status,
                updatedAt: new Date().toISOString(),
                trackingHistory: [...(shipment.trackingHistory || []), newEvent]
            };
            
            await shipmentRef.update(updatedData);
            
            // Close modal
            closeUpdateModal();
            
            // Show success message
            alert(`✅ Shipment updated successfully!\n\nNew Status: ${status}\nLocation: ${location}\n\nThe customer will see this update in real-time.`);
            
            // Refresh the table
            await loadShipments();
            
        } catch (error) {
            console.error('Error updating shipment:', error);
            alert('❌ Error updating shipment. Please try again.');
        }
    }

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
    }

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
        // Clear authentication
        localStorage.removeItem('sfAdminAuth');
        // Redirect to index page
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
