// Master Data Base Utilities
// Common functions for all master data management pages

const MastersAPI = {
    baseURL: window.config?.API_BASE_URL || 'http://localhost:8000/api/v1',
    
    // Generic CRUD operations
    async getAll(entity, params = {}) {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.page_size) queryParams.append('page_size', params.page_size);
        if (params.search) queryParams.append('search', params.search);
        if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
        if (params.partner_type) queryParams.append('partner_type', params.partner_type);
        
        const url = `${this.baseURL}/masters/${entity}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${entity}:`, error);
            throw error;
        }
    },
    
    async getById(entity, id) {
        const url = `${this.baseURL}/masters/${entity}/${id}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${entity} by id:`, error);
            throw error;
        }
    },
    
    async create(entity, data) {
        const url = `${this.baseURL}/masters/${entity}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error creating ${entity}:`, error);
            throw error;
        }
    },
    
    async update(entity, id, data) {
        const url = `${this.baseURL}/masters/${entity}/${id}`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error updating ${entity}:`, error);
            throw error;
        }
    },
    
    async delete(entity, id) {
        const url = `${this.baseURL}/masters/${entity}/${id}`;
        try {
            const response = await fetch(url, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP error! status: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error(`Error deleting ${entity}:`, error);
            throw error;
        }
    },
    
    async getActive(entity) {
        const url = `${this.baseURL}/masters/${entity}/active`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching active ${entity}:`, error);
            throw error;
        }
    }
};

