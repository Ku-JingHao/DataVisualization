document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeCharts();
});

function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.getAttribute('data-section');
            
            const headerTitle = document.querySelector('.header-left h2');
            if (section === 'sales') {
                headerTitle.textContent = 'Sales Analysis';
            } else if (section === 'logistics') {
                headerTitle.textContent = 'Logistics & Delivery Analysis';
            }
        });
    });
}

async function initializeCharts() {
    try {
        await initializeDataLoader();
        
        if (typeof initializeFilterManager === 'function') {
            initializeFilterManager();
        }
        
        if (typeof initializeKPICards !== 'undefined') {
            initializeKPICards();
        }
        
        if (typeof initDeliveryStatusChart !== 'undefined') {
            await initDeliveryStatusChart();
        }
        
        if (typeof initCountryRiskChart !== 'undefined') {
            initCountryRiskChart();
        }
        
        if (typeof initShippingScatterChart !== 'undefined') {
            initShippingScatterChart();
        }
        
        if (typeof initTreemapChart !== 'undefined') {
            initTreemapChart();
        }
        
        if (typeof initializeCrossChartInteractions !== 'undefined') {
            initializeCrossChartInteractions();
        }
        
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}