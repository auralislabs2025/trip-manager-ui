// Excel-like Trips Table Management

let currentEditingCell = null;
let currentEditingRow = null;
let masterData = {
    vehicles: [],
    drivers: [],
    items: [],
    purchasePlaces: [],
    partners: []
};
let expenseTypes = ['Food', 'Diesel', 'Toll', 'Salary', 'GST', 'Other'];
let currentExpenseBreakdownRow = null;

// Pagination state
let currentPage = 1;
let itemsPerPage = 20;
let allTrips = []; // Store all trips for pagination
let filteredTrips = []; // Store filtered trips (for search)
let totalPages = 1;

// Initialize trips table page
function initTripsTable() {
    // No authentication required for this page
    loadMasterData();
    loadTrips();
    setupEventListeners();
    setupNavigation();
}

// Load master data (vehicles, drivers, items, purchase places)
function loadMasterData() {
    const vehicles = storage.VehicleStorage.getAll();
    const drivers = storage.DriverStorage.getAll();
    
    masterData.vehicles = vehicles.map(v => v.vehicleNumber || v.name || v);
    masterData.drivers = drivers.map(d => d.name || d);
    
    // Load items, purchase places, and partners from existing trips
    const trips = storage.TripStorage.getAll();
    const itemsSet = new Set();
    const purchasePlacesSet = new Set();
    const partnersSet = new Set();
    trips.forEach(trip => {
        if (trip.itemName) itemsSet.add(trip.itemName);
        if (trip.purchasePlace) purchasePlacesSet.add(trip.purchasePlace);
        if (trip.partner) partnersSet.add(trip.partner);
    });
    masterData.items = Array.from(itemsSet);
    masterData.purchasePlaces = Array.from(purchasePlacesSet);
    masterData.partners = Array.from(partnersSet);
}

