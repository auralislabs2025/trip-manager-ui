// Expenses Management JavaScript

let gridApi;
let currentExpenseId = null;
let isEditMode = false;
let currentSearchTerm = '';
let searchDebounceTimer = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initExpensesPage();
});

function initExpensesPage() {
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
    initExpensesGrid();
    
    // Load expenses data
    loadExpenses();
}

function setupEventListeners() {
    // Add button
    document.getElementById('addExpenseBtn').addEventListener('click', () => {
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
        saveExpense();
    });
    
    // Delete confirmation
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        closeDeleteModal();
    });
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        confirmDelete();
    });
    
    // Search input (server-side)
    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearchTerm = e.target.value || '';
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        searchDebounceTimer = setTimeout(() => {
            loadExpenses();
        }, 300);
    });
    
    // Active filter toggle
    document.getElementById('activeFilterToggle').addEventListener('click', (e) => {
        e.target.classList.toggle('active');
        loadExpenses();
    });
    
    // Close modal on backdrop click
    document.getElementById('expenseModal').addEventListener('click', (e) => {
        if (e.target.id === 'expenseModal') {
            closeModal();
        }
    });
    
    // Master menu dropdown is handled by MastersNavigation.setupMasterMenu()
}

function initExpensesGrid() {
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded');
        setTimeout(initExpensesGrid, 100);
        return;
    }
    
    const gridDiv = document.getElementById('expensesGridContainer');
    const gridOptions = {
        ...MastersGrid.getDefaultGridOptions(),
        columnDefs: MastersGrid.buildColumnDefs([
            {
                headerName: 'Code',
                field: 'expense_code',
                width: 150,
                minWidth: 120,
                sortable: true,
                filter: false
            },
            {
                headerName: 'Name',
                field: 'name',
                width: 220,
                minWidth: 160,
                sortable: true,
                filter: false
            },
            {
                headerName: 'Details',
                field: 'details',
                width: 300,
                minWidth: 200,
                sortable: true,
                filter: false,
                cellStyle: { whiteSpace: 'normal', wordWrap: 'break-word' },
                autoHeight: true,
                valueFormatter: (params) => {
                    if (!params.value) return '';
                    if (typeof params.value === 'string') return params.value;
                    return JSON.stringify(params.value);
                }
            },
            MastersGrid.createStatusColumn(),
            MastersGrid.createDateColumn('created_at', 'Created At', 180),
            MastersGrid.createActionsColumn('Expense', 'Expense')
        ]),
        onGridReady: (params) => {
            gridApi = params.api;
        }
    };
    
    agGrid.createGrid(gridDiv, gridOptions);
}

async function loadExpenses() {
    try {
        const activeFilter = document.getElementById('activeFilterToggle').classList.contains('active');
        const params = {
            page: 1,
            page_size: 1000,
            is_active: activeFilter ? true : undefined,
            search: currentSearchTerm.trim() || undefined
        };
        
        const response = await MastersAPI.getAll('expenses', params);
        const expenses = response.items || response || [];
        
        if (gridApi) {
            gridApi.setGridOption('rowData', expenses);
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        utils.showToast('Failed to load expenses: ' + error.message, 'error');
    }
}

function openAddModal() {
    isEditMode = false;
    currentExpenseId = null;
    document.getElementById('modalTitle').textContent = 'Add Expense';
    MastersModal.resetForm('expenseForm');
    document.getElementById('is_active').checked = true;
    MastersModal.show('expenseModal');
}

// Global function for edit button
window.editExpense = function(id) {
    isEditMode = true;
    currentExpenseId = id;
    document.getElementById('modalTitle').textContent = 'Edit Expense';
    
    MastersAPI.getById('expenses', id)
        .then(expense => {
            const normalizedExpense = {
                ...expense,
                details: typeof expense.details === 'string' ? expense.details : JSON.stringify(expense.details || '')
            };
            MastersModal.fillForm('expenseForm', normalizedExpense);
            MastersModal.show('expenseModal');
        })
        .catch(error => {
            console.error('Error loading expense:', error);
            utils.showToast('Failed to load expense: ' + error.message, 'error');
        });
};

function closeModal() {
    MastersModal.hide('expenseModal');
    MastersModal.resetForm('expenseForm');
    currentExpenseId = null;
    isEditMode = false;
}

async function saveExpense() {
    const form = document.getElementById('expenseForm');
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        details: formData.get('details') || null,
        is_active: document.getElementById('is_active').checked
    };
    
    // Validation
    const validation = MastersValidation.validateForm('expenseForm', {
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
        
        if (isEditMode && currentExpenseId) {
            await MastersAPI.update('expenses', currentExpenseId, data);
            utils.showToast('Expense updated successfully', 'success');
        } else {
            await MastersAPI.create('expenses', data);
            utils.showToast('Expense created successfully', 'success');
        }
        
        closeModal();
        loadExpenses();
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    } catch (error) {
        console.error('Error saving expense:', error);
        utils.showToast('Failed to save expense: ' + error.message, 'error');
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Global function for delete button
window.deleteExpense = function(id) {
    currentExpenseId = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentExpenseId = null;
}

async function confirmDelete() {
    if (!currentExpenseId) return;
    
    try {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        
        await MastersAPI.delete('expenses', currentExpenseId);
        utils.showToast('Expense deleted successfully', 'success');
        
        closeDeleteModal();
        loadExpenses();
        
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    } catch (error) {
        console.error('Error deleting expense:', error);
        utils.showToast('Failed to delete expense: ' + error.message, 'error');
        
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
    }
}

