// AG Grid Trips Table Implementation

let gridApi;
let gridColumnApi;
let masterData = {
    vehicles: [],
    drivers: [],
    items: [],
    purchasePlaces: [],
    partners: []
};
let expenseTypes = ['Food', 'Diesel', 'Toll', 'Salary', 'GST', 'Other'];
let currentExpenseBreakdownRow = null;

// Initialize AG Grid
function initTripsTableAGGrid() {
    // Check if AG Grid is loaded
    if (typeof agGrid === 'undefined') {
        console.error('AG Grid is not loaded. Please check the CDN link.');
        setTimeout(initTripsTableAGGrid, 100); // Retry after a short delay
        return;
    }
    
    loadMasterData();
    
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
            wrapText: true, // Enable text wrapping in cells
            autoHeight: true, // Auto adjust row height based on content
            cellStyle: { 
                whiteSpace: 'normal', // Allow text wrapping
                wordWrap: 'break-word', // Wrap long words
                overflowWrap: 'break-word', // Wrap overflowing text
                overflow: 'hidden', // Prevent content overflow
                maxWidth: '100%' // Keep content within column boundaries
            }
        },
        
        // Don't auto-size columns to fit - allow horizontal scroll
        suppressSizeToFit: true,
        
        // Enable single click editing (instead of double click)
        // In AG Grid, suppressClickEdit: false means allow editing on single click
        suppressClickEdit: false,
        enterNavigatesVertically: true,
        enterNavigatesVerticallyAfterEdit: true,
        
        // Pagination
        pagination: true,
        paginationPageSize: 20,
        paginationPageSizeSelector: [10, 20, 50, 100],
        
        // Row styling
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
            
            // Check if setRowData exists (might be in prototype or not in first 20 methods)
            const hasSetRowData = gridApi && (typeof gridApi.setRowData === 'function' || typeof gridApi.setGridOption === 'function');
            
            if (hasSetRowData) {
                loadTripsData();
            } else {
                console.error('Grid API not properly initialized');
                console.log('Grid API:', gridApi);
                console.log('Checking for setRowData:', 'setRowData' in gridApi, typeof gridApi.setRowData);
                console.log('Checking for setGridOption:', 'setGridOption' in gridApi, typeof gridApi.setGridOption);
                // Retry after a short delay - sometimes API takes a moment to fully initialize
                setTimeout(() => {
                    gridApi = params.api; // Re-assign to be sure
                    loadTripsData();
                }, 100);
            }
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
                    colKey: params.column.getColId()
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

// Load master data
function loadMasterData() {
    const vehicles = storage.VehicleStorage.getAll();
    const drivers = storage.DriverStorage.getAll();
    
    masterData.vehicles = vehicles.map(v => v.vehicleNumber || v.name || v);
    masterData.drivers = drivers.map(d => d.name || d);
    
    const trips = storage.TripStorage.getAll();
    const itemsSet = new Set();
    const purchasePlacesSet = new Set();
    const partnersSet = new Set();
    trips.forEach(trip => {
        if (trip.itemName && trip.itemName !== '__ADD_NEW__') itemsSet.add(trip.itemName);
        if (trip.purchasePlace && trip.purchasePlace !== '__ADD_NEW__') purchasePlacesSet.add(trip.purchasePlace);
        if (trip.partner && trip.partner !== '__ADD_NEW__') partnersSet.add(trip.partner);
    });
    masterData.items = Array.from(itemsSet);
    masterData.purchasePlaces = Array.from(purchasePlacesSet);
    masterData.partners = Array.from(partnersSet);
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
    
    const rowNode = gridApi.getRowNode(tripId);
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

// Get responsive header config (icon for small screens, text for large screens)
function getResponsiveHeaderConfig(text, iconSvg) {
    if (isSmallScreen()) {
        return {
            headerComponent: createIconHeaderComponent(text, iconSvg),
            headerName: text // Fallback for tooltip
        };
    }
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
                if (params.value.includes('-')) return params.value;
                return utils.formatDate(params.value);
            },
            valueGetter: (params) => {
                if (!params.data?.tripStartDate) return '';
                const date = params.data.tripStartDate;
                if (date.includes('-')) return date;
                // Convert to YYYY-MM-DD for editing
                const dateObj = new Date(date);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toISOString().split('T')[0];
                }
                return date;
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
                if (date.includes('-')) return date;
                const dateObj = new Date(date);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toISOString().split('T')[0];
                }
                return date;
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
            cellEditorParams: {
                values: [...masterData.vehicles, 'Add New...']
            },
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
            cellEditorParams: {
                values: [...masterData.drivers, 'Add New...']
            },
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
            cellEditorParams: {
                values: [...masterData.partners, 'Add New...']
            },
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
            cellEditorParams: {
                values: [...masterData.purchasePlaces, 'Add New...']
            },
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
            cellEditorParams: {
                values: [...masterData.items, 'Add New...']
            },
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
                const expenses = trip.expenses || {};
                const totalExpenses = trip.totalExpenses || 0;
                
                // Check if any expenses are set
                const hasExpenses = totalExpenses > 0 || 
                    expenses.food > 0 || expenses.diesel > 0 || expenses.toll > 0 || 
                    expenses.salary > 0 || expenses.gst > 0 || expenses.other > 0;
                
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

