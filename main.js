// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Supply Chain Dashboard Loading...');
    
    // Initialize dashboard components
    initializeNavigation();
    initializeCharts();
    
    // Initialize filter manager after charts are loaded with a small delay 
    // to ensure data is fully processed
    setTimeout(() => {
        if (typeof initializeFilterManager === 'function') {
            initializeFilterManager();
        }
    }, 300);
    
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
            const headerTitle = document.querySelector('.header-left h2');
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
    try {
        // Initialize data loader first
        await initializeDataLoader();
        
        // Initialize KPI cards after data is loaded
        if (typeof initializeKPICards !== 'undefined') {
            initializeKPICards();
        }
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize each chart module
        if (typeof initDeliveryStatusChart !== 'undefined') {
            console.log('Initializing Delivery Status Chart...');
            await initDeliveryStatusChart();
        }
        
        if (typeof initCountryRiskChart !== 'undefined') {
            console.log('Initializing Country Risk Chart...');
            initCountryRiskChart();
        }
        
        if (typeof initShippingScatterChart !== 'undefined') {
            console.log('Initializing Shipping Scatter Chart...');
            initShippingScatterChart();
        }
        
        if (typeof initTreemapChart !== 'undefined') {
            console.log('Initializing Treemap Chart...');
            initTreemapChart();
        }
        
        // Initialize cross-chart interactions after all charts are loaded
        if (typeof initializeCrossChartInteractions !== 'undefined') {
            console.log('Initializing Cross-Chart Interactions...');
            initializeCrossChartInteractions();
        }
        
        console.log('All charts initialized successfully');
        
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Initialize Filters (placeholder)
function initializeFilters() {
    console.log('Filters initialized');
    // Add filters logic here if needed
}
