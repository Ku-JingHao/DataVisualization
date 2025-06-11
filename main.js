// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Supply Chain Dashboard Loading...');
    
    // Initialize dashboard components
    initializeNavigation();
    initializeKPICards();
    initializeCharts();
    initializeFilters();
    
    console.log('Dashboard initialized successfully');
});

// Initialize navigation functionality
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get section
            const section = this.getAttribute('data-section');
            
            // Update header title based on section
            const headerTitle = document.querySelector('.dashboard-header h2');
            if (section === 'sales') {
                headerTitle.textContent = 'Sales Analysis';
                // Here you would switch to sales charts
                console.log('Switching to Sales Analysis');
            } else if (section === 'logistics') {
                headerTitle.textContent = 'Logistics & Delivery Analysis';
                // Here you would switch to logistics charts
                console.log('Switching to Logistics & Delivery Analysis');
            }
        });
    });
}

// Initialize all chart components
async function initializeCharts() {
    // Initialize data loader first
    await initializeDataLoader();
    
    // Initialize each chart module
    if (typeof initDeliveryStatusChart !== 'undefined') {
        await initDeliveryStatusChart();
    }
    
    if (typeof initCountryRiskChart !== 'undefined') {
        initCountryRiskChart();
    }
    
    if (typeof initShippingScatterChart !== 'undefined') {
        initShippingScatterChart();
    }
    
    if (typeof initShippingModeChart !== 'undefined') {
        initShippingModeChart();
    }
    
    if (typeof initHeatmapChart !== 'undefined') {
        initHeatmapChart();
    }
}

// Initialize KPI Cards (placeholder)
function initializeKPICards() {
    console.log('KPI Cards initialized');
    // Add KPI cards logic here
}

// Initialize Filters (placeholder)
function initializeFilters() {
    console.log('Filters initialized');
    // Add filters logic here
}
