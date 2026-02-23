// Profit and Expense Calculations

// Calculate revenue (advance given is part of revenue, not added to it)
function calculateRevenue(tonnage, ratePerTon, advanceGiven = 0) {
    if (!tonnage || !ratePerTon || isNaN(tonnage) || isNaN(ratePerTon)) {
        return 0;
    }
    // Revenue is just tonnage × rate per ton
    // Advance given is part of this revenue, not additional to it
    return parseFloat(tonnage) * parseFloat(ratePerTon);
}

// Calculate total expenses
function calculateTotalExpenses(expenses) {
    if (!expenses) return 0;
    
    const food = parseFloat(expenses.food) || 0;
    const diesel = parseFloat(expenses.diesel) || 0;
    const toll = parseFloat(expenses.toll) || 0;
    const salary = parseFloat(expenses.salary) || 0;
    const gst = parseFloat(expenses.gst) || 0;
    const other = parseFloat(expenses.other) || 0;
    
    return food + diesel + toll + salary + gst + other;
}

// Calculate profit
function calculateProfit(revenue, totalExpenses) {
    if (!revenue || !totalExpenses) return 0;
    return parseFloat(revenue) - parseFloat(totalExpenses);
}

// Get monthly profit
function getMonthlyProfit(month, year) {
    const trips = storage.TripStorage.getAll();
    const closedTrips = trips.filter(trip => {
        if (trip.status !== 'closed') return false;
        
        const tripDate = new Date(trip.closedAt || trip.updatedAt);
        return tripDate.getMonth() === month && tripDate.getFullYear() === year;
    });
    
    return closedTrips.reduce((total, trip) => {
        return total + (parseFloat(trip.profit) || 0);
    }, 0);
}

// Get yearly profit
function getYearlyProfit(year) {
    const trips = storage.TripStorage.getAll();
    const closedTrips = trips.filter(trip => {
        if (trip.status !== 'closed') return false;
        
        const tripDate = new Date(trip.closedAt || trip.updatedAt);
        return tripDate.getFullYear() === year;
    });
    
    return closedTrips.reduce((total, trip) => {
        return total + (parseFloat(trip.profit) || 0);
    }, 0);
}

// Get monthly expenses
function getMonthlyExpenses(month, year) {
    const trips = storage.TripStorage.getAll();
    const closedTrips = trips.filter(trip => {
        if (trip.status !== 'closed') return false;
        
        const tripDate = new Date(trip.closedAt || trip.updatedAt);
        return tripDate.getMonth() === month && tripDate.getFullYear() === year;
    });
    
    return closedTrips.reduce((total, trip) => {
        return total + (parseFloat(trip.totalExpenses) || 0);
    }, 0);
}

// Get last N months profit data
function getLastMonthsProfit(months = 12) {
    const data = [];
    const today = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const month = date.getMonth();
        const year = date.getFullYear();
        const profit = getMonthlyProfit(month, year);
        
        data.push({
            month: month,
            year: year,
            monthName: utils.getMonthName(month),
            profit: profit,
            label: `${utils.getMonthName(month)} ${year}`
        });
    }
    
    return data;
}

// Get expense breakdown for a period
function getExpenseBreakdown(trips) {
    const breakdown = {
        food: 0,
        diesel: 0,
        toll: 0,
        salary: 0,
        gst: 0,
        other: 0
    };
    
    trips.forEach(trip => {
        if (trip.expenses) {
            breakdown.food += parseFloat(trip.expenses.food) || 0;
            breakdown.diesel += parseFloat(trip.expenses.diesel) || 0;
            breakdown.toll += parseFloat(trip.expenses.toll) || 0;
            breakdown.salary += parseFloat(trip.expenses.salary) || 0;
            breakdown.gst += parseFloat(trip.expenses.gst) || 0;
            breakdown.other += parseFloat(trip.expenses.other) || 0;
        }
    });
    
    return breakdown;
}

// Get current month profit
function getCurrentMonthProfit() {
    const today = new Date();
    return getMonthlyProfit(today.getMonth(), today.getFullYear());
}

// Get current year profit
function getCurrentYearProfit() {
    const today = new Date();
    return getYearlyProfit(today.getFullYear());
}

// Get current month expenses
function getCurrentMonthExpenses() {
    const today = new Date();
    return getMonthlyExpenses(today.getMonth(), today.getFullYear());
}

// Get active trips count
function getActiveTripsCount() {
    const trips = storage.TripStorage.getAll();
    return trips.filter(trip => 
        trip.status === 'draft' || 
        trip.status === 'in_progress' || 
        trip.status === 'returned'
    ).length;
}

// Get trip status distribution
function getTripStatusDistribution() {
    const trips = storage.TripStorage.getAll();
    const distribution = {
        draft: 0,
        in_progress: 0,
        returned: 0,
        closed: 0
    };
    
    trips.forEach(trip => {
        if (distribution.hasOwnProperty(trip.status)) {
            distribution[trip.status]++;
        }
    });
    
    return distribution;
}

// Get driver performance
function getDriverPerformance(driverName, startDate, endDate) {
    const trips = storage.TripStorage.getAll();
    let filteredTrips = trips.filter(trip => trip.driverName === driverName);
    
    if (startDate && endDate) {
        filteredTrips = filteredTrips.filter(trip => {
            const tripDate = new Date(trip.tripStartDate);
            return tripDate >= new Date(startDate) && tripDate <= new Date(endDate);
        });
    }
    
    const closedTrips = filteredTrips.filter(trip => trip.status === 'closed');
    
    const totalTrips = closedTrips.length;
    const totalProfit = closedTrips.reduce((sum, trip) => sum + (parseFloat(trip.profit) || 0), 0);
    const avgProfit = totalTrips > 0 ? totalProfit / totalTrips : 0;
    
    return {
        driverName,
        totalTrips,
        totalProfit,
        avgProfit
    };
}

// Get vehicle performance
function getVehiclePerformance(vehicleNumber, startDate, endDate) {
    const trips = storage.TripStorage.getAll();
    let filteredTrips = trips.filter(trip => trip.vehicleNumber === vehicleNumber);
    
    if (startDate && endDate) {
        filteredTrips = filteredTrips.filter(trip => {
            const tripDate = new Date(trip.tripStartDate);
            return tripDate >= new Date(startDate) && tripDate <= new Date(endDate);
        });
    }
    
    const closedTrips = filteredTrips.filter(trip => trip.status === 'closed');
    
    const totalTrips = closedTrips.length;
    const totalProfit = closedTrips.reduce((sum, trip) => sum + (parseFloat(trip.profit) || 0), 0);
    const avgProfit = totalTrips > 0 ? totalProfit / totalTrips : 0;
    
    return {
        vehicleNumber,
        totalTrips,
        totalProfit,
        avgProfit
    };
}

// Export calculation functions
window.calculations = {
    calculateRevenue,
    calculateTotalExpenses,
    calculateProfit,
    getMonthlyProfit,
    getYearlyProfit,
    getMonthlyExpenses,
    getLastMonthsProfit,
    getExpenseBreakdown,
    getCurrentMonthProfit,
    getCurrentYearProfit,
    getCurrentMonthExpenses,
    getActiveTripsCount,
    getTripStatusDistribution,
    getDriverPerformance,
    getVehiclePerformance
};

