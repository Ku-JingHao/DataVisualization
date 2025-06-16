let shippingScatterData = null;
let shippingScatterSvg = null;
let shippingScatterTooltip = null;
let riskMetrics = null;
let currentStatusFilter = 'All'; // Track current status filter
let baseFilteredData = null; // Store the base filtered data from global filters
let shippingModeClickHandlers = new Map();

// Initialize the shipping scatter plot chart
async function initShippingScatterChart(filteredData) {
    try {
        console.log('Initializing Enhanced Shipping Scatter Chart...');
        
        // Use provided filtered data or global data
        const dataToUse = filteredData || globalData;
        
        // Check if we have data to process
        if (!dataToUse || dataToUse.length === 0) {
            console.warn('No data available for shipping scatter chart');
            showNoDataMessage();
            return;
        }
        
        // Store the base filtered data for use with status filters
        baseFilteredData = dataToUse;
        
        // Process data for scatter plot
        shippingScatterData = processShippingScatterData(dataToUse);
        
        // Check if we have points to display after processing
        if (shippingScatterData.length === 0) {
            console.warn('No valid shipping data points after processing');
            showNoDataMessage();
            return;
        }
        
        // FIXED: Always calculate risk metrics using the full base data
        riskMetrics = calculateRiskMetrics(dataToUse);
        
        // Reset status filter to 'All' when chart is reinitialized
        currentStatusFilter = 'All';
        
        // Create the chart
        createEnhancedShippingScatterChart();
        
        console.log('Enhanced Shipping Scatter Chart initialized successfully');
    } catch (error) {
        console.error('Error initializing shipping scatter chart:', error);
        showNoDataMessage();
    }
}

// Show no data message in the shipping scatter chart
function showNoDataMessage() {
    const container = d3.select('#shipping-scatter-chart');
    container.selectAll('*').remove();
    
    container.append("div")
        .attr("class", "no-data-message")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("align-items", "center")
        .style("height", "100%")
        .style("color", "#666")
        .style("font-size", "14px")
        .style("text-align", "center")
        .html("No shipping data matches the selected filters.");
}

// FIXED: Calculate risk metrics for each shipping mode using base data
function calculateRiskMetrics(baseData) {
    const validData = baseData.filter(d => 
        d.daysScheduled >= 0 && 
        d.daysForShipping >= 0 && 
        d.shippingMode && 
        d.orderId
    );
    
    const riskByMode = d3.rollup(validData,
        v => {
            const totalOrders = v.length;
            const lateOrders = v.filter(d => d.daysForShipping > d.daysScheduled).length;
            const onTimeOrders = v.filter(d => d.daysForShipping === d.daysScheduled).length;
            const earlyOrders = v.filter(d => d.daysForShipping < d.daysScheduled).length;
            const avgScheduled = d3.mean(v, d => d.daysScheduled);
            const avgActual = d3.mean(v, d => d.daysForShipping);
            const avgDifference = d3.mean(v, d => d.daysForShipping - d.daysScheduled);
            const totalValue = d3.sum(v, d => d.orderTotal);
            const avgEfficiency = d3.mean(v, d => d.daysScheduled > 0 ? (d.daysScheduled / d.daysForShipping) * 100 : 0);
            
            return {
                totalOrders,
                lateOrders,
                onTimeOrders,
                earlyOrders,
                riskPercentage: (lateOrders / totalOrders) * 100,
                onTimePercentage: (onTimeOrders / totalOrders) * 100,
                earlyPercentage: (earlyOrders / totalOrders) * 100,
                avgScheduled: avgScheduled ? avgScheduled.toFixed(1) : "0.0",
                avgActual: avgActual ? avgActual.toFixed(1) : "0.0",
                avgDifference: avgDifference ? avgDifference.toFixed(1) : "0.0",
                totalValue,
                avgEfficiency: avgEfficiency ? avgEfficiency.toFixed(1) : "0.0",
                onTimeRate: ((totalOrders - lateOrders) / totalOrders) * 100
            };
        },
        d => d.shippingMode
    );
    
    // Convert to array and sort by risk percentage
    const riskArray = Array.from(riskByMode.entries()).map(([mode, metrics]) => ({
        shippingMode: mode,
        ...metrics
    })).sort((a, b) => b.riskPercentage - a.riskPercentage);
    
    console.log('Risk metrics calculated:', riskArray);
    return riskArray;
}

