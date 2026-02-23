// AG Grid Trips Table Implementation

let gridApi;
let gridColumnApi;
let masterData = {
    vehicles: [],
    drivers: [],
    items: [],
    purchasePlaces: [],
    partners: [],
    vehicleNameToId: {},
    vehicleIdToName: {},
    driverNameToId: {},
    driverIdToName: {},
    itemNameToId: {},
    itemIdToName: {},
    purchasePlaceNameToId: {},
    purchasePlaceIdToName: {},
    partnerNameToId: {},
    partnerIdToName: {}
};
let expenseTypes = [];
let expenseNameToId = {};
let expenseIdToName = {};
let currentExpenseBreakdownRow = null;
let mastersReady = false;
let expensesReady = false;
let isLoadingTrips = false;
let lastTripsQuery = null;

// Initialize AG Grid
function initTripsTableAGGrid() {
    // Check if AG Grid is loaded
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded. Please check the CDN link.');
        setTimeout(initTripsTableAGGrid, 100); // Retry after a short delay
        return;
    }
    
    loadMasterData();
    loadExpenseMaster();
    
    const gridOptions = {
        // Data
        rowData: [],
        
        // Use trip id as row id for better node lookup
        getRowId: (params) => {
            return params.data.id;
        },
        
        // Columns
        columnDefs: getColumnDefs(),
        
        // Default column properties
        defaultColDef: {
            sortable: true,
            filter: false,
            resizable: isSmallScreen(), // Allow resizing on small screens
            editable: false, // Default to false, enable per column
            wrapText: false, // Keep fixed row height for infinite row model
            autoHeight: false, // Avoid overlap with infinite row model
            cellStyle: { 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
            }
        },
        
        // Don't auto-size columns to fit - allow horizontal scroll
        suppressSizeToFit: true,
        
        // Enable single click editing (instead of double click)
        // In AG Grid, suppressClickEdit: false means allow editing on single click
        suppressClickEdit: false,
        enterNavigatesVertically: true,
        enterNavigatesVerticallyAfterEdit: true,
        
        // Pagination (server-side)
        rowModelType: 'infinite',
        pagination: true,
        paginationPageSize: 20,
        paginationPageSizeSelector: [20],
        cacheBlockSize: 20,
        
        // Row styling
        rowHeight: 44,
        getRowStyle: (params) => {
            const status = params.data?.status || 'draft';
            if (status === 'draft') {
                return { backgroundColor: '#fff3cd' };
            } else if (status === 'closed') {
                return { backgroundColor: '#d1e7dd' };
            }
            return null;
        },
        
        // Row selection completely disabled - no checkboxes, no row selection
        rowSelection: undefined,
        suppressRowClickSelection: true,
        suppressCellFocus: false,
        
        // Ensure no checkbox column appears
        suppressRowHoverHighlight: false,
        
        // Enable quick filter
        enableCellTextSelection: true,
        
        // Theme - don't set it here, use CSS class on container instead
        
        // Callbacks
        onGridReady: (params) => {
            // Always use params.api from callback - it's guaranteed to be fully initialized
            gridApi = params.api;
            gridColumnApi = params.columnApi || params.api;
            
            setTripsDatasource();
        },
        
        onCellValueChanged: (params) => {
            // Handle cell value changes
            handleCellValueChanged(params);
        },
        
        // Enable single-click editing (especially for dropdowns)
        onCellClicked: (params) => {
            // Check if cell is editable and not locked
            const isEditable = params.colDef.editable;
            let canEdit = false;
            
            if (typeof isEditable === 'function') {
                canEdit = isEditable(params) && !params.data?.locked;
            } else {
                canEdit = (isEditable === true) && !params.data?.locked;
            }
            
            // Start editing on single click for editable cells
            if (canEdit && params.event) {
                params.api.startEditingCell({
                    rowIndex: params.node.rowIndex,
                    colKey: params.column.getColId(),
                    rowPinned: params.node.rowPinned || undefined
                });
            }
        },
        
        onFirstDataRendered: (params) => {
            // Auto-size columns on first render
            params.api.sizeColumnsToFit();
        }
    };
    
    const gridDiv = document.querySelector('#tripsGridContainer');
    if (gridDiv) {
        // Check if AG Grid is loaded
        if (typeof agGrid === 'undefined') {
            console.error('AG Grid is not loaded. Please check the CDN link.');
            setTimeout(() => {
                if (typeof agGrid !== 'undefined') {
                    initTripsTableAGGrid();
                }
            }, 500);
            return;
        }
        
        // AG Grid v31+ uses createGrid() instead of new Grid()
        try {
            if (!agGrid) {
                console.error('AG Grid not found. Check if CDN loaded correctly.');
                console.log('If opening file directly (file://), use a local server instead.');
                return;
            }
            
            // Add theme class to container (required for AG Grid theming)
            if (!gridDiv.classList.contains('ag-theme-alpine')) {
                gridDiv.classList.add('ag-theme-alpine');
            }
            
            // Use modern API (v31+) - createGrid returns the grid API
            if (typeof agGrid.createGrid === 'function') {
                gridApi = agGrid.createGrid(gridDiv, gridOptions);
                // In v31+, columnApi is merged into the main API
                gridColumnApi = gridApi.columnApi || gridApi;
                console.log('AG Grid initialized successfully with createGrid()');
            } else if (typeof agGrid.Grid === 'function') {
                // Fallback to old API (deprecated in v31+)
                const grid = new agGrid.Grid(gridDiv, gridOptions);
                // With old API, api is set in onGridReady callback
                console.log('AG Grid initialized with Grid() constructor (deprecated)');
            } else {
                console.error('AG Grid createGrid() and Grid() not found');
                console.log('AG Grid available properties:', Object.keys(agGrid).slice(0, 20));
                return;
            }
        } catch (error) {
            console.error('Error initializing AG Grid:', error);
            console.log('Error message:', error.message);
            console.log('If this is a file:// URL, AG Grid CDN may not load. Use a local server.');
            return;
        }
    }
    
    setupEventListeners();
    setupNavigation();
    
    // Setup master menu dropdown
    if (typeof MastersNavigation !== 'undefined' && MastersNavigation.setupMasterMenu) {
        MastersNavigation.setupMasterMenu();
    }
}

