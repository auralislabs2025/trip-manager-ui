// Dashboard Logic

let monthlyProfitChart = null;
let expenseChart = null;
let tripStatusChart = null;

// Initialize dashboard
function initDashboard() {
    if (!auth.protectRoute()) return;
    
    updateMetrics();
    loadRecentTrips();
    initCharts();
    setupNavigation();
}

// Update metrics cards
function updateMetrics() {
    const monthlyProfit = calculations.getCurrentMonthProfit();
    const yearlyProfit = calculations.getCurrentYearProfit();
    const activeTrips = calculations.getActiveTripsCount();
    const monthlyExpenses = calculations.getCurrentMonthExpenses();
    
    // Update monthly profit
    const monthlyProfitEl = document.getElementById('monthlyProfit');
    if (monthlyProfitEl) {
        monthlyProfitEl.textContent = utils.formatCurrency(monthlyProfit);
    }
    
    // Update yearly profit
    const yearlyProfitEl = document.getElementById('yearlyProfit');
    if (yearlyProfitEl) {
        yearlyProfitEl.textContent = utils.formatCurrency(yearlyProfit);
    }
    
    // Update active trips
    const activeTripsEl = document.getElementById('activeTrips');
    if (activeTripsEl) {
        activeTripsEl.textContent = activeTrips;
    }
    
    // Update monthly expenses
    const monthlyExpensesEl = document.getElementById('monthlyExpenses');
    if (monthlyExpensesEl) {
        monthlyExpensesEl.textContent = utils.formatCurrency(monthlyExpenses);
    }
    
    // Calculate previous month profit for comparison
    const today = new Date();
    const prevMonth = today.getMonth() - 1;
    const prevYear = prevMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
    const prevMonthProfit = calculations.getMonthlyProfit(prevMonth < 0 ? 11 : prevMonth, prevYear);
    const change = monthlyProfit - prevMonthProfit;
    const changePercent = prevMonthProfit !== 0 ? ((change / prevMonthProfit) * 100).toFixed(1) : 0;
    
    const monthlyProfitChangeEl = document.getElementById('monthlyProfitChange');
    if (monthlyProfitChangeEl) {
        if (change > 0) {
            monthlyProfitChangeEl.textContent = `↑ ${utils.formatCurrency(Math.abs(change))} (${Math.abs(changePercent)}%)`;
            monthlyProfitChangeEl.style.color = 'var(--color-success)';
        } else if (change < 0) {
            monthlyProfitChangeEl.textContent = `↓ ${utils.formatCurrency(Math.abs(change))} (${Math.abs(changePercent)}%)`;
            monthlyProfitChangeEl.style.color = 'var(--color-error)';
        } else {
            monthlyProfitChangeEl.textContent = 'No change';
            monthlyProfitChangeEl.style.color = 'var(--color-text-secondary)';
        }
    }
}

// Load recent trips
function loadRecentTrips() {
    const trips = storage.TripStorage.getAll();
    const recentTrips = trips
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    const container = document.getElementById('recentTripsList');
    if (!container) return;
    
    if (recentTrips.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No trips yet</p>';
        return;
    }
    
    container.innerHTML = recentTrips.map(trip => {
        const profit = trip.profit !== undefined ? parseFloat(trip.profit) : 0;
        const profitClass = profit >= 0 ? 'positive' : 'negative';
        const profitText = trip.status === 'closed' ? utils.formatCurrency(profit) : '-';
        
        return `
            <div class="trip-item" onclick="window.location.href='trip-detail.html?id=${trip.id}'">
                <div class="trip-item-info">
                    <h4>${trip.vehicleNumber} - ${trip.driverName}</h4>
                    <div class="trip-item-meta">
                        <span>${utils.formatDate(trip.tripStartDate)}</span>
                        <span class="status-badge ${trip.status}">${trip.status.replace('_', ' ')}</span>
                    </div>
                </div>
                <div class="trip-item-actions">
                    <span class="trip-item-profit ${profitClass}">${profitText}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize charts
function initCharts() {
    initMonthlyProfitChart();
    initExpenseChart();
    initTripStatusChart();
}

// Monthly profit line chart
function initMonthlyProfitChart() {
    const ctx = document.getElementById('monthlyProfitChart');
    if (!ctx) return;
    
    const data = calculations.getLastMonthsProfit(12);
    
    if (monthlyProfitChart) {
        monthlyProfitChart.destroy();
    }
    
    monthlyProfitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Profit (₹)',
                data: data.map(d => d.profit),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + new Intl.NumberFormat('en-IN').format(value);
                        }
                    }
                }
            }
        }
    });
}

// Expense breakdown pie chart
function initExpenseChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    const today = new Date();
    const trips = storage.TripStorage.getAll().filter(trip => {
        if (trip.status !== 'closed') return false;
        const tripDate = new Date(trip.closedAt || trip.updatedAt);
        return tripDate.getMonth() === today.getMonth() && tripDate.getFullYear() === today.getFullYear();
    });
    
    const breakdown = calculations.getExpenseBreakdown(trips);
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Food', 'Diesel', 'Toll', 'Salary', 'GST', 'Other'],
            datasets: [{
                data: [
                    breakdown.food,
                    breakdown.diesel,
                    breakdown.toll,
                    breakdown.salary,
                    breakdown.gst,
                    breakdown.other
                ],
                backgroundColor: [
                    '#FF9800',
                    '#F44336',
                    '#9C27B0',
                    '#2196F3',
                    '#4CAF50',
                    '#00BCD4'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = utils.formatCurrency(context.parsed);
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

// Trip status distribution chart
function initTripStatusChart() {
    const ctx = document.getElementById('tripStatusChart');
    if (!ctx) return;
    
    const distribution = calculations.getTripStatusDistribution();
    
    if (tripStatusChart) {
        tripStatusChart.destroy();
    }
    
    tripStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Draft', 'In Progress', 'Returned', 'Closed'],
            datasets: [{
                data: [
                    distribution.draft,
                    distribution.in_progress,
                    distribution.returned,
                    distribution.closed
                ],
                backgroundColor: [
                    '#757575',
                    '#2196F3',
                    '#FF9800',
                    '#4CAF50'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
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
                // Mobile: use active class
                sidebar.classList.toggle('active');
            } else {
                // Tablet/Desktop: use collapsed class
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
            // On tablet/desktop, ensure sidebar state is correct
            if (sidebar && !sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('active');
            }
        } else {
            // On mobile, ensure collapsed class is removed
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
document.addEventListener('DOMContentLoaded', initDashboard);

