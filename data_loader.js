// Data loading and processing utilities
let globalData = null;

// Load and parse the CSV data
async function loadData() {
    try {
        const data = await d3.csv('cleaned_dataset_complete_orders_country_region.csv');
        
        // Process and clean the data
        globalData = data.map(d => ({
            // Order information
            orderId: d['Order Id'],
            orderDate: new Date(d['order date (DateOrders)']),
            shippingDate: new Date(d['shipping date (DateOrders)']),
            
            // Delivery information
            deliveryStatus: d['Delivery Status'],
            lateDeliveryRisk: +d['Late_delivery_risk'],
            daysForShipping: +d['Days for shipping (real)'],
            daysScheduled: +d['Days for shipment (scheduled)'],
            
            // Order details
            orderQuantity: +d['Order Item Quantity'],
            orderTotal: +d['Order Item Total'],
            sales: +d['Sales'],
            
            // Location information
            market: d['Market'],
            orderCountry: d['Order Country'],
            orderState: d['Order State'],
            orderCity: d['Order City'],
            customerCountry: d['Customer Country'],
            orderRegion: d['Order Region'],
            
            // Product information
            departmentName: d['Department Name'] || 'Unknown Department',
            categoryName: d['Category Name'] || 'Unknown Category',
            productName: d['Product Name'] || 'Unknown Product',
            shippingMode: d['Shipping Mode'],
            
            // Customer information
            customerSegment: d['Customer Segment']
        }));
        
        console.log('Data loaded successfully:', globalData.length, 'records');
        console.log('Sample data:', globalData[0]); 
        
        if (typeof extractUniqueFilterValues === 'function') {
            extractUniqueFilterValues();
        }
        
        return globalData;
        
    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

function processDeliveryStatusData(data) {
    // Group data by month and delivery status
    const monthlyData = d3.rollup(data, 
        v => d3.sum(v, d => d.orderQuantity), // Sum order quantities
        d => d3.timeFormat("%Y-%m")(d.orderDate), // Group by year-month
        d => d.deliveryStatus // Group by delivery status
    );
    
    // Convert to array format for chart
    const processedData = [];
    const months = Array.from(monthlyData.keys()).sort();
    
    months.forEach(month => {
        const monthData = monthlyData.get(month);
        const monthEntry = {
            month: month,
            onTimeShipping: monthData.get('Shipping on time') || 0,
            lateDelivery: monthData.get('Late delivery') || 0,
            advanceShipping: monthData.get('Advance shipping') || 0,
            shippingOnTime: monthData.get('Shipping on time') || 0
        };
        
        // Calculate late delivery risk for this month
        const monthOrders = data.filter(d => d3.timeFormat("%Y-%m")(d.orderDate) === month);
        const riskSum = d3.sum(monthOrders, d => d.lateDeliveryRisk * d.orderQuantity);
        const totalQuantity = d3.sum(monthOrders, d => d.orderQuantity);
        monthEntry.lateDeliveryRisk = totalQuantity > 0 ? riskSum / totalQuantity : 0;
        
        processedData.push(monthEntry);
    });
    
    return processedData;
}

// Initialize data loading
function initializeDataLoader() {
    return loadData();
}