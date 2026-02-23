// Trip Management Logic

let currentEditingTripId = null;

// Initialize trips page
function initTrips() {
    if (!auth.protectRoute()) return;
    
    loadTrips();
    setupEventListeners();
    loadVehiclesAndDrivers();
    setupNavigation();
}

// Load trips with filters
function loadTrips() {
    let trips = storage.TripStorage.getAll();
    
    // Apply filters
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase();
        trips = trips.filter(trip => 
            trip.vehicleNumber.toLowerCase().includes(searchTerm) ||
            trip.driverName.toLowerCase().includes(searchTerm) ||
            (trip.notes && trip.notes.toLowerCase().includes(searchTerm)) ||
            trip.id.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter && statusFilter.value) {
        trips = trips.filter(trip => trip.status === statusFilter.value);
    }
    
    if (dateFromFilter && dateFromFilter.value) {
        trips = trips.filter(trip => new Date(trip.tripStartDate) >= new Date(dateFromFilter.value));
    }
    
    if (dateToFilter && dateToFilter.value) {
        trips = trips.filter(trip => new Date(trip.tripStartDate) <= new Date(dateToFilter.value));
    }
    
    // Sort by date (newest first)
    trips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    displayTrips(trips);
}

// Display trips in the list
function displayTrips(trips) {
    const container = document.getElementById('tripsList');
    const emptyState = document.getElementById('emptyState');
    
    if (!container) return;
    
    if (trips.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = trips.map(trip => {
        const profit = trip.profit !== undefined ? parseFloat(trip.profit) : null;
        const profitClass = profit !== null ? (profit >= 0 ? 'positive' : 'negative') : '';
        const profitText = profit !== null ? utils.formatCurrency(profit) : '-';
        
        // Show expense button for all trips except closed ones
        const showExpenseBtn = trip.status !== 'closed';
        
        return `
            <div class="trip-card" onclick="window.location.href='trip-detail.html?id=${trip.id}'">
                <div class="trip-card-header">
                    <h3 class="trip-card-title">${trip.vehicleNumber}</h3>
                    <span class="status-badge ${trip.status}">${trip.status.replace('_', ' ')}</span>
                </div>
                <div class="trip-card-body">
                    <div class="trip-card-meta">
                        <span><strong>Driver:</strong> ${trip.driverName}</span>
                        <span><strong>Start:</strong> ${utils.formatDate(trip.tripStartDate)}</span>
                        ${trip.tripEndDate ? `<span><strong>End:</strong> ${utils.formatDate(trip.tripEndDate)}</span>` : ''}
                    </div>
                </div>
                <div class="trip-card-footer">
                    <div class="trip-profit-section">
                        <span class="profit-label">Profit</span>
                        <span class="trip-item-profit ${profitClass}">${profitText}</span>
                    </div>
                    <div class="trip-card-actions">
                        ${showExpenseBtn ? `<button class="btn-action btn-expense" onclick="event.stopPropagation(); addExpenses('${trip.id}')" title="Add Expenses">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            <span>Expenses</span>
                        </button>` : ''}
                        ${trip.status !== 'closed' ? `<button class="btn-action btn-edit" onclick="event.stopPropagation(); editTrip('${trip.id}')" title="Edit Trip">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Edit</span>
                        </button>` : ''}
                        ${auth.getCurrentUser()?.role === 'admin' ? `<button class="btn-action btn-delete" onclick="event.stopPropagation(); deleteTrip('${trip.id}')" title="Delete Trip">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            <span>Delete</span>
                        </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Create trip button
    const createBtn = document.getElementById('createTripBtn');
    const createEmptyBtn = document.getElementById('createTripEmptyBtn');
    
    if (createBtn) {
        createBtn.addEventListener('click', () => openTripModal());
    }
    
    if (createEmptyBtn) {
        createEmptyBtn.addEventListener('click', () => openTripModal());
    }
    
    // Filter inputs
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', utils.debounce(loadTrips, 300));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', loadTrips);
    }
    
    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', loadTrips);
    }
    
    if (dateToFilter) {
        dateToFilter.addEventListener('change', loadTrips);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (dateFromFilter) dateFromFilter.value = '';
            if (dateToFilter) dateToFilter.value = '';
            loadTrips();
        });
    }
    
    // Trip form
    const tripForm = document.getElementById('tripForm');
    if (tripForm) {
        tripForm.addEventListener('submit', handleTripSubmit);
        
        // Auto-calculate revenue
        const tonnageInput = document.getElementById('tonnage');
        const rateInput = document.getElementById('ratePerTon');
        const revenueInput = document.getElementById('revenue');
        
        if (tonnageInput && rateInput && revenueInput) {
            const calculateRevenue = () => {
                const tonnage = parseFloat(tonnageInput.value) || 0;
                const rate = parseFloat(rateInput.value) || 0;
                // Revenue = Tonnage × Rate per Ton (advance is part of revenue, not added)
                const revenue = calculations.calculateRevenue(tonnage, rate);
                revenueInput.value = utils.formatCurrency(revenue);
            };
            
            // Revenue only depends on tonnage and rate, not advance
            tonnageInput.addEventListener('input', calculateRevenue);
            rateInput.addEventListener('input', calculateRevenue);
        }
    }
    
    // Modal close
    const modal = document.getElementById('tripModal');
    const modalClose = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (modalClose) {
        modalClose.addEventListener('click', () => closeTripModal());
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeTripModal());
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeTripModal();
            }
        });
    }
    
    // Past trips modal
    const viewPastTripsBtn = document.getElementById('viewPastTripsBtn');
    const pastTripsModal = document.getElementById('pastTripsModal');
    const pastTripsModalClose = document.getElementById('pastTripsModalClose');
    const closePastTripsBtn = document.getElementById('closePastTripsBtn');
    const pastTripsSearch = document.getElementById('pastTripsSearch');
    const pastTripsStatusFilter = document.getElementById('pastTripsStatusFilter');
    
    if (viewPastTripsBtn) {
        viewPastTripsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openPastTripsModal();
        });
    }
    
    if (pastTripsModalClose) {
        pastTripsModalClose.addEventListener('click', closePastTripsModal);
    }
    
    if (closePastTripsBtn) {
        closePastTripsBtn.addEventListener('click', closePastTripsModal);
    }
    
    if (pastTripsModal) {
        pastTripsModal.addEventListener('click', (e) => {
            if (e.target === pastTripsModal) {
                closePastTripsModal();
            }
        });
    }
    
    if (pastTripsSearch) {
        pastTripsSearch.addEventListener('input', utils.debounce(loadPastTrips, 300));
    }
    
    if (pastTripsStatusFilter) {
        pastTripsStatusFilter.addEventListener('change', loadPastTrips);
    }
}

