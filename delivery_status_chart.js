// Delivery Status Chart Implementation
// Modify the initDeliveryStatusChart function to accept filtered data
async function initDeliveryStatusChart(filteredData) {
    console.log('Initializing Delivery Status Chart...');
    
    try {
        // FIXED: Use filtered data if provided, otherwise use global data
        let dataToUse = filteredData;
        
        if (!dataToUse) {
            // Load data if not already loaded
            if (!globalData) {
                await initializeDataLoader();
            }
            
            if (!globalData || globalData.length === 0) {
                console.error('No data available for delivery status chart');
                return;
            }
            
            dataToUse = globalData;
        }
        
        // Process data for the chart
        const processedData = processDeliveryStatusDataNew(dataToUse);
        console.log('Processed delivery data:', processedData);
        
        // Default time grouping is month
        const timeGrouping = 'month';
        createDeliveryStatusChart(processedData, timeGrouping);
        
    } catch (error) {
        console.error('Error initializing delivery status chart:', error);
    }
}

// ... rest of the delivery_status_chart.js file remains the same

// Process data for single bar + risk line (removed delay days)
function processDeliveryStatusDataNew(data, timeGrouping = 'month') {
    // Determine the format string based on time grouping
    let formatString;
    if (timeGrouping === 'year') {
        formatString = "%Y";
    } else if (timeGrouping === 'quarter') {
        formatString = "%Y-Q%q";
    } else { // Default to month
        formatString = "%Y-%m";
    }
    
    // Custom quarter format function
    const formatQuarter = (date) => {
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${year}-Q${quarter}`;
    };
    
    // Group data by the appropriate time period
    const timeData = d3.rollup(data, 
        v => ({
            totalQuantity: d3.sum(v, d => d.orderQuantity),
            totalOrders: v.length,
            lateRiskSum: d3.sum(v, d => d.lateDeliveryRisk * d.orderQuantity),
            deliveryStatusBreakdown: d3.rollup(v, 
                orders => ({
                    count: orders.length,
                    quantity: d3.sum(orders, o => o.orderQuantity)
                }), 
                d => d.deliveryStatus
            ),
            orders: v
        }),
        d => timeGrouping === 'quarter' ? formatQuarter(d.orderDate) : d3.timeFormat(formatString)(d.orderDate)
    );
    
    // Convert to array format for chart
    const processedData = [];
    const timePeriods = Array.from(timeData.keys()).sort();
    
    timePeriods.forEach(period => {
        const periodData = timeData.get(period);
        const entry = {
            period: period,
            totalQuantity: periodData.totalQuantity,
            totalOrders: periodData.totalOrders,
            lateDeliveryRisk: periodData.totalQuantity > 0 ? 
                periodData.lateRiskSum / periodData.totalQuantity : 0,
            deliveryStatusBreakdown: periodData.deliveryStatusBreakdown,
            orders: periodData.orders
        };
        
        processedData.push(entry);
    });
    
    return processedData;
}

function createDeliveryStatusChart(data, timeGrouping) {
    // Clear existing chart AND remove any existing tooltips
    d3.select("#delivery-status-chart").selectAll("*").remove();
    
    // ADDED: Remove any existing enhanced tooltips from previous chart instances
    d3.selectAll('.enhanced-tooltip').remove();
    
    // Create time grouping controls and year-over-year comparison toggle
    createControls(timeGrouping);
    
    const container = d3.select("#delivery-status-chart");
    const containerRect = container.node().getBoundingClientRect();
    
    const margin = { top: 50, right: 50, bottom: 50, left: 60 };
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;
    
    console.log('Chart dimensions:', { width, height, containerRect });
    
    // Create SVG with responsive sizing
    const svg = container
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.period))
        .range([0, width])
        .padding(0.2);
    
    const yBarScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.totalQuantity)])
        .range([height, 0])
        .nice();
    
    // MODIFIED: Calculate optimized domain for risk percentage
    const riskValues = data.map(d => d.lateDeliveryRisk);
    const minRisk = d3.min(riskValues);
    const maxRisk = d3.max(riskValues);
    // Set buffer to make the trends more visible (using ~20% padding)
    const riskBuffer = (maxRisk - minRisk) * 0.2;
    // Ensure we don't go below 0
    const yRiskMin = Math.max(0, minRisk - riskBuffer);
    const yRiskMax = maxRisk + riskBuffer;
    
    const yRiskScale = d3.scaleLinear()
        .domain([yRiskMin, yRiskMax])
        .range([height, 0])
        .nice();
    
    // Line generators - only risk line now
    const riskLine = d3.line()
        .x(d => xScale(d.period) + xScale.bandwidth() / 2)
        .y(d => yRiskScale(d.lateDeliveryRisk))
        .curve(d3.curveMonotoneX);
    
    const formatPeriod = (periodStr) => {
        if (timeGrouping === 'year') {
            return periodStr;
        } else if (timeGrouping === 'quarter') {
            return periodStr;
        } else { // month
            const [year, month] = periodStr.split('-');
            const date = new Date(year, month - 1);
            return d3.timeFormat("%b %Y")(date);
        }
    };
    
    // Filter ticks based on time grouping
    let filteredTicks;
    if (timeGrouping === 'year') {
        filteredTicks = data.map(d => d.period);
    } else if (timeGrouping === 'quarter') {
        filteredTicks = data.map(d => d.period);
    } else {
        filteredTicks = data.filter((d, i) => {
            const [year, month] = d.period.split('-');
            return parseInt(month) === 1 || parseInt(month) === 7;
        }).map(d => d.period);
    }
    
    // Create axes
    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickValues(filteredTicks)
            .tickFormat(formatPeriod)
            .tickSize(0)
        );
    
    xAxis.select(".domain").remove();
    xAxis.selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", "9px")
        .attr("dy", "1em");
    
    // Left Y-axis (Order Quantity)
    const yAxisLeft = g.append("g")
        .attr("class", "y-axis-left")
        .call(d3.axisLeft(yBarScale)
            .tickFormat(d3.format(".0f"))
            .tickSize(0)
        );
    
    yAxisLeft.select(".domain").remove();
    yAxisLeft.selectAll("text")
        .style("text-anchor", "end")
        .style("font-size", "9px")
        .attr("dx", "-5px");
    
    // Axis labels
    g.append("text")
        .attr("class", "y-label-left")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#666")
        .text("Order Quantity");
    
    // Enhanced tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "enhanced-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.95)")
        .style("color", "white")
        .style("padding", "15px")
        .style("border-radius", "8px")
        .style("pointer-events", "none") // IMPORTANT: This prevents tooltip from interfering with mouse events
        .style("font-size", "11px")
        .style("z-index", "1000")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
        .style("max-width", "350px");
    
    // Create bars (single bar per time period)
    const bars = g.selectAll(".quantity-bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "quantity-bar chart-element delivery-chart-element") // Added class for isolation
        .attr("data-type", "bar")
        .attr("x", d => xScale(d.period))
        .attr("width", xScale.bandwidth())
        .attr("y", height) // Start from bottom for animation
        .attr("height", 0) // Start with 0 height
        .attr("fill", "#4CAF50")
        .style("opacity", 0.7);
    
    // Animate bars
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .ease(d3.easeQuadOut)
        .attr("y", d => yBarScale(d.totalQuantity))
        .attr("height", d => height - yBarScale(d.totalQuantity));
    
    // Create risk line
    const riskPath = g.append("path")
        .datum(data)
        .attr("class", "risk-line chart-element delivery-chart-element") // Added class for isolation
        .attr("data-type", "risk")
        .attr("fill", "none")
        .attr("stroke", "#E91E63")
        .attr("stroke-width", 3)
        .attr("d", riskLine);
    
    // Animate risk line
    const riskLength = riskPath.node().getTotalLength();
    riskPath
        .attr("stroke-dasharray", `${riskLength} ${riskLength}`)
        .attr("stroke-dashoffset", riskLength)
        .transition()
        .duration(1500)
        .delay(500)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
    
    // Create invisible hover zones for synchronized interaction
    const hoverZones = g.selectAll(".hover-zone")
        .data(data)
        .enter().append("rect")
        .attr("class", "hover-zone")
        .attr("x", d => xScale(d.period) - 10)
        .attr("width", xScale.bandwidth() + 20)
        .attr("y", 0)
        .attr("height", height)
        .attr("fill", "transparent")
        .style("cursor", "crosshair");

    // Add hover interactions
    hoverZones
        .on("mouseover", function(event, d) {
            const xPos = xScale(d.period) + xScale.bandwidth() / 2;
            
            // Show cursor line
            cursorLine
                .attr("x1", xPos)
                .attr("x2", xPos)
                .attr("y1", 0)
                .attr("y2", height)
                .style("opacity", 1);
            
            // Show enhanced tooltip
            showEnhancedTooltipWithInteraction(event, d, tooltip, formatPeriod);
        })
        .on("mouseout", function() {
            // Hide cursor line
            cursorLine.style("opacity", 0);
            
            // Hide tooltip immediately
            tooltip.transition().duration(200).style("opacity", 0);
        })
        .on("mousemove", function(event, d) {
            // Update tooltip position on mouse move
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 50) + "px");
        })
        .on("click", function(event, d) {
            // FIXED: Single click - hide tooltip immediately and apply cross-chart filter
            
            // Hide tooltip immediately when clicking
            tooltip.transition().duration(0).style("opacity", 0);
            
            // Hide cursor line
            cursorLine.style("opacity", 0);
            
            // Apply cross-chart filter for this time period
            const filterType = 'period';
            
            // Check if this filter is already active
            if (isCrossChartFilterActive(filterType) && getActiveCrossChartFilter(filterType) === d.period) {
                // Remove the cross-chart filter
                removeCrossChartFilter(filterType);
            } else {
                // Apply cross-chart filter
                applyCrossChartFilter(filterType, d.period, 'delivery-status');
            }
            
            // Update visual state
            updateDeliveryChartVisualState();
            
            // Prevent event bubbling that might interfere with tooltip hiding
            event.stopPropagation();
        })
        .on("mousedown", function(event, d) {
            // Middle mouse button (button 1): Handle drill-down if needed
            if (event.button === 1) {
                // Hide tooltip for middle click as well
                tooltip.transition().duration(0).style("opacity", 0);
                cursorLine.style("opacity", 0);
                
                // Currently delivery status chart doesn't have drill-down
                // But if you want to add drill-down functionality later, add it here
                console.log('Middle mouse clicked on delivery status chart - no drill-down available');
                event.preventDefault(); // Prevent default middle-click behavior
            }
        });
    
    // Create cursor line (initially hidden)
    const cursorLine = g.append("line")
        .attr("class", "cursor-line")
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3")
        .style("opacity", 0);
    
    // Add hover interactions
    hoverZones
        .on("mouseover", function(event, d) {
            const xPos = xScale(d.period) + xScale.bandwidth() / 2;
            
            // Show cursor line
            cursorLine
                .attr("x1", xPos)
                .attr("x2", xPos)
                .attr("y1", 0)
                .attr("y2", height)
                .style("opacity", 1);
            
            // Show enhanced tooltip with pie chart inside
            showEnhancedTooltipSimplified(event, d, tooltip, formatPeriod);
        })
        .on("mouseout", function() {
            // Hide cursor line
            cursorLine.style("opacity", 0);
            
            // Hide tooltip
            tooltip.transition().duration(500).style("opacity", 0);
        });
    
    // Create legend with selectable items
    createSelectableLegend(g, width, height);
    
    // Store chart state
    window.deliveryChartState = {
        data: data,
        scales: { xScale, yBarScale, yRiskScale },
        dimensions: { width, height, margin },
        timeGrouping: timeGrouping,
        visibleElements: new Set(['bar', 'risk'])
    };
    
    console.log('Enhanced delivery status chart created successfully');
}

function showEnhancedTooltipWithInteraction(event, d, tooltip, formatPeriod) {
    // Call the existing function first
    showEnhancedTooltipSimplified(event, d, tooltip, formatPeriod);
    
    // Add interaction hints
    const contentDiv = tooltip.select('div');
    if (!contentDiv.empty()) {
        contentDiv.append('div')
            .style('margin-top', '10px')
            .style('padding-top', '8px')
            .style('border-top', '1px solid #ddd')
            .style('font-size', '10px')
            .style('text-align', 'center')
            .html(`
                <span style="color:#4CAF50;">Click to filter all charts</span><br/>
                <span style="color:#1976d2;">Hover to see details</span>
            `);
    }
}


// Add function to update delivery chart visual state
function updateDeliveryChartVisualState() {
    const activePeriod = getActiveCrossChartFilter('period');
    
    const bars = d3.selectAll('.quantity-bar');
    const riskPath = d3.select('.risk-line');
    
    if (activePeriod) {
        // Highlight the selected period
        bars.attr("stroke", d => d.period === activePeriod ? "#2196f3" : "none")
            .attr("stroke-width", d => d.period === activePeriod ? 3 : 0)
            .style("opacity", d => d.period === activePeriod ? 1 : 0.3);
        
        // Dim the risk line except for the selected period
        riskPath.style("opacity", 0.3);
        
        // Add highlight marker for selected period
        const selectedData = window.deliveryChartState.data.find(d => d.period === activePeriod);
        if (selectedData) {
            const g = d3.select('#delivery-status-chart svg g');
            
            // Remove existing highlight
            g.select('.period-highlight').remove();
            
            // Add new highlight
            g.append('circle')
                .attr('class', 'period-highlight')
                .attr('cx', window.deliveryChartState.scales.xScale(activePeriod) + window.deliveryChartState.scales.xScale.bandwidth() / 2)
                .attr('cy', window.deliveryChartState.scales.yRiskScale(selectedData.lateDeliveryRisk))
                .attr('r', 6)
                .attr('fill', '#2196f3')
                .attr('stroke', 'white')
                .attr('stroke-width', 2);
        }
    } else {
        // Reset all elements
        bars.attr("stroke", "none")
            .attr("stroke-width", 0)
            .style("opacity", 0.7);
        
        riskPath.style("opacity", 1);
        
        // Remove highlight
        d3.select('.period-highlight').remove();
    }
}


// Simplified tooltip with pie chart inside and fewer metrics - UPDATED WHITE BACKGROUND
function showEnhancedTooltipSimplified(event, d, tooltip, formatPeriod) {
    // Calculate total for percentages
    const totalDeliveryCount = Array.from(d.deliveryStatusBreakdown.values())
        .reduce((sum, data) => sum + data.quantity, 0);
    
    // Prepare pie chart data
    const pieData = Array.from(d.deliveryStatusBreakdown.entries())
        .map(([status, data]) => ({
            label: status,
            value: data.quantity,
            percentage: ((data.quantity / totalDeliveryCount) * 100).toFixed(1)
        }));
    
    // Create SVG for pie chart in tooltip
    const pieSize = 130;
    const pieRadius = pieSize / 2;
    
    // Clear any existing tooltip content
    tooltip.html("");
    
    // Set tooltip styles
    tooltip
        .style("background", "white")
        .style("color", "#333")
        .style("border", "1px solid #ddd")
        .style("pointer-events", "none"); // IMPORTANT: Ensure tooltip doesn't interfere with mouse events
    
    // Add title and metrics section
    const contentDiv = tooltip.append("div")
        .style("padding", "10px");
    
    contentDiv.append("div")
        .style("border-bottom", "1px solid #ddd")
        .style("padding-bottom", "10px")
        .style("margin-bottom", "10px")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("color", "#333")
        .text(formatPeriod(d.period));
    
    // Simplified metrics section
    const metricsDiv = contentDiv.append("div")
        .style("margin-bottom", "15px")
        .style("font-size", "12px");
    
    metricsDiv.html(`
        <div>
            <strong>Total Orders:</strong> ${d.totalOrders.toLocaleString()}<br/>
            <strong>Late Risk:</strong> <span style="color: #E91E63; font-weight: bold;">${(d.lateDeliveryRisk * 100).toFixed(1)}%</span><br/>
            <strong>Risk Orders:</strong> ${d.orders.filter(o => o.lateDeliveryRisk > 0).length}
        </div>
    `);
    
    // Add pie chart
    const pieColors = {
        'Late delivery': '#F44336',
        'Advance shipping': '#2196F3',
        'Shipping on time': '#4CAF50'
    };
    
    const pieContainer = contentDiv.append("div")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("margin-top", "5px");
    
    const pieSvg = pieContainer.append("svg")
        .attr("width", pieSize)
        .attr("height", pieSize)
        .style("display", "block");
    
    const pieGroup = pieSvg.append("g")
        .attr("transform", `translate(${pieRadius},${pieRadius})`);
    
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null)
        .padAngle(0.03);
    
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius - 15);
    
    const labelPositioning = {
        'Late delivery': 0.5,
        'Advance shipping': 0.7,
        'Shipping on time': 0.6
    };
    
    const calculateLabelPosition = (d) => {
        const centroid = arc.centroid(d);
        const midAngle = Math.atan2(centroid[1], centroid[0]);
        const x = Math.cos(midAngle) * (pieRadius - 30) * (labelPositioning[d.data.label] || 0.5);
        const y = Math.sin(midAngle) * (pieRadius - 30) * (labelPositioning[d.data.label] || 0.5);
        return [x, y];
    };
    
    // Add slices
    const slices = pieGroup.selectAll(".pie-slice")
        .data(pie(pieData))
        .enter().append("path")
        .attr("class", "pie-slice")
        .attr("d", arc)
        .attr("fill", d => pieColors[d.data.label] || '#999')
        .style("stroke", "white")
        .style("stroke-width", 2);
    
    // Add percentage labels
    const labels = pieGroup.selectAll(".pie-label")
        .data(pie(pieData))
        .enter().append("text")
        .attr("class", "pie-label")
        .attr("transform", d => `translate(${calculateLabelPosition(d)})`)
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#333")
        .style("font-weight", "bold")
        .style("text-shadow", "0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white")
        .text(d => `${d.data.percentage}%`);
    
    // Add connector lines
    pieGroup.selectAll(".connector")
        .data(pie(pieData))
        .enter().append("polyline")
        .attr("class", "connector")
        .style("fill", "none")
        .style("stroke", "#ccc")
        .style("stroke-width", 1)
        .attr("points", function(d) {
            const centroid = arc.centroid(d);
            const labelPos = calculateLabelPosition(d);
            const midPoint = [(centroid[0] + labelPos[0])/2, (centroid[1] + labelPos[1])/2];
            return [centroid, midPoint, labelPos];
        });
    
    // Add legend
    const legendContainer = contentDiv.append("div")
        .style("margin-top", "10px")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("flex-wrap", "wrap")
        .style("gap", "10px");
    
    pieData.forEach(d => {
        const legendItem = legendContainer.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "5px")
            .style("font-size", "10px")
            .style("color", "#333");
        
        legendItem.append("div")
            .style("width", "10px")
            .style("height", "10px")
            .style("background", pieColors[d.label] || '#999')
            .style("border-radius", "2px");
        
        legendItem.append("span")
            .text(`${d.label} (${d.percentage}%)`);
    });
    
    // Position and show tooltip with immediate transition
    tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 50) + "px")
        .transition().duration(100).style("opacity", 1); // Faster transition
}

// ALSO ADD: Global click handler to hide tooltip when clicking outside
document.addEventListener('click', function(event) {
    // Check if the click is outside the delivery status chart
    const deliveryChart = document.getElementById('delivery-status-chart');
    if (deliveryChart && !deliveryChart.contains(event.target)) {
        // Hide the tooltip if it exists
        const tooltip = d3.select('.enhanced-tooltip');
        if (!tooltip.empty()) {
            tooltip.transition().duration(200).style("opacity", 0);
        }
    }
});

// Create legend with selectable items - UPDATED WITH TOOLTIPS
function createSelectableLegend(g, width, height) {
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width / 2 - 100}, -35)`); // Adjusted position with only 2 items
    
    // MODIFIED: Removed Avg Delay Days from legend data
    const legendData = [
        { label: 'Order Quantity', color: '#4CAF50', type: 'bar' },
        { label: 'Late Delivery Risk', color: '#E91E63', type: 'risk' }
    ];
    
    const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter().append("g")
        .attr("class", "legend-item delivery-legend-item") // Added class for isolation
        .attr("data-type", d => d.type)
        .attr("transform", (d, i) => `translate(${i * 130}, 0)`) // Adjusted spacing with only 2 items
        .style("cursor", "pointer")
        .style("opacity", 1) // Start with all visible
        .append("title") // Add tooltip
        .text("Click to isolate this element") // Tooltip text
        .select(function() { return this.parentNode; }) // Go back to the parent node
        .on("click", function(event, d) {
            // Toggle visibility of the corresponding chart element
            toggleChartElement(d.type);
        });
    
    legendItems.each(function(d) {
        const item = d3.select(this);
        
        if (d.type === 'bar') {
            item.append("rect")
                .attr("width", 12)
                .attr("height", 8)
                .attr("fill", d.color)
                .style("opacity", 0.7);
        } else {
            item.append("line")
                .attr("x1", 0)
                .attr("x2", 12)
                .attr("y1", 4)
                .attr("y2", 4)
                .attr("stroke", d.color)
                .attr("stroke-width", 3);
        }
        
        item.append("text")
            .attr("x", 16)
            .attr("y", 6)
            .style("font-size", "9px")
            .style("fill", "#666")
            .text(d.label);
    });
}