// Load trips and populate table
function loadTrips() {
    const trips = storage.TripStorage.getAll();
    const tbody = document.getElementById('tripsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    if (trips.length === 0) {
        allTrips = [];
        filteredTrips = [];
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Sort by date (newest first)
    trips.sort((a, b) => {
        const dateA = new Date(a.tripStartDate || a.createdAt || 0);
        const dateB = new Date(b.tripStartDate || b.createdAt || 0);
        return dateB - dateA;
    });
    
    allTrips = [...trips]; // Create a copy
    filteredTrips = [...trips]; // Create a copy
    
    // Setup pagination and render current page
    setupPagination();
    renderCurrentPage();
}

// Create a table row for a trip
function createTableRow(trip, rowNumber) {
    // Format start date - if it's in YYYY-MM-DD format, keep it for input, otherwise format for display
    let startDateValue = trip.tripStartDate || '';
    let startDateDisplay = startDateValue;
    if (startDateValue && /^\d{4}-\d{2}-\d{2}$/.test(startDateValue)) {
        startDateDisplay = utils.formatDate(startDateValue);
    } else if (startDateValue) {
        startDateDisplay = utils.formatDate(startDateValue);
        // Try to convert to YYYY-MM-DD for input
        const dateObj = new Date(startDateValue);
        if (!isNaN(dateObj.getTime())) {
            startDateValue = dateObj.toISOString().split('T')[0];
        }
    }
    
    // Format expected end date
    let expectedEndDateValue = trip.estimatedEndDate || '';
    let expectedEndDateDisplay = expectedEndDateValue;
    if (expectedEndDateValue && /^\d{4}-\d{2}-\d{2}$/.test(expectedEndDateValue)) {
        expectedEndDateDisplay = utils.formatDate(expectedEndDateValue);
    } else if (expectedEndDateValue) {
        expectedEndDateDisplay = utils.formatDate(expectedEndDateValue);
        // Try to convert to YYYY-MM-DD for input
        const dateObj = new Date(expectedEndDateValue);
        if (!isNaN(dateObj.getTime())) {
            expectedEndDateValue = dateObj.toISOString().split('T')[0];
        }
    }
    
    const vehicle = trip.vehicleNumber || '';
    const driver = trip.driverName || '';
    const partner = trip.partner || '';
    const purchasePlace = trip.purchasePlace || '';
    const item = trip.itemName || '';
    const startingKm = trip.startingKm !== undefined ? trip.startingKm : '';
    const closingKm = trip.closingKm !== undefined ? trip.closingKm : '';
    const tonnage = trip.tonnage !== undefined ? trip.tonnage : '';
    const rate = trip.ratePerTon !== undefined ? trip.ratePerTon : '';
    const advance = trip.amountGivenToDriver || 0;
    const revenue = trip.revenue || calculations.calculateRevenue(trip.tonnage || 0, trip.ratePerTon || 0);
    const totalExpenses = trip.totalExpenses || 0;
    const profit = trip.profit !== undefined ? trip.profit : calculations.calculateProfit(revenue, totalExpenses);
    const profitClass = profit >= 0 ? 'cell-profit-positive' : 'cell-profit-negative';
    
    // Get selected expenses
    const expenses = trip.expenses || {};
    const selectedExpenses = [];
    if (expenses.food > 0) selectedExpenses.push('Food');
    if (expenses.diesel > 0) selectedExpenses.push('Diesel');
    if (expenses.toll > 0) selectedExpenses.push('Toll');
    if (expenses.salary > 0) selectedExpenses.push('Salary');
    if (expenses.gst > 0) selectedExpenses.push('GST');
    if (expenses.other > 0) selectedExpenses.push('Other');
    
    const tripId = trip.id || `trip_new_${Date.now()}`;
    // If trip has an ID and no status, it's likely an existing saved trip - default to closed
    // If it's a new trip (no ID or starts with trip_new_), default to draft
    const status = trip.status || (trip.id && !trip.id.startsWith('trip_new_') ? 'closed' : 'draft');
    const statusClass = status === 'draft' ? 'row-draft' : 'row-closed';
    const isLocked = status === 'closed' && !trip.isEditing;
    const lockClass = isLocked ? 'row-locked' : '';
    
    return `
        <tr data-trip-id="${tripId}" data-row-number="${rowNumber}" data-start-date-value="${startDateValue}" data-expected-end-date-value="${expectedEndDateValue}" data-status="${status}" data-locked="${isLocked}" class="${statusClass} ${lockClass}">
            <!-- Identification -->
            <td class="cell-row-number">${rowNumber}</td>
            
            <!-- Date Information -->
            <td class="editable cell-date" data-field="startDate">${startDateDisplay || '-'}</td>
            <td class="editable cell-date" data-field="expectedEndDate">${expectedEndDateDisplay || '-'}</td>
            
            <!-- People & Equipment -->
            <td class="editable cell-text" data-field="vehicle">${createMasterDataSelect('vehicle', vehicle, tripId)}</td>
            <td class="editable cell-text" data-field="driver">${createMasterDataSelect('driver', driver, tripId)}</td>
            <td class="editable cell-text" data-field="partner">${createMasterDataSelect('partner', partner, tripId)}</td>
            
            <!-- Trip Details -->
            <td class="editable cell-text" data-field="purchasePlace">${createMasterDataSelect('purchasePlace', purchasePlace, tripId)}</td>
            <td class="editable cell-text" data-field="item">${createMasterDataSelect('item', item, tripId)}</td>
            
            <!-- Operational Metrics -->
            <td class="editable cell-number" data-field="startingKm">${startingKm}</td>
            <td class="editable cell-number" data-field="closingKm">${closingKm}</td>
            
            <!-- Business Terms -->
            <td class="editable cell-number" data-field="tonnage">${tonnage}</td>
            <td class="editable cell-number" data-field="rate">${rate}</td>
            
            <!-- Financial Information -->
            <td class="editable cell-number" data-field="advance">${advance}</td>
            <td class="editable cell-text" data-field="expenses">${createExpenseMultiSelect(selectedExpenses, tripId)}</td>
            <td class="cell-number" data-field="expenseAmount">${utils.formatCurrency(totalExpenses)}</td>
            <td class="cell-number" data-field="revenue">${utils.formatCurrency(revenue)}</td>
            <td class="cell-number ${profitClass}" data-field="profit">${utils.formatCurrency(profit)}</td>
            
            <!-- Actions -->
            <td class="cell-actions">
                ${status === 'closed' && isLocked ? `
                    <button class="btn btn-cell-action btn-edit" onclick="enableRowEdit('${tripId}')" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                ` : `
                    <button class="btn btn-cell-action btn-primary" onclick="saveRow('${tripId}')" title="Save">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    </button>
                `}
                <button class="btn btn-cell-action btn-secondary" onclick="deleteRow('${tripId}')" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        </tr>
    `;
}

// Create master data select dropdown
function createMasterDataSelect(type, value, tripId) {
    // Handle special cases for pluralization
    let dataKey;
    if (type === 'purchasePlace') {
        dataKey = 'purchasePlaces';
    } else {
        dataKey = type + 's';
    }
    
    const data = masterData[dataKey] || [];
    const options = data.map(item => 
        `<option value="${item}" ${item === value ? 'selected' : ''}>${item}</option>`
    ).join('');
    
    // Format display name
    let displayName = type;
    if (type === 'purchasePlace') {
        displayName = 'Purchase Place';
    } else {
        displayName = type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    return `
        <select class="master-data-select" data-type="${type}" data-trip-id="${tripId}" onchange="handleMasterDataChange(this, '${type}')">
            <option value="">-- Select ${displayName} --</option>
            ${options}
            <option value="__ADD_NEW__">+ Add New ${displayName}</option>
        </select>
    `;
}

// Create expense multi-select
function createExpenseMultiSelect(selectedExpenses, tripId) {
    const options = expenseTypes.map(type => 
        `<option value="${type}" ${selectedExpenses.includes(type) ? 'selected' : ''}>${type}</option>`
    ).join('');
    
    return `
        <div class="expense-multiselect" onclick="openExpenseBreakdown('${tripId}')" style="cursor: pointer;">
            <select class="expense-select" multiple data-trip-id="${tripId}" onchange="handleExpenseSelectChange(this, '${tripId}')" size="3" onclick="event.stopPropagation();">
                ${options}
            </select>
            <button class="btn btn-enter-amounts btn-primary desktop-only" onclick="event.stopPropagation(); openExpenseBreakdown('${tripId}')" style="margin-left: 4px;">Enter Amounts</button>
        </div>
    `;
}

// Add new row
function addNewRow() {
    const tbody = document.getElementById('tripsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    // Prevent multiple rapid clicks
    const addBtn = document.getElementById('addNewRowBtn');
    if (addBtn && addBtn.disabled) return;
    if (addBtn) {
        addBtn.disabled = true;
        setTimeout(() => {
            if (addBtn) addBtn.disabled = false;
        }, 500);
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    const newTripId = `trip_new_${Date.now()}`;
    const newTrip = {
        id: newTripId,
        tripStartDate: utils.getTodayDate(),
        status: 'draft'
    };
    
    // Check if trip with same ID already exists (prevent duplicates)
    if (allTrips.some(t => t.id === newTripId)) {
        return;
    }
    
    // Add to beginning of arrays (top of list)
    allTrips.unshift(newTrip);
    
    // Only add to filteredTrips if it matches current search (or no search active)
    const searchInput = document.getElementById('tableSearch');
    const searchTerm = searchInput?.value.trim().toLowerCase() || '';
    if (!searchTerm) {
        filteredTrips.unshift(newTrip);
    } else {
        // Check if new trip matches search - if not, don't add to filtered
        const searchableText = [
            newTrip.tripStartDate,
            newTrip.vehicleNumber || '',
            newTrip.driverName || '',
            newTrip.partner || ''
        ].join(' ').toLowerCase();
        if (searchableText.includes(searchTerm)) {
            filteredTrips.unshift(newTrip);
        }
    }
    
    // Go to page 1 to show the new row
    currentPage = 1;
    setupPagination();
    renderCurrentPage();
    
    // Mark as new row and scroll to it
    const row = tbody.querySelector(`[data-trip-id="${newTripId}"]`);
    if (row) {
        row.classList.add('new-row');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Handle master data change
function handleMasterDataChange(select, type) {
    const value = select.value;
    const tripId = select.getAttribute('data-trip-id');
    
    if (value === '__ADD_NEW__') {
        openMasterDataModal(type, tripId, select);
    } else {
        updateRowField(tripId, type, value);
    }
}

// Open master data modal
function openMasterDataModal(type, tripId, selectElement) {
    const modal = document.getElementById('masterDataModal');
    const title = document.getElementById('masterDataModalTitle');
    const label = document.getElementById('masterDataLabel');
    const input = document.getElementById('masterDataInput');
    const form = document.getElementById('masterDataForm');
    
    if (!modal) return;
    
    let typeName = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === 'purchasePlace') {
        typeName = 'Purchase Place';
    } else if (type === 'partner') {
        typeName = 'Partner';
    }
    if (title) title.textContent = `Add New ${typeName}`;
    if (label) label.textContent = `${typeName} Name`;
    if (input) input.value = '';
    
    // Store context
    form.dataset.type = type;
    form.dataset.tripId = tripId;
    form.dataset.selectElement = JSON.stringify({}); // Can't store DOM element
    
    modal.style.display = 'flex';
    if (input) input.focus();
}

// Save master data item
function saveMasterDataItem(type, name) {
    if (!name || !name.trim()) {
        utils.showToast('Please enter a name', 'error');
        return false;
    }
    
    const trimmedName = name.trim();
    
    // Handle special cases for pluralization
    let dataKey;
    if (type === 'purchasePlace') {
        dataKey = 'purchasePlaces';
    } else {
        dataKey = type + 's';
    }
    
    const data = masterData[dataKey] || [];
    
    // Check if already exists
    if (data.includes(trimmedName)) {
        utils.showToast(`${type} already exists`, 'warning');
        return false;
    }
    
    // Add to master data
    masterData[dataKey].push(trimmedName);
    
    // Save to storage
    if (type === 'vehicle') {
        storage.VehicleStorage.ensureExists(trimmedName);
    } else if (type === 'driver') {
        storage.DriverStorage.ensureExists(trimmedName);
    }
    // Items, purchase places, and partners are stored in trips, so we'll save them when trip is saved
    
    return true;
}

// Handle expense select change
function handleExpenseSelectChange(select, tripId) {
    // Just update the visual selection, but don't restrict expense entry
    // Users can always enter amounts for all expense types
}

// Open expense breakdown modal
function openExpenseBreakdown(tripId) {
    const modal = document.getElementById('expenseBreakdownModal');
    const form = document.getElementById('expenseBreakdownForm');
    const row = document.querySelector(`[data-trip-id="${tripId}"]`);
    
    if (!modal || !form || !row) return;
    
    // Check if row is locked
    if (row.dataset.locked === 'true') {
        utils.showToast('Row is locked. Click Edit button to enable editing.', 'info');
        return;
    }
    
    currentExpenseBreakdownRow = tripId;
    
    // Get existing expense data
    const trip = storage.TripStorage.getById(tripId);
    const existingExpenses = trip?.expenses || {};
    
    // Also check row data
    const rowExpenses = row.dataset.expenses ? JSON.parse(row.dataset.expenses) : {};
    // Merge existing expenses, prioritizing row data
    const allExpenses = { ...existingExpenses, ...rowExpenses };
    
    // Create form inputs for ALL expense types (always show all)
    form.innerHTML = expenseTypes.map(expense => {
        const expenseKey = expense.toLowerCase();
        const value = allExpenses[expenseKey] || 0;
        
        return `
            <div class="expense-breakdown-item">
                <label>${expense} (₹)</label>
                <input type="number" 
                       class="input" 
                       id="expense_${expenseKey}" 
                       value="${value}" 
                       step="1" 
                       min="0" 
                       oninput="updateExpenseBreakdownTotal()"
                       placeholder="0">
            </div>
        `;
    }).join('');
    
    updateExpenseBreakdownTotal();
    modal.style.display = 'flex';
    
    // Focus on first input for better UX
    const firstInput = form.querySelector('input[type="number"]');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

// Update expense breakdown total
function updateExpenseBreakdownTotal() {
    const form = document.getElementById('expenseBreakdownForm');
    const totalEl = document.getElementById('expenseBreakdownTotal');
    
    if (!form || !totalEl) return;
    
    const inputs = form.querySelectorAll('input[type="number"]');
    let total = 0;
    
    inputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    totalEl.textContent = utils.formatCurrency(total);
}

// Save expense breakdown
function saveExpenseBreakdown() {
    if (!currentExpenseBreakdownRow) return;
    
    const form = document.getElementById('expenseBreakdownForm');
    const row = document.querySelector(`[data-trip-id="${currentExpenseBreakdownRow}"]`);
    
    if (!form || !row) return;
    
    const inputs = form.querySelectorAll('input[type="number"]');
    const expenses = {
        food: 0,
        diesel: 0,
        toll: 0,
        salary: 0,
        gst: 0,
        other: 0
    };
    let total = 0;
    
    // Get all expense values (default to 0 if not entered)
    inputs.forEach(input => {
        const expenseKey = input.id.replace('expense_', '');
        const value = parseFloat(input.value) || 0;
        if (expenses.hasOwnProperty(expenseKey)) {
            expenses[expenseKey] = value;
            total += value;
        }
    });
    
    // Update the multi-select to show which expenses have values > 0
    const expenseSelect = row.querySelector('.expense-select');
    if (expenseSelect) {
        // Clear all selections first
        Array.from(expenseSelect.options).forEach(opt => {
            opt.selected = false;
        });
        
        // Select expenses that have values > 0
        expenseTypes.forEach(expenseType => {
            const key = expenseType.toLowerCase();
            if (expenses[key] > 0) {
                const option = Array.from(expenseSelect.options).find(opt => opt.value === expenseType);
                if (option) {
                    option.selected = true;
                }
            }
        });
    }
    
    // Update expense amount cell
    const expenseAmountCell = row.querySelector('[data-field="expenseAmount"]');
    if (expenseAmountCell) {
        expenseAmountCell.textContent = utils.formatCurrency(total);
    }
    
    // Store ALL expenses in row data (including zeros)
    row.dataset.expenses = JSON.stringify(expenses);
    row.dataset.totalExpenses = total;
    
    // Update calculations
    updateCalculatedFields(currentExpenseBreakdownRow);
    
    closeExpenseBreakdownModal();
    utils.showToast('Expense amounts saved', 'success');
}

// Update calculated fields (revenue and profit)
function updateCalculatedFields(tripId) {
    const row = document.querySelector(`[data-trip-id="${tripId}"]`);
    if (!row) return;
    
    const tonnageCell = row.querySelector('[data-field="tonnage"]');
    const rateCell = row.querySelector('[data-field="rate"]');
    
    // Get values from cells (handle both text and input)
    let tonnage = 0;
    let rate = 0;
    
    if (tonnageCell) {
        const input = tonnageCell.querySelector('input');
        const cellText = tonnageCell.textContent.trim();
        tonnage = parseFloat(input ? input.value : (cellText === '-' ? 0 : cellText)) || 0;
    }
    
    if (rateCell) {
        const input = rateCell.querySelector('input');
        const cellText = rateCell.textContent.trim();
        rate = parseFloat(input ? input.value : (cellText === '-' ? 0 : cellText)) || 0;
    }
    
    const totalExpenses = parseFloat(row.dataset.totalExpenses || 0);
    
    // Calculate revenue: tonnage × rate per ton
    const revenue = calculations.calculateRevenue(tonnage, rate);
    
    // Calculate profit: revenue - total expenses
    const profit = calculations.calculateProfit(revenue, totalExpenses);
    
    const revenueCell = row.querySelector('[data-field="revenue"]');
    const profitCell = row.querySelector('[data-field="profit"]');
    
    if (revenueCell) {
        revenueCell.textContent = utils.formatCurrency(revenue);
    }
    
    if (profitCell) {
        profitCell.textContent = utils.formatCurrency(profit);
        profitCell.className = `cell-number ${profit >= 0 ? 'cell-profit-positive' : 'cell-profit-negative'}`;
    }
    
    // Store in row data
    row.dataset.revenue = revenue;
    row.dataset.profit = profit;
}

// Update row field
function updateRowField(tripId, field, value) {
    const row = document.querySelector(`[data-trip-id="${tripId}"]`);
    if (!row) return;
    
    const cell = row.querySelector(`[data-field="${field}"]`);
    if (!cell) return;
    
    // If cell contains select, update it
    const select = cell.querySelector('select');
    if (select) {
        select.value = value;
    } else {
        cell.textContent = value;
    }
    
    // Update calculations if needed
    if (['tonnage', 'rate'].includes(field)) {
        updateCalculatedFields(tripId);
    }
}

// Enable inline editing
function enableInlineEditing(cell) {
    if (cell.classList.contains('editing')) return;
    if (cell.querySelector('select')) return; // Don't edit cells with selects
    
    const originalValue = cell.textContent.trim();
    const field = cell.getAttribute('data-field');
    
    // Create input
    const input = document.createElement('input');
    input.type = (field === 'date' || field === 'startDate' || field === 'expectedEndDate') ? 'date' : field.includes('Km') || field === 'tonnage' || field === 'rate' || field === 'advance' ? 'number' : 'text';
    input.value = originalValue;
    input.className = 'cell-input';
    
    if (field.includes('Km') || field === 'tonnage' || field === 'rate' || field === 'advance') {
        input.step = field.includes('Km') ? '0.1' : '1';
        input.min = '0';
    }
    
    // Replace cell content
    cell.classList.add('editing');
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();
    
    // Save on blur or Enter
    const saveCell = () => {
        const newValue = input.value.trim();
        cell.classList.remove('editing');
        
        // Validate
        if ((field === 'date' || field === 'startDate' || field === 'expectedEndDate') && newValue && !isValidDate(newValue)) {
            utils.showToast('Invalid date format', 'error');
            cell.textContent = originalValue;
            return;
        }
        
        // Validate end date is after start date
        if (field === 'expectedEndDate' && newValue && tripId) {
            const row = cell.closest('tr');
            const startDateValue = row?.dataset.startDateValue || getCellValue(row, 'startDate');
            if (startDateValue && newValue < startDateValue) {
                utils.showToast('End Date must be after Start Date', 'error');
                cell.textContent = originalValue;
                return;
            }
        }
        
        if ((field.includes('Km') || field === 'tonnage' || field === 'rate' || field === 'advance') && newValue) {
            const numValue = parseFloat(newValue);
            if (isNaN(numValue) || numValue < 0) {
                utils.showToast('Invalid number', 'error');
                cell.textContent = originalValue;
                return;
            }
        }
        
        // Format the value based on field type
        if ((field === 'date' || field === 'startDate' || field === 'expectedEndDate') && newValue) {
            cell.textContent = utils.formatDate(newValue);
            // Store the date value in row data
            const row = cell.closest('tr');
            if (row) {
                if (field === 'startDate') {
                    row.dataset.startDateValue = newValue;
                } else if (field === 'expectedEndDate') {
                    row.dataset.expectedEndDateValue = newValue;
                } else {
                    row.dataset.dateValue = newValue;
                }
            }
        } else if ((field.includes('Km') || field === 'tonnage' || field === 'rate' || field === 'advance') && newValue) {
            const numValue = parseFloat(newValue);
            if (field === 'tonnage') {
                cell.textContent = numValue.toFixed(1);
            } else if (field === 'advance' || field === 'rate') {
                cell.textContent = numValue.toFixed(0);
            } else {
                cell.textContent = numValue.toFixed(1);
            }
        } else {
            cell.textContent = newValue || '-';
        }
        
        // Update calculations
        const tripId = cell.closest('tr')?.getAttribute('data-trip-id');
        if (tripId && ['tonnage', 'rate', 'startingKm', 'closingKm'].includes(field)) {
            updateCalculatedFields(tripId);
        }
        
        // Validate closing KM >= starting KM
        if (field === 'closingKm' && tripId) {
            const row = cell.closest('tr');
            const startingKm = parseFloat(getCellValue(row, 'startingKm')) || 0;
            const closingKm = parseFloat(newValue) || 0;
            if (closingKm < startingKm) {
                utils.showToast('Closing KM must be greater than or equal to Starting KM', 'error');
                cell.textContent = '';
                return;
            }
        }
    };
    
    input.addEventListener('blur', saveCell);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveCell();
        } else if (e.key === 'Escape') {
            cell.classList.remove('editing');
            cell.textContent = originalValue;
        }
    });
    
    currentEditingCell = cell;
}

// Validate date
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Save row
function saveRow(tripId) {
    const row = document.querySelector(`[data-trip-id="${tripId}"]`);
    if (!row) return;
    
    // Collect data from row
    const tripData = {
        id: tripId.startsWith('trip_new_') ? null : tripId,
        tripStartDate: getCellValue(row, 'startDate'),
        estimatedEndDate: getCellValue(row, 'expectedEndDate') || null,
        vehicleNumber: getCellValue(row, 'vehicle'),
        driverName: getCellValue(row, 'driver'),
        partner: getCellValue(row, 'partner') || null,
        purchasePlace: getCellValue(row, 'purchasePlace'),
        itemName: getCellValue(row, 'item'),
        startingKm: parseFloat(getCellValue(row, 'startingKm')) || 0,
        closingKm: parseFloat(getCellValue(row, 'closingKm')) || 0,
        tonnage: parseFloat(getCellValue(row, 'tonnage')) || 0,
        ratePerTon: parseFloat(getCellValue(row, 'rate')) || 0,
        amountGivenToDriver: parseFloat(getCellValue(row, 'advance')) || 0,
        status: 'closed' // Change status from draft to closed when saved
    };
    
    // Validate required fields
    if (!tripData.tripStartDate || !tripData.vehicleNumber || !tripData.driverName) {
        utils.showToast('Please fill in required fields (Start Date, Vehicle, Driver)', 'error');
        return;
    }
    
    // Get expenses
    const expensesData = row.dataset.expenses ? JSON.parse(row.dataset.expenses) : {};
    const expenses = {
        food: expensesData.food || 0,
        diesel: expensesData.diesel || 0,
        toll: expensesData.toll || 0,
        salary: expensesData.salary || 0,
        gst: expensesData.gst || 0,
        other: expensesData.other || 0
    };
    
    tripData.expenses = expenses;
    tripData.totalExpenses = parseFloat(row.dataset.totalExpenses || 0);
    tripData.revenue = parseFloat(row.dataset.revenue || calculations.calculateRevenue(tripData.tonnage, tripData.ratePerTon));
    tripData.profit = parseFloat(row.dataset.profit || calculations.calculateProfit(tripData.revenue, tripData.totalExpenses));
    tripData.tripEndDate = tripData.tripStartDate; // Same as start date in single process
    
    // Save to storage
    if (storage.TripStorage.save(tripData)) {
        // Update row ID if it was new
        if (tripId.startsWith('trip_new_')) {
            row.setAttribute('data-trip-id', tripData.id);
            row.classList.remove('new-row');
        }
        
        // Update status from draft to closed
        row.setAttribute('data-status', 'closed');
        row.classList.remove('row-draft');
        row.classList.add('row-closed');
        
        // Lock the row after saving
        row.dataset.locked = 'true';
        row.classList.add('row-locked');
        
        // Update action buttons back to Edit button
        const actionsCell = row.querySelector('.cell-actions');
        if (actionsCell) {
            actionsCell.innerHTML = `
                <button class="btn btn-cell-action btn-edit" onclick="enableRowEdit('${tripData.id}')" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn btn-cell-action btn-secondary" onclick="deleteRow('${tripData.id}')" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
        }
        
        // Update the trip in our arrays
        const tripIndex = allTrips.findIndex(t => t.id === tripData.id);
        if (tripIndex >= 0) {
            allTrips[tripIndex] = tripData;
        }
        const filteredIndex = filteredTrips.findIndex(t => t.id === tripData.id);
        if (filteredIndex >= 0) {
            filteredTrips[filteredIndex] = tripData;
        }
        
        row.classList.add('saved');
        setTimeout(() => row.classList.remove('saved'), 500);
        
        utils.showToast('Trip saved successfully', 'success');
        
        // Ensure master data items are saved
        if (tripData.itemName && !masterData.items.includes(tripData.itemName)) {
            masterData.items.push(tripData.itemName);
        }
        if (tripData.purchasePlace && !masterData.purchasePlaces.includes(tripData.purchasePlace)) {
            masterData.purchasePlaces.push(tripData.purchasePlace);
        }
        if (tripData.partner && !masterData.partners.includes(tripData.partner)) {
            masterData.partners.push(tripData.partner);
        }
    } else {
        utils.showToast('Error saving trip', 'error');
    }
}

// Get cell value
function getCellValue(row, field) {
    const cell = row.querySelector(`[data-field="${field}"]`);
    if (!cell) return '';
    
    const select = cell.querySelector('select');
    if (select) {
        return select.value;
    }
    
    // Check if it's an input (editing mode)
    const input = cell.querySelector('input');
    if (input) {
        return input.value;
    }
    
    let value = cell.textContent.trim();
    
    // Handle date formatting
    if (field === 'date' || field === 'startDate' || field === 'expectedEndDate') {
        // First check if row has stored date value
        const row = cell.closest('tr');
        if (row) {
            if (field === 'startDate' && row.dataset.startDateValue) {
                return row.dataset.startDateValue;
            }
            if (field === 'expectedEndDate' && row.dataset.expectedEndDateValue) {
                return row.dataset.expectedEndDateValue;
            }
            if (field === 'date' && row.dataset.dateValue) {
                return row.dataset.dateValue;
            }
        }
        
        // If it's already in YYYY-MM-DD format, return as is
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        
        // Try to parse and format
        if (value && value !== '-') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }
        
        // Return today's date if empty (only for start date)
        if ((!value || value === '-') && field === 'startDate') {
            return utils.getTodayDate();
        }
        
        // Return empty string for expected end date if not set
        if ((!value || value === '-') && field === 'expectedEndDate') {
            return '';
        }
    }
    
    return value;
}

// Setup pagination
function setupPagination() {
    totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
    if (totalPages === 0) totalPages = 1;
    
    // Ensure current page is valid
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }
    
    updatePaginationUI();
}

// Update pagination UI
function updatePaginationUI() {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const paginationNumbers = document.getElementById('paginationNumbers');
    
    if (!paginationContainer || filteredTrips.length === 0) {
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Update info
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, filteredTrips.length);
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${start}-${end} of ${filteredTrips.length}`;
    }
    
    // Update Previous/Next buttons
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
    
    // Update page numbers
    if (paginationNumbers) {
        paginationNumbers.innerHTML = generatePageNumbers();
    }
}

// Generate page number buttons
function generatePageNumbers() {
    const maxVisiblePages = 7;
    let startPage, endPage;
    
    if (totalPages <= maxVisiblePages) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const halfVisible = Math.floor(maxVisiblePages / 2);
        
        if (currentPage <= halfVisible) {
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (currentPage + halfVisible >= totalPages) {
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - halfVisible;
            endPage = currentPage + halfVisible;
        }
    }
    
    let html = '';
    
    // First page and ellipsis
    if (startPage > 1) {
        html += `<button class="pagination-page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="pagination-page-btn ${activeClass}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    // Last page and ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button class="pagination-page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    return html;
}

// Navigate to specific page
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    renderCurrentPage();
    updatePaginationUI();
    
    // Scroll to top of table
    const tableContainer = document.querySelector('.excel-table-container');
    if (tableContainer) {
        tableContainer.scrollTop = 0;
    }
}

// Render current page rows
function renderCurrentPage() {
    const tbody = document.getElementById('tripsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    if (filteredTrips.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Get current page data
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageTrips = filteredTrips.slice(startIndex, endIndex);
    
    // Calculate global row numbers
    const startRowNumber = startIndex + 1;
    
    // Render rows
    tbody.innerHTML = currentPageTrips.map((trip, index) => {
        const globalRowNumber = startRowNumber + index;
        return createTableRow(trip, globalRowNumber);
    }).join('');
    
    // Attach event listeners
    attachRowEventListeners();
}

// Update row numbers (no longer needed, handled in renderCurrentPage)
function updateRowNumbers() {
    // Row numbers are now calculated during rendering
    // This function kept for compatibility but does nothing
}

// Delete row
async function deleteRow(tripId) {
    if (tripId.startsWith('trip_new_')) {
        // Remove from arrays and re-render
        allTrips = allTrips.filter(t => t.id !== tripId);
        filteredTrips = filteredTrips.filter(t => t.id !== tripId);
        
        // Check if we need to go to previous page
        const currentPageStartIndex = (currentPage - 1) * itemsPerPage;
        if (currentPageStartIndex >= filteredTrips.length && currentPage > 1) {
            currentPage--;
        }
        
        setupPagination();
        renderCurrentPage();
        checkEmptyState();
        return;
    }
    
    const confirmed = await utils.confirmDialog(
        'Are you sure you want to delete this trip? This action cannot be undone.',
        'Delete Trip'
    );
    
    if (confirmed) {
        if (storage.TripStorage.delete(tripId)) {
            // Remove from arrays
            allTrips = allTrips.filter(t => t.id !== tripId);
            filteredTrips = filteredTrips.filter(t => t.id !== tripId);
            
            // Check if we need to go to previous page
            const currentPageStartIndex = (currentPage - 1) * itemsPerPage;
            if (currentPageStartIndex >= filteredTrips.length && currentPage > 1) {
                currentPage--;
            }
            
            setupPagination();
            renderCurrentPage();
            checkEmptyState();
            utils.showToast('Trip deleted successfully', 'success');
        } else {
            utils.showToast('Error deleting trip', 'error');
        }
    }
}

// Check empty state
function checkEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!emptyState) return;
    
    // Show empty state if no filtered trips
    if (filteredTrips.length === 0) {
        emptyState.style.display = 'block';
        if (paginationContainer) paginationContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
    }
}

// Attach row event listeners
function attachRowEventListeners() {
    const editableCells = document.querySelectorAll('.excel-table td.editable:not(.cell-row-number)');
    editableCells.forEach(cell => {
        if (!cell.querySelector('select')) {
            cell.addEventListener('click', (e) => {
                // Check if row is locked
                const row = cell.closest('tr');
                if (row && row.dataset.locked === 'true') {
                    e.preventDefault();
                    e.stopPropagation();
                    utils.showToast('Row is locked. Click Edit button to enable editing.', 'info');
                    return false;
                }
                enableInlineEditing(cell);
            });
        }
    });
}

// Enable row editing (unlock saved row)
function enableRowEdit(tripId) {
    const row = document.querySelector(`[data-trip-id="${tripId}"]`);
    if (!row) return;
    
    row.dataset.locked = 'false';
    row.classList.remove('row-locked');
    
    // Update the action button from Edit to Save
    const actionsCell = row.querySelector('.cell-actions');
    if (actionsCell) {
        actionsCell.innerHTML = `
            <button class="btn btn-cell-action btn-primary" onclick="saveRow('${tripId}')" title="Save">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            </button>
            <button class="btn btn-cell-action btn-secondary" onclick="cancelRowEdit('${tripId}')" title="Cancel">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <button class="btn btn-cell-action btn-secondary" onclick="deleteRow('${tripId}')" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
    }
    
    utils.showToast('Row unlocked for editing', 'success');
}

// Cancel row editing (re-lock saved row)
function cancelRowEdit(tripId) {
    const row = document.querySelector(`[data-trip-id="${tripId}"]`);
    if (!row) return;
    
    // Reload the row from storage to reset any unsaved changes
    const trip = storage.TripStorage.getById(tripId);
    if (!trip) {
        // If trip doesn't exist, just re-lock it
        row.dataset.locked = 'true';
        row.classList.add('row-locked');
        return;
    }
    
    // Update the trip in our arrays
    const tripIndex = allTrips.findIndex(t => t.id === tripId);
    if (tripIndex >= 0) {
        allTrips[tripIndex] = trip;
    }
    const filteredIndex = filteredTrips.findIndex(t => t.id === tripId);
    if (filteredIndex >= 0) {
        filteredTrips[filteredIndex] = trip;
    }
    
    // Re-render the current page to show fresh data
    renderCurrentPage();
    
    utils.showToast('Changes cancelled', 'info');
}

// Close expense breakdown modal
function closeExpenseBreakdownModal() {
    const modal = document.getElementById('expenseBreakdownModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentExpenseBreakdownRow = null;
}

// Close master data modal
function closeMasterDataModal() {
    const modal = document.getElementById('masterDataModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export to Excel/CSV
function exportToExcel() {
    // Use filteredTrips if search is active, otherwise allTrips
    const searchInput = document.getElementById('tableSearch');
    const searchTerm = searchInput?.value.trim().toLowerCase() || '';
    const tripsToExport = searchTerm ? filteredTrips : allTrips;
    
    if (tripsToExport.length === 0) {
        utils.showToast('No trips to export', 'warning');
        return;
    }
    
    // Create CSV content (matching the table column order)
    const headers = ['#', 'Start Date', 'End Date', 'Vehicle', 'Driver', 'Partner', 'Purchase Place', 'Item', 'Starting KM', 'Closing KM', 'Tonnage', 'Rate/Ton', 'Advance', 'Expenses', 'Total Expenses', 'Revenue', 'Profit'];
    const rows = tripsToExport.map((trip, index) => {
        // Get expense breakdown for CSV
        const expenses = trip.expenses || {};
        const expenseList = [];
        if (expenses.food > 0) expenseList.push(`Food:${expenses.food}`);
        if (expenses.diesel > 0) expenseList.push(`Diesel:${expenses.diesel}`);
        if (expenses.toll > 0) expenseList.push(`Toll:${expenses.toll}`);
        if (expenses.salary > 0) expenseList.push(`Salary:${expenses.salary}`);
        if (expenses.gst > 0) expenseList.push(`GST:${expenses.gst}`);
        if (expenses.other > 0) expenseList.push(`Other:${expenses.other}`);
        
        return [
            index + 1,
            trip.tripStartDate || '',
            trip.estimatedEndDate || '',
            trip.vehicleNumber || '',
            trip.driverName || '',
            trip.partner || '',
            trip.purchasePlace || '',
            trip.itemName || '',
            trip.startingKm || '',
            trip.closingKm || '',
            trip.tonnage || '',
            trip.ratePerTon || '',
            trip.amountGivenToDriver || '',
            expenseList.join('; ') || '',
            trip.totalExpenses || '',
            trip.revenue || '',
            trip.profit || ''
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trips_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    utils.showToast('Trips exported successfully', 'success');
}

// Setup event listeners
function setupEventListeners() {
    // Add new row button - remove existing listener first to prevent duplicates
    const addNewRowBtn = document.getElementById('addNewRowBtn');
    if (addNewRowBtn) {
        // Clone and replace to remove all event listeners
        const newBtn = addNewRowBtn.cloneNode(true);
        addNewRowBtn.parentNode.replaceChild(newBtn, addNewRowBtn);
        newBtn.addEventListener('click', addNewRow);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    // Search
    const tableSearch = document.getElementById('tableSearch');
    if (tableSearch) {
        tableSearch.addEventListener('input', utils.debounce(() => {
            const searchTerm = tableSearch.value.toLowerCase();
            
            if (searchTerm.trim() === '') {
                filteredTrips = allTrips;
            } else {
                filteredTrips = allTrips.filter(trip => {
                    const searchableText = [
                        trip.tripStartDate,
                        trip.estimatedEndDate,
                        trip.vehicleNumber,
                        trip.driverName,
                        trip.partner,
                        trip.purchasePlace,
                        trip.itemName,
                        trip.startingKm?.toString(),
                        trip.closingKm?.toString(),
                        trip.tonnage?.toString(),
                        trip.ratePerTon?.toString(),
                        trip.amountGivenToDriver?.toString(),
                        trip.totalExpenses?.toString(),
                        trip.revenue?.toString(),
                        trip.profit?.toString()
                    ].join(' ').toLowerCase();
                    
                    return searchableText.includes(searchTerm);
                });
            }
            
            // Reset to page 1 when searching
            currentPage = 1;
            setupPagination();
            renderCurrentPage();
        }, 300));
    }
    
    // Pagination controls
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                goToPage(currentPage - 1);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                goToPage(currentPage + 1);
            }
        });
    }
    
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1; // Reset to first page
            setupPagination();
            renderCurrentPage();
        });
    }
    
    // Master data modal
    const masterDataForm = document.getElementById('masterDataForm');
    if (masterDataForm) {
        masterDataForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = masterDataForm.dataset.type;
            const input = document.getElementById('masterDataInput');
            const name = input?.value.trim();
            
            if (saveMasterDataItem(type, name)) {
                // Update the select that triggered this
                const tripId = masterDataForm.dataset.tripId;
                if (tripId) {
                    const row = document.querySelector(`[data-trip-id="${tripId}"]`);
                    const select = row?.querySelector(`select[data-type="${type}"]`);
                    if (select) {
                        // Add new option before the "+ Add New" option
                        const addNewOption = select.querySelector('option[value="__ADD_NEW__"]');
                        const option = document.createElement('option');
                        option.value = name;
                        option.textContent = name;
                        option.selected = true;
                        if (addNewOption) {
                            select.insertBefore(option, addNewOption);
                        } else {
                            select.appendChild(option);
                        }
                    }
                }
                
                closeMasterDataModal();
                let typeName = type === 'purchasePlace' ? 'Purchase Place' : type;
                if (type === 'partner') {
                    typeName = 'Partner';
                } else {
                    typeName = type.charAt(0).toUpperCase() + type.slice(1);
                }
                utils.showToast(`${typeName} added successfully`, 'success');
            }
        });
    }
    
    const masterDataModalClose = document.getElementById('masterDataModalClose');
    const cancelMasterDataBtn = document.getElementById('cancelMasterDataBtn');
    if (masterDataModalClose) {
        masterDataModalClose.addEventListener('click', closeMasterDataModal);
    }
    if (cancelMasterDataBtn) {
        cancelMasterDataBtn.addEventListener('click', closeMasterDataModal);
    }
    
    // Expense breakdown modal
    const saveExpenseBreakdownBtn = document.getElementById('saveExpenseBreakdownBtn');
    const expenseBreakdownModalClose = document.getElementById('expenseBreakdownModalClose');
    const cancelExpenseBreakdownBtn = document.getElementById('cancelExpenseBreakdownBtn');
    
    if (saveExpenseBreakdownBtn) {
        saveExpenseBreakdownBtn.addEventListener('click', saveExpenseBreakdown);
    }
    if (expenseBreakdownModalClose) {
        expenseBreakdownModalClose.addEventListener('click', closeExpenseBreakdownModal);
    }
    if (cancelExpenseBreakdownBtn) {
        cancelExpenseBreakdownBtn.addEventListener('click', closeExpenseBreakdownModal);
    }
}

// Setup navigation
function setupNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const mainContent = document.querySelector('.main-content');
    
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
    
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', () => {
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
    });
    
    // Logout (optional - only if user is logged in)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (auth.isAuthenticated()) {
                auth.logout();
            } else {
                window.location.href = '../index.html';
            }
        });
    }
    
    // Set user info (optional - only if user is logged in)
    if (auth.isAuthenticated()) {
        const currentUser = auth.getCurrentUser();
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        if (userName && currentUser) {
            userName.textContent = currentUser.username;
        }
        if (userRole && currentUser) {
            userRole.textContent = currentUser.role;
        }
    } else {
        // Hide or show guest info
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        if (userName) userName.textContent = 'Guest';
        if (userRole) userRole.textContent = '';
    }
}

// Make functions globally available
window.addNewRow = addNewRow;
window.saveRow = saveRow;
window.deleteRow = deleteRow;
window.enableRowEdit = enableRowEdit;
window.cancelRowEdit = cancelRowEdit;
window.goToPage = goToPage;
window.handleMasterDataChange = handleMasterDataChange;
window.openExpenseBreakdown = openExpenseBreakdown;
window.handleExpenseSelectChange = handleExpenseSelectChange;
window.updateExpenseBreakdownTotal = updateExpenseBreakdownTotal;
window.saveExpenseBreakdown = saveExpenseBreakdown;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTripsTable);