// Open trip modal
function openTripModal(tripId = null) {
    const modal = document.getElementById('tripModal');
    const modalTitle = document.getElementById('modalTitle');
    const tripForm = document.getElementById('tripForm');
    
    if (!modal) return;
    
    currentEditingTripId = tripId;
    
    if (tripId) {
        // Edit mode
        if (modalTitle) modalTitle.textContent = 'Edit Trip';
        loadTripForEdit(tripId);
    } else {
        // Create mode
        if (modalTitle) modalTitle.textContent = 'Create New Trip';
        resetTripForm();
    }
    
    modal.style.display = 'flex';
}

// Close trip modal
function closeTripModal() {
    const modal = document.getElementById('tripModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditingTripId = null;
    resetTripForm();
}

// Reset trip form
function resetTripForm() {
    const form = document.getElementById('tripForm');
    if (form) {
        form.reset();
        const revenueInput = document.getElementById('revenue');
        if (revenueInput) revenueInput.value = '';
        const rateInput = document.getElementById('ratePerTon');
        if (rateInput) rateInput.value = '650';
    }
}

// Load trip for editing
function loadTripForEdit(tripId) {
    const trip = storage.TripStorage.getById(tripId);
    if (!trip) return;
    
    document.getElementById('vehicleNumber').value = trip.vehicleNumber || '';
    document.getElementById('driverName').value = trip.driverName || '';
    document.getElementById('tripStartDate').value = trip.tripStartDate || '';
    document.getElementById('estimatedEndDate').value = trip.estimatedEndDate || '';
    document.getElementById('purchasePlace').value = trip.purchasePlace || '';
    document.getElementById('itemName').value = trip.itemName || '';
    document.getElementById('startingKm').value = trip.startingKm || '';
    document.getElementById('tonnage').value = trip.tonnage || '';
    document.getElementById('ratePerTon').value = trip.ratePerTon || '650';
    document.getElementById('amountGiven').value = trip.amountGivenToDriver || '';
    document.getElementById('notes').value = trip.notes || '';
    
    // Calculate revenue (includes advance)
    const revenue = calculations.calculateRevenue(trip.tonnage, trip.ratePerTon, trip.amountGivenToDriver);
    document.getElementById('revenue').value = utils.formatCurrency(revenue);
}

// Handle trip form submit
function handleTripSubmit(e) {
    e.preventDefault();
    
    const formData = {
        vehicleNumber: document.getElementById('vehicleNumber').value.trim(),
        driverName: document.getElementById('driverName').value.trim(),
        tripStartDate: document.getElementById('tripStartDate').value,
        estimatedEndDate: document.getElementById('estimatedEndDate').value,
        purchasePlace: document.getElementById('purchasePlace').value.trim(),
        itemName: document.getElementById('itemName').value.trim(),
        startingKm: parseFloat(document.getElementById('startingKm').value) || 0,
        tonnage: parseFloat(document.getElementById('tonnage').value),
        ratePerTon: parseFloat(document.getElementById('ratePerTon').value),
        amountGivenToDriver: parseFloat(document.getElementById('amountGiven').value),
        notes: document.getElementById('notes').value.trim()
    };
    
    // Validate
    if (!formData.vehicleNumber || !formData.driverName || !formData.tripStartDate || 
        !formData.purchasePlace || !formData.itemName) {
        utils.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (new Date(formData.estimatedEndDate) < new Date(formData.tripStartDate)) {
        utils.showToast('End date must be after start date', 'error');
        return;
    }
    
    // Calculate revenue (includes advance)
    const revenue = calculations.calculateRevenue(formData.tonnage, formData.ratePerTon, formData.amountGivenToDriver);
    
    // Create trip object
    const trip = {
        ...formData,
        revenue: revenue,
        status: 'draft',
        expenses: null,
        totalExpenses: 0,
        profit: 0,
        tripEndDate: null
    };
    
    // If editing, preserve ID and other fields
    if (currentEditingTripId) {
        const existingTrip = storage.TripStorage.getById(currentEditingTripId);
        if (existingTrip) {
            trip.id = existingTrip.id;
            trip.createdAt = existingTrip.createdAt;
            trip.status = existingTrip.status; // Don't change status on edit
            trip.expenses = existingTrip.expenses;
            trip.totalExpenses = existingTrip.totalExpenses;
            trip.profit = existingTrip.profit;
            trip.tripEndDate = existingTrip.tripEndDate;
        }
    }
    
    // Recalculate revenue with updated values (includes advance)
    trip.revenue = calculations.calculateRevenue(trip.tonnage, trip.ratePerTon, trip.amountGivenToDriver);
    
    // Save trip
    if (storage.TripStorage.save(trip)) {
        // Auto-create vehicle and driver if not exists
        storage.VehicleStorage.ensureExists(trip.vehicleNumber);
        storage.DriverStorage.ensureExists(trip.driverName);
        
        utils.showToast(currentEditingTripId ? 'Trip updated successfully' : 'Trip created successfully', 'success');
        closeTripModal();
        loadTrips();
    } else {
        utils.showToast('Error saving trip', 'error');
    }
}

// Edit trip
function editTrip(tripId) {
    const trip = storage.TripStorage.getById(tripId);
    if (!trip) return;
    
    if (trip.status === 'closed') {
        utils.showToast('Cannot edit closed trips', 'warning');
        return;
    }
    
    openTripModal(tripId);
}

// Delete trip
async function deleteTrip(tripId) {
    const trip = storage.TripStorage.getById(tripId);
    if (!trip) return;
    
    const confirmed = await utils.confirmDialog(
        `Are you sure you want to delete trip ${trip.vehicleNumber}? This action cannot be undone.`,
        'Delete Trip'
    );
    
    if (confirmed) {
        if (storage.TripStorage.delete(tripId)) {
            utils.showToast('Trip deleted successfully', 'success');
            loadTrips();
        } else {
            utils.showToast('Error deleting trip', 'error');
        }
    }
}

// Load vehicles and drivers for autocomplete
function loadVehiclesAndDrivers() {
    const vehicles = storage.VehicleStorage.getAll();
    const drivers = storage.DriverStorage.getAll();
    
    const vehiclesList = document.getElementById('vehiclesList');
    const driversList = document.getElementById('driversList');
    
    if (vehiclesList) {
        vehiclesList.innerHTML = vehicles.map(v => 
            `<option value="${v.vehicleNumber}">`
        ).join('');
    }
    
    if (driversList) {
        driversList.innerHTML = drivers.map(d => 
            `<option value="${d.name}">`
        ).join('');
    }
}

// Setup navigation
function setupNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const mainContent = document.querySelector('.main-content');
    
    // Toggle sidebar function
    const toggleSidebar = () => {
        if (sidebar) {
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
                if (mainContent) {
                    mainContent.classList.toggle('sidebar-collapsed');
                }
            }
        }
    };
    
    // Close sidebar function
    const closeSidebar = () => {
        if (sidebar) {
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
                sidebar.classList.remove('active');
            } else {
                sidebar.classList.add('collapsed');
                if (mainContent) {
                    mainContent.classList.add('sidebar-collapsed');
                }
            }
        }
    };
    
    // Open sidebar function
    const openSidebar = () => {
        if (sidebar) {
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
                sidebar.classList.add('active');
            } else {
                sidebar.classList.remove('collapsed');
                if (mainContent) {
                    mainContent.classList.remove('sidebar-collapsed');
                }
            }
        }
    };
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    // Close sidebar when clicking outside (mobile only)
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && e.target === sidebar) {
                closeSidebar();
            }
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            if (sidebar && !sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('active');
            }
        } else {
            if (sidebar) {
                sidebar.classList.remove('collapsed');
                if (mainContent) {
                    mainContent.classList.remove('sidebar-collapsed');
                }
            }
        }
    });
}