// Toggle chart element visibility - UPDATED BEHAVIOR
function toggleChartElement(elementType) {
    const state = window.deliveryChartState;
    if (!state) return;
    
    // Get the set of visible elements
    const visibleElements = state.visibleElements;
    
    // Check if we're clicking on an already-isolated element
    if (visibleElements.size === 1 && visibleElements.has(elementType)) {
        // If this is the only visible element, show all elements
        visibleElements.clear();
        visibleElements.add('bar');
        visibleElements.add('risk');
    } else {
        // Otherwise, show only this element
        visibleElements.clear();
        visibleElements.add(elementType);
    }
    
    // Update legend item opacity - ONLY DELIVERY CHART LEGEND ITEMS
    d3.selectAll(".delivery-legend-item")
        .style("opacity", d => visibleElements.has(d.type) ? 1 : 0.4);
    
    // Update chart element visibility - ONLY DELIVERY CHART ELEMENTS
    d3.selectAll(".delivery-chart-element")
        .style("opacity", function() {
            const type = d3.select(this).attr("data-type");
            if (visibleElements.has(type)) {
                return type === 'bar' ? 0.7 : 1;
            } else {
                return 0;
            }
        })
        .style("pointer-events", function() {
            const type = d3.select(this).attr("data-type");
            return visibleElements.has(type) ? "all" : "none";
        });
}