// Process data for shipping scatter plot
function processShippingScatterData(data) {
    // Filter valid data
    const validData = data.filter(d => 
        d.daysScheduled >= 0 && 
        d.daysForShipping >= 0 && 
        d.shippingMode && 
        d.orderId
    );
    
    // Group overlapping points by (scheduled, actual, shippingMode) coordinates
    const grouped = d3.rollup(validData,
        v => {
            // Calculate metrics for this group
            const orders = v.map(d => d.orderId);
            const totalValue = d3.sum(v, d => d.orderTotal);
            const avgValue = totalValue / v.length;
            const efficiency = v[0].daysScheduled > 0 ? (v[0].daysScheduled / v[0].daysForShipping) * 100 : 0;
            const riskScore = v.filter(d => d.daysForShipping > d.daysScheduled).length / v.length;
            
            return {
                count: v.length,
                orders: orders,
                scheduled: v[0].daysScheduled,
                actual: v[0].daysForShipping,
                shippingMode: v[0].shippingMode,
                deliveryStatus: v[0].deliveryStatus,
                absoluteDifference: v[0].daysForShipping - v[0].daysScheduled,
                efficiency: efficiency,
                riskScore: riskScore,
                totalValue: totalValue,
                avgValue: avgValue,
                market: v[0].market,
                orderDates: v.map(d => d.orderDate),
                sampleOrderId: orders[0]
            };
        },
        d => `${d.daysScheduled}-${d.daysForShipping}-${d.shippingMode}`
    );
    
    // Convert grouped data back to array
    const processedData = Array.from(grouped.values());
    
    console.log('Processed shipping scatter data:', processedData.length, 'unique points, representing', validData.length, 'total orders');
    return processedData;
}