// Add expenses function
function addExpenses(tripId) {
    window.location.href = `trip-detail.html?id=${tripId}&action=expenses`;
}

// Past Trips Modal Functions
let currentSortField = 'date'; // Default: sort by date
let currentSortDirection = 'desc'; // Default: newest first

function openPastTripsModal() {
    const modal = document.getElementById('pastTripsModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Reset sort to default
        currentSortField = 'date';
        currentSortDirection = 'desc';
        
        // Setup sortable columns (after modal is visible)
        setTimeout(() => {
            const sortableHeaders = document.querySelectorAll('.excel-grid th.sortable');
            sortableHeaders.forEach(header => {
                // Remove existing listeners by cloning
                const newHeader = header.cloneNode(true);
                header.parentNode.replaceChild(newHeader, header);
                
                // Set initial sort indicator
                if (newHeader.getAttribute('data-sort') === currentSortField) {
                    newHeader.classList.add(`sort-${currentSortDirection}`);
                }
                
                // Add click listener
                newHeader.addEventListener('click', () => {
                    const sortField = newHeader.getAttribute('data-sort');
                    toggleSort(sortField);
                });
            });
        }, 100);
        
        loadPastTrips();
    }
}

function closePastTripsModal() {
    const modal = document.getElementById('pastTripsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadPastTrips() {
    let trips = storage.TripStorage.getAll();
    
    // Filter by status if selected
    const statusFilter = document.getElementById('pastTripsStatusFilter');
    if (statusFilter && statusFilter.value) {
        trips = trips.filter(trip => trip.status === statusFilter.value);
    }
    
    // Filter by search term
    const searchInput = document.getElementById('pastTripsSearch');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase();
        trips = trips.filter(trip => 
            (trip.vehicleNumber && trip.vehicleNumber.toLowerCase().includes(searchTerm)) ||
            (trip.driverName && trip.driverName.toLowerCase().includes(searchTerm)) ||
            (trip.purchasePlace && trip.purchasePlace.toLowerCase().includes(searchTerm)) ||
            (trip.itemName && trip.itemName.toLowerCase().includes(searchTerm)) ||
            (trip.notes && trip.notes.toLowerCase().includes(searchTerm))
        );
    }
    
    // Sort trips
    if (currentSortField) {
        trips.sort((a, b) => {
            let aVal = getSortValue(a, currentSortField);
            let bVal = getSortValue(b, currentSortField);
            
            // Handle null/undefined values
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';
            
            // Compare values
            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }
            
            return currentSortDirection === 'asc' ? comparison : -comparison;
        });
    } else {
        // Default sort by date (newest first)
        trips.sort((a, b) => {
            const dateA = new Date(a.tripStartDate || a.createdAt || 0);
            const dateB = new Date(b.tripStartDate || b.createdAt || 0);
            return dateB - dateA;
        });
    }
    
    displayPastTrips(trips);
}