function expenseKeyFromName(name) {
    return (name || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

async function loadExpenseMaster() {
    const baseUrl = window.config?.API_BASE_URL || 'http://localhost:8000/api/v1';
    const expensesUrl = `${baseUrl}/masters/expenses`;

    try {
        let data;
        if (window.api && typeof window.api.get === 'function') {
            const response = await window.api.get('/masters/expenses/');
            if (!response.success) {
                throw new Error(response.error || `API request failed: ${response.status}`);
            }
            data = response.data;
        } else {
            const response = await fetch(expensesUrl);
            if (!response.ok) {
                throw new Error(`Failed to load expenses: ${response.status}`);
            }
            data = await response.json();
        }

        expenseNameToId = {};
        expenseIdToName = {};
        const list = (data.items || data || [])
            .map(expense => {
                if (!expense?.name) return null;
                expenseNameToId[expense.name] = expense.id || null;
                if (expense.id) {
                    expenseIdToName[expense.id] = expense.name;
                }
                return expense.name;
            })
            .filter(Boolean);

        expenseTypes = Array.from(new Set(list));
        expensesReady = true;
    } catch (error) {
        console.warn('Expense master unavailable:', error);
        expenseTypes = [];
        expenseNameToId = {};
        expenseIdToName = {};
        expensesReady = false;
    }
}

function normalizeMasterName(value) {
    return (value || '').toString().trim();
}

function setMasterMaps() {
    masterData.vehicleNameToId = {};
    masterData.vehicleIdToName = {};
    masterData.driverNameToId = {};
    masterData.driverIdToName = {};
    masterData.itemNameToId = {};
    masterData.itemIdToName = {};
    masterData.purchasePlaceNameToId = {};
    masterData.purchasePlaceIdToName = {};
    masterData.partnerNameToId = {};
    masterData.partnerIdToName = {};
}

function normalizeTripFromApi(trip) {
    const normalized = { ...trip };
    normalized.tripStartDate = trip.tripStartDate || trip.trip_start_date || '';
    normalized.estimatedEndDate = trip.estimatedEndDate || trip.estimated_end_date || '';
    normalized.vehicleId = trip.vehicleId || trip.vehicle_id || null;
    normalized.driverId = trip.driverId || trip.driver_id || null;
    normalized.purchasePlaceId = trip.purchasePlaceId || trip.purchase_place_id || null;
    normalized.itemId = trip.itemId || trip.item_id || null;
    normalized.partnerId = trip.partnerId || trip.partner_id || null;
    normalized.startingKm = trip.startingKm ?? trip.starting_km ?? '';
    normalized.closingKm = trip.closingKm ?? trip.ending_km ?? '';
    normalized.distance = trip.distance ?? '';
    normalized.tonnage = trip.tonnage ?? '';
    normalized.ratePerTon = trip.ratePerTon ?? trip.rate_per_ton ?? '';
    normalized.freight = trip.freight ?? '';
    normalized.amountGivenToDriver = trip.amountGivenToDriver ?? trip.amount_given_to_driver ?? '';
    normalized.totalExpenses = trip.totalExpenses ?? trip.total_expenses ?? 0;
    normalized.revenue = trip.revenue ?? 0;
    normalized.profit = trip.profit ?? 0;
    normalized.status = trip.status ?? 'draft';
    normalized.locked = trip.locked ?? (normalized.status === 'closed');
    normalized.expenses = trip.expenses || {};
    normalized.expense_items = trip.expense_items || [];
    return normalized;
}

function applyMasterMappingsToTrip(trip) {
    if (!trip) return;

    // Normalize incoming snake_case fields if present
    trip.vehicleId = trip.vehicleId || trip.vehicle_id || null;
    trip.driverId = trip.driverId || trip.driver_id || null;
    trip.itemId = trip.itemId || trip.item_id || null;
    trip.purchasePlaceId = trip.purchasePlaceId || trip.purchase_place_id || null;
    trip.partnerId = trip.partnerId || trip.partner_id || null;

    trip.vehicleNumber = trip.vehicleNumber || trip.vehicle_number || '';
    trip.driverName = trip.driverName || trip.driver_name || '';

    if (trip.vehicleId && !trip.vehicleNumber) {
        trip.vehicleNumber = masterData.vehicleIdToName[trip.vehicleId] || '';
    }
    if (trip.vehicleNumber && !trip.vehicleId) {
        const key = normalizeMasterName(trip.vehicleNumber);
        trip.vehicleId = masterData.vehicleNameToId[key] || null;
    }

    if (trip.driverId && !trip.driverName) {
        trip.driverName = masterData.driverIdToName[trip.driverId] || '';
    }
    if (trip.driverName && !trip.driverId) {
        const key = normalizeMasterName(trip.driverName);
        trip.driverId = masterData.driverNameToId[key] || null;
    }

    if (trip.itemId && !trip.itemName) {
        trip.itemName = masterData.itemIdToName[trip.itemId] || '';
    }
    if (trip.itemName && !trip.itemId) {
        const key = normalizeMasterName(trip.itemName);
        trip.itemId = masterData.itemNameToId[key] || null;
    }

    if (trip.purchasePlaceId && !trip.purchasePlace) {
        trip.purchasePlace = masterData.purchasePlaceIdToName[trip.purchasePlaceId] || '';
    }
    if (trip.purchasePlace && !trip.purchasePlaceId) {
        const key = normalizeMasterName(trip.purchasePlace);
        trip.purchasePlaceId = masterData.purchasePlaceNameToId[key] || null;
    }

    if (trip.partnerId && !trip.partner) {
        trip.partner = masterData.partnerIdToName[trip.partnerId] || '';
    }
    if (trip.partner && !trip.partnerId) {
        const key = normalizeMasterName(trip.partner);
        trip.partnerId = masterData.partnerNameToId[key] || null;
    }
}

function syncTripMasterFieldsForGrid() {
    if (!gridApi) return;
    gridApi.forEachNode((node) => {
        if (!node?.data) return;
        applyMasterMappingsToTrip(node.data);
    });
}

// Load master data
async function loadMasterData() {
    const baseUrl = window.config?.API_BASE_URL || 'http://localhost:8000/api/v1';
    const mastersUrl = `${baseUrl}/trips/masters`;

    try {
        let data;
        if (window.api && typeof window.api.get === 'function') {
            const response = await window.api.get('/trips/masters');
            if (!response.success) {
                throw new Error(response.error || `API request failed: ${response.status}`);
            }
            data = response.data;
        } else {
            const response = await fetch(mastersUrl);
            if (!response.ok) {
                throw new Error(`Failed to load masters: ${response.status}`);
            }
            data = await response.json();
        }

        setMasterMaps();

        masterData.vehicles = (data.vehicles || []).map((v) => {
            const name = normalizeMasterName(v.vehicle_number || v.name);
            if (name) {
                masterData.vehicleNameToId[name] = v.id;
                masterData.vehicleIdToName[v.id] = name;
            }
            return name;
        }).filter(Boolean);
        masterData.drivers = (data.drivers || []).map((d) => {
            const name = normalizeMasterName(d.name);
            if (name) {
                masterData.driverNameToId[name] = d.id;
                masterData.driverIdToName[d.id] = name;
            }
            return name;
        }).filter(Boolean);
        masterData.items = (data.items || []).map((i) => {
            const name = normalizeMasterName(i.name);
            if (name) {
                masterData.itemNameToId[name] = i.id;
                masterData.itemIdToName[i.id] = name;
            }
            return name;
        }).filter(Boolean);
        masterData.purchasePlaces = (data.purchase_places || []).map((p) => {
            const name = normalizeMasterName(p.name);
            if (name) {
                masterData.purchasePlaceNameToId[name] = p.id;
                masterData.purchasePlaceIdToName[p.id] = name;
            }
            return name;
        }).filter(Boolean);
        masterData.partners = (data.partners || []).map((p) => {
            const name = normalizeMasterName(p.name);
            if (name) {
                masterData.partnerNameToId[name] = p.id;
                masterData.partnerIdToName[p.id] = name;
            }
            return name;
        }).filter(Boolean);

        mastersReady = true;
        syncTripMasterFieldsForGrid();

        if (gridApi) {
            gridApi.refreshCells({ force: true });
        }
    } catch (error) {
        console.warn('Master API unavailable:', error);
        masterData.vehicles = [];
        masterData.drivers = [];
        masterData.items = [];
        masterData.purchasePlaces = [];
        masterData.partners = [];
    }
}

// Custom cell renderer for master data dropdowns with add button
function createMasterDataCellRenderer(fieldName, modalTitle, labelText, storageType) {
    return (params) => {
        if (params.node.data?.locked) {
            return params.value || '';
        }
        
        return `
            <div style="display: flex; align-items: center; gap: 4px; width: 100%;">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis;">${params.value || ''}</span>
                <button onclick="event.stopPropagation(); openMasterDataModalForField('${fieldName}', '${modalTitle}', '${labelText}', '${storageType}', '${params.data.id}')" 
                        title="Add New"
                        style="padding: 2px 4px; background: transparent; color: #0d6efd; border: 1px solid #0d6efd; border-radius: 3px; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; flex-shrink: 0;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
        `;
    };
}

// Open master data modal for specific field
function openMasterDataModalForField(fieldName, modalTitle, labelText, storageType, tripId) {
    if (!gridApi) return;
    
    let rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) {
        rowNode = findPinnedRowById(tripId);
    }
    if (!rowNode) return;
    
    // Store context
    currentMasterDataContext = {
        field: fieldName,
        rowNode: rowNode,
        storageType: storageType
    };
    
    // Open modal
    openMasterDataModal(modalTitle, labelText);
}

// Check if screen is small (iPad and below)
function isSmallScreen() {
    return window.innerWidth < 1024;
}

// Icon mapping for column headers
const columnIcons = {
    '#': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
    'Start Date': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'End Date': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="8 14 12 18 16 14"></polyline></svg>',
    'Vehicle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path><polygon points="12 15 17 21 7 21 12 15"></polygon><circle cx="17.5" cy="17.5" r="2.5"></circle><circle cx="6.5" cy="17.5" r="2.5"></circle></svg>',
    'Driver': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    'Partner': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    'Purchase Place': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    'Item': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    'Starting KM': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    'Closing KM': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    'Tonnage': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2a1 1 0 0 0-1 1v1"></path><path d="M18 2a1 1 0 0 1 1 1v1"></path><path d="M20 6v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6"></path><path d="M4 10v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10"></path><line x1="8" y1="6" x2="16" y2="6"></line><line x1="12" y1="10" x2="12" y2="14"></line><line x1="9" y1="10" x2="15" y2="14"></line><line x1="15" y1="10" x2="9" y2="14"></line></svg>',
    'Rate/Ton': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    'Advance': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"></circle><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><path d="M7 6h1v4h-1"></path><path d="M16 14h1v4h-1"></path></svg>',
    'Expenses': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
    'Total Expenses': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    'Revenue': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    'Profit': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    'Actions': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>'
};

// Custom header component for icons
function createIconHeaderComponent(text, iconSvg) {
    return class {
        init(params) {
            this.eGui = document.createElement('div');
            this.eGui.className = 'ag-header-cell-label';
            this.eGui.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;';
            
            if (isSmallScreen()) {
                this.eGui.innerHTML = iconSvg;
                this.eGui.title = text;
                this.eGui.style.cursor = 'help';
            } else {
                this.eGui.textContent = text;
                this.eGui.title = text;
            }
        }
        
        getGui() {
            return this.eGui;
        }
        
        refresh() {
            return false;
        }
    };
}

// Get responsive header config (always use text headers)
function getResponsiveHeaderConfig(text, iconSvg) {
    return {
        headerName: text
    };
}

// Get responsive width - wider columns for tablets, normal for large screens
function getResponsiveWidth(smallWidth, largeWidth) {
    // Small screens (tablets/iPads): wider columns for better readability and less congestion
    // Large screens: standard comfortable width
    if (isSmallScreen()) {
        return smallWidth;
    }
    return largeWidth;
}

// Get column definitions
function getColumnDefs() {
    return [
        {
            ...getResponsiveHeaderConfig('#', columnIcons['#']),
            headerTooltip: '#',
            field: 'rowNumber',
            width: getResponsiveWidth(65, 70),
            minWidth: 65,
            pinned: 'left',
            sortable: false,
            filter: false,
            editable: false,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (params) => {
                if (!gridApi) return params.node.rowIndex + 1;
                const currentPage = gridApi.paginationGetCurrentPage() || 0;
                const pageSize = gridApi.paginationGetPageSize() || 20;
                return (currentPage * pageSize) + params.node.rowIndex + 1;
            }
        },
        {
            ...getResponsiveHeaderConfig('Start Date', columnIcons['Start Date']),
            headerTooltip: 'Start Date',
            field: 'tripStartDate',
            width: getResponsiveWidth(120, 140),
            minWidth: 120,
            filter: false,
            cellStyle: { textAlign: 'left' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agDateCellEditor',
            cellEditorParams: {
                min: '2000-01-01'
            },
            valueFormatter: (params) => {
                if (!params.value) return '';
                return utils.formatDate(params.value);
            },
            valueGetter: (params) => {
                if (!params.data?.tripStartDate) return '';
                const date = params.data.tripStartDate;
                const dateString = typeof date === 'string' ? date : String(date);
                if (dateString.includes('-')) return dateString;
                // Convert to YYYY-MM-DD for editing
                const dateObj = new Date(date);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toISOString().split('T')[0];
                }
                return dateString;
            },
            valueSetter: (params) => {
                params.data.tripStartDate = params.newValue;
                return true;
            }
        },
        {
            ...getResponsiveHeaderConfig('End Date', columnIcons['End Date']),
            headerTooltip: 'End Date',
            field: 'estimatedEndDate',
            width: getResponsiveWidth(120, 140),
            minWidth: 120,
            filter: false,
            cellStyle: { textAlign: 'left' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agDateCellEditor',
            valueFormatter: (params) => {
                if (!params.value) return '';
                return utils.formatDate(params.value);
            },
            valueGetter: (params) => {
                if (!params.data?.estimatedEndDate) return '';
                const date = params.data.estimatedEndDate;
                const dateString = typeof date === 'string' ? date : String(date);
                if (dateString.includes('-')) return dateString;
                const dateObj = new Date(date);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toISOString().split('T')[0];
                }
                return dateString;
            },
            valueSetter: (params) => {
                params.data.estimatedEndDate = params.newValue;
                return true;
            }
        },
        {
            ...getResponsiveHeaderConfig('Vehicle', columnIcons['Vehicle']),
            headerTooltip: 'Vehicle',
            field: 'vehicleNumber',
            width: getResponsiveWidth(170, 160),
            minWidth: 170,
            cellStyle: { textAlign: 'left' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: () => ({
                values: [...masterData.vehicles, 'Add New...']
            }),
            valueFormatter: (params) => {
                if (params.value === '__ADD_NEW__' || params.value === 'Add New...') return '';
                return params.value || '';
            }
        },
        {
            ...getResponsiveHeaderConfig('Driver', columnIcons['Driver']),
            headerTooltip: 'Driver',
            field: 'driverName',
            width: getResponsiveWidth(170, 160),
            minWidth: 170,
            cellStyle: { textAlign: 'left' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: () => ({
                values: [...masterData.drivers, 'Add New...']
            }),
            valueFormatter: (params) => {
                if (params.value === '__ADD_NEW__' || params.value === 'Add New...') return '';
                return params.value || '';
            }
        },
        {
            ...getResponsiveHeaderConfig('Partner', columnIcons['Partner']),
            headerTooltip: 'Partner',
            field: 'partner',
            width: getResponsiveWidth(170, 160),
            minWidth: 170,
            cellStyle: { textAlign: 'left' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: () => ({
                values: [...masterData.partners, 'Add New...']
            }),
            valueFormatter: (params) => {
                if (params.value === '__ADD_NEW__' || params.value === 'Add New...') return '';
                return params.value || '';
            }
        },
        {
            ...getResponsiveHeaderConfig('Purchase Place', columnIcons['Purchase Place']),
            headerTooltip: 'Purchase Place',
            field: 'purchasePlace',
            width: getResponsiveWidth(190, 180),
            minWidth: 190,
            cellStyle: { textAlign: 'left' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: () => ({
                values: [...masterData.purchasePlaces, 'Add New...']
            }),
            valueFormatter: (params) => {
                if (params.value === '__ADD_NEW__' || params.value === 'Add New...') return '';
                return params.value || '';
            }
        },
        {
            ...getResponsiveHeaderConfig('Item', columnIcons['Item']),
            headerTooltip: 'Item',
            field: 'itemName',
            width: getResponsiveWidth(190, 180),
            minWidth: 190,
            cellStyle: { textAlign: 'left' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: () => ({
                values: [...masterData.items, 'Add New...']
            }),
            valueFormatter: (params) => {
                if (params.value === '__ADD_NEW__' || params.value === 'Add New...') return '';
                return params.value || '';
            }
        },
        {
            ...getResponsiveHeaderConfig('Starting KM', columnIcons['Starting KM']),
            headerTooltip: 'Starting KM',
            field: 'startingKm',
            width: getResponsiveWidth(130, 120),
            minWidth: 130,
            filter: false,
            cellStyle: { textAlign: 'right' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 0,
                step: 0.1
            },
            valueFormatter: (params) => {
                return params.value || '';
            }
        },
        {
            ...getResponsiveHeaderConfig('Closing KM', columnIcons['Closing KM']),
            headerTooltip: 'Closing KM',
            field: 'closingKm',
            width: getResponsiveWidth(130, 120),
            minWidth: 130,
            filter: false,
            cellStyle: { textAlign: 'right' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 0,
                step: 0.1
            }
        },
        {
            ...getResponsiveHeaderConfig('Tonnage', columnIcons['Tonnage']),
            headerTooltip: 'Tonnage',
            field: 'tonnage',
            width: getResponsiveWidth(95, 100),
            minWidth: 95,
            filter: false,
            cellStyle: { textAlign: 'right' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 0,
                step: 0.1
            },
            onCellValueChanged: (params) => {
                updateCalculatedFields(params.data);
            }
        },
        {
            ...getResponsiveHeaderConfig('Rate/Ton', columnIcons['Rate/Ton']),
            headerTooltip: 'Rate/Ton',
            field: 'ratePerTon',
            width: getResponsiveWidth(95, 100),
            minWidth: 95,
            filter: false,
            cellStyle: { textAlign: 'right' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 0
            },
            onCellValueChanged: (params) => {
                updateCalculatedFields(params.data);
            }
        },
        {
            ...getResponsiveHeaderConfig('Advance', columnIcons['Advance']),
            headerTooltip: 'Advance',
            field: 'amountGivenToDriver',
            width: getResponsiveWidth(110, 120),
            minWidth: 110,
            filter: false,
            cellStyle: { textAlign: 'right' },
            editable: (params) => {
                return !params.data?.locked;
            },
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 0
            },
            valueFormatter: (params) => {
                return params.value ? utils.formatCurrency(params.value) : '';
            }
        },
        {
            ...getResponsiveHeaderConfig('Expenses', columnIcons['Expenses']),
            headerTooltip: 'Expenses',
            field: 'expenses',
            width: getResponsiveWidth(120, 100),
            minWidth: 120,
            editable: false,
            cellRenderer: (params) => {
                const trip = params.data;
                if (!trip) {
                    return '';
                }
                const expenses = trip.expenses || {};
                const totalExpenses = trip.totalExpenses || 0;
                
                // Check if any expenses are set
                const hasExpenses = totalExpenses > 0 || Object.values(expenses).some(value => (parseFloat(value) || 0) > 0);
                
                const isSmall = window.innerWidth < 1024;
                const buttonPadding = isSmall ? '4px 8px' : '6px 12px';
                const buttonFontSize = isSmall ? '11px' : '12px';
                const displayText = hasExpenses ? (isSmall ? '₹' + Math.round(totalExpenses).toLocaleString('en-IN') : '₹' + utils.formatCurrency(totalExpenses).replace('₹', '')) : 'Add';
                
                return `
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                        <button onclick="openExpenseBreakdown('${trip.id}')" 
                                title="${hasExpenses ? 'Edit Expenses (₹' + utils.formatCurrency(totalExpenses).replace('₹', '') + ')' : 'Add Expenses'}"
                                style="padding: ${buttonPadding}; font-size: ${buttonFontSize}; background: ${hasExpenses ? '#198754' : '#0d6efd'}; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                            ${displayText}
                        </button>
                    </div>
                `;
            }
        },
        {
            ...getResponsiveHeaderConfig('Total Expenses', columnIcons['Total Expenses']),
            headerTooltip: 'Total Expenses',
            field: 'totalExpenses',
            width: getResponsiveWidth(115, 140),
            minWidth: 115,
            filter: false,
            editable: false,
            cellStyle: { textAlign: 'right' },
            valueFormatter: (params) => {
                return params.value ? utils.formatCurrency(params.value) : utils.formatCurrency(0);
            }
        },
        {
            ...getResponsiveHeaderConfig('Revenue', columnIcons['Revenue']),
            headerTooltip: 'Revenue',
            field: 'revenue',
            width: getResponsiveWidth(110, 120),
            minWidth: 110,
            filter: false,
            editable: false,
            cellStyle: { textAlign: 'right' },
            valueFormatter: (params) => {
                return params.value ? utils.formatCurrency(params.value) : utils.formatCurrency(0);
            }
        },
        {
            ...getResponsiveHeaderConfig('Profit', columnIcons['Profit']),
            headerTooltip: 'Profit',
            field: 'profit',
            width: getResponsiveWidth(110, 120),
            minWidth: 110,
            filter: false,
            editable: false,
            valueFormatter: (params) => {
                const profit = params.value || 0;
                return utils.formatCurrency(profit);
            },
            cellStyle: (params) => {
                const profit = params.value || 0;
                return {
                    textAlign: 'right',
                    color: profit >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                    fontWeight: '600'
                };
            }
        },
        {
            ...getResponsiveHeaderConfig('Actions', columnIcons['Actions']),
            headerTooltip: 'Actions',
            field: 'actions',
            width: getResponsiveWidth(160, 140),
            minWidth: 160,
            pinned: 'right',
            sortable: false,
            filter: false,
            editable: false,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (params) => {
                const trip = params.data;
                if (!trip) {
                    return '';
                }
                const isLocked = trip.status === 'closed' && trip.locked !== false;
                
                const isSmall = window.innerWidth < 1024;
                const buttonSize = isSmall ? '36px' : '32px';
                const iconSize = isSmall ? '18px' : '16px';
                const gapSize = isSmall ? '10px' : '8px';
                const paddingSize = isSmall ? '8px' : '6px';
                
                if (isLocked) {
                    return `
                        <div style="display: flex; gap: ${gapSize}; justify-content: center; align-items: center; padding: ${paddingSize};">
                            <button onclick="enableRowEdit('${trip.id}')" title="Edit" style="padding: ${paddingSize}; background: #0d6efd; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: ${buttonSize}; height: ${buttonSize}; min-width: ${buttonSize}; min-height: ${buttonSize};">
                                <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button onclick="deleteRowAG('${trip.id}')" title="Delete" style="padding: ${paddingSize}; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: ${buttonSize}; height: ${buttonSize}; min-width: ${buttonSize}; min-height: ${buttonSize};">
                                <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                } else {
                    return `
                        <div style="display: flex; gap: ${gapSize}; justify-content: center; align-items: center; padding: ${paddingSize};">
                            <button onclick="saveRowAG('${trip.id}')" title="Save" style="padding: ${paddingSize}; background: #198754; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: ${buttonSize}; height: ${buttonSize}; min-width: ${buttonSize}; min-height: ${buttonSize};">
                                <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </button>
                            <button onclick="cancelRowEdit('${trip.id}')" title="Cancel" style="padding: ${paddingSize}; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: ${buttonSize}; height: ${buttonSize}; min-width: ${buttonSize}; min-height: ${buttonSize};">
                                <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                            <button onclick="deleteRowAG('${trip.id}')" title="Delete" style="padding: ${paddingSize}; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: ${buttonSize}; height: ${buttonSize}; min-width: ${buttonSize}; min-height: ${buttonSize};">
                                <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                }
            }
        }
    ];
}

// API Configuration - use config from config.js if available, otherwise fallback
function getApiBaseUrl() {
    if (window.config && window.config.API_BASE_URL) {
        return window.config.API_BASE_URL;
    }
    // Fallback to default if config not loaded
    return 'http://localhost:8000/api/v1';
}

const API_BASE_URL = getApiBaseUrl();
let includeDateFiltersOnSearch = false;

function updateSummaryTotals(trips, totals) {
    const revenueEl = document.getElementById('summaryRevenue');
    const expensesEl = document.getElementById('summaryExpenses');
    const profitEl = document.getElementById('summaryProfit');
    if (!revenueEl || !expensesEl || !profitEl) return;

    const resolvedTotals = totals || (trips || []).reduce(
        (acc, trip) => {
            acc.revenue += Number(trip.revenue || 0);
            acc.expenses += Number(trip.totalExpenses || 0);
            acc.profit += Number(trip.profit || 0);
            return acc;
        },
        { revenue: 0, expenses: 0, profit: 0 }
    );

    const format = (value) => {
        if (typeof utils?.formatCurrency === 'function') {
            return utils.formatCurrency(value);
        }
        return `₹${value.toFixed(2)}`;
    };

    revenueEl.textContent = format(resolvedTotals.revenue || 0);
    expensesEl.textContent = format(resolvedTotals.expenses || 0);
    profitEl.textContent = format(resolvedTotals.profit || 0);
}

// Load trips data from API
async function fetchTripsPage(page, pageSize) {
    const searchTerm = document.getElementById('tableSearch')?.value?.trim() || '';
    const startDateFrom = document.getElementById('startDateFrom')?.value || '';
    const startDateTo = document.getElementById('startDateTo')?.value || '';
    const queryParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize)
    });
    if (searchTerm) {
        queryParams.append('search', searchTerm);
    }
    if (includeDateFiltersOnSearch) {
        if (startDateFrom) {
            queryParams.append('start_date_from', startDateFrom);
        }
        if (startDateTo) {
            queryParams.append('start_date_to', startDateTo);
        }
    }

    const queryString = queryParams.toString();
    const responseTotals = { totals: null, total: null, items: [] };

    if (window.api && typeof window.api.get === 'function') {
        const response = await window.api.get(`/trips/?${queryString}`);
        if (!response.success) {
            throw new Error(response.error || `API request failed: ${response.status}`);
        }
        responseTotals.items = response.data?.items || [];
        responseTotals.totals = response.data?.totals || null;
        responseTotals.total = response.data?.total ?? null;
        return responseTotals;
    }

    const response = await fetch(`${API_BASE_URL}/trips/?${queryString}`);
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }
    const data = await response.json();
    responseTotals.items = data?.items || [];
    responseTotals.totals = data?.totals || null;
    responseTotals.total = data?.total ?? null;
    return responseTotals;
}

function setTripsDatasource() {
    if (!gridApi) return;
    const datasource = {
        getRows: async (params) => {
            if (isLoadingTrips) return;
            isLoadingTrips = true;
            try {
                const pageSize = params.endRow - params.startRow;
                const page = Math.floor(params.startRow / pageSize) + 1;
                const response = await fetchTripsPage(page, pageSize);
                const trips = (response.items || []).map(normalizeTripFromApi).map((trip) => {
                    const mergedTrip = {
                        ...trip,
                        locked: trip.status === 'closed'
                    };
                    if (mastersReady) {
                        applyMasterMappingsToTrip(mergedTrip);
                    }
                    return mergedTrip;
                });

                updateSummaryTotals(trips, response.totals);
                const totalRows = typeof response.total === 'number' ? response.total : trips.length;
                params.successCallback(trips, totalRows);
            } catch (error) {
                console.error('Error fetching trips from API:', error);
                utils.showToast('Failed to load trips from API', 'error');
                params.failCallback();
            } finally {
                isLoadingTrips = false;
            }
        }
    };

    if (typeof gridApi.setDatasource === 'function') {
        gridApi.setDatasource(datasource);
    } else if (typeof gridApi.setGridOption === 'function') {
        gridApi.setGridOption('datasource', datasource);
    }
}

function refreshTripsData() {
    if (!gridApi) return;
    lastTripsQuery = null;
    if (typeof gridApi.purgeInfiniteCache === 'function') {
        gridApi.purgeInfiniteCache();
        return;
    }
    if (typeof gridApi.refreshInfiniteCache === 'function') {
        gridApi.refreshInfiniteCache();
    }
}

// Handle cell value changed
let currentMasterDataContext = null; // Track which field and row we're adding to

function handleCellValueChanged(params) {
    // Check if "__ADD_NEW__" or "Add New..." was selected in master data dropdowns
    if (params.newValue === '__ADD_NEW__' || params.newValue === 'Add New...') {
        const field = params.colDef.field;
        let modalTitle = '';
        let labelText = '';
        let storageType = '';
        
        // Determine which type of master data we're adding
        if (field === 'vehicleNumber') {
            modalTitle = 'Add New Vehicle';
            labelText = 'Vehicle Number';
            storageType = 'vehicle';
        } else if (field === 'driverName') {
            modalTitle = 'Add New Driver';
            labelText = 'Driver Name';
            storageType = 'driver';
        } else if (field === 'partner') {
            modalTitle = 'Add New Partner';
            labelText = 'Partner Name';
            storageType = 'partner';
        } else if (field === 'purchasePlace') {
            modalTitle = 'Add New Purchase Place';
            labelText = 'Purchase Place';
            storageType = 'purchasePlace';
        } else if (field === 'itemName') {
            modalTitle = 'Add New Item';
            labelText = 'Item Name';
            storageType = 'item';
        }
        
        if (modalTitle) {
            // Store context for when user saves
            currentMasterDataContext = {
                field: field,
                rowNode: params.node,
                storageType: storageType
            };
            
            // Open the master data modal
            openMasterDataModal(modalTitle, labelText);
            
            // Revert the cell value back to empty (we'll set it after user adds)
            params.node.setDataValue(field, params.oldValue || '');
            return;
        }
    }

    // Map master names to IDs when a selection changes
    if (mastersReady) {
        const field = params.colDef.field;
        const selectedName = normalizeMasterName(params.newValue);
        if (field === 'vehicleNumber') {
            params.data.vehicleId = masterData.vehicleNameToId[selectedName] || null;
        } else if (field === 'driverName') {
            params.data.driverId = masterData.driverNameToId[selectedName] || null;
        } else if (field === 'partner') {
            params.data.partnerId = masterData.partnerNameToId[selectedName] || null;
        } else if (field === 'purchasePlace') {
            params.data.purchasePlaceId = masterData.purchasePlaceNameToId[selectedName] || null;
        } else if (field === 'itemName') {
            params.data.itemId = masterData.itemNameToId[selectedName] || null;
        }
    }
    
    // Handle calculated fields
    if (params.colDef.field === 'tonnage' || params.colDef.field === 'ratePerTon') {
        updateCalculatedFields(params.data);
        gridApi.refreshCells({ rowNodes: [params.node], force: true });
    }
}

// Update calculated fields (Revenue and Profit)
function updateCalculatedFields(trip) {
    const tonnage = parseFloat(trip.tonnage) || 0;
    const rate = parseFloat(trip.ratePerTon) || 0;
    const totalExpenses = parseFloat(trip.totalExpenses) || 0;
    
    trip.revenue = calculations.calculateRevenue(tonnage, rate);
    trip.profit = calculations.calculateProfit(trip.revenue, totalExpenses);
}

function getPinnedTopRowData() {
    if (!gridApi || typeof gridApi.getPinnedTopRowCount !== 'function') return [];
    const count = gridApi.getPinnedTopRowCount();
    const rows = [];
    for (let i = 0; i < count; i += 1) {
        const rowNode = gridApi.getPinnedTopRow(i);
        if (rowNode?.data) rows.push(rowNode.data);
    }
    return rows;
}

function setPinnedTopRowData(rows) {
    if (!gridApi) return;
    if (typeof gridApi.setPinnedTopRowData === 'function') {
        gridApi.setPinnedTopRowData(rows);
        return;
    }
    if (typeof gridApi.setGridOption === 'function') {
        gridApi.setGridOption('pinnedTopRowData', rows);
    }
}

function findPinnedRowById(tripId) {
    if (!gridApi || typeof gridApi.getPinnedTopRowCount !== 'function') return null;
    const count = gridApi.getPinnedTopRowCount();
    for (let i = 0; i < count; i += 1) {
        const rowNode = gridApi.getPinnedTopRow(i);
        if (rowNode?.data?.id === tripId) {
            return rowNode;
        }
    }
    return null;
}

// Add new row
function addNewRow() {
    if (!gridApi) {
        console.error('Grid API not available');
        return;
    }
    
    const newTripId = `trip_new_${Date.now()}`;
    const newTrip = {
        id: newTripId,
        tripStartDate: utils.getTodayDate(),
        status: 'draft',
        locked: false
    };
    
    const pinned = getPinnedTopRowData();
    pinned.unshift(newTrip);
    setPinnedTopRowData(pinned);
    
    if (typeof gridApi.paginationGoToPage === 'function') {
        gridApi.paginationGoToPage(0);
    }
    
    setTimeout(() => {
        if (typeof gridApi.setFocusedCell === 'function') {
            gridApi.setFocusedCell(0, 'tripStartDate', 'top');
        }
        if (typeof gridApi.startEditingCell === 'function') {
            gridApi.startEditingCell({
                rowIndex: 0,
                colKey: 'tripStartDate',
                rowPinned: 'top'
            });
        }
    }, 100);
    
    utils.showToast('New row added at the top', 'success');
}

// Save row
async function saveRowAG(tripId) {
    if (!gridApi) return;
    
    let rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) {
        rowNode = findPinnedRowById(tripId);
    }
    if (!rowNode) return;
    
    const trip = rowNode.data;
    
    // Validate required fields
    if (!trip.tripStartDate || !trip.vehicleNumber || !trip.driverName) {
        utils.showToast('Please fill in required fields (Start Date, Vehicle, Driver)', 'error');
        return;
    }
    
    // Prepare trip data for saving
    const payload = {
        trip_start_date: trip.tripStartDate,
        estimated_end_date: trip.estimatedEndDate || null,
        vehicle_id: trip.vehicleId || masterData.vehicleNameToId[normalizeMasterName(trip.vehicleNumber)] || null,
        driver_id: trip.driverId || masterData.driverNameToId[normalizeMasterName(trip.driverName)] || null,
        partner_id: trip.partnerId || masterData.partnerNameToId[normalizeMasterName(trip.partner)] || null,
        purchase_place_id: trip.purchasePlaceId || masterData.purchasePlaceNameToId[normalizeMasterName(trip.purchasePlace)] || null,
        item_id: trip.itemId || masterData.itemNameToId[normalizeMasterName(trip.itemName)] || null,
        expense_items: trip.expense_items || [],
        starting_km: parseFloat(trip.startingKm) || 0,
        ending_km: parseFloat(trip.closingKm) || 0,
        tonnage: parseFloat(trip.tonnage) || 0,
        rate_per_ton: parseFloat(trip.ratePerTon) || 0,
        amount_given_to_driver: parseFloat(trip.amountGivenToDriver) || 0,
        expenses: trip.expenses || {},
        total_expenses: parseFloat(trip.totalExpenses) || 0,
        revenue: parseFloat(trip.revenue) || 0,
        profit: parseFloat(trip.profit) || 0,
        status: 'closed'
    };
    
    try {
        let response;
        if (window.api && typeof window.api.post === 'function') {
            if (trip.id.startsWith('trip_new_')) {
                response = await window.api.post('/trips/', payload);
            } else {
                response = await window.api.put(`/trips/${trip.id}`, payload);
            }
            if (!response.success) {
                throw new Error(response.error || 'API request failed');
            }
            response = response.data;
        } else {
            const url = trip.id.startsWith('trip_new_')
                ? `${API_BASE_URL}/trips/`
                : `${API_BASE_URL}/trips/${trip.id}`;
            const method = trip.id.startsWith('trip_new_') ? 'POST' : 'PUT';
            const apiResponse = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!apiResponse.ok) {
                throw new Error(`API request failed: ${apiResponse.status}`);
            }
            response = await apiResponse.json();
        }
        
        const updatedTrip = normalizeTripFromApi(response);
        if (trip.id.startsWith('trip_new_')) {
            const pinned = getPinnedTopRowData().filter((row) => row.id !== trip.id);
            setPinnedTopRowData(pinned);
            refreshTripsData();
        } else {
            Object.assign(rowNode.data, updatedTrip);
            rowNode.data.locked = updatedTrip.status === 'closed';
            rowNode.data._originalTrip = null;
            gridApi.refreshCells({ rowNodes: [rowNode], force: true });
        }
        utils.showToast('Trip saved successfully', 'success');
    } catch (error) {
        console.error('Error saving trip:', error);
        utils.showToast('Error saving trip', 'error');
    }
}