// AG Grid Helper Functions
const MastersGrid = {
    // Create common column definitions
    createActionsColumn(onEdit, onDelete) {
        return {
            headerName: 'Actions',
            field: 'actions',
            width: 120,
            minWidth: 120,
            pinned: 'right',
            sortable: false,
            filter: false,
            editable: false,
            cellRenderer: (params) => {
                const id = params.data.id;
                return `
                    <div class="action-buttons-container" style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        <button onclick="window.edit${onEdit}('${id}')" 
                                class="btn-icon btn-edit" 
                                title="Edit"
                                style="padding: 6px; background: #0d6efd; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button onclick="window.delete${onDelete}('${id}')" 
                                class="btn-icon btn-delete" 
                                title="Delete"
                                style="padding: 6px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
            }
        };
    },
    
    // Create status column (is_active)
    createStatusColumn() {
        return {
            headerName: 'Status',
            field: 'is_active',
            width: 100,
            minWidth: 100,
            sortable: true,
            filter: false,
            editable: false,
            cellRenderer: (params) => {
                const isActive = params.data.is_active;
                return `
                    <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                `;
            }
        };
    },
    
    // Create date column
    createDateColumn(field, headerName, width = 150, options = {}) {
        const resolvedMinWidth = options.minWidth ?? width;
        return {
            headerName: headerName,
            field: field,
            width: width,
            minWidth: resolvedMinWidth,
            flex: options.flex,
            sortable: true,
            filter: false,
            editable: false,
            valueFormatter: (params) => {
                if (!params.value) return '-';
                return utils.formatDateTime(params.value);
            }
        };
    },
    
    // Common grid options
    getDefaultGridOptions() {
        return {
            pagination: true,
            paginationPageSize: 20,
            paginationPageSizeSelector: [10, 20, 50, 100],
            suppressSizeToFit: true,
            suppressRowClickSelection: true,
            rowSelection: undefined,
            defaultColDef: {
                sortable: true,
                filter: false,
                resizable: true,
                editable: false,
                wrapText: false,
                autoHeight: false,
                cellStyle: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }
            }
        };
    }
};

// Modal Helper Functions
const MastersModal = {
    // Show modal
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },
    
    // Hide modal
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    },
    
    // Reset form
    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            // Clear any hidden fields
            const hiddenId = form.querySelector('[name="id"]');
            if (hiddenId) hiddenId.value = '';
        }
    },
    
    // Fill form with data
    fillForm(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = data[key];
                } else {
                    field.value = data[key] || '';
                }
            }
        });
    }
};

// Validation Helper
const MastersValidation = {
    required(value, fieldName) {
        if (!value || value.trim() === '') {
            return `${fieldName} is required`;
        }
        return null;
    },
    
    email(value) {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Invalid email format';
        }
        return null;
    },
    
    phone(value) {
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
            return 'Invalid phone number format';
        }
        return null;
    },
    
    validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: [] };
        
        const errors = [];
        const formData = new FormData(form);
        
        Object.keys(rules).forEach(fieldName => {
            const value = formData.get(fieldName) || form.querySelector(`[name="${fieldName}"]`)?.value;
            const fieldRules = rules[fieldName];
            
            fieldRules.forEach(rule => {
                const error = rule(value, fieldName);
                if (error) {
                    errors.push({ field: fieldName, message: error });
                }
            });
        });
        
        // Show errors
        errors.forEach(error => {
            const field = form.querySelector(`[name="${error.field}"]`);
            if (field) {
                field.classList.add('error');
                const errorMsg = field.parentElement.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.textContent = error.message;
                } else {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = error.message;
                    field.parentElement.appendChild(errorDiv);
                }
            }
        });
        
        // Remove error class from valid fields
        form.querySelectorAll('input, select, textarea').forEach(field => {
            if (!errors.find(e => e.field === field.name)) {
                field.classList.remove('error');
                const errorMsg = field.parentElement.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};

// Navigation Helper
const MastersNavigation = {
    // Setup master menu dropdown
    setupMasterMenu() {
        const masterMenuToggle = document.getElementById('masterMenuToggle');
        const masterMenuDropdown = document.getElementById('masterMenuDropdown');
        
        // Only setup if elements exist (not on login page)
        if (!masterMenuToggle || !masterMenuDropdown) {
            return;
        }
        
        // Remove any existing listeners by cloning
        const newToggle = masterMenuToggle.cloneNode(true);
        masterMenuToggle.parentNode.replaceChild(newToggle, masterMenuToggle);
        
        // Prevent hash from being added to URL
        newToggle.setAttribute('href', 'javascript:void(0);');
        
        // Prevent default anchor behavior and toggle dropdown
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Toggle active class on the parent dropdown item
            const dropdownItem = newToggle.closest('.nav-item-dropdown');
            if (dropdownItem) {
                dropdownItem.classList.toggle('active');
            } else {
                // Fallback: toggle on dropdown element itself
                masterMenuDropdown.classList.toggle('active');
            }
        });
        
        // Close dropdown when clicking outside
        const handleOutsideClick = (e) => {
            if (masterMenuDropdown && 
                !masterMenuDropdown.contains(e.target) && 
                !newToggle.contains(e.target) &&
                e.target.id !== 'menuToggle' &&
                !e.target.closest('#menuToggle')) {
                masterMenuDropdown.classList.remove('active');
            }
        };
        
        document.addEventListener('click', handleOutsideClick, false);
    }
};

// Sidebar navigation helper for master pages
function setupSidebarNavigation() {
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const menuToggle = document.getElementById('menuToggle');
    if (!sidebar) return;

    const closeSidebar = () => {
        if (window.innerWidth < 768) {
            sidebar.classList.remove('active');
        } else {
            sidebar.classList.add('collapsed');
        }
    };

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.innerWidth < 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });
    }

    // Close sidebar when clicking a nav link (except the Master toggle)
    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        if (link.id === 'masterMenuToggle') return;
        const href = link.getAttribute('href') || '';
        if (href === '' || href === '#' || href.startsWith('javascript')) return;
        if (window.innerWidth < 1024) {
            closeSidebar();
        }
    });
}

// Export to window for global access
window.MastersAPI = MastersAPI;
window.MastersGrid = MastersGrid;
window.MastersModal = MastersModal;
window.MastersValidation = MastersValidation;
window.MastersNavigation = MastersNavigation;

// Auto-setup master menu on page load (only if not on login page)
document.addEventListener('DOMContentLoaded', function() {
    // Only setup master menu if we're not on the login page
    const isLoginPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');
    
    if (!isLoginPage) {
        MastersNavigation.setupMasterMenu();
    }
});

