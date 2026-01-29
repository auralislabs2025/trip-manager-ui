// Vehicles Management JavaScript

let gridApi;
let currentVehicleId = null;
let isEditMode = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initVehiclesPage();
});

function initVehiclesPage() {
    // Check authentication
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        window.location.href = '../index.html';
        return;
    }
    
    // Setup sidebar navigation and master menu
    if (typeof setupSidebarNavigation === 'function') {
        setupSidebarNavigation();
    }
    if (typeof MastersNavigation !== 'undefined' && typeof MastersNavigation.setupMasterMenu === 'function') {
        MastersNavigation.setupMasterMenu();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize AG Grid
    initVehiclesGrid();
    
    // Load vehicles data
    loadVehicles();
}

function setupEventListeners() {
    // Add button
    document.getElementById('addVehicleBtn').addEventListener('click', () => {
        openAddModal();
    });
    
    // Modal close
    document.getElementById('closeModal').addEventListener('click', () => {
        closeModal();
    });
    
    document.getElementById('cancelBtn').addEventListener('click', () => {
        closeModal();
    });
    
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => {
        saveVehicle();
    });
    
    // Delete confirmation
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        closeDeleteModal();
    });
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        confirmDelete();
    });
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        if (gridApi) {
            gridApi.setGridOption('quickFilterText', searchTerm);
        }
    });
    
    // Active filter toggle
    document.getElementById('activeFilterToggle').addEventListener('click', (e) => {
        e.target.classList.toggle('active');
        loadVehicles();
    });
    
    // Close modal on backdrop click
    document.getElementById('vehicleModal').addEventListener('click', (e) => {
        if (e.target.id === 'vehicleModal') {
            closeModal();
        }
    });
    
    // Master menu dropdown is handled by MastersNavigation.setupMasterMenu()
}

function initVehiclesGrid() {
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded');
        setTimeout(initVehiclesGrid, 100);
        return;
    }
    
    const gridDiv = document.getElementById('vehiclesGridContainer');
    const gridOptions = {
        ...MastersGrid.getDefaultGridOptions(),
        columnDefs: [
            {
                headerName: 'Vehicle Number',
                field: 'vehicle_number',
                width: 200,
                minWidth: 150,
                sortable: true,
                filter: false
            },
            {
                headerName: 'Vehicle Type',
                field: 'vehicle_type',
                width: 150,
                minWidth: 120,
                sortable: true,
                filter: false
            },
            {
                headerName: 'Current Driver',
                field: 'current_driver_name',
                width: 200,
                minWidth: 150,
                sortable: true,
                filter: false
            },
            MastersGrid.createStatusColumn(),
            MastersGrid.createDateColumn('created_at', 'Created At', 180),
            MastersGrid.createActionsColumn('Vehicle', 'Vehicle')
        ],
        onGridReady: (params) => {
            gridApi = params.api;
        }
    };
    
    agGrid.createGrid(gridDiv, gridOptions);
}

async function loadVehicles() {
    try {
        const activeFilter = document.getElementById('activeFilterToggle').classList.contains('active');
        const params = {
            page: 1,
            page_size: 1000,
            is_active: activeFilter ? true : undefined
        };
        
        const response = await MastersAPI.getAll('vehicles', params);
        const vehicles = response.items || response || [];
        
        if (gridApi) {
            gridApi.setGridOption('rowData', vehicles);
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
        utils.showToast('Failed to load vehicles: ' + error.message, 'error');
    }
}

function openAddModal() {
    isEditMode = false;
    currentVehicleId = null;
    document.getElementById('modalTitle').textContent = 'Add Vehicle';
    MastersModal.resetForm('vehicleForm');
    document.getElementById('is_active').checked = true;
    document.getElementById('vehicle_type').value = 'Truck';
    MastersModal.show('vehicleModal');
}

// Global function for edit button
window.editVehicle = function(id) {
    isEditMode = true;
    currentVehicleId = id;
    document.getElementById('modalTitle').textContent = 'Edit Vehicle';
    
    MastersAPI.getById('vehicles', id)
        .then(vehicle => {
            MastersModal.fillForm('vehicleForm', vehicle);
            MastersModal.show('vehicleModal');
        })
        .catch(error => {
            console.error('Error loading vehicle:', error);
            utils.showToast('Failed to load vehicle: ' + error.message, 'error');
        });
};

function closeModal() {
    MastersModal.hide('vehicleModal');
    MastersModal.resetForm('vehicleForm');
    currentVehicleId = null;
    isEditMode = false;
}

async function saveVehicle() {
    const form = document.getElementById('vehicleForm');
    const formData = new FormData(form);
    
    const data = {
        vehicle_number: formData.get('vehicle_number'),
        vehicle_type: formData.get('vehicle_type') || 'Truck',
        current_driver_name: formData.get('current_driver_name') || null,
        is_active: document.getElementById('is_active').checked
    };
    
    // Validation
    const validation = MastersValidation.validateForm('vehicleForm', {
        vehicle_number: [
            (v) => MastersValidation.required(v, 'Vehicle Number')
        ]
    });
    
    if (!validation.valid) {
        return;
    }
    
    try {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
        
        if (isEditMode && currentVehicleId) {
            await MastersAPI.update('vehicles', currentVehicleId, data);
            utils.showToast('Vehicle updated successfully', 'success');
        } else {
            await MastersAPI.create('vehicles', data);
            utils.showToast('Vehicle created successfully', 'success');
        }
        
        closeModal();
        loadVehicles();
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    } catch (error) {
        console.error('Error saving vehicle:', error);
        utils.showToast('Failed to save vehicle: ' + error.message, 'error');
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Global function for delete button
window.deleteVehicle = function(id) {
    currentVehicleId = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentVehicleId = null;
}

async function confirmDelete() {
    if (!currentVehicleId) return;
    
    try {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        
        await MastersAPI.delete('vehicles', currentVehicleId);
        utils.showToast('Vehicle deleted successfully', 'success');
        
        closeDeleteModal();
        loadVehicles();
        
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        utils.showToast('Failed to delete vehicle: ' + error.message, 'error');
        
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    }
}