// Delete row
async function deleteRowAG(tripId) {
    if (!gridApi) return;
    
    if (tripId.startsWith('trip_new_')) {
        const pinned = getPinnedTopRowData().filter((row) => row.id !== tripId);
        setPinnedTopRowData(pinned);
        return;
    }
    
    const rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) return;
    
    const confirmed = await utils.confirmDialog(
        'Are you sure you want to delete this trip? This action cannot be undone.',
        'Delete Trip'
    );
    
    if (confirmed) {
        try {
            if (window.api && typeof window.api.delete === 'function') {
                const response = await window.api.delete(`/trips/${tripId}`);
                if (!response.success) {
                    throw new Error(response.error || 'API request failed');
                }
            } else {
                const apiResponse = await fetch(`${API_BASE_URL}/trips/${tripId}`, {
                    method: 'DELETE'
                });
                if (!apiResponse.ok) {
                    throw new Error(`API request failed: ${apiResponse.status}`);
                }
            }
            gridApi.applyTransaction({ remove: [rowNode.data] });
            refreshTripsData();
            utils.showToast('Trip deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting trip:', error);
            utils.showToast('Error deleting trip', 'error');
        }
    }
}

// Enable row editing
function enableRowEdit(tripId) {
    if (!gridApi) return;
    
    let rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) {
        rowNode = findPinnedRowById(tripId);
    }
    if (!rowNode) return;
    
    rowNode.data._originalTrip = { ...rowNode.data };
    rowNode.data.locked = false;
    gridApi.refreshCells({ rowNodes: [rowNode], force: true });
    utils.showToast('Row unlocked for editing', 'success');
}