function getSortValue(trip, field) {
    switch(field) {
        case 'date':
            return new Date(trip.tripStartDate || trip.createdAt || 0);
        case 'vehicle':
            return (trip.vehicleNumber || '').toLowerCase();
        case 'driver':
            return (trip.driverName || '').toLowerCase();
        case 'expense':
            return trip.totalExpenses || 0;
        case 'advance':
            return trip.amountGivenToDriver || 0;
        case 'returnDate':
            return trip.tripEndDate ? new Date(trip.tripEndDate) : null;
        case 'purchasePlace':
            return (trip.purchasePlace || '').toLowerCase();
        case 'item':
            return (trip.itemName || '').toLowerCase();
        case 'quantity':
            return trip.tonnage || 0;
        case 'rate':
            return trip.ratePerTon || 0;
        case 'profit':
            return trip.profit !== undefined ? trip.profit : 0;
        default:
            return '';
    }
}

function toggleSort(field) {
    const headers = document.querySelectorAll('.excel-grid th.sortable');
    
    if (currentSortField === field) {
        // Toggle direction
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New field, default to desc
        currentSortField = field;
        currentSortDirection = 'desc';
    }
    
    // Update header classes
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-sort') === field) {
            header.classList.add(`sort-${currentSortDirection}`);
        }
    });
    
    loadPastTrips();
}

