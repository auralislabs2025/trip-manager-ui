// Items Management JavaScript

let gridApi;
let currentItemId = null;
let isEditMode = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initItemsPage();
});

function initItemsPage() {
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
    initItemsGrid();
    
    // Load items data
    loadItems();
}

function setupEventListeners() {
    // Add button
    document.getElementById('addItemBtn').addEventListener('click', () => {
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
        saveItem();
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
        loadItems();
    });
    
    // Close modal on backdrop click
    document.getElementById('itemModal').addEventListener('click', (e) => {
        if (e.target.id === 'itemModal') {
            closeModal();
        }
    });
    
    // Master menu dropdown is handled by MastersNavigation.setupMasterMenu()
}

function initItemsGrid() {
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded');
        setTimeout(initItemsGrid, 100);
        return;
    }
    
    const gridDiv = document.getElementById('itemsGridContainer');
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
                headerName: 'Description',
                field: 'description',
                width: 300,
                minWidth: 200,
                sortable: true,
                filter: false,
                cellStyle: { whiteSpace: 'normal', wordWrap: 'break-word' },
                autoHeight: true
            },
            MastersGrid.createStatusColumn(),
            MastersGrid.createDateColumn('created_at', 'Created At', 180),
            MastersGrid.createActionsColumn('Item', 'Item')
        ],
        onGridReady: (params) => {
            gridApi = params.api;
        }
    };
    
    agGrid.createGrid(gridDiv, gridOptions);
}

async function loadItems() {
    try {
        const activeFilter = document.getElementById('activeFilterToggle').classList.contains('active');
        const params = {
            page: 1,
            page_size: 1000,
            is_active: activeFilter ? true : undefined
        };
        
        const response = await MastersAPI.getAll('items', params);
        const items = response.items || response || [];
        
        if (gridApi) {
            gridApi.setGridOption('rowData', items);
        }
    } catch (error) {
        console.error('Error loading items:', error);
        utils.showToast('Failed to load items: ' + error.message, 'error');
    }
}

function openAddModal() {
    isEditMode = false;
    currentItemId = null;
    document.getElementById('modalTitle').textContent = 'Add Item';
    MastersModal.resetForm('itemForm');
    document.getElementById('is_active').checked = true;
    MastersModal.show('itemModal');
}

// Global function for edit button
window.editItem = function(id) {
    isEditMode = true;
    currentItemId = id;
    document.getElementById('modalTitle').textContent = 'Edit Item';
    
    MastersAPI.getById('items', id)
        .then(item => {
            MastersModal.fillForm('itemForm', item);
            MastersModal.show('itemModal');
        })
        .catch(error => {
            console.error('Error loading item:', error);
            utils.showToast('Failed to load item: ' + error.message, 'error');
        });
};

function closeModal() {
    MastersModal.hide('itemModal');
    MastersModal.resetForm('itemForm');
    currentItemId = null;
    isEditMode = false;
}

async function saveItem() {
    const form = document.getElementById('itemForm');
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        description: formData.get('description') || null,
        is_active: document.getElementById('is_active').checked
    };
    
    // Validation
    const validation = MastersValidation.validateForm('itemForm', {
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
        
        if (isEditMode && currentItemId) {
            await MastersAPI.update('items', currentItemId, data);
            utils.showToast('Item updated successfully', 'success');
        } else {
            await MastersAPI.create('items', data);
            utils.showToast('Item created successfully', 'success');
        }
        
        closeModal();
        loadItems();
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    } catch (error) {
        console.error('Error saving item:', error);
        utils.showToast('Failed to save item: ' + error.message, 'error');
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Global function for delete button
window.deleteItem = function(id) {
    currentItemId = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentItemId = null;
}

async function confirmDelete() {
    if (!currentItemId) return;
    
    try {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        
        await MastersAPI.delete('items', currentItemId);
        utils.showToast('Item deleted successfully', 'success');
        
        closeDeleteModal();
        loadItems();
        
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    } catch (error) {
        console.error('Error deleting item:', error);
        utils.showToast('Failed to delete item: ' + error.message, 'error');
        
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    }
}

