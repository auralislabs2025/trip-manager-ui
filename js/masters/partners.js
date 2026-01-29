// Partners Management JavaScript

let gridApi;
let currentPartnerId = null;
let isEditMode = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initPartnersPage();
});

function initPartnersPage() {
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
    initPartnersGrid();
    
    // Load partners data
    loadPartners();
}

function setupEventListeners() {
    // Add button
    document.getElementById('addPartnerBtn').addEventListener('click', () => {
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
        savePartner();
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
    
    // Partner type filter
    document.getElementById('partnerTypeFilter').addEventListener('change', () => {
        loadPartners();
    });
    
    // Active filter toggle
    document.getElementById('activeFilterToggle').addEventListener('click', (e) => {
        e.target.classList.toggle('active');
        loadPartners();
    });
    
    // Close modal on backdrop click
    document.getElementById('partnerModal').addEventListener('click', (e) => {
        if (e.target.id === 'partnerModal') {
            closeModal();
        }
    });
    
    // Master menu dropdown is handled by MastersNavigation.setupMasterMenu()
}

function initPartnersGrid() {
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded');
        setTimeout(initPartnersGrid, 100);
        return;
    }
    
    const gridDiv = document.getElementById('partnersGridContainer');
    const gridOptions = {
        ...MastersGrid.getDefaultGridOptions(),
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
                headerName: 'Type',
                field: 'partner_type',
                width: 120,
                minWidth: 100,
                sortable: true,
                filter: false
            },
            {
                headerName: 'Email',
                field: 'email',
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
                headerName: 'GST Number',
                field: 'gst_number',
                width: 150,
                minWidth: 120,
                sortable: true,
                filter: false
            },
            MastersGrid.createStatusColumn(),
            MastersGrid.createDateColumn('created_at', 'Created At', 180),
            MastersGrid.createActionsColumn('Partner', 'Partner')
        ],
        onGridReady: (params) => {
            gridApi = params.api;
        }
    };
    
    agGrid.createGrid(gridDiv, gridOptions);
}

async function loadPartners() {
    try {
        const activeFilter = document.getElementById('activeFilterToggle').classList.contains('active');
        const partnerType = document.getElementById('partnerTypeFilter').value;
        const params = {
            page: 1,
            page_size: 1000,
            is_active: activeFilter ? true : undefined,
            partner_type: partnerType || undefined
        };
        
        const response = await MastersAPI.getAll('partners', params);
        const partners = response.items || response || [];
        
        if (gridApi) {
            gridApi.setGridOption('rowData', partners);
        }
    } catch (error) {
        console.error('Error loading partners:', error);
        utils.showToast('Failed to load partners: ' + error.message, 'error');
    }
}

function openAddModal() {
    isEditMode = false;
    currentPartnerId = null;
    document.getElementById('modalTitle').textContent = 'Add Partner';
    MastersModal.resetForm('partnerForm');
    document.getElementById('is_active').checked = true;
    document.getElementById('partner_type').value = 'PARTNER';
    MastersModal.show('partnerModal');
}

// Global function for edit button
window.editPartner = function(id) {
    isEditMode = true;
    currentPartnerId = id;
    document.getElementById('modalTitle').textContent = 'Edit Partner';
    
    MastersAPI.getById('partners', id)
        .then(partner => {
            MastersModal.fillForm('partnerForm', partner);
            MastersModal.show('partnerModal');
        })
        .catch(error => {
            console.error('Error loading partner:', error);
            utils.showToast('Failed to load partner: ' + error.message, 'error');
        });
};

function closeModal() {
    MastersModal.hide('partnerModal');
    MastersModal.resetForm('partnerForm');
    currentPartnerId = null;
    isEditMode = false;
}

async function savePartner() {
    const form = document.getElementById('partnerForm');
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        partner_type: formData.get('partner_type'),
        contact_info: formData.get('contact_info') || null,
        email: formData.get('email') || null,
        phone: formData.get('phone') || null,
        address: formData.get('address') || null,
        gst_number: formData.get('gst_number') || null,
        pan_number: formData.get('pan_number') || null,
        registration_number: formData.get('registration_number') || null,
        notes: formData.get('notes') || null,
        is_active: document.getElementById('is_active').checked
    };
    
    // Validation
    const validation = MastersValidation.validateForm('partnerForm', {
        name: [
            (v) => MastersValidation.required(v, 'Name')
        ],
        partner_type: [
            (v) => MastersValidation.required(v, 'Partner Type')
        ],
        email: [
            (v) => v ? MastersValidation.email(v) : null
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
        
        if (isEditMode && currentPartnerId) {
            await MastersAPI.update('partners', currentPartnerId, data);
            utils.showToast('Partner updated successfully', 'success');
        } else {
            await MastersAPI.create('partners', data);
            utils.showToast('Partner created successfully', 'success');
        }
        
        closeModal();
        loadPartners();
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    } catch (error) {
        console.error('Error saving partner:', error);
        utils.showToast('Failed to save partner: ' + error.message, 'error');
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Global function for delete button
window.deletePartner = function(id) {
    currentPartnerId = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentPartnerId = null;
}

async function confirmDelete() {
    if (!currentPartnerId) return;
    
    try {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        
        await MastersAPI.delete('partners', currentPartnerId);
        utils.showToast('Partner deleted successfully', 'success');
        
        closeDeleteModal();
        loadPartners();
        
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    } catch (error) {
        console.error('Error deleting partner:', error);
        utils.showToast('Failed to delete partner: ' + error.message, 'error');
        
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    }
}