// Cancel row editing
function cancelRowEdit(tripId) {
    if (!gridApi) return;
    
    let rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) {
        rowNode = findPinnedRowById(tripId);
    }
    if (!rowNode) return;
    
    const originalTrip = rowNode.data._originalTrip;
    if (originalTrip) {
        Object.assign(rowNode.data, originalTrip);
        rowNode.data.locked = originalTrip.status === 'closed';
        rowNode.data._originalTrip = null;
        gridApi.refreshCells({ rowNodes: [rowNode], force: true });
    }
    
    utils.showToast('Changes cancelled', 'info');
}

// Setup event listeners
// Open master data modal
function openMasterDataModal(title, label) {
    const modal = document.getElementById('masterDataModal');
    const modalTitle = document.getElementById('masterDataModalTitle');
    const modalLabel = document.getElementById('masterDataLabel');
    const modalInput = document.getElementById('masterDataInput');
    
    if (modal && modalTitle && modalLabel && modalInput) {
        modalTitle.textContent = title;
        modalLabel.textContent = label;
        modalInput.value = '';
        modal.style.display = 'flex';
        modalInput.focus();
    }
}

// Save master data item
async function saveMasterDataItem() {
    if (!currentMasterDataContext) {
        return;
    }
    
    const input = document.getElementById('masterDataInput');
    if (!input || !input.value.trim()) {
        utils.showToast('Please enter a value', 'error');
        return;
    }
    
    const newValue = input.value.trim();
    const { field, rowNode, storageType } = currentMasterDataContext;
    
    try {
        if (storageType === 'vehicle') {
            await MastersAPI.create('vehicles', { vehicle_number: newValue });
        } else if (storageType === 'driver') {
            await MastersAPI.create('drivers', { name: newValue });
        } else if (storageType === 'partner') {
            await MastersAPI.create('partners', { name: newValue });
        } else if (storageType === 'purchasePlace') {
            await MastersAPI.create('purchase-places', { name: newValue });
        } else if (storageType === 'item') {
            await MastersAPI.create('items', { name: newValue });
        }
        await loadMasterData();
    } catch (error) {
        console.error('Error saving master data item:', error);
        utils.showToast('Failed to save item', 'error');
        return;
    }
    
    // Update the cell with the new value
    rowNode.setDataValue(field, newValue);
    
    // Refresh all column definitions to update dropdowns
    if (gridApi) {
        const columnDefs = getColumnDefs();
        gridApi.setGridOption('columnDefs', columnDefs);
    }
    
    // Close modal
    const modal = document.getElementById('masterDataModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    currentMasterDataContext = null;
    utils.showToast('Item added successfully', 'success');
}

function setupEventListeners() {
    // Window resize handler for responsive columns
    const debouncedResize = debounce(handleWindowResize, 250);
    window.addEventListener('resize', debouncedResize);
    
    // Add new row button
    const addNewRowBtn = document.getElementById('addNewRowBtn');
    if (addNewRowBtn) {
        addNewRowBtn.addEventListener('click', addNewRow);
    }
    
    // Search
    const tableSearch = document.getElementById('tableSearch');
    const applyQuickFilter = (value) => {
        if (!gridApi) return;
        if (typeof gridApi.setQuickFilter === 'function') {
            gridApi.setQuickFilter(value);
            return;
        }
        if (typeof gridApi.setGridOption === 'function') {
            gridApi.setGridOption('quickFilterText', value);
        }
    };
    if (tableSearch) {
        tableSearch.addEventListener('input', utils.debounce(() => {
            includeDateFiltersOnSearch = false;
            if (typeof gridApi.paginationGoToFirstPage === 'function') {
                gridApi.paginationGoToFirstPage();
            }
            refreshTripsData();
        }, 300));
    }

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            includeDateFiltersOnSearch = true;
            if (typeof gridApi.paginationGoToFirstPage === 'function') {
                gridApi.paginationGoToFirstPage();
            }
            refreshTripsData();
        });
    }
    
    // Master data modal handlers
    const masterDataForm = document.getElementById('masterDataForm');
    const masterDataModalClose = document.getElementById('masterDataModalClose');
    const cancelMasterDataBtn = document.getElementById('cancelMasterDataBtn');
    
    if (masterDataForm) {
        masterDataForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveMasterDataItem();
        });
    }
    
    if (masterDataModalClose) {
        masterDataModalClose.addEventListener('click', () => {
            const modal = document.getElementById('masterDataModal');
            if (modal) modal.style.display = 'none';
            currentMasterDataContext = null;
        });
    }
    
    if (cancelMasterDataBtn) {
        cancelMasterDataBtn.addEventListener('click', () => {
            const modal = document.getElementById('masterDataModal');
            if (modal) modal.style.display = 'none';
            currentMasterDataContext = null;
        });
    }
    
    // Date filter controls
    const startDateFrom = document.getElementById('startDateFrom');
    const startDateTo = document.getElementById('startDateTo');
    const clearDateFiltersBtn = document.getElementById('clearDateFiltersBtn');
    
    const applyDateFilters = () => {
        if (!gridApi) return;
        includeDateFiltersOnSearch = true;
    };
    
    if (startDateFrom) startDateFrom.addEventListener('change', applyDateFilters);
    if (startDateTo) startDateTo.addEventListener('change', applyDateFilters);
    
    if (clearDateFiltersBtn) {
        clearDateFiltersBtn.addEventListener('click', () => {
            includeDateFiltersOnSearch = false;
            if (tableSearch) tableSearch.value = '';
            if (startDateFrom) startDateFrom.value = '';
            if (startDateTo) startDateTo.value = '';
            if (typeof gridApi.paginationGoToFirstPage === 'function') {
                gridApi.paginationGoToFirstPage();
            }
            refreshTripsData();
            utils.showToast('Date filters cleared', 'info');
        });
    }
    
    // Expense modal close handlers
    const expenseBreakdownModalClose = document.getElementById('expenseBreakdownModalClose');
    const cancelExpenseBreakdownBtn = document.getElementById('cancelExpenseBreakdownBtn');
    const saveExpenseBreakdownBtn = document.getElementById('saveExpenseBreakdownBtn');
    
    if (expenseBreakdownModalClose) {
        expenseBreakdownModalClose.addEventListener('click', () => {
            const modal = document.getElementById('expenseBreakdownModal');
            if (modal) modal.style.display = 'none';
            currentExpenseBreakdownRow = null;
        });
    }
    
    if (cancelExpenseBreakdownBtn) {
        cancelExpenseBreakdownBtn.addEventListener('click', () => {
            const modal = document.getElementById('expenseBreakdownModal');
            if (modal) modal.style.display = 'none';
            currentExpenseBreakdownRow = null;
        });
    }
    
    if (saveExpenseBreakdownBtn) {
        saveExpenseBreakdownBtn.addEventListener('click', saveExpenseBreakdown);
    }
}

