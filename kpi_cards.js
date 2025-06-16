// KPI Cards functionality

// Initialize and update KPI cards with calculated values
function initializeKPICards() {
    if (globalData && globalData.length > 0) {
        updateKPICards(globalData);
    }
}

// Update KPI cards with calculated metrics
function updateKPICards(data) {
    const totalOrders = data.length;
    
    // Calculate using Late_delivery_risk field (0 = on time, 1 = late risk)
    const onTimeOrders = data.filter(d => d.lateDeliveryRisk === 0).length;
    const lateRiskOrders = data.filter(d => d.lateDeliveryRisk === 1).length;
    
    // Calculate percentages
    const onTimeRate = ((onTimeOrders / totalOrders) * 100).toFixed(1);
    const lateRiskRate = ((lateRiskOrders / totalOrders) * 100).toFixed(1);
    
    // Calculate Average Delivery Days
    const validDeliveryDays = data.filter(d => d.daysForShipping > 0);
    const avgDeliveryDays = d3.mean(validDeliveryDays, d => d.daysForShipping).toFixed(1);
    
    // Total Orders
    const totalOrdersFormatted = totalOrders.toLocaleString();
    
    // Update KPI card values
    updateKPICard('On-Time Delivery Rate', `${onTimeRate}%`);
    updateKPICard('Late Delivery Risk Rate', `${lateRiskRate}%`);
    updateKPICard('Average Delivery Days', `${avgDeliveryDays} days`);
    updateKPICard('Total Orders', totalOrdersFormatted);
    
    console.log('KPI Cards updated:', {
        onTimeOrders: onTimeOrders,
        lateRiskOrders: lateRiskOrders,
        totalOrders: totalOrders,
        onTimeRate: `${onTimeRate}%`,
        lateRiskRate: `${lateRiskRate}%`,
        avgDays: `${avgDeliveryDays} days`,
        totalOrders: totalOrdersFormatted,
        verification: `${onTimeRate}% + ${lateRiskRate}% = ${(parseFloat(onTimeRate) + parseFloat(lateRiskRate)).toFixed(1)}%`
    });
}

// Helper function to update individual KPI card
function updateKPICard(label, value) {
    const kpiCards = document.querySelectorAll('.kpi-card');
    
    kpiCards.forEach(card => {
        const labelElement = card.querySelector('.kpi-label');
        const valueElement = card.querySelector('.kpi-value');
        
        if (labelElement && labelElement.textContent === label) {
            valueElement.textContent = value;
        }
    });
}

// Function to update KPI cards based on filtered data
// Modify updateKPICardsWithFilters to better handle filtered data
function updateKPICardsWithFilters(filteredData) {
    if (!filteredData || filteredData.length === 0) {
        console.warn('No filtered data provided for KPI cards, using global data');
        filteredData = globalData;
    }
    
    if (filteredData && filteredData.length > 0) {
        updateKPICards(filteredData);
    } else {
        // Show zero values or dash when no data is available
        updateKPICard('On-Time Delivery Rate', '0%');
        updateKPICard('Late Delivery Risk Rate', '0%');
        updateKPICard('Average Delivery Days', '0 days');
        updateKPICard('Total Orders', '0');
    }
}