// Load trips data from API
async function loadTripsData() {
    // Safety check - ensure gridApi is ready
    if (!gridApi) {
        console.error('Grid API not available');
        return;
    }
    
    // Check if setRowData exists (try both direct check and in operator)
    const canSetRowData = 'setRowData' in gridApi || typeof gridApi.setRowData === 'function';
    const canSetGridOption = 'setGridOption' in gridApi || typeof gridApi.setGridOption === 'function';
    
    if (!canSetRowData && !canSetGridOption) {
        console.error('Neither setRowData nor setGridOption available');
        console.log('Grid API methods check:', {
            hasSetRowDataIn: 'setRowData' in gridApi,
            hasSetGridOptionIn: 'setGridOption' in gridApi,
            hasSetRowData: typeof gridApi.setRowData,
            hasSetGridOption: typeof gridApi.setGridOption
        });
        return;
    }
    
    try {
        // Try to fetch from API first - use api helper if available, otherwise direct fetch
        let trips;
        
        if (window.api && typeof window.api.get === 'function') {
            // Use authenticated API helper
            const response = await window.api.get('/trips/');
            if (response.success) {
                trips = response.data;
            } else {
                throw new Error(response.error || `API request failed: ${response.status}`);
            }
        } else {
            // Fallback to direct fetch
            const response = await fetch(`${API_BASE_URL}/trips/`);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            trips = await response.json();
        }
        
        // If API returns empty array or no data, fallback to LocalStorage
        if (!trips || trips.length === 0) {
            console.log('No trips from API, trying LocalStorage fallback');
            loadTripsDataFromStorage();
            return;
        }
        
        // Sort by date (newest first)
        trips.sort((a, b) => {
            const dateA = new Date(a.tripStartDate || a.createdAt || 0);
            const dateB = new Date(b.tripStartDate || b.createdAt || 0);
            return dateB - dateA;
        });
        
        // Set locked status for closed trips
        const tripsWithLocked = trips.map(trip => ({
            ...trip,
            locked: trip.status === 'closed'
        }));
        
        // Use setRowData if available, otherwise use setGridOption
        if (typeof gridApi.setRowData === 'function') {
            gridApi.setRowData(tripsWithLocked);
        } else if (typeof gridApi.setGridOption === 'function') {
            gridApi.setGridOption('rowData', tripsWithLocked);
        } else {
            console.error('Cannot set row data - no suitable method found');
            return;
        }
        console.log(`Loaded ${trips.length} trips from API`);
        
    } catch (error) {
        console.error('Error fetching trips from API:', error);
        console.log('Falling back to LocalStorage');
        // Fallback to LocalStorage if API fails
        loadTripsDataFromStorage();
    }
}