// Setup navigation
function setupNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const mainContent = document.querySelector('.main-content');
    
    // Initialize sidebar state on tablets - start collapsed (hidden) so table uses full width
    if (sidebar && window.innerWidth >= 768) {
        sidebar.classList.add('collapsed');
    }
    
    // Define closeSidebar function first (needed by overlay handler)
    const closeSidebar = () => {
        if (!sidebar) return;
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            sidebar.classList.remove('active');
        } else {
            sidebar.classList.add('collapsed');
            if (overlay) {
                overlay.classList.remove('show');
            }
        }
    };
    
    // Create overlay backdrop for sidebar
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);
    }
    
    // Setup overlay click handler
    const overlayClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
    };
    
    // Remove any existing listeners and add new one
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);
    overlay = newOverlay;
    overlay.addEventListener('click', overlayClickHandler);
    
    const toggleSidebar = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!sidebar) return;
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            sidebar.classList.toggle('active');
        } else {
            // Tablet/Desktop: toggle collapsed class - sidebar overlays
            const wasCollapsed = sidebar.classList.contains('collapsed');
            if (wasCollapsed) {
                sidebar.classList.remove('collapsed');
                if (overlay) {
                    overlay.classList.add('show');
                }
            } else {
                sidebar.classList.add('collapsed');
                if (overlay) {
                    overlay.classList.remove('show');
                }
            }
        }
    };
    
    if (menuToggle && sidebar) {
        // Remove any existing listeners to prevent duplicates
        const newMenuToggle = menuToggle.cloneNode(true);
        menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
        
        newMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar(e);
        });
    }
    
    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });
    }
    
    // Overlay click handler is already set up above when overlay is created
    
    // Close sidebar when clicking outside (on main content)
    if (mainContent) {
        mainContent.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && sidebar && sidebar.classList.contains('active')) {
                // On mobile, close if clicking outside sidebar
                if (!sidebar.contains(e.target)) {
                    closeSidebar();
                }
            } else if (window.innerWidth >= 768 && sidebar && !sidebar.classList.contains('collapsed')) {
                // On tablet/desktop, close if clicking outside sidebar (when overlay is visible)
                if (!sidebar.contains(e.target) && overlay && overlay.classList.contains('show')) {
                    closeSidebar();
                }
            }
        });
    }

    // Close sidebar when clicking a nav link (except the Master toggle)
    if (sidebar) {
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
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (auth.isAuthenticated()) {
                auth.logout();
            } else {
                window.location.href = '../index.html';
            }
        });
    }
}

