// Trip Detail Page Logic

let currentTrip = null;

// Initialize trip detail page
function initTripDetail() {
    if (!auth.protectRoute()) return;
    
    const tripId = window.currentTripId || new URLSearchParams(window.location.search).get('id');
    if (!tripId) {
        window.location.href = 'trips.html';
        return;
    }
    
    // Check if we should open expense modal
    const urlParams = new URLSearchParams(window.location.search);
    const openExpenses = urlParams.get('action') === 'expenses';
    
    loadTripDetail(tripId);
    setupEventListeners();
    setupNavigation();
    
    // Auto-open expense modal if requested
    if (openExpenses) {
        setTimeout(() => {
            openExpenseModal();
        }, 500);
    }
}

// Load trip detail
function loadTripDetail(tripId) {
    const trip = storage.TripStorage.getById(tripId);
    if (!trip) {
        utils.showToast('Trip not found', 'error');
        window.location.href = 'trips.html';
        return;
    }
    
    currentTrip = trip;
    displayTripInfo(trip);
    displayExpenses(trip);
    updateActionButtons(trip);
}

// Display trip information
function displayTripInfo(trip) {
    document.getElementById('detailVehicleNumber').textContent = trip.vehicleNumber || '-';
    document.getElementById('detailDriverName').textContent = trip.driverName || '-';
    document.getElementById('detailStartDate').textContent = utils.formatDate(trip.tripStartDate) || '-';
    document.getElementById('detailEndDate').textContent = utils.formatDate(trip.tripEndDate) || '-';
    document.getElementById('detailTonnage').textContent = trip.tonnage ? `${trip.tonnage} tons` : '-';
    document.getElementById('detailRatePerTon').textContent = trip.ratePerTon ? utils.formatCurrency(trip.ratePerTon) : '-';
    document.getElementById('detailNotes').textContent = trip.notes || '-';
    
    // Status badge
    const statusBadge = document.getElementById('tripStatusBadge');
    if (statusBadge) {
        statusBadge.textContent = trip.status.replace('_', ' ');
        statusBadge.className = `status-badge ${trip.status}`;
    }
    
    // Financial summary
    const revenue = trip.revenue || calculations.calculateRevenue(trip.tonnage, trip.ratePerTon, trip.amountGivenToDriver);
    const totalExpenses = trip.totalExpenses || 0;
    const profit = trip.profit !== undefined ? trip.profit : calculations.calculateProfit(revenue, totalExpenses);
    
    document.getElementById('detailRevenue').textContent = utils.formatCurrency(revenue);
    document.getElementById('detailAmountGiven').textContent = utils.formatCurrency(trip.amountGivenToDriver || 0);
    document.getElementById('detailTotalExpenses').textContent = utils.formatCurrency(totalExpenses);
    
    const profitEl = document.getElementById('detailProfit');
    profitEl.textContent = utils.formatCurrency(profit);
    profitEl.className = `amount ${profit >= 0 ? 'profit' : 'expense'}`;
}

// Display expenses
function displayExpenses(trip) {
    const expensesCard = document.getElementById('expensesCard');
    const expensesList = document.getElementById('expensesList');
    const addExpensesBtn = document.getElementById('addExpensesBtn');
    const editExpensesBtn = document.getElementById('editExpensesBtn');
    
    if (!trip.expenses) {
        // No expenses yet
        if (expensesList) {
            expensesList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-lg);">No expenses added yet</p>';
        }
        
        if (addExpensesBtn && (trip.status === 'in_progress' || trip.status === 'returned' || trip.status === 'draft')) {
            addExpensesBtn.style.display = 'inline-flex';
        }
        
        if (editExpensesBtn) {
            editExpensesBtn.style.display = 'none';
        }
    } else {
        // Display expenses
        if (expensesList) {
            expensesList.innerHTML = `
                <div class="expense-item">
                    <span class="expense-item-label">Food</span>
                    <span class="expense-item-value">${utils.formatCurrency(trip.expenses.food || 0)}</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Diesel</span>
                    <span class="expense-item-value">${utils.formatCurrency(trip.expenses.diesel || 0)}</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Toll</span>
                    <span class="expense-item-value">${utils.formatCurrency(trip.expenses.toll || 0)}</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Driver Salary</span>
                    <span class="expense-item-value">${utils.formatCurrency(trip.expenses.salary || 0)}</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">GST/Other Taxes</span>
                    <span class="expense-item-value">${utils.formatCurrency(trip.expenses.gst || 0)}</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Other Expenses</span>
                    <span class="expense-item-value">${utils.formatCurrency(trip.expenses.other || 0)}</span>
                </div>
                ${trip.expenses.otherDescription ? `
                <div class="expense-item">
                    <span class="expense-item-label">Other Description</span>
                    <span class="expense-item-value" style="font-size: var(--font-size-sm);">${trip.expenses.otherDescription}</span>
                </div>
                ` : ''}
            `;
        }
        
        if (addExpensesBtn) {
            addExpensesBtn.style.display = 'none';
        }
        
        if (editExpensesBtn && trip.status !== 'closed') {
            editExpensesBtn.style.display = 'inline-flex';
        }
    }
}