// Create time grouping controls and year-over-year comparison toggle
function createControls(currentTimeGrouping) {
    const container = d3.select("#delivery-status-chart");
    
    // Remove existing controls
    d3.select("#chart-controls").remove();
    
    const controlsDiv = container.insert("div", "svg")
        .attr("id", "chart-controls")
        .style("margin-bottom", "10px")
        .style("padding", "8px")
        .style("background", "#f8f9fa")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("align-items", "center");
    
    // Add time grouping select
    const timeGroupControl = controlsDiv.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px");
    
    timeGroupControl.append("label")
        .text("Time Period:")
        .style("font-weight", "500");
    
    timeGroupControl.append("select")
        .attr("id", "time-grouping-select")
        .style("padding", "4px")
        .style("border-radius", "4px")
        .style("border", "1px solid #ddd")
        .on("change", function() {
            const newGrouping = this.value;
            changeTimeGrouping(newGrouping);
        })
        .selectAll("option")
        .data([
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' }
        ])
        .enter()
        .append("option")
        .attr("value", d => d.value)
        .property("selected", d => d.value === currentTimeGrouping)
        .text(d => d.label);
    
    // Add Year-over-Year comparison toggle
    const yoyControl = controlsDiv.append("div");
    
    const label = yoyControl.append("label")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px")
        .style("cursor", "pointer");
    
    label.append("input")
        .attr("type", "checkbox")
        .attr("id", "yoy-comparison")
        .on("change", function() {
            toggleYearOverYearComparison(this.checked);
        });
    
    label.append("span")
        .text("Show Year-over-Year Comparison")
        .style("font-weight", "500");
}