// Open expense breakdown (simplified - will integrate with existing modal)
function openExpenseBreakdown(tripId) {
    if (!gridApi) return;
    
    let rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) {
        rowNode = findPinnedRowById(tripId);
    }
    if (!rowNode) return;
    
    const trip = rowNode.data;
    if (trip.locked) {
        utils.showToast('Row is locked. Click Edit button to enable editing.', 'info');
        return;
    }
    
    // Open the existing expense modal (you may need to adapt this)
    const modal = document.getElementById('expenseBreakdownModal');
    if (modal) {
        modal.style.display = 'flex';
        currentExpenseBreakdownRow = tripId;
        // Populate expense form with existing data
        const form = document.getElementById('expenseBreakdownForm');
        if (form) {
            if (!expensesReady || expenseTypes.length === 0) {
                form.innerHTML = `
                    <div class="expense-breakdown-empty">
                        <p>No expenses configured in the master yet.</p>
                    </div>
                `;
                updateExpenseBreakdownTotal();
                return;
            }

            const expenses = trip.expenses || {};
            form.innerHTML = expenseTypes.map(expense => {
                const expenseKey = expenseKeyFromName(expense);
                const value = expenses[expenseKey] || 0;
                return `
                    <div class="expense-breakdown-item">
                        <label>${expense} (₹)</label>
                        <input type="number" 
                               class="input" 
                               id="expense_${expenseKey}" 
                               value="${value}" 
                               step="1" 
                               min="0" 
                               oninput="updateExpenseBreakdownTotal()"
                               placeholder="0">
                    </div>
                `;
            }).join('');
            updateExpenseBreakdownTotal();
        }
    }
}

