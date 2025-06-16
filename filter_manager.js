// Filter Manager for unified dashboard filters
let activeFilters = {
    customerCountry: 'all',
    geographicLevel: 'market',
    geographicValue: 'all',
    customerSegment: 'all',
    timeType: 'all',
    timeValue: 'all'
};

// Store unique values for geographic filters
let uniqueMarkets = [];
let uniqueRegions = [];
let uniqueCountries = [];
let uniqueCustomerCountries = [];
let uniqueCustomerSegments = [];

// Store unique values for time filters
let uniqueYears = [];
let monthYearCombinations = [];

// Initialize filter functionality
function initializeFilterManager() {
    console.log('Initializing Filter Manager...');
    
    // Extract unique values from data
    extractUniqueFilterValues();
    
    // Populate customer country options
    populateCustomerCountryOptions();
    
    // Populate customer segment options
    populateCustomerSegmentOptions();
    
    // Get filter elements
    const customerCountrySelect = document.getElementById('customer-country-select');
    const geographicLevelSelect = document.getElementById('geographic-level-select');
    const geographicValueSelect = document.getElementById('geographic-value-select');
    const customerSegmentSelect = document.getElementById('customer-segment-select');
    const timeTypeSelect = document.getElementById('time-type-select');
    const timeValueSelect = document.getElementById('time-value-select');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    
    // Set up event listeners
    if (customerCountrySelect) {
        customerCountrySelect.addEventListener('change', function() {
            activeFilters.customerCountry = this.value;
            console.log('Customer Country filter changed to:', this.value);
            applyFilters();
        });
    }
    
    if (geographicLevelSelect) {
        geographicLevelSelect.addEventListener('change', function() {
            activeFilters.geographicLevel = this.value;
            console.log('Geographic Level filter changed to:', this.value);
            updateGeographicValueOptions();
            applyFilters();
        });
    }
    
    if (geographicValueSelect) {
        geographicValueSelect.addEventListener('change', function() {
            activeFilters.geographicValue = this.value;
            console.log('Geographic Value filter changed to:', this.value);
            applyFilters();
        });
    }
    
    if (customerSegmentSelect) {
        customerSegmentSelect.addEventListener('change', function() {
            activeFilters.customerSegment = this.value;
            console.log('Customer Segment filter changed to:', this.value);
            applyFilters();
        });
    }
    
    if (timeTypeSelect) {
        timeTypeSelect.addEventListener('change', function() {
            activeFilters.timeType = this.value;
            console.log('Time Type filter changed to:', this.value);
            updateTimeValueOptions();
            applyFilters();
        });
    }
    
    if (timeValueSelect) {
        timeValueSelect.addEventListener('change', function() {
            activeFilters.timeValue = this.value;
            console.log('Time Value filter changed to:', this.value);
            applyFilters();
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Initialize the geographic value options
    updateGeographicValueOptions();
    
    // Initialize the time value options
    updateTimeValueOptions();
    
    console.log('Filter Manager initialized');
}

// Extract unique values for filters from data
function extractUniqueFilterValues() {
    if (!globalData || globalData.length === 0) {
        console.warn('No global data available for extracting filter values');
        return;
    }
    
    console.log('Extracting unique filter values from', globalData.length, 'records');
    
    // Get unique markets (filter out null/undefined values)
    uniqueMarkets = [...new Set(globalData.map(d => d.market).filter(v => v && v.trim()))].sort();
    
    // Get unique regions (filter out null/undefined values)
    uniqueRegions = [...new Set(globalData.map(d => d.orderRegion).filter(v => v && v.trim()))].sort();
    
    // Get unique countries (filter out null/undefined values)
    uniqueCountries = [...new Set(globalData.map(d => d.orderCountry).filter(v => v && v.trim()))].sort();
    
    // Get unique customer countries (filter out null/undefined values)
    uniqueCustomerCountries = [...new Set(globalData.map(d => d.customerCountry).filter(v => v && v.trim()))].sort();
    
    // Get unique customer segments (filter out null/undefined values)
    uniqueCustomerSegments = [...new Set(globalData.map(d => d.customerSegment).filter(v => v && v.trim()))].sort();
    
    // Get unique years
    uniqueYears = [...new Set(globalData.map(d => d.orderDate.getFullYear()).filter(v => v && !isNaN(v)))].sort();
    
    // Get unique month-year combinations
    const formatMonthYear = d => {
        try {
            const year = d.getFullYear();
            const month = d.toLocaleString('default', { month: 'long' });
            return `${year} ${month}`;
        } catch (e) {
            return null;
        }
    };
    
    monthYearCombinations = [...new Set(globalData.map(d => formatMonthYear(d.orderDate)).filter(v => v))]
        .sort((a, b) => {
            const [yearA, monthA] = a.split(' ');
            const [yearB, monthB] = b.split(' ');
            
            if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
            
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 
                            'August', 'September', 'October', 'November', 'December'];
            return months.indexOf(monthA) - months.indexOf(monthB);
        });
    
    console.log('Extracted filter values:', {
        markets: uniqueMarkets.length,
        regions: uniqueRegions.length,
        countries: uniqueCountries.length,
        customerCountries: uniqueCustomerCountries.length,
        customerSegments: uniqueCustomerSegments.length,
        years: uniqueYears.length,
        monthYears: monthYearCombinations.length
    });
}

// FIXED: Add function to populate customer country options
function populateCustomerCountryOptions() {
    const customerCountrySelect = document.getElementById('customer-country-select');
    if (!customerCountrySelect) return;
    
    // Clear existing options (except "All Countries")
    while (customerCountrySelect.options.length > 1) {
        customerCountrySelect.remove(1);
    }
    
    // Add customer country options
    uniqueCustomerCountries.forEach(country => {
        if (!country) return;
        
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        customerCountrySelect.appendChild(option);
    });
}

// FIXED: Add function to populate customer segment options
function populateCustomerSegmentOptions() {
    const customerSegmentSelect = document.getElementById('customer-segment-select');
    if (!customerSegmentSelect) return;
    
    // Clear existing options (except "All Segments")
    while (customerSegmentSelect.options.length > 1) {
        customerSegmentSelect.remove(1);
    }
    
    // Add customer segment options
    uniqueCustomerSegments.forEach(segment => {
        if (!segment) return;
        
        const option = document.createElement('option');
        option.value = segment;
        option.textContent = segment;
        customerSegmentSelect.appendChild(option);
    });
}

// Update geographic value options based on selected geographic level
function updateGeographicValueOptions() {
    const geographicLevelSelect = document.getElementById('geographic-level-select');
    const geographicValueSelect = document.getElementById('geographic-value-select');
    
    if (!geographicLevelSelect || !geographicValueSelect) return;
    
    // Clear existing options
    while (geographicValueSelect.options.length > 1) {
        geographicValueSelect.remove(1);
    }
    
    // Get values based on selected level
    let values = [];
    if (geographicLevelSelect.value === 'market') {
        values = uniqueMarkets;
    } else if (geographicLevelSelect.value === 'orderRegion') {
        values = uniqueRegions;
    } else if (geographicLevelSelect.value === 'orderCountry') {
        values = uniqueCountries;
    }
    
    // Add options
    values.forEach(value => {
        if (!value) return; // Skip empty values
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        geographicValueSelect.appendChild(option);
    });
    
    // Reset to "All" when changing level
    geographicValueSelect.value = 'all';
    activeFilters.geographicValue = 'all';
}

// Update time value options based on selected time type
function updateTimeValueOptions() {
    const timeTypeSelect = document.getElementById('time-type-select');
    const timeValueSelect = document.getElementById('time-value-select');
    
    if (!timeTypeSelect || !timeValueSelect) return;
    
    // Clear existing options
    while (timeValueSelect.options.length > 1) {
        timeValueSelect.remove(1);
    }
    
    // Show/hide time value select based on selection
    if (timeTypeSelect.value === 'all') {
        timeValueSelect.style.display = 'none';
        return;
    } else {
        timeValueSelect.style.display = 'block';
    }
    
    // Get values based on selected type
    let values = [];
    if (timeTypeSelect.value === 'year') {
        values = uniqueYears.map(String);
    } else if (timeTypeSelect.value === 'month') {
        values = monthYearCombinations;
    }
    
    // Add options
    values.forEach(value => {
        if (!value) return; // Skip empty values
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        timeValueSelect.appendChild(option);
    });
    
    // Reset to "All" when changing type
    timeValueSelect.value = 'all';
    activeFilters.timeValue = 'all';
}

// Apply selected filters to all charts
function applyFilters() {
    console.log('Applying filters...', activeFilters);
    
    // Filter the global data
    const filteredData = filterGlobalData();
    
    console.log('Filtered data result:', {
        original: globalData ? globalData.length : 0,
        filtered: filteredData.length,
        filters: activeFilters
    });
    
    // Update all charts with filtered data
    updateAllCharts(filteredData);
}

// Reset all filters to default values
function resetFilters() {
    console.log('Resetting filters...');
    
    // Reset filter UI elements
    const customerCountrySelect = document.getElementById('customer-country-select');
    const geographicLevelSelect = document.getElementById('geographic-level-select');
    const geographicValueSelect = document.getElementById('geographic-value-select');
    const customerSegmentSelect = document.getElementById('customer-segment-select');
    const timeTypeSelect = document.getElementById('time-type-select');
    const timeValueSelect = document.getElementById('time-value-select');
    
    if (customerCountrySelect) customerCountrySelect.value = 'all';
    if (geographicLevelSelect) geographicLevelSelect.value = 'market';
    if (geographicValueSelect) geographicValueSelect.value = 'all';
    if (customerSegmentSelect) customerSegmentSelect.value = 'all';
    if (timeTypeSelect) timeTypeSelect.value = 'all';
    
    // Hide time value select when resetting to "All Time"
    if (timeValueSelect) {
        timeValueSelect.style.display = 'none';
        timeValueSelect.value = 'all';
    }
    
    // Reset active filters
    activeFilters = {
        customerCountry: 'all',
        geographicLevel: 'market',
        geographicValue: 'all',
        customerSegment: 'all',
        timeType: 'all',
        timeValue: 'all'
    };
    
    // Update geographic value options after resetting geographic level
    updateGeographicValueOptions();
    
    // Update all charts with original data
    updateAllCharts(globalData);
}

// Filter global data based on active filters
function filterGlobalData() {
    if (!globalData || globalData.length === 0) {
        console.warn('No global data available to filter');
        return [];
    }
    
    let filteredData = [...globalData];
    console.log('Starting filter process with', filteredData.length, 'records');
    
    // Apply customer country filter
    if (activeFilters.customerCountry !== 'all') {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(d => d.customerCountry === activeFilters.customerCountry);
        console.log(`Customer country filter (${activeFilters.customerCountry}): ${beforeCount} -> ${filteredData.length}`);
    }
    
    // Apply geographic value filter if a specific value is selected
    if (activeFilters.geographicValue !== 'all') {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(d => d[activeFilters.geographicLevel] === activeFilters.geographicValue);
        console.log(`Geographic filter (${activeFilters.geographicLevel}=${activeFilters.geographicValue}): ${beforeCount} -> ${filteredData.length}`);
    }
    
    // Apply customer segment filter
    if (activeFilters.customerSegment !== 'all') {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(d => d.customerSegment === activeFilters.customerSegment);
        console.log(`Customer segment filter (${activeFilters.customerSegment}): ${beforeCount} -> ${filteredData.length}`);
    }
    
    // Apply time filters
    if (activeFilters.timeType !== 'all') {
        if (activeFilters.timeType === 'year' && activeFilters.timeValue !== 'all') {
            const beforeCount = filteredData.length;
            const year = parseInt(activeFilters.timeValue);
            filteredData = filteredData.filter(d => d.orderDate.getFullYear() === year);
            console.log(`Year filter (${year}): ${beforeCount} -> ${filteredData.length}`);
        } else if (activeFilters.timeType === 'month' && activeFilters.timeValue !== 'all') {
            const beforeCount = filteredData.length;
            const [year, month] = activeFilters.timeValue.split(' ');
            filteredData = filteredData.filter(d => {
                return d.orderDate.getFullYear() === parseInt(year) && 
                       d.orderDate.toLocaleString('default', { month: 'long' }) === month;
            });
            console.log(`Month filter (${activeFilters.timeValue}): ${beforeCount} -> ${filteredData.length}`);
        }
    }
    
    console.log('Final filtered data count:', filteredData.length);
    return filteredData;
}

// Update all charts with filtered data
function updateAllCharts(filteredData) {
    console.log('Updating all charts with filtered data:', filteredData.length, 'records');
    
    // Update KPI Cards
    if (typeof updateKPICardsWithFilters === 'function') {
        updateKPICardsWithFilters(filteredData);
    }
    
    // Store filtered data for reference by other charts
    window.filteredGlobalData = filteredData;
    
    // Update Delivery Status Chart
    if (typeof initDeliveryStatusChart === 'function') {
        try {
            // FIXED: Pass filtered data to delivery chart
            const processedData = processDeliveryStatusDataNew(filteredData);
            createDeliveryStatusChart(processedData, 'month');
        } catch (error) {
            console.error('Error updating delivery status chart:', error);
        }
    }
    
    // Update Country Risk Chart
    if (typeof initCountryRiskChart === 'function') {
        try {
            initCountryRiskChart(filteredData);
        } catch (error) {
            console.error('Error updating country risk chart:', error);
        }
    }
    
    // Update Shipping Scatter Chart
    if (typeof initShippingScatterChart === 'function') {
        try {
            initShippingScatterChart(filteredData);
        } catch (error) {
            console.error('Error updating shipping scatter chart:', error);
        }
    }
    
    // Update Treemap Chart
    if (typeof initTreemapChart === 'function') {
        try {
            initTreemapChart(filteredData);
        } catch (error) {
            console.error('Error updating treemap chart:', error);
        }
    }
}

// Get currently filtered data
function getFilteredData() {
    return window.filteredGlobalData || globalData;
}