// Change time grouping and redraw chart
function changeTimeGrouping(newGrouping) {
    // Process data with the new time grouping
    const newData = processDeliveryStatusDataNew(globalData, newGrouping);
    
    // Recreate the chart with new data
    createDeliveryStatusChart(newData, newGrouping);
}

// Year-over-Year Comparison 
function toggleYearOverYearComparison(enabled) {
    const state = window.deliveryChartState;
    if (!state) return;
    
    if (enabled) {
        addYearOverYearBars();
    } else {
        removeYearOverYearBars();
    }
}

function addYearOverYearBars() {
    const state = window.deliveryChartState;
    const currentData = state.data;
    const { xScale, yBarScale } = state.scales;
    const timeGrouping = state.timeGrouping;
    
    // Calculate previous year/period data
    let previousPeriodData = [];
    
    if (timeGrouping === 'year') {
        // For yearly data, shift by one year
        previousPeriodData = currentData.map(d => {
            const year = parseInt(d.period);
            const prevYear = (year - 1).toString();
            const prevYearData = currentData.find(prev => prev.period === prevYear);
            return prevYearData ? {
                ...prevYearData,
                period: d.period // Keep current period for positioning
            } : null;
        }).filter(d => d !== null);
    } else if (timeGrouping === 'quarter') {
        // For quarterly data, shift by one year (same quarter)
        previousPeriodData = currentData.map(d => {
            const [year, quarter] = d.period.split('-');
            const prevYear = (parseInt(year) - 1).toString();
            const prevPeriod = `${prevYear}-${quarter}`;
            const prevPeriodData = currentData.find(prev => prev.period === prevPeriod);
            return prevPeriodData ? {
                ...prevPeriodData,
                period: d.period // Keep current period for positioning
            } : null;
        }).filter(d => d !== null);
    } else {
        // For monthly data, shift by one year (same month)
        previousPeriodData = currentData.map(d => {
            const [year, month] = d.period.split('-');
            const prevYear = (parseInt(year) - 1).toString();
            const prevPeriod = `${prevYear}-${month}`;
            const prevPeriodData = currentData.find(prev => prev.period === prevPeriod);
            return prevPeriodData ? {
                ...prevPeriodData,
                period: d.period // Keep current period for positioning
            } : null;
        }).filter(d => d !== null);
    }
    
    if (previousPeriodData.length === 0) {
        alert("No previous year data available for comparison.");
        // Uncheck the checkbox
        document.getElementById("yoy-comparison").checked = false;
        return;
    }
    
    const svg = d3.select("#delivery-status-chart svg g");
    
    const prevBars = svg.selectAll(".prev-year-bar")
        .data(previousPeriodData)
        .enter().append("rect")
        .attr("class", "prev-year-bar chart-element delivery-chart-element") // Added class for isolation
        .attr("data-type", "bar") // Tie to the same visibility control as regular bars
        .attr("x", d => xScale(d.period) + 5)
        .attr("width", xScale.bandwidth() - 10)
        .attr("y", d => yBarScale(d.totalQuantity))
        .attr("height", d => state.dimensions.height - yBarScale(d.totalQuantity))
        .attr("fill", "#4CAF50")
        .style("opacity", 0.3)
        .style("stroke", "#fff")
        .style("stroke-width", 1);
    
    // Update visibility based on current state
    if (!state.visibleElements.has('bar')) {
        prevBars.style("opacity", 0);
    }
}

function removeYearOverYearBars() {
    d3.selectAll(".prev-year-bar").remove();
}
