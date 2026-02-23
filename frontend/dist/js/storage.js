// LocalStorage Data Management

const STORAGE_KEYS = {
    USERS: 'truckmgmt_users',
    TRIPS: 'truckmgmt_trips',
    VEHICLES: 'truckmgmt_vehicles',
    DRIVERS: 'truckmgmt_drivers',
    SETTINGS: 'truckmgmt_settings',
    SESSION: 'truckmgmt_session'
};

// Simple password hashing (for demo purposes - use proper hashing in production)
function hashPassword(password) {
    // Simple hash function - in production, use proper bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// Initialize storage with default data
function initializeStorage() {
    // Initialize users if not exists
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const defaultUsers = [
            {
                id: 'user_admin_1',
                username: 'admin',
                password: hashPassword('admin123'), // Simple hash for demo
                role: 'admin',
                createdAt: new Date().toISOString()
            },
            {
                id: 'user_staff_1',
                username: 'staff',
                password: hashPassword('staff123'),
                role: 'staff',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }
    
    // Initialize other storage keys if not exists
    if (!localStorage.getItem(STORAGE_KEYS.TRIPS)) {
        localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
        localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.DRIVERS)) {
        localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
            defaultRatePerTon: 650,
            currency: 'INR',
            dateFormat: 'DD/MM/YYYY'
        }));
    }
}

// Get data from storage
function getStorageData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
    }
}

// Set data to storage
function setStorageData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error writing to storage:', error);
        return false;
    }
}

// Trip Operations
const TripStorage = {
    // Get all trips
    getAll() {
        return getStorageData(STORAGE_KEYS.TRIPS) || [];
    },
    
    // Get trip by ID
    getById(id) {
        const trips = this.getAll();
        return trips.find(trip => trip.id === id) || null;
    },
    
    // Save trip (create or update)
    save(trip) {
        const trips = this.getAll();
        const index = trips.findIndex(t => t.id === trip.id);
        
        if (index >= 0) {
            // Update existing trip
            trips[index] = { ...trip, updatedAt: new Date().toISOString() };
        } else {
            // Create new trip
            const newTrip = {
                ...trip,
                id: trip.id || generateId('trip_'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            trips.push(newTrip);
        }
        
        return setStorageData(STORAGE_KEYS.TRIPS, trips);
    },
    
    // Delete trip
    delete(id) {
        const trips = this.getAll();
        const filtered = trips.filter(trip => trip.id !== id);
        return setStorageData(STORAGE_KEYS.TRIPS, filtered);
    },
    
    // Get trips by status
    getByStatus(status) {
        const trips = this.getAll();
        return trips.filter(trip => trip.status === status);
    },
    
    // Get trips by date range
    getByDateRange(startDate, endDate) {
        const trips = this.getAll();
        return trips.filter(trip => {
            const tripDate = new Date(trip.tripStartDate);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return tripDate >= start && tripDate <= end;
        });
    }
};

// User Operations
const UserStorage = {
    getAll() {
        return getStorageData(STORAGE_KEYS.USERS) || [];
    },
    
    getByUsername(username) {
        const users = this.getAll();
        return users.find(user => user.username === username) || null;
    },
    
    save(user) {
        const users = this.getAll();
        const index = users.findIndex(u => u.id === user.id);
        
        if (index >= 0) {
            users[index] = user;
        } else {
            users.push(user);
        }
        
        return setStorageData(STORAGE_KEYS.USERS, users);
    }
};

// Vehicle Operations
const VehicleStorage = {
    getAll() {
        return getStorageData(STORAGE_KEYS.VEHICLES) || [];
    },
    
    getByNumber(vehicleNumber) {
        const vehicles = this.getAll();
        return vehicles.find(v => v.vehicleNumber === vehicleNumber) || null;
    },
    
    save(vehicle) {
        const vehicles = this.getAll();
        const index = vehicles.findIndex(v => v.id === vehicle.id);
        
        if (index >= 0) {
            vehicles[index] = vehicle;
        } else {
            vehicles.push({
                ...vehicle,
                id: vehicle.id || generateId('vehicle_'),
                createdAt: new Date().toISOString()
            });
        }
        
        return setStorageData(STORAGE_KEYS.VEHICLES, vehicles);
    },
    
    // Auto-create vehicle from trip if not exists
    ensureExists(vehicleNumber) {
        if (!this.getByNumber(vehicleNumber)) {
            this.save({
                vehicleNumber: vehicleNumber,
                driverName: '' // Will be updated from trip
            });
        }
    }
};

// Driver Operations
const DriverStorage = {
    getAll() {
        return getStorageData(STORAGE_KEYS.DRIVERS) || [];
    },
    
    getByName(name) {
        const drivers = this.getAll();
        return drivers.find(d => d.name === name) || null;
    },
    
    save(driver) {
        const drivers = this.getAll();
        const index = drivers.findIndex(d => d.id === driver.id);
        
        if (index >= 0) {
            drivers[index] = driver;
        } else {
            drivers.push({
                ...driver,
                id: driver.id || generateId('driver_'),
                createdAt: new Date().toISOString()
            });
        }
        
        return setStorageData(STORAGE_KEYS.DRIVERS, drivers);
    },
    
    // Auto-create driver from trip if not exists
    ensureExists(name) {
        if (!this.getByName(name)) {
            this.save({ name: name });
        }
    }
};

// Session Operations
const SessionStorage = {
    get() {
        return getStorageData(STORAGE_KEYS.SESSION);
    },
    
    set(session) {
        return setStorageData(STORAGE_KEYS.SESSION, session);
    },
    
    clear() {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
};

// Settings Operations
const SettingsStorage = {
    get() {
        return getStorageData(STORAGE_KEYS.SETTINGS) || {
            defaultRatePerTon: 650,
            currency: 'INR',
            dateFormat: 'DD/MM/YYYY'
        };
    },
    
    update(settings) {
        const current = this.get();
        return setStorageData(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
    }
};

// Export/Import Functions
function exportData() {
    const data = {
        trips: TripStorage.getAll(),
        vehicles: VehicleStorage.getAll(),
        drivers: DriverStorage.getAll(),
        settings: SettingsStorage.get(),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truck-management-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
}

function importData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!data.trips || !Array.isArray(data.trips)) {
                    reject(new Error('Invalid data format: trips array missing'));
                    return;
                }
                
                // Import data
                if (data.trips) setStorageData(STORAGE_KEYS.TRIPS, data.trips);
                if (data.vehicles) setStorageData(STORAGE_KEYS.VEHICLES, data.vehicles);
                if (data.drivers) setStorageData(STORAGE_KEYS.DRIVERS, data.drivers);
                if (data.settings) setStorageData(STORAGE_KEYS.SETTINGS, data.settings);
                
                resolve(true);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

// Initialize storage on load
initializeStorage();

// Export storage functions
window.storage = {
    TripStorage,
    UserStorage,
    VehicleStorage,
    DriverStorage,
    SessionStorage,
    SettingsStorage,
    exportData,
    importData,
    hashPassword
};