function displayPastTrips(trips) {
    const tbody = document.getElementById('pastTripsTableBody');
    const emptyState = document.getElementById('pastTripsEmpty');
    
    if (!tbody) return;
    
    if (trips.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    tbody.innerHTML = trips.map(trip => {
        const date = trip.tripStartDate ? utils.formatDate(trip.tripStartDate) : '-';
        const vehicle = trip.vehicleNumber || '-';
        const driver = trip.driverName || '-';
        const expense = trip.totalExpenses || 0;
        const advance = trip.amountGivenToDriver || 0;
        const returnDate = trip.tripEndDate ? utils.formatDate(trip.tripEndDate) : '-';
        const purchasePlace = trip.purchasePlace || '-';
        const item = trip.itemName || '-';
        const quantity = trip.tonnage || 0;
        const rate = trip.ratePerTon || 0;
        const profit = trip.profit !== undefined ? trip.profit : 0;
        const profitClass = profit >= 0 ? 'cell-profit-positive' : 'cell-profit-negative';
        
        return `
            <tr>
                <td class="cell-date">${date}</td>
                <td class="cell-text">${vehicle}</td>
                <td class="cell-text">${driver}</td>
                <td class="cell-number">${utils.formatCurrency(expense)}</td>
                <td class="cell-number">${utils.formatCurrency(advance)}</td>
                <td class="cell-date">${returnDate}</td>
                <td class="cell-text">${purchasePlace}</td>
                <td class="cell-text">${item}</td>
                <td class="cell-number">${quantity.toFixed(1)}</td>
                <td class="cell-number">${utils.formatCurrency(rate)}</td>
                <td class="cell-number ${profitClass}">${utils.formatCurrency(profit)}</td>
            </tr>
        `;
    }).join('');
}

// Make functions globally available
window.editTrip = editTrip;
window.deleteTrip = deleteTrip;
window.addExpenses = addExpenses;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTrips);