// Load trips data from LocalStorage (fallback)
function loadTripsDataFromStorage() {
    // Safety check - ensure gridApi is ready
    if (!gridApi) {
        console.error('Grid API not available in fallback function');
        return;
    }
    
    const trips = storage.TripStorage.getAll();
    
    // Set locked status for closed trips
    const tripsWithLocked = trips.length === 0 ? [] : trips.map(trip => ({
        ...trip,
        locked: trip.status === 'closed'
    }));
    
    if (trips.length > 0) {
        // Sort by date (newest first)
        tripsWithLocked.sort((a, b) => {
            const dateA = new Date(a.tripStartDate || a.createdAt || 0);
            const dateB = new Date(b.tripStartDate || b.createdAt || 0);
            return dateB - dateA;
        });
    }
    
    // Use setRowData if available, otherwise use setGridOption
    if (typeof gridApi.setRowData === 'function') {
        gridApi.setRowData(tripsWithLocked);
    } else if (typeof gridApi.setGridOption === 'function') {
        gridApi.setGridOption('rowData', tripsWithLocked);
    } else {
        console.error('Cannot set row data in fallback - no suitable method found');
        return;
    }
    
    console.log(`Loaded ${trips.length} trips from LocalStorage`);
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
    
    // Use applyTransaction to add row at index 0 (top of current view)
    // This is the proper AG Grid way to add rows at a specific position
    const transaction = {
        add: [newTrip],
        addIndex: 0
    };
    
    if (typeof gridApi.applyTransaction === 'function') {
        gridApi.applyTransaction(transaction);
        
        // Go to first page to ensure new row is visible
        if (typeof gridApi.paginationGoToPage === 'function') {
            gridApi.paginationGoToPage(0);
        }
        
        // Scroll to top and focus on the new row
        setTimeout(() => {
            gridApi.ensureIndexVisible(0, 'top');
            // Focus on the first editable cell
            const firstRowNode = gridApi.getDisplayedRowAtIndex(0);
            if (firstRowNode) {
                gridApi.setFocusedCell(0, 'tripStartDate');
            }
        }, 100);
    } else {
        // Fallback: Get all data, add at beginning, and set back
        let allRowData = [];
        gridApi.forEachNode((node) => {
            allRowData.push(node.data);
        });
        
        allRowData.unshift(newTrip);
        
        if (typeof gridApi.setRowData === 'function') {
            gridApi.setRowData(allRowData);
        } else if (typeof gridApi.setGridOption === 'function') {
            gridApi.setGridOption('rowData', allRowData);
        }
        
        setTimeout(() => {
            gridApi.ensureIndexVisible(0, 'top');
        }, 100);
    }
    
    utils.showToast('New row added at the top', 'success');
}

// Save row
function saveRowAG(tripId) {
    if (!gridApi) return;
    
    const rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) return;
    
    const trip = rowNode.data;
    
    // Validate required fields
    if (!trip.tripStartDate || !trip.vehicleNumber || !trip.driverName) {
        utils.showToast('Please fill in required fields (Start Date, Vehicle, Driver)', 'error');
        return;
    }
    
    // Prepare trip data for saving
    const tripData = {
        id: trip.id.startsWith('trip_new_') ? null : trip.id,
        tripStartDate: trip.tripStartDate,
        estimatedEndDate: trip.estimatedEndDate || null,
        vehicleNumber: trip.vehicleNumber,
        driverName: trip.driverName,
        partner: trip.partner || null,
        purchasePlace: trip.purchasePlace,
        itemName: trip.itemName,
        startingKm: parseFloat(trip.startingKm) || 0,
        closingKm: parseFloat(trip.closingKm) || 0,
        tonnage: parseFloat(trip.tonnage) || 0,
        ratePerTon: parseFloat(trip.ratePerTon) || 0,
        amountGivenToDriver: parseFloat(trip.amountGivenToDriver) || 0,
        expenses: trip.expenses || {},
        totalExpenses: parseFloat(trip.totalExpenses) || 0,
        revenue: parseFloat(trip.revenue) || 0,
        profit: parseFloat(trip.profit) || 0,
        status: 'closed'
    };
    
    if (storage.TripStorage.save(tripData)) {
        // Update the row
        trip.id = tripData.id;
        trip.status = 'closed';
        trip.locked = true;
        
        // Refresh the row
        gridApi.refreshCells({ rowNodes: [rowNode], force: true });
        
        utils.showToast('Trip saved successfully', 'success');
    } else {
        utils.showToast('Error saving trip', 'error');
    }
}

// Delete row
async function deleteRowAG(tripId) {
    if (!gridApi) return;
    
    const rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) return;
    
    if (tripId.startsWith('trip_new_')) {
        gridApi.applyTransaction({ remove: [rowNode.data] });
        return;
    }
    
    const confirmed = await utils.confirmDialog(
        'Are you sure you want to delete this trip? This action cannot be undone.',
        'Delete Trip'
    );
    
    if (confirmed) {
        if (storage.TripStorage.delete(tripId)) {
            gridApi.applyTransaction({ remove: [rowNode.data] });
            utils.showToast('Trip deleted successfully', 'success');
        } else {
            utils.showToast('Error deleting trip', 'error');
        }
    }
}

