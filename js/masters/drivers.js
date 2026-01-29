// Drivers Management JavaScript

let gridApi;
let currentDriverId = null;
let isEditMode = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initDriversPage();
});

function initDriversPage() {
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
    initDriversGrid();
    
    // Load drivers data
    loadDrivers();
}

function setupEventListeners() {
    // Add button
    document.getElementById('addDriverBtn').addEventListener('click', () => {
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
        saveDriver();
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
        loadDrivers();
    });
    
    // Close modal on backdrop click
    document.getElementById('driverModal').addEventListener('click', (e) => {
        if (e.target.id === 'driverModal') {
            closeModal();
        }
    });
}

function initDriversGrid() {
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded');
        setTimeout(initDriversGrid, 100);
        return;
    }
    
    const gridDiv = document.getElementById('driversGridContainer');
    const isDesktop = window.innerWidth >= 1024;
    const createdAtColumn = MastersGrid.createDateColumn('created_at', 'Created At', 180, {
        flex: isDesktop ? 1 : undefined
    });

    const gridOptions = {
        ...MastersGrid.getDefaultGridOptions(),
        suppressSizeToFit: !isDesktop,
        columnDefs: [
            {
                headerName: 'Name',
                field: 'name',
                width: 200,
                minWidth: 150,
                sortable: true,
                filter: false
            },
            {
                headerName: 'Phone',
                field: 'phone',
                width: 150,
                minWidth: 120,
                sortable: true,
                filter: false
            },
            {
                headerName: 'License Number',
                field: 'license_number',
                width: 180,
                minWidth: 150,
                sortable: true,
                filter: false
            },
            MastersGrid.createStatusColumn(),
            createdAtColumn,
            MastersGrid.createActionsColumn('Driver', 'Driver')
        ],
        onGridReady: (params) => {
            gridApi = params.api;
            if (isDesktop) {
                params.api.sizeColumnsToFit();
            }
        },
        onGridSizeChanged: (params) => {
            if (isDesktop) {
                params.api.sizeColumnsToFit();
            }
        }
    };
    
    agGrid.createGrid(gridDiv, gridOptions);
}

async function loadDrivers() {
    try {
        const activeFilter = document.getElementById('activeFilterToggle').classList.contains('active');
        const params = {
            page: 1,
            page_size: 1000, // Load all for client-side pagination
            is_active: activeFilter ? true : undefined
        };
        
        const response = await MastersAPI.getAll('drivers', params);
        const drivers = response.items || response || [];
        
        if (gridApi) {
            gridApi.setGridOption('rowData', drivers);
        }
    } catch (error) {
        console.error('Error loading drivers:', error);
        utils.showToast('Failed to load drivers: ' + error.message, 'error');
    }
}

function openAddModal() {
    isEditMode = false;
    currentDriverId = null;
    document.getElementById('modalTitle').textContent = 'Add Driver';
    MastersModal.resetForm('driverForm');
    document.getElementById('is_active').checked = true;
    MastersModal.show('driverModal');
}

// Global function for edit button
window.editDriver = function(id) {
    isEditMode = true;
    currentDriverId = id;
    document.getElementById('modalTitle').textContent = 'Edit Driver';
    
    MastersAPI.getById('drivers', id)
        .then(driver => {
            MastersModal.fillForm('driverForm', driver);
            MastersModal.show('driverModal');
        })
        .catch(error => {
            console.error('Error loading driver:', error);
            utils.showToast('Failed to load driver: ' + error.message, 'error');
        });
};

function closeModal() {
    MastersModal.hide('driverModal');
    MastersModal.resetForm('driverForm');
    currentDriverId = null;
    isEditMode = false;
}

async function saveDriver() {
    const form = document.getElementById('driverForm');
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        phone: formData.get('phone') || null,
        license_number: formData.get('license_number'),
        is_active: document.getElementById('is_active').checked
    };
    
    // Validation
    const validation = MastersValidation.validateForm('driverForm', {
        name: [
            (v) => MastersValidation.required(v, 'Name')
        ],
        license_number: [
            (v) => MastersValidation.required(v, 'License Number')
        ],
        phone: [
            (v) => v ? MastersValidation.phone(v) : null
        ]
    });
    
    if (!validation.valid) {
        return;
    }
    
    try {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
        
        if (isEditMode && currentDriverId) {
            await MastersAPI.update('drivers', currentDriverId, data);
            utils.showToast('Driver updated successfully', 'success');
        } else {
            await MastersAPI.create('drivers', data);
            utils.showToast('Driver created successfully', 'success');
        }
        
        closeModal();
        loadDrivers();
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    } catch (error) {
        console.error('Error saving driver:', error);
        utils.showToast('Failed to save driver: ' + error.message, 'error');
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Global function for delete button
window.deleteDriver = function(id) {
    currentDriverId = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentDriverId = null;
}

async function confirmDelete() {
    if (!currentDriverId) return;
    
    try {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        
        await MastersAPI.delete('drivers', currentDriverId);
        utils.showToast('Driver deleted successfully', 'success');
        
        closeDeleteModal();
        loadDrivers();
        
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    } catch (error) {
        console.error('Error deleting driver:', error);
        utils.showToast('Failed to delete driver: ' + error.message, 'error');
        
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    }
}

