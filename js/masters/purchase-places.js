// Purchase Places Management JavaScript

let gridApi;
let currentPurchasePlaceId = null;
let isEditMode = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initPurchasePlacesPage();
});

function initPurchasePlacesPage() {
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
    initPurchasePlacesGrid();
    
    // Load purchase places data
    loadPurchasePlaces();
}

function setupEventListeners() {
    // Add button
    document.getElementById('addPurchasePlaceBtn').addEventListener('click', () => {
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
        savePurchasePlace();
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
        loadPurchasePlaces();
    });
    
    // Close modal on backdrop click
    document.getElementById('purchasePlaceModal').addEventListener('click', (e) => {
        if (e.target.id === 'purchasePlaceModal') {
            closeModal();
        }
    });
    
    // Master menu dropdown is handled by MastersNavigation.setupMasterMenu()
}

function initPurchasePlacesGrid() {
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded');
        setTimeout(initPurchasePlacesGrid, 100);
        return;
    }
    
    const gridDiv = document.getElementById('purchasePlacesGridContainer');
    const gridOptions = {
        ...MastersGrid.getDefaultGridOptions(),
        columnDefs: [
            {
                headerName: 'Name',
                field: 'name',
                width: 250,
                minWidth: 200,
                sortable: true,
                filter: false
            },
            {
                headerName: 'Location',
                field: 'location',
                width: 300,
                minWidth: 200,
                sortable: true,
                filter: false
            },
            MastersGrid.createStatusColumn(),
            MastersGrid.createDateColumn('created_at', 'Created At', 180),
            MastersGrid.createActionsColumn('PurchasePlace', 'PurchasePlace')
        ],
        onGridReady: (params) => {
            gridApi = params.api;
        }
    };
    
    agGrid.createGrid(gridDiv, gridOptions);
}

async function loadPurchasePlaces() {
    try {
        const activeFilter = document.getElementById('activeFilterToggle').classList.contains('active');
        const params = {
            page: 1,
            page_size: 1000,
            is_active: activeFilter ? true : undefined
        };
        
        const response = await MastersAPI.getAll('purchase-places', params);
        const purchasePlaces = response.items || response || [];
        
        if (gridApi) {
            gridApi.setGridOption('rowData', purchasePlaces);
        }
    } catch (error) {
        console.error('Error loading purchase places:', error);
        utils.showToast('Failed to load purchase places: ' + error.message, 'error');
    }
}

function openAddModal() {
    isEditMode = false;
    currentPurchasePlaceId = null;
    document.getElementById('modalTitle').textContent = 'Add Purchase Place';
    MastersModal.resetForm('purchasePlaceForm');
    document.getElementById('is_active').checked = true;
    MastersModal.show('purchasePlaceModal');
}

// Global function for edit button
window.editPurchasePlace = function(id) {
    isEditMode = true;
    currentPurchasePlaceId = id;
    document.getElementById('modalTitle').textContent = 'Edit Purchase Place';
    
    MastersAPI.getById('purchase-places', id)
        .then(purchasePlace => {
            MastersModal.fillForm('purchasePlaceForm', purchasePlace);
            MastersModal.show('purchasePlaceModal');
        })
        .catch(error => {
            console.error('Error loading purchase place:', error);
            utils.showToast('Failed to load purchase place: ' + error.message, 'error');
        });
};

function closeModal() {
    MastersModal.hide('purchasePlaceModal');
    MastersModal.resetForm('purchasePlaceForm');
    currentPurchasePlaceId = null;
    isEditMode = false;
}

async function savePurchasePlace() {
    const form = document.getElementById('purchasePlaceForm');
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        location: formData.get('location') || null,
        is_active: document.getElementById('is_active').checked
    };
    
    // Validation
    const validation = MastersValidation.validateForm('purchasePlaceForm', {
        name: [
            (v) => MastersValidation.required(v, 'Name')
        ]
    });
    
    if (!validation.valid) {
        return;
    }
    
    try {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
        
        if (isEditMode && currentPurchasePlaceId) {
            await MastersAPI.update('purchase-places', currentPurchasePlaceId, data);
            utils.showToast('Purchase place updated successfully', 'success');
        } else {
            await MastersAPI.create('purchase-places', data);
            utils.showToast('Purchase place created successfully', 'success');
        }
        
        closeModal();
        loadPurchasePlaces();
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    } catch (error) {
        console.error('Error saving purchase place:', error);
        utils.showToast('Failed to save purchase place: ' + error.message, 'error');
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Global function for delete button
window.deletePurchasePlace = function(id) {
    currentPurchasePlaceId = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentPurchasePlaceId = null;
}

async function confirmDelete() {
    if (!currentPurchasePlaceId) return;
    
    try {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        
        await MastersAPI.delete('purchase-places', currentPurchasePlaceId);
        utils.showToast('Purchase place deleted successfully', 'success');
        
        closeDeleteModal();
        loadPurchasePlaces();
        
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    } catch (error) {
        console.error('Error deleting purchase place:', error);
        utils.showToast('Failed to delete purchase place: ' + error.message, 'error');
        
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    }
}