// Update action buttons
function updateActionButtons(trip) {
    const headerActions = document.getElementById('headerActions');
    if (!headerActions) return;
    
    headerActions.innerHTML = '';
    
    // Show delete button if trip doesn't have expenses yet
    const hasExpenses = trip.expenses && trip.totalExpenses > 0;
    const canDelete = !hasExpenses && (trip.status === 'draft' || trip.status === 'in_progress' || (trip.status === 'returned' && !hasExpenses));
    
    if (canDelete && auth.getCurrentUser()?.role === 'admin') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-secondary';
        deleteBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            <span>Delete</span>
        `;
        deleteBtn.onclick = () => deleteTripFromDetail();
        headerActions.appendChild(deleteBtn);
    }
    
    if (trip.status === 'draft') {
        const startBtn = document.createElement('button');
        startBtn.className = 'btn btn-primary';
        startBtn.textContent = 'Start Trip';
        startBtn.onclick = () => startTrip();
        headerActions.appendChild(startBtn);
    }
    
    if (trip.status === 'in_progress') {
        const returnBtn = document.createElement('button');
        returnBtn.className = 'btn btn-primary';
        returnBtn.textContent = 'Trip Returned';
        returnBtn.onclick = () => markTripReturned();
        headerActions.appendChild(returnBtn);
    }
    
    // Show close button if trip has expenses and trip end date has been reached
    if (trip.expenses && trip.tripEndDate) {
        const returnDate = new Date(trip.tripEndDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        returnDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - returnDate) / (1000 * 60 * 60 * 24));
        
        // Show close button if trip end date has been reached (today is on or after trip end date)
        if (daysDiff >= 0 && trip.status !== 'closed') {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-primary';
            closeBtn.textContent = 'Close Trip';
            closeBtn.onclick = () => openCloseTripModal();
            headerActions.appendChild(closeBtn);
        }
    }
}

// Start trip
function startTrip() {
    if (!currentTrip) return;
    
    currentTrip.status = 'in_progress';
    if (!currentTrip.tripStartDate) {
        currentTrip.tripStartDate = utils.getTodayDate();
    }
    
    if (storage.TripStorage.save(currentTrip)) {
        utils.showToast('Trip started successfully', 'success');
        loadTripDetail(currentTrip.id);
    } else {
        utils.showToast('Error starting trip', 'error');
    }
}

// Mark trip as returned
function markTripReturned() {
    if (!currentTrip) return;
    
    currentTrip.status = 'returned';
    
    if (storage.TripStorage.save(currentTrip)) {
        utils.showToast('Trip marked as returned', 'success');
        loadTripDetail(currentTrip.id);
        // Open expense modal
        setTimeout(() => {
            openExpenseModal();
        }, 500);
    } else {
        utils.showToast('Error updating trip', 'error');
    }
}

// Open expense modal
function openExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (!modal) return;
    
    if (currentTrip && currentTrip.expenses) {
        // Edit mode - load existing expenses
        document.getElementById('actualEndDate').value = currentTrip.tripEndDate || '';
        document.getElementById('expenseFood').value = currentTrip.expenses.food || 0;
        document.getElementById('expenseDiesel').value = currentTrip.expenses.diesel || 0;
        document.getElementById('expenseToll').value = currentTrip.expenses.toll || 0;
        document.getElementById('expenseSalary').value = currentTrip.expenses.salary || 0;
        document.getElementById('expenseGST').value = currentTrip.expenses.gst || 0;
        document.getElementById('expenseOther').value = currentTrip.expenses.other || 0;
        document.getElementById('expenseOtherDesc').value = currentTrip.expenses.otherDescription || '';
    } else {
        // New mode
        document.getElementById('actualEndDate').value = currentTrip?.tripEndDate || utils.getTodayDate();
        document.getElementById('expenseFood').value = 0;
        document.getElementById('expenseDiesel').value = 0;
        document.getElementById('expenseToll').value = 0;
        document.getElementById('expenseSalary').value = 0;
        document.getElementById('expenseGST').value = 0;
        document.getElementById('expenseOther').value = 0;
        document.getElementById('expenseOtherDesc').value = '';
    }
    
    updateExpenseSummary();
    modal.style.display = 'flex';
}

// Close expense modal
function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Update expense summary
function updateExpenseSummary() {
    const food = parseFloat(document.getElementById('expenseFood').value) || 0;
    const diesel = parseFloat(document.getElementById('expenseDiesel').value) || 0;
    const toll = parseFloat(document.getElementById('expenseToll').value) || 0;
    const salary = parseFloat(document.getElementById('expenseSalary').value) || 0;
    const gst = parseFloat(document.getElementById('expenseGST').value) || 0;
    const other = parseFloat(document.getElementById('expenseOther').value) || 0;
    
    const totalExpenses = food + diesel + toll + salary + gst + other;
    const advanceGiven = currentTrip?.amountGivenToDriver || 0;
    const remaining = advanceGiven - totalExpenses;
    
    const revenue = currentTrip?.revenue || calculations.calculateRevenue(currentTrip?.tonnage || 0, currentTrip?.ratePerTon || 0, currentTrip?.amountGivenToDriver || 0);
    const estimatedProfit = revenue - totalExpenses;
    
    document.getElementById('expenseTotal').textContent = utils.formatCurrency(totalExpenses);
    document.getElementById('expenseRemaining').textContent = utils.formatCurrency(remaining);
    document.getElementById('expenseProfit').textContent = utils.formatCurrency(estimatedProfit);
    document.getElementById('expenseProfit').className = `amount ${estimatedProfit >= 0 ? 'profit' : 'expense'}`;
}

// Handle expense form submit
function handleExpenseSubmit(e) {
    e.preventDefault();
    
    if (!currentTrip) return;
    
    const expenses = {
        food: parseFloat(document.getElementById('expenseFood').value) || 0,
        diesel: parseFloat(document.getElementById('expenseDiesel').value) || 0,
        toll: parseFloat(document.getElementById('expenseToll').value) || 0,
        salary: parseFloat(document.getElementById('expenseSalary').value) || 0,
        gst: parseFloat(document.getElementById('expenseGST').value) || 0,
        other: parseFloat(document.getElementById('expenseOther').value) || 0,
        otherDescription: document.getElementById('expenseOtherDesc').value.trim()
    };
    
    const actualEndDate = document.getElementById('actualEndDate').value;
    
    if (!actualEndDate) {
        utils.showToast('Please enter actual trip end date', 'error');
        return;
    }
    
    if (new Date(actualEndDate) < new Date(currentTrip.tripStartDate)) {
        utils.showToast('End date must be after start date', 'error');
        return;
    }
    
    const totalExpenses = calculations.calculateTotalExpenses(expenses);
    const revenue = currentTrip.revenue || calculations.calculateRevenue(currentTrip.tonnage, currentTrip.ratePerTon, currentTrip.amountGivenToDriver);
    const profit = calculations.calculateProfit(revenue, totalExpenses);
    
    // Update trip
    currentTrip.expenses = expenses;
    currentTrip.totalExpenses = totalExpenses;
    currentTrip.profit = profit;
    currentTrip.tripEndDate = actualEndDate;
    
    // If trip was in progress, mark as returned
    if (currentTrip.status === 'in_progress') {
        currentTrip.status = 'returned';
    }
    
    if (storage.TripStorage.save(currentTrip)) {
        utils.showToast('Expenses saved successfully', 'success');
        closeExpenseModal();
        loadTripDetail(currentTrip.id);
    } else {
        utils.showToast('Error saving expenses', 'error');
    }
}

// Open close trip modal
function openCloseTripModal() {
    if (!currentTrip || !currentTrip.expenses) {
        utils.showToast('Please add expenses before closing trip', 'warning');
        return;
    }
    
    // Check if trip can be closed (can be closed on trip end date or later)
    if (!currentTrip.tripEndDate) {
        utils.showToast('Trip end date is required to close trip', 'warning');
        return;
    }
    
    const returnDate = new Date(currentTrip.tripEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    returnDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - returnDate) / (1000 * 60 * 60 * 24));
    
    // Allow closing on trip end date (daysDiff >= 0) or later
    if (daysDiff < 0) {
        utils.showToast('Trip can only be closed on or after the trip end date', 'warning');
        return;
    }
    
    const modal = document.getElementById('closeTripModal');
    if (!modal) return;
    
    const revenue = currentTrip.revenue || calculations.calculateRevenue(currentTrip.tonnage, currentTrip.ratePerTon, currentTrip.amountGivenToDriver);
    const totalExpenses = currentTrip.totalExpenses || 0;
    const profit = calculations.calculateProfit(revenue, totalExpenses);
    
    document.getElementById('closeRevenue').textContent = utils.formatCurrency(revenue);
    document.getElementById('closeExpenses').textContent = utils.formatCurrency(totalExpenses);
    document.getElementById('closeProfit').textContent = utils.formatCurrency(profit);
    document.getElementById('closeProfit').className = `amount ${profit >= 0 ? 'profit' : 'expense'}`;
    
    modal.style.display = 'flex';
}

// Close close trip modal
function closeCloseTripModal() {
    const modal = document.getElementById('closeTripModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Confirm close trip
function confirmCloseTrip() {
    if (!currentTrip) return;
    
    currentTrip.status = 'closed';
    currentTrip.closedAt = new Date().toISOString();
    
    // Recalculate profit to ensure accuracy
    const revenue = currentTrip.revenue || calculations.calculateRevenue(currentTrip.tonnage, currentTrip.ratePerTon, currentTrip.amountGivenToDriver);
    const totalExpenses = currentTrip.totalExpenses || 0;
    currentTrip.profit = calculations.calculateProfit(revenue, totalExpenses);
    
    if (storage.TripStorage.save(currentTrip)) {
        utils.showToast('Trip closed successfully', 'success');
        closeCloseTripModal();
        loadTripDetail(currentTrip.id);
    } else {
        utils.showToast('Error closing trip', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add expenses button
    const addExpensesBtn = document.getElementById('addExpensesBtn');
    if (addExpensesBtn) {
        addExpensesBtn.addEventListener('click', openExpenseModal);
    }
    
    // Edit expenses button
    const editExpensesBtn = document.getElementById('editExpensesBtn');
    if (editExpensesBtn) {
        editExpensesBtn.addEventListener('click', openExpenseModal);
    }
    
    // Expense form
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
        
        // Update summary on input
        const expenseInputs = ['expenseFood', 'expenseDiesel', 'expenseToll', 'expenseSalary', 'expenseGST', 'expenseOther'];
        expenseInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', updateExpenseSummary);
            }
        });
    }
    
    // Expense modal close
    const expenseModal = document.getElementById('expenseModal');
    const expenseModalClose = document.getElementById('expenseModalClose');
    const cancelExpenseBtn = document.getElementById('cancelExpenseBtn');
    
    if (expenseModalClose) {
        expenseModalClose.addEventListener('click', closeExpenseModal);
    }
    
    if (cancelExpenseBtn) {
        cancelExpenseBtn.addEventListener('click', closeExpenseModal);
    }
    
    if (expenseModal) {
        expenseModal.addEventListener('click', (e) => {
            if (e.target === expenseModal) {
                closeExpenseModal();
            }
        });
    }
    
    // Close trip modal
    const closeTripModal = document.getElementById('closeTripModal');
    const closeTripModalClose = document.getElementById('closeTripModalClose');
    const cancelCloseBtn = document.getElementById('cancelCloseBtn');
    const confirmCloseBtn = document.getElementById('confirmCloseBtn');
    
    if (closeTripModalClose) {
        closeTripModalClose.addEventListener('click', closeCloseTripModal);
    }
    
    if (cancelCloseBtn) {
        cancelCloseBtn.addEventListener('click', closeCloseTripModal);
    }
    
    if (confirmCloseBtn) {
        confirmCloseBtn.addEventListener('click', confirmCloseTrip);
    }
    
    if (closeTripModal) {
        closeTripModal.addEventListener('click', (e) => {
            if (e.target === closeTripModal) {
                closeCloseTripModal();
            }
        });
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

// Delete trip from detail page
async function deleteTripFromDetail() {
    if (!currentTrip) return;
    
    const confirmed = await utils.confirmDialog(
        `Are you sure you want to delete trip ${currentTrip.vehicleNumber}? This action cannot be undone.`,
        'Delete Trip'
    );
    
    if (confirmed) {
        if (storage.TripStorage.delete(currentTrip.id)) {
            utils.showToast('Trip deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = 'trips.html';
            }, 1000);
        } else {
            utils.showToast('Error deleting trip', 'error');
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTripDetail);

