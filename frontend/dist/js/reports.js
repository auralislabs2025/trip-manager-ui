// Reports Logic

// Initialize reports page
function initReports() {
    if (!auth.protectRoute()) return;
    
    setupEventListeners();
    setupNavigation();
    
    // Load default report
    generateReport();
}

// Setup event listeners
function setupEventListeners() {
    const generateBtn = document.getElementById('generateReportBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReport);
    }
}

// Generate report
function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const dateFrom = document.getElementById('reportDateFrom').value;
    const dateTo = document.getElementById('reportDateTo').value;
    
    const container = document.getElementById('reportResults');
    if (!container) return;
    
    container.innerHTML = '<div class="skeleton" style="height: 200px; margin-bottom: var(--spacing-base);"></div>';
    
    setTimeout(() => {
        switch (reportType) {
            case 'trip':
                displayTripWiseReport(dateFrom, dateTo);
                break;
            case 'driver':
                displayDriverReport(dateFrom, dateTo);
                break;
            case 'vehicle':
                displayVehicleReport(dateFrom, dateTo);
                break;
            case 'expense':
                displayExpenseReport(dateFrom, dateTo);
                break;
            default:
                displayTripWiseReport(dateFrom, dateTo);
        }
    }, 300);
}

// Display trip-wise profit report
function displayTripWiseReport(dateFrom, dateTo) {
    let trips = storage.TripStorage.getAll();
    
    // Filter by date range
    if (dateFrom && dateTo) {
        trips = trips.filter(trip => {
            const tripDate = new Date(trip.tripStartDate);
            return tripDate >= new Date(dateFrom) && tripDate <= new Date(dateTo);
        });
    }
    
    // Only show closed trips
    trips = trips.filter(trip => trip.status === 'closed');
    
    // Sort by date
    trips.sort((a, b) => new Date(b.closedAt || b.updatedAt) - new Date(a.closedAt || a.updatedAt));
    
    const container = document.getElementById('reportResults');
    if (!container) return;
    
    if (trips.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No trips found for the selected period</p></div>';
        return;
    }
    
    const totalProfit = trips.reduce((sum, trip) => sum + (parseFloat(trip.profit) || 0), 0);
    const totalRevenue = trips.reduce((sum, trip) => sum + (parseFloat(trip.revenue) || 0), 0);
    const totalExpenses = trips.reduce((sum, trip) => sum + (parseFloat(trip.totalExpenses) || 0), 0);
    
    container.innerHTML = `
        <div class="info-card">
            <h2>Summary</h2>
            <div class="financial-grid">
                <div class="financial-item">
                    <label>Total Trips</label>
                    <p class="amount">${trips.length}</p>
                </div>
                <div class="financial-item">
                    <label>Total Revenue</label>
                    <p class="amount">${utils.formatCurrency(totalRevenue)}</p>
                </div>
                <div class="financial-item">
                    <label>Total Expenses</label>
                    <p class="amount expense">${utils.formatCurrency(totalExpenses)}</p>
                </div>
                <div class="financial-item highlight">
                    <label>Total Profit</label>
                    <p class="amount ${totalProfit >= 0 ? 'profit' : 'expense'}">${utils.formatCurrency(totalProfit)}</p>
                </div>
            </div>
        </div>
        
        <div class="info-card">
            <h2>Trip Details</h2>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Revenue</th>
                        <th>Expenses</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${trips.map(trip => `
                        <tr onclick="window.location.href='trip-detail.html?id=${trip.id}'" style="cursor: pointer;">
                            <td>${utils.formatDate(trip.closedAt || trip.updatedAt)}</td>
                            <td>${trip.vehicleNumber}</td>
                            <td>${trip.driverName}</td>
                            <td>${utils.formatCurrency(trip.revenue || 0)}</td>
                            <td>${utils.formatCurrency(trip.totalExpenses || 0)}</td>
                            <td class="${parseFloat(trip.profit || 0) >= 0 ? 'profit' : 'expense'}">${utils.formatCurrency(trip.profit || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display driver performance report
function displayDriverReport(dateFrom, dateTo) {
    const trips = storage.TripStorage.getAll();
    const drivers = storage.DriverStorage.getAll();
    
    const driverPerformance = drivers.map(driver => {
        return calculations.getDriverPerformance(driver.name, dateFrom, dateTo);
    }).filter(perf => perf.totalTrips > 0);
    
    driverPerformance.sort((a, b) => b.totalProfit - a.totalProfit);
    
    const container = document.getElementById('reportResults');
    if (!container) return;
    
    if (driverPerformance.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No driver performance data found</p></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="info-card">
            <h2>Driver Performance</h2>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Driver Name</th>
                        <th>Total Trips</th>
                        <th>Total Profit</th>
                        <th>Average Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${driverPerformance.map(perf => `
                        <tr>
                            <td>${perf.driverName}</td>
                            <td>${perf.totalTrips}</td>
                            <td class="${perf.totalProfit >= 0 ? 'profit' : 'expense'}">${utils.formatCurrency(perf.totalProfit)}</td>
                            <td class="${perf.avgProfit >= 0 ? 'profit' : 'expense'}">${utils.formatCurrency(perf.avgProfit)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display vehicle performance report
function displayVehicleReport(dateFrom, dateTo) {
    const vehicles = storage.VehicleStorage.getAll();
    
    const vehiclePerformance = vehicles.map(vehicle => {
        return calculations.getVehiclePerformance(vehicle.vehicleNumber, dateFrom, dateTo);
    }).filter(perf => perf.totalTrips > 0);
    
    vehiclePerformance.sort((a, b) => b.totalProfit - a.totalProfit);
    
    const container = document.getElementById('reportResults');
    if (!container) return;
    
    if (vehiclePerformance.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No vehicle performance data found</p></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="info-card">
            <h2>Vehicle Performance</h2>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Vehicle Number</th>
                        <th>Total Trips</th>
                        <th>Total Profit</th>
                        <th>Average Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${vehiclePerformance.map(perf => `
                        <tr>
                            <td>${perf.vehicleNumber}</td>
                            <td>${perf.totalTrips}</td>
                            <td class="${perf.totalProfit >= 0 ? 'profit' : 'expense'}">${utils.formatCurrency(perf.totalProfit)}</td>
                            <td class="${perf.avgProfit >= 0 ? 'profit' : 'expense'}">${utils.formatCurrency(perf.avgProfit)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display expense analysis report
function displayExpenseReport(dateFrom, dateTo) {
    let trips = storage.TripStorage.getAll();
    
    // Filter by date range
    if (dateFrom && dateTo) {
        trips = trips.filter(trip => {
            const tripDate = new Date(trip.closedAt || trip.updatedAt);
            return tripDate >= new Date(dateFrom) && tripDate <= new Date(dateTo);
        });
    }
    
    // Only closed trips
    trips = trips.filter(trip => trip.status === 'closed');
    
    const breakdown = calculations.getExpenseBreakdown(trips);
    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    
    const container = document.getElementById('reportResults');
    if (!container) return;
    
    if (total === 0) {
        container.innerHTML = '<div class="empty-state"><p>No expense data found for the selected period</p></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="info-card">
            <h2>Expense Breakdown</h2>
            <div class="expenses-list">
                <div class="expense-item">
                    <span class="expense-item-label">Food</span>
                    <span class="expense-item-value">${utils.formatCurrency(breakdown.food)} (${((breakdown.food / total) * 100).toFixed(1)}%)</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Diesel</span>
                    <span class="expense-item-value">${utils.formatCurrency(breakdown.diesel)} (${((breakdown.diesel / total) * 100).toFixed(1)}%)</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Toll</span>
                    <span class="expense-item-value">${utils.formatCurrency(breakdown.toll)} (${((breakdown.toll / total) * 100).toFixed(1)}%)</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Driver Salary</span>
                    <span class="expense-item-value">${utils.formatCurrency(breakdown.salary)} (${((breakdown.salary / total) * 100).toFixed(1)}%)</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">GST/Other Taxes</span>
                    <span class="expense-item-value">${utils.formatCurrency(breakdown.gst)} (${((breakdown.gst / total) * 100).toFixed(1)}%)</span>
                </div>
                <div class="expense-item">
                    <span class="expense-item-label">Other Expenses</span>
                    <span class="expense-item-value">${utils.formatCurrency(breakdown.other)} (${((breakdown.other / total) * 100).toFixed(1)}%)</span>
                </div>
                <div class="expense-item" style="border-top: 2px solid var(--color-border); margin-top: var(--spacing-base); padding-top: var(--spacing-base);">
                    <span class="expense-item-label" style="font-weight: var(--font-weight-bold);">Total Expenses</span>
                    <span class="expense-item-value" style="font-weight: var(--font-weight-bold); font-size: var(--font-size-lg);">${utils.formatCurrency(total)}</span>
                </div>
            </div>
        </div>
    `;
}

// Export report
function exportReport() {
    const reportType = document.getElementById('reportType').value;
    const dateFrom = document.getElementById('reportDateFrom').value;
    const dateTo = document.getElementById('reportDateTo').value;
    
    let trips = storage.TripStorage.getAll();
    
    if (dateFrom && dateTo) {
        trips = trips.filter(trip => {
            const tripDate = new Date(trip.tripStartDate);
            return tripDate >= new Date(dateFrom) && tripDate <= new Date(dateTo);
        });
    }
    
    // Convert to CSV
    const headers = ['Date', 'Vehicle', 'Driver', 'Status', 'Revenue', 'Expenses', 'Profit'];
    const rows = trips.map(trip => [
        utils.formatDate(trip.tripStartDate),
        trip.vehicleNumber,
        trip.driverName,
        trip.status,
        trip.revenue || 0,
        trip.totalExpenses || 0,
        trip.profit || 0
    ]);
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    utils.showToast('Report exported successfully', 'success');
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', initReports);