// Enable row editing
function enableRowEdit(tripId) {
    if (!gridApi) return;
    
    const rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) return;
    
    rowNode.data.locked = false;
    gridApi.refreshCells({ rowNodes: [rowNode], force: true });
    utils.showToast('Row unlocked for editing', 'success');
}

// Cancel row editing
function cancelRowEdit(tripId) {
    if (!gridApi) return;
    
    const rowNode = gridApi.getRowNode(tripId);
    if (!rowNode) return;
    
    // Reload from storage
    const trip = storage.TripStorage.getById(tripId);
    if (trip) {
        Object.assign(rowNode.data, trip);
        rowNode.data.locked = trip.status === 'closed';
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
function saveMasterDataItem() {
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
    
    // Save to appropriate storage
    if (storageType === 'vehicle') {
        storage.VehicleStorage.save({
            vehicleNumber: newValue
        });
        masterData.vehicles.push(newValue);
    } else if (storageType === 'driver') {
        storage.DriverStorage.save({
            name: newValue
        });
        masterData.drivers.push(newValue);
    } else if (storageType === 'partner') {
        masterData.partners.push(newValue);
    } else if (storageType === 'purchasePlace') {
        masterData.purchasePlaces.push(newValue);
    } else if (storageType === 'item') {
        masterData.items.push(newValue);
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
    if (tableSearch) {
        tableSearch.addEventListener('input', utils.debounce(() => {
            const searchTerm = tableSearch.value;
            gridApi.setQuickFilter(searchTerm);
        }, 300));
    }
    
    // Export
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!gridApi) return;
            gridApi.exportDataAsCsv({
                fileName: `trips_${new Date().toISOString().split('T')[0]}.csv`
            });
            utils.showToast('Trips exported successfully', 'success');
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
    const endDateFrom = document.getElementById('endDateFrom');
    const endDateTo = document.getElementById('endDateTo');
    const clearDateFiltersBtn = document.getElementById('clearDateFiltersBtn');
    
    const applyDateFilters = () => {
        if (!gridApi) return;
        
        const filters = [];
        if (startDateFrom?.value) {
            gridApi.setFilterModel({
                tripStartDate: {
                    type: 'greaterThanOrEqual',
                    dateFrom: startDateFrom.value
                }
            });
        }
        if (startDateTo?.value) {
            const currentFilter = gridApi.getFilterModel()?.tripStartDate || {};
            gridApi.setFilterModel({
                tripStartDate: {
                    ...currentFilter,
                    type: 'lessThanOrEqual',
                    dateTo: startDateTo.value
                }
            });
        }
        // Note: AG Grid date filter works per column, so we apply to each date column separately
    };
    
    if (startDateFrom) startDateFrom.addEventListener('change', applyDateFilters);
    if (startDateTo) startDateTo.addEventListener('change', applyDateFilters);
    if (endDateFrom) endDateFrom.addEventListener('change', applyDateFilters);
    if (endDateTo) endDateTo.addEventListener('change', applyDateFilters);
    
    if (clearDateFiltersBtn) {
        clearDateFiltersBtn.addEventListener('click', () => {
            if (startDateFrom) startDateFrom.value = '';
            if (startDateTo) startDateTo.value = '';
            if (endDateFrom) endDateFrom.value = '';
            if (endDateTo) endDateTo.value = '';
            if (gridApi) {
                gridApi.setFilterModel(null);
            }
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
    
    const rowNode = gridApi.getRowNode(tripId);
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
            const expenses = trip.expenses || {};
            form.innerHTML = expenseTypes.map(expense => {
                const expenseKey = expense.toLowerCase();
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
    
    const rowNode = gridApi.getRowNode(currentExpenseBreakdownRow);
    if (!rowNode) return;
    
    const form = document.getElementById('expenseBreakdownForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[type="number"]');
    const expenses = {
        food: 0,
        diesel: 0,
        toll: 0,
        salary: 0,
        gst: 0,
        other: 0
    };
    let total = 0;
    
    inputs.forEach(input => {
        const expenseKey = input.id.replace('expense_', '');
        const value = parseFloat(input.value) || 0;
        if (expenses.hasOwnProperty(expenseKey)) {
            expenses[expenseKey] = value;
            total += value;
        }
    });
    
    rowNode.data.expenses = expenses;
    rowNode.data.totalExpenses = total;
    
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