// Create the enhanced shipping scatter plot chart
function createEnhancedShippingScatterChart() {
    const container = d3.select('#shipping-scatter-chart');
    container.selectAll('*').remove();
    
    // Add interactive controls at the top - SIMPLIFIED
    const controlsContainer = container.append('div')
        .attr('class', 'scatter-controls')
        .style('display', 'flex')
        .style('justify-content', 'flex-start')
        .style('margin-bottom', '10px')
        .style('padding', '0 5px');
    
    // Filter buttons container - ONLY STATUS FILTER
    const filterContainer = controlsContainer.append('div')
        .style('display', 'flex')
        .style('gap', '10px')
        .style('align-items', 'center');
    
    // Add delivery status filter
    filterContainer.append('span')
        .text('Status:')
        .style('font-size', '12px');
    
    const statusOptions = ['All', 'On-Time', 'Early', 'Late'];
    
    statusOptions.forEach(status => {
        filterContainer.append('button')
            .attr('class', 'status-filter-btn')
            .attr('data-status', status)
            .text(status)
            .style('padding', '5px 8px')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('background', status === currentStatusFilter ? '#e3f2fd' : 'white')
            .style('font-size', '11px')
            .style('cursor', 'pointer')
            .on('click', function() {
                d3.selectAll('.status-filter-btn').style('background', 'white');
                d3.select(this).style('background', '#e3f2fd');
                currentStatusFilter = status;
                filterByDeliveryStatus(status);
            });
    });
    
    // Chart dimensions - increased right margin for enhanced legend
    const margin = { top: 25, right: 320, bottom: 50, left: 70 };
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom - 40; // Adjust for controls
    
    // Create SVG
    shippingScatterSvg = container
        .append('svg')
        .attr('width', containerRect.width)
        .attr('height', containerRect.height - 40); // Adjust for controls
    
    const chartGroup = shippingScatterSvg
        .append('g')
        .attr('class', 'chart-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create tooltip
    if (shippingScatterTooltip) {
        shippingScatterTooltip.remove();
    }
    
    shippingScatterTooltip = d3.select('body')
        .append('div')
        .attr('class', 'enhanced-tooltip')
        .style('opacity', 0);
    
    // Define scales
    const maxValue = d3.max(shippingScatterData, d => Math.max(d.scheduled, d.actual));
    const xScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height, 0]);
    
    // Define color scale for shipping modes
    const shippingModes = [...new Set(shippingScatterData.map(d => d.shippingMode))];
    const colorScale = d3.scaleOrdinal()
        .domain(shippingModes)
        .range(['#2196F3', '#FF9800', '#4CAF50', '#E91E63', '#9C27B0']);
    
    // Define size scale based on count of orders
    const maxCount = d3.max(shippingScatterData, d => d.count);
    const sizeScale = d3.scaleSqrt()
        .domain([1, maxCount])
        .range([3, 12]);
    
    // Create axes (without tick marks)
    const xAxis = d3.axisBottom(xScale)
        .ticks(8)
        .tickSize(0)
        .tickFormat(d => `${d} days`);
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(8)
        .tickSize(0)
        .tickFormat(d => `${d} days`);
    
    // Add X axis
    const xAxisGroup = chartGroup.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);
    
    // Add Y axis
    const yAxisGroup = chartGroup.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
    
    // Add axis labels
    chartGroup.append('text')
        .attr('class', 'x-label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('Scheduled Shipping Days');
    
    chartGroup.append('text')
        .attr('class', 'y-label')
        .attr('text-anchor', 'middle')
        .attr('x', -height / 2)
        .attr('y', -50)
        .attr('transform', 'rotate(-90)')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('Actual Shipping Days');
    
    // Add diagonal reference line (y = x) for on-time performance
    const diagonalLine = d3.line()
        .x(d => xScale(d))
        .y(d => yScale(d));
    
    chartGroup.append('path')
        .attr('class', 'diagonal-line')
        .datum([0, maxValue])
        .attr('d', diagonalLine)
        .style('stroke', '#999')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '5,5')
        .style('opacity', 0.7);
    
    // Add diagonal line label
    chartGroup.append('text')
        .attr('x', xScale(maxValue * 0.8))
        .attr('y', yScale(maxValue * 0.8) - 10)
        .style('font-size', '11px')
        .style('fill', '#999')
        .style('font-style', 'italic')
        .text('On-Time');
    
    // Create legend state management
    let selectedMode = null;
    
    // Add scatter points with size based on count
    const dots = chartGroup.selectAll('.dot')
        .data(shippingScatterData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.scheduled))
        .attr('cy', d => yScale(d.actual))
        .attr('r', d => sizeScale(d.count))
        .attr('fill', d => colorScale(d.shippingMode))
        .attr('opacity', 0.7)
        .style('cursor', 'pointer');
    
    // Add interactive tooltips
    dots.on('mouseover', function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
        
        // Determine performance status
        let performanceStatus = '';
        if (d.actual < d.scheduled) {
            performanceStatus = 'Early Delivery';
        } else if (d.actual === d.scheduled) {
            performanceStatus = 'On-Time Delivery';
        } else {
            performanceStatus = 'Late Delivery';
        }
        
        shippingScatterTooltip
            .style('opacity', 1)
            .html(`
                <div style="font-weight: bold; margin-bottom: 8px; color: #fff;">
                    ${d.count === 1 ? '1 Order' : `${d.count} Orders`}
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>Shipping Mode:</strong> ${d.shippingMode}
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>Scheduled:</strong> ${d.scheduled} days
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>Actual:</strong> ${d.actual} days
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>Difference:</strong> ${d.absoluteDifference > 0 ? '+' : ''}${d.absoluteDifference} days
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>Efficiency:</strong> ${d.efficiency.toFixed(1)}%
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>Risk Score:</strong> ${(d.riskScore * 100).toFixed(1)}%
                </div>
                <div style="margin-bottom: 4px; color: ${d.actual <= d.scheduled ? '#4CAF50' : '#F44336'};">
                    <strong>Performance:</strong> ${performanceStatus}
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>Market:</strong> ${d.market}
                </div>
                <div>
                    <strong>Total Value:</strong> $${d.totalValue.toFixed(2)}
                </div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke', 'none');
        
        shippingScatterTooltip
            .style('opacity', 0);
    });
    
    // Store scales for filtering
    shippingScatterSvg.xScale = xScale;
    shippingScatterSvg.yScale = yScale;
    shippingScatterSvg.sizeScale = sizeScale;
    shippingScatterSvg.colorScale = colorScale;
    
    // Create simplified legend-bar hybrid
    createSimplifiedLegend(chartGroup, width, height, colorScale, dots);
}

// FIXED: Filter by delivery status - only filter scatter points, not risk metrics
function filterByDeliveryStatus(status) {
    console.log('Filtering by delivery status:', status);
    
    // Apply status filter to the base filtered data for scatter plot visualization
    let statusFilteredData;
    
    if (status === 'All') {
        statusFilteredData = baseFilteredData;
    } else {
        statusFilteredData = baseFilteredData.filter(d => {
            if (status === 'On-Time') {
                return d.daysForShipping === d.daysScheduled;
            } else if (status === 'Early') {
                return d.daysForShipping < d.daysScheduled;
            } else if (status === 'Late') {
                return d.daysForShipping > d.daysScheduled;
            }
            return true;
        });
    }
    
    console.log(`Status filter result: ${baseFilteredData.length} -> ${statusFilteredData.length} records`);
    
    // CRITICAL FIX: Keep risk metrics based on ALL base data, don't recalculate
    // The risk metrics should always show percentages based on the full dataset
    // Only reprocess scatter data for visualization
    shippingScatterData = processShippingScatterData(statusFilteredData);
    
    // Completely redraw the chart with the updated scatter data but original risk metrics
    createEnhancedShippingScatterChart();
}

// Update scatter plot with filtered data
function updateScatterPlot() {
    // Instead of partially updating, just redraw the entire chart
    // This ensures all components (legend, dots, etc.) are in sync
    createEnhancedShippingScatterChart();
}

// FIXED: Create simplified legend with proper status filtering support
// FIXED: Create simplified legend with proper status filtering support
function createSimplifiedLegend(chartGroup, width, height, colorScale, dots) {
    // Make sure we have valid risk metrics
    if (!riskMetrics || riskMetrics.length === 0) {
        console.warn('No risk metrics available for legend');
        
        // Create empty legend with message
        const legend = chartGroup.append('g')
            .attr('class', 'legend-bar-hybrid')
            .attr('transform', `translate(${width + 50}, -30)`);
        
        // Legend dimensions
        const legendWidth = 240;
        
        // Add legend background
        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', 80)
            .attr('fill', 'white')
            .attr('stroke', '#e9ecef')
            .attr('stroke-width', 1)
            .attr('rx', 8);
        
        // Add legend title
        legend.append('text')
            .attr('x', 15)
            .attr('y', 20)
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('Shipping Mode Risk Analysis');
        
        // Add message
        legend.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', 50)
            .style('font-size', '12px')
            .style('fill', '#666')
            .style('text-anchor', 'middle')
            .text('No data available for current filters');
            
        return;
    }
    
    // Position in the upper corner of the chart
    const legend = chartGroup.append('g')
        .attr('class', 'legend-bar-hybrid')
        .attr('transform', `translate(${width + 50}, -30)`);
    
    // Legend dimensions
    const legendWidth = 240;
    const itemHeight = 55; // Increased height to accommodate multiple percentage lines
    const barWidth = 100;
    const barHeight = 15;
    
    // FIXED: Determine which percentage to show based on current filter
    let percentageKey, percentageLabel, barColor;
    if (currentStatusFilter === 'On-Time') {
        percentageKey = 'onTimePercentage';
        percentageLabel = 'On-Time';
        barColor = '#4CAF50';
    } else if (currentStatusFilter === 'Early') {
        percentageKey = 'earlyPercentage';
        percentageLabel = 'Early';
        barColor = '#2196F3';
    } else if (currentStatusFilter === 'Late') {
        percentageKey = 'riskPercentage';
        percentageLabel = 'Late';
        barColor = '#F44336';
    } else {
        // Show risk percentage for 'All'
        percentageKey = 'riskPercentage';
        percentageLabel = 'Risk';
        barColor = '#F44336';
    }
    
    // ADDED: Sort riskMetrics by the current percentage key in descending order
    const sortedRiskMetrics = [...riskMetrics].sort((a, b) => b[percentageKey] - a[percentageKey]);
    
    // Add legend background
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', sortedRiskMetrics.length * itemHeight + 40)
        .attr('fill', 'white')
        .attr('stroke', '#e9ecef')
        .attr('stroke-width', 1)
        .attr('rx', 8);
    
    // FIXED: Add legend title with current status filter information
    let titleText = 'Shipping Mode Risk Analysis';
    if (currentStatusFilter !== 'All') {
        titleText = `Shipping Mode - ${currentStatusFilter} %`;
    }
    
    legend.append('text')
        .attr('x', 15)
        .attr('y', 20)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(titleText);
    
    // FIXED: Create scale for the selected percentage based on actual data range
    const maxPercentage = Math.max(100, d3.max(sortedRiskMetrics, d => d[percentageKey]) || 100);
    const percentageScale = d3.scaleLinear()
        .domain([0, maxPercentage])
        .range([0, barWidth]);
    
    // Create legend items using sorted data
    const legendItems = legend.selectAll('.legend-item')
        .data(sortedRiskMetrics)
        .enter().append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(15, ${40 + i * itemHeight})`)
        .style('cursor', 'pointer');
    
    // Add legend item background for selection effect
    legendItems.append('rect')
        .attr('width', legendWidth - 30)
        .attr('height', itemHeight - 5)
        .attr('fill', 'transparent')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 1)
        .attr('rx', 4);
    
    // Add shipping mode color indicator
    legendItems.append('circle')
        .attr('cx', 8)
        .attr('cy', 12)
        .attr('r', 6)
        .attr('fill', d => colorScale(d.shippingMode));
    
    // Add shipping mode name
    legendItems.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#333')
        .text(d => d.shippingMode);
    
    // FIXED: Add percentage text with context
    legendItems.append('text')
        .attr('x', 20)
        .attr('y', 28)
        .style('font-size', '10px')
        .style('fill', '#666')
        .text(d => {
            if (currentStatusFilter === 'All') {
                return `Risk: ${d[percentageKey].toFixed(1)}%`;
            } else {
                return `${percentageLabel}: ${d[percentageKey].toFixed(1)}%`;
            }
        });
    
    // Add total order count (always from base data)
    legendItems.append('text')
        .attr('x', 20)
        .attr('y', 42)
        .style('font-size', '9px')
        .style('fill', '#666')
        .text(d => `${d.totalOrders} total orders`);
    
    // Add mini percentage bar background
    legendItems.append('rect')
        .attr('x', 120)
        .attr('y', 4)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', '#e9ecef')
        .attr('stroke', '#dee2e6')
        .attr('stroke-width', 0.5)
        .attr('rx', 2);
    
    // Add mini percentage bar
    legendItems.append('rect')
        .attr('class', 'percentage-bar')
        .attr('x', 120)
        .attr('y', 4)
        .attr('width', d => percentageScale(d[percentageKey]))
        .attr('height', barHeight)
        .attr('fill', barColor)
        .attr('rx', 2);
    
    // Add percentage label on bar
    legendItems.append('text')
        .attr('x', d => 120 + percentageScale(d[percentageKey]) + 5)
        .attr('y', 15)
        .style('font-size', '9px')
        .style('font-weight', '600')
        .style('fill', '#333')
        .text(d => `${d[percentageKey].toFixed(1)}%`);

    legendItems.append("title")
        .text("Click to filter locally, Double-click to filter all charts");
    
    // Track selected mode
    let selectedMode = null;
    
    // Update click functionality to include cross-chart interaction
    legendItems.on('click', function(event, modeData) {
        const mode = modeData.shippingMode;
        
        // Single click: Toggle selection for local chart
        if (selectedMode === mode) {
            selectedMode = null;
            // Reset local chart appearance
            updateLocalLegendState(null);
        } else {
            selectedMode = mode;
            // Update local chart appearance
            updateLocalLegendState(mode);
        }
    })
    .on('dblclick', function(event, modeData) {
        const mode = modeData.shippingMode;
        
        // Double click: Apply cross-chart filter for this shipping mode
        // Check if this shipping mode is already selected as cross-chart filter
        if (isCrossChartFilterActive('shippingMode') && getActiveCrossChartFilter('shippingMode') === mode) {
            // Remove the cross-chart filter
            removeCrossChartFilter('shippingMode');
        } else {
            // Apply cross-chart filter for this shipping mode
            applyCrossChartFilter('shippingMode', mode, 'shipping-scatter');
        }
        
        // Update visual state for cross-chart interactions
        updateLegendVisualState();
        
        // Prevent event from bubbling to single click
        event.stopPropagation();
    });
    

    // Add click functionality
    legendItems.on('click', function(event, modeData) {
        const mode = modeData.shippingMode;
        
        // Toggle selection
        if (selectedMode === mode) {
            selectedMode = null;
            // Reset all items
            legendItems.select('rect:first-child')
                .attr('fill', 'transparent')
                .attr('stroke', 'transparent');
            
            legendItems.selectAll('text')
                .style('opacity', 1);
            
            legendItems.selectAll('circle, .percentage-bar')
                .style('opacity', 1);
            
            // Show all dots
            dots.style('opacity', 0.7);
            
        } else {
            selectedMode = mode;
            
            // Update legend appearance
            legendItems.select('rect:first-child')
                .attr('fill', d => d.shippingMode === mode ? '#e3f2fd' : 'transparent')
                .attr('stroke', d => d.shippingMode === mode ? '#2196f3' : 'transparent');
            
            legendItems.selectAll('text')
                .style('opacity', d => d.shippingMode === mode ? 1 : 0.5);
            
            legendItems.selectAll('circle, .percentage-bar')
                .style('opacity', d => d.shippingMode === mode ? 1 : 0.5);
            
            // Filter dots
            dots.style('opacity', d => d.shippingMode === mode ? 0.7 : 0.1);
        }
    });

    function updateLocalLegendState(selectedMode) {
        if (selectedMode) {
            // Update legend appearance for local selection
            legendItems.select('rect:first-child')
                .attr('fill', d => d.shippingMode === selectedMode ? '#e8f4f8' : 'transparent')
                .attr('stroke', d => d.shippingMode === selectedMode ? '#1976d2' : 'transparent');
            
            legendItems.selectAll('text')
                .style('opacity', d => d.shippingMode === selectedMode ? 1 : 0.6);
            
            legendItems.selectAll('circle, .percentage-bar')
                .style('opacity', d => d.shippingMode === selectedMode ? 1 : 0.6);
            
            // Filter dots for local interaction
            dots.style('opacity', d => d.shippingMode === selectedMode ? 0.8 : 0.2);
        } else {
            // Reset all items for local interaction
            legendItems.select('rect:first-child')
                .attr('fill', 'transparent')
                .attr('stroke', 'transparent');
            
            legendItems.selectAll('text')
                .style('opacity', 1);
            
            legendItems.selectAll('circle, .percentage-bar')
                .style('opacity', 1);
            
            // Show all dots
            dots.style('opacity', 0.7);
        }
    }

}

