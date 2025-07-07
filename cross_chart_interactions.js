let crossChartState = {
    activeFilters: new Map(), // Store active cross-chart filters
    isActive: false, // Whether cross-chart filtering is currently active
    listeners: new Set() // Set of chart update functions
};

// Initialize cross-chart interaction system
function initializeCrossChartInteractions() {
    // Clear any existing state
    crossChartState.activeFilters.clear();
    crossChartState.isActive = false;
    crossChartState.listeners.clear();
    
    // Remove any existing active interactions display elements
    d3.select('.active-interactions').remove();
    d3.selectAll('.active-chart-interactions').remove();
    d3.selectAll('.cross-chart-indicator').remove();
    d3.selectAll('.filter-status-display').remove();
    d3.selectAll('.active-filters-indicator').remove();
    d3.selectAll('.interaction-status').remove();
    
    // Register chart update functions
    registerChartUpdateListeners();
}

// Register all chart update functions
function registerChartUpdateListeners() {
    crossChartState.listeners.add('delivery-status');
    crossChartState.listeners.add('country-risk');
    crossChartState.listeners.add('shipping-scatter');
    crossChartState.listeners.add('treemap');
    crossChartState.listeners.add('kpi-cards');
}

// Apply cross-chart filter
function applyCrossChartFilter(filterType, filterValue, sourceChart) {
    // Add or update the filter
    crossChartState.activeFilters.set(filterType, {
        value: filterValue,
        source: sourceChart,
        timestamp: Date.now()
    });
    
    crossChartState.isActive = true;
    
    // Apply filters to all charts
    updateAllChartsWithCrossFilters();
    
    // Log for debugging (optional)
    console.log(`Cross-chart filter applied: ${filterType} = ${filterValue} from ${sourceChart}`);
}

// Remove a specific cross-chart filter
function removeCrossChartFilter(filterType) {
    crossChartState.activeFilters.delete(filterType);
    
    // If no filters remain, deactivate cross-chart filtering
    if (crossChartState.activeFilters.size === 0) {
        crossChartState.isActive = false;
    }
    
    // Apply remaining filters to all charts
    updateAllChartsWithCrossFilters();
    
    // Log for debugging (optional)
    console.log(`Cross-chart filter removed: ${filterType}`);
}

// Clear all cross-chart filters
function clearAllCrossChartFilters() {
    crossChartState.activeFilters.clear();
    crossChartState.isActive = false;
    
    // Reset all charts to use only global filters
    updateAllChartsWithCrossFilters();
    
    console.log('All cross-chart filters cleared');
}

// Get data filtered by both global and cross-chart filters
function getFullyFilteredData() {
    // Start with globally filtered data
    let data = getFilteredData() || globalData;
    
    if (!crossChartState.isActive || crossChartState.activeFilters.size === 0) {
        return data;
    }
    
    // Apply each cross-chart filter
    for (let [filterType, filterInfo] of crossChartState.activeFilters) {
        data = applySingleCrossChartFilter(data, filterType, filterInfo.value);
    }
    
    return data;
}

// Apply a single cross-chart filter to data
function applySingleCrossChartFilter(data, filterType, filterValue) {
    switch (filterType) {
        case 'shippingMode':
            return data.filter(d => d.shippingMode === filterValue);
        
        case 'orderCountry':
            return data.filter(d => d.orderCountry === filterValue);
        
        case 'orderState':
            return data.filter(d => d.orderState === filterValue);
        
        case 'orderCity':
            return data.filter(d => d.orderCity === filterValue);
        
        case 'period':
            // For delivery status chart time period filtering
            return data.filter(d => {
                const orderPeriod = d3.timeFormat("%Y-%m")(d.orderDate);
                return orderPeriod === filterValue;
            });
        
        case 'categoryName':
            return data.filter(d => d.categoryName === filterValue);
        
        case 'departmentName':
            return data.filter(d => d.departmentName === filterValue);
        
        case 'productName':
            return data.filter(d => d.productName === filterValue);
        
        default:
            return data;
    }
}

// Update all charts with cross-chart filtered data
function updateAllChartsWithCrossFilters() {
    const filteredData = getFullyFilteredData();
    
    // Update KPI Cards
    if (typeof updateKPICardsWithFilters === 'function') {
        updateKPICardsWithFilters(filteredData);
    }
    
    // Update Delivery Status Chart
    if (typeof processDeliveryStatusDataNew === 'function' && typeof createDeliveryStatusChart === 'function') {
        try {
            const processedData = processDeliveryStatusDataNew(filteredData);
            createDeliveryStatusChart(processedData, 'month');
        } catch (error) {
            console.error('Error updating delivery status chart with cross-filters:', error);
        }
    }
    
    // Update Country Risk Chart
    if (typeof initCountryRiskChart === 'function') {
        try {
            initCountryRiskChart(filteredData);
        } catch (error) {
            console.error('Error updating country risk chart with cross-filters:', error);
        }
    }
    
    // Update Shipping Scatter Chart
    if (typeof initShippingScatterChart === 'function') {
        try {
            initShippingScatterChart(filteredData);
        } catch (error) {
            console.error('Error updating shipping scatter chart with cross-filters:', error);
        }
    }
    
    // Update Treemap Chart
    if (typeof initTreemapChart === 'function') {
        try {
            initTreemapChart(filteredData);
        } catch (error) {
            console.error('Error updating treemap chart with cross-filters:', error);
        }
    }
}

// Check if a specific cross-chart filter is active
function isCrossChartFilterActive(filterType) {
    return crossChartState.activeFilters.has(filterType);
}

// Get active cross-chart filter value
function getActiveCrossChartFilter(filterType) {
    const filterInfo = crossChartState.activeFilters.get(filterType);
    return filterInfo ? filterInfo.value : null;
}

// Get all active filters (for debugging purposes only)
function getActiveCrossChartFilters() {
    return Array.from(crossChartState.activeFilters.entries()).map(([type, info]) => ({
        type,
        value: info.value,
        source: info.source
    }));
}