// Update expense breakdown total (simplified)
function updateExpenseBreakdownTotal() {
    const form = document.getElementById('expenseBreakdownForm');
    const totalEl = document.getElementById('expenseBreakdownTotal');
    
    if (!form || !totalEl) return;
    
    const inputs = form.querySelectorAll('input[type="number"]');
    let total = 0;
    
    inputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    totalEl.textContent = utils.formatCurrency(total);
}

// Save expense breakdown (simplified)
function saveExpenseBreakdown() {
    if (!currentExpenseBreakdownRow || !gridApi) return;
    
    let rowNode = gridApi.getRowNode(currentExpenseBreakdownRow);
    if (!rowNode) {
        rowNode = findPinnedRowById(currentExpenseBreakdownRow);
    }
    if (!rowNode) return;
    
    const form = document.getElementById('expenseBreakdownForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[type="number"]');
    const expenses = {};
    let total = 0;
    
    inputs.forEach(input => {
        const expenseKey = input.id.replace('expense_', '');
        const value = parseFloat(input.value) || 0;
        expenses[expenseKey] = value;
        total += value;
    });
    
    rowNode.data.expenses = expenses;
    rowNode.data.totalExpenses = total;
    rowNode.data.expense_items = expenseTypes.map(expense => ({
        expense_id: expenseNameToId[expense] || null,
        expense_name: expense,
        amount: expenses[expenseKeyFromName(expense)] || 0
    }));
    
    // Update calculations
    updateCalculatedFields(rowNode.data);
    gridApi.refreshCells({ rowNodes: [rowNode], force: true });
    
    // Close modal
    const modal = document.getElementById('expenseBreakdownModal');
    if (modal) modal.style.display = 'none';
    currentExpenseBreakdownRow = null;
    
    utils.showToast('Expense amounts saved', 'success');
}

// Debounce function for resize handler
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle window resize to update column headers and widths
function handleWindowResize() {
    if (!gridApi) return;
    
    // Update column definitions with new responsive values
    const newColumnDefs = getColumnDefs();
    gridApi.setGridOption('columnDefs', newColumnDefs);
}

// Make functions globally available
window.addNewRow = addNewRow;
window.saveRowAG = saveRowAG;
window.deleteRowAG = deleteRowAG;
window.enableRowEdit = enableRowEdit;
window.cancelRowEdit = cancelRowEdit;
window.openExpenseBreakdown = openExpenseBreakdown;
window.updateExpenseBreakdownTotal = updateExpenseBreakdownTotal;
window.saveExpenseBreakdown = saveExpenseBreakdown;
window.openMasterDataModal = openMasterDataModal;
window.saveMasterDataItem = saveMasterDataItem;
window.openMasterDataModalForField = openMasterDataModalForField;

// Initialize is now called from HTML script tag after AG Grid loads
// Don't call here to avoid race conditions