function updateLegendVisualState() {
    const activeShippingMode = getActiveCrossChartFilter('shippingMode');
    
    const legendItems = d3.selectAll('.legend-item');
    
    if (activeShippingMode) {
        // Update legend appearance for active cross-chart filter
        legendItems.select('rect:first-child')
            .attr('fill', d => d.shippingMode === activeShippingMode ? '#e3f2fd' : 'transparent')
            .attr('stroke', d => d.shippingMode === activeShippingMode ? '#2196f3' : 'transparent')
            .attr('stroke-width', d => d.shippingMode === activeShippingMode ? 2 : 1);
        
        legendItems.selectAll('text')
            .style('opacity', d => d.shippingMode === activeShippingMode ? 1 : 0.4)
            .style('font-weight', d => d.shippingMode === activeShippingMode ? 'bold' : 'normal');
        
        legendItems.selectAll('circle, .percentage-bar')
            .style('opacity', d => d.shippingMode === activeShippingMode ? 1 : 0.4);
        
        // Filter dots for cross-chart interaction
        const dots = d3.selectAll('.dot');
        dots.style('opacity', d => d.shippingMode === activeShippingMode ? 0.8 : 0.1);
    } else {
        // Reset all items when no cross-chart filter is active
        legendItems.select('rect:first-child')
            .attr('fill', 'transparent')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 1);
        
        legendItems.selectAll('text')
            .style('opacity', 1)
            .style('font-weight', 'normal');
        
        legendItems.selectAll('circle, .percentage-bar')
            .style('opacity', 1);
        
        // Show all dots
        const dots = d3.selectAll('.dot');
        dots.style('opacity', 0.7);
    }
}

// Cleanup function
function cleanupShippingScatterChart() {
    if (shippingScatterTooltip) {
        shippingScatterTooltip.remove();
        shippingScatterTooltip = null;
    }
}

// Export initialization function
window.initShippingScatterChart = initShippingScatterChart;
