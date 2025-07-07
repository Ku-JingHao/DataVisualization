function initializeKPICards() {
    if (globalData && globalData.length > 0) {
        updateKPICards(globalData);
    }
}

// Update KPI cards with calculated metrics
function updateKPICards(data) {
    // Get unique orders only
    const uniqueOrders = new Set(data.map(d => d.orderId));
    const totalOrders = uniqueOrders.size;
    
    const orderLevelData = Array.from(d3.group(data, d => d.orderId), ([orderId, orderItems]) => {
        const firstItem = orderItems[0];
        return {
            orderId: orderId,
            lateDeliveryRisk: firstItem.lateDeliveryRisk,
            daysForShipping: firstItem.daysForShipping
        };
    });
    
    const onTimeOrders = orderLevelData.filter(order => order.lateDeliveryRisk === 0).length;
    const lateRiskOrders = orderLevelData.filter(order => order.lateDeliveryRisk === 1).length;

    const onTimeRate = ((onTimeOrders / totalOrders) * 100).toFixed(1);
    const lateRiskRate = ((lateRiskOrders / totalOrders) * 100).toFixed(1);

    const validDeliveryOrders = orderLevelData.filter(order => order.daysForShipping > 0);
    const avgDeliveryDays = d3.mean(validDeliveryOrders, order => order.daysForShipping).toFixed(1);
    
    const totalOrdersFormatted = totalOrders.toLocaleString();
    
    updateKPICard('On-Time Delivery Rate', `${onTimeRate}%`);
    updateKPICard('Late Delivery Risk Rate', `${lateRiskRate}%`);
    updateKPICard('Average Delivery Days', `${avgDeliveryDays} days`);
    updateKPICard('Total Orders', totalOrdersFormatted);
    
    console.log('KPI Cards updated (FIXED - using unique orders):', {
        uniqueOrders: totalOrders,
        onTimeOrders: onTimeOrders,
        lateRiskOrders: lateRiskOrders,
        onTimeRate: `${onTimeRate}%`,
        lateRiskRate: `${lateRiskRate}%`,
        avgDays: `${avgDeliveryDays} days`,
        totalOrdersFormatted: totalOrdersFormatted,
        verification: `${onTimeRate}% + ${lateRiskRate}% = ${(parseFloat(onTimeRate) + parseFloat(lateRiskRate)).toFixed(1)}%`
    });
}

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

function updateKPICardsWithFilters(filteredData) {
    if (!filteredData || filteredData.length === 0) {
        console.warn('No filtered data provided for KPI cards, using global data');
        filteredData = globalData;
    }
    
    if (filteredData && filteredData.length > 0) {
        updateKPICards(filteredData);
    } else {
        updateKPICard('On-Time Delivery Rate', '0%');
        updateKPICard('Late Delivery Risk Rate', '0%');
        updateKPICard('Average Delivery Days', '0 days');
        updateKPICard('Total Orders', '0');
    }
}
