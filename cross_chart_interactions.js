// Cross-Chart Interaction Manager
// Handles click interactions between all charts and KPI cards

let crossChartState = {
    activeFilters: new Map(), // Store active cross-chart filters
    isActive: false, // Whether cross-chart filtering is currently active
    listeners: new Set() // Set of chart update functions
};

// Initialize cross-chart interaction system
function initializeCrossChartInteractions() {
    console.log('Initializing Cross-Chart Interaction System...');
    
    // Clear any existing state
    crossChartState.activeFilters.clear();
    crossChartState.isActive = false;
    crossChartState.listeners.clear();
    
    // Register chart update functions
    registerChartUpdateListeners();
    
    // Add visual indicator for active cross-chart filters
    createCrossChartIndicator();
    
    console.log('Cross-Chart Interaction System initialized');
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
    console.log(`Applying cross-chart filter: ${filterType} = ${filterValue} from ${sourceChart}`);
    
    // Add or update the filter
    crossChartState.activeFilters.set(filterType, {
        value: filterValue,
        source: sourceChart,
        timestamp: Date.now()
    });
    
    crossChartState.isActive = true;
    
    // Update the cross-chart indicator
    updateCrossChartIndicator();
    
    // Apply filters to all charts
    updateAllChartsWithCrossFilters();
}

// Remove a specific cross-chart filter
function removeCrossChartFilter(filterType) {
    console.log(`Removing cross-chart filter: ${filterType}`);
    
    crossChartState.activeFilters.delete(filterType);
    
    // If no filters remain, deactivate cross-chart filtering
    if (crossChartState.activeFilters.size === 0) {
        crossChartState.isActive = false;
    }
    
    // Update the cross-chart indicator
    updateCrossChartIndicator();
    
    // Apply remaining filters to all charts
    updateAllChartsWithCrossFilters();
}

// Clear all cross-chart filters
function clearAllCrossChartFilters() {
    console.log('Clearing all cross-chart filters');
    
    crossChartState.activeFilters.clear();
    crossChartState.isActive = false;
    
    // Update the cross-chart indicator
    updateCrossChartIndicator();
    
    // Reset all charts to use only global filters
    updateAllChartsWithCrossFilters();
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
    
    console.log(`Cross-chart filtering: ${(getFilteredData() || globalData).length} -> ${data.length} records`);
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
            console.warn(`Unknown cross-chart filter type: ${filterType}`);
            return data;
    }
}

// Update all charts with cross-chart filtered data
function updateAllChartsWithCrossFilters() {
    const filteredData = getFullyFilteredData();
    
    console.log('Updating all charts with cross-chart filters:', {
        activeFilters: Array.from(crossChartState.activeFilters.keys()),
        recordCount: filteredData.length
    });
    
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

// Create visual indicator for active cross-chart filters
function createCrossChartIndicator() {
    // Remove existing indicator
    d3.select('#cross-chart-indicator').remove();
    
    // Create indicator container
    const indicator = d3.select('.unified-filters')
        .append('div')
        .attr('id', 'cross-chart-indicator')
        .style('margin-top', '10px')
        .style('padding', '8px 12px')
        .style('background', '#e3f2fd')
        .style('border', '1px solid #2196f3')
        .style('border-radius', '4px')
        .style('display', 'none')
        .style('font-size', '12px');
    
    // Add title
    indicator.append('div')
        .attr('class', 'indicator-title')
        .style('font-weight', 'bold')
        .style('margin-bottom', '5px')
        .style('color', '#1976d2')
        .text('Active Chart Interactions:');
    
    // Add filters container
    indicator.append('div')
        .attr('class', 'active-filters-container')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('gap', '8px')
        .style('align-items', 'center');
}

// Update the cross-chart indicator
function updateCrossChartIndicator() {
    const indicator = d3.select('#cross-chart-indicator');
    const filtersContainer = indicator.select('.active-filters-container');
    
    if (crossChartState.activeFilters.size === 0) {
        indicator.style('display', 'none');
        return;
    }
    
    indicator.style('display', 'block');
    
    // Clear existing filter tags
    filtersContainer.selectAll('.filter-tag').remove();
    
    // Add filter tags
    crossChartState.activeFilters.forEach((filterInfo, filterType) => {
        const tag = filtersContainer.append('div')
            .attr('class', 'filter-tag')
            .style('background', '#fff')
            .style('border', '1px solid #2196f3')
            .style('border-radius', '12px')
            .style('padding', '4px 8px')
            .style('font-size', '11px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px');
        
        // Add filter text
        tag.append('span')
            .style('color', '#1976d2')
            .text(`${formatFilterType(filterType)}: ${filterInfo.value}`);
        
        // Add remove button
        tag.append('button')
            .style('background', 'none')
            .style('border', 'none')
            .style('color', '#f44336')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('padding', '0')
            .style('margin', '0')
            .text('×')
            .on('click', function(event) {
                event.stopPropagation();
                removeCrossChartFilter(filterType);
            });
    });
    
    // Add clear all button
    if (crossChartState.activeFilters.size > 1) {
        const clearAllBtn = filtersContainer.append('button')
            .attr('class', 'clear-all-btn')
            .style('background', '#f44336')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('padding', '4px 8px')
            .style('font-size', '11px')
            .style('cursor', 'pointer')
            .text('Clear All')
            .on('click', clearAllCrossChartFilters);
    }
}

// Format filter type for display
function formatFilterType(filterType) {
    const typeMap = {
        'shippingMode': 'Shipping Mode',
        'orderCountry': 'Country',
        'orderState': 'State',
        'orderCity': 'City',
        'period': 'Time Period',
        'categoryName': 'Category',
        'departmentName': 'Department',
        'productName': 'Product'
    };
    
    return typeMap[filterType] || filterType;
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
