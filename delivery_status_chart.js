// Delivery Status Chart Implementation
async function initDeliveryStatusChart() {
    console.log('Initializing Delivery Status Chart...');
    
    try {
        // Load data if not already loaded
        if (!globalData) {
            await initializeDataLoader();
        }
        
        if (!globalData || globalData.length === 0) {
            console.error('No data available for delivery status chart');
            return;
        }
        
        // Process data for the chart
        const processedData = processDeliveryStatusData(globalData);
        console.log('Processed delivery data:', processedData);
        
        createDeliveryStatusChart(processedData);
        
    } catch (error) {
        console.error('Error initializing delivery status chart:', error);
    }
}

function createDeliveryStatusChart(data) {
    // Clear existing chart
    d3.select("#delivery-status-chart").selectAll("*").remove();
    
    // FIXED: Much smaller margins for maximum chart space
    const container = d3.select("#delivery-status-chart");
    const containerRect = container.node().getBoundingClientRect();
    
    const margin = { top: 35, right: 15, bottom: 30, left: 50 };
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
    
    // Define delivery status categories and colors
    const categories = [
        { key: 'lateDelivery', label: 'Late Delivery', color: '#F44336' },
        { key: 'advanceShipping', label: 'Advance Shipping', color: '#2196F3' },
        { key: 'onTimeShipping', label: 'On-Time Shipping', color: '#4CAF50' }
    ];
    
    // Process data for grouped bars
    const processedData = data.map(d => ({
        month: d.month,
        values: categories.map(cat => ({
            category: cat.key,
            label: cat.label,
            value: d[cat.key] || 0,
            color: cat.color
        })),
        lateDeliveryRisk: d.lateDeliveryRisk || 0
    }));
    
    // Scales
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.1);
    
    const x1 = d3.scaleBand()
        .domain(categories.map(d => d.key))
        .range([0, x0.bandwidth()])
        .padding(0.05);
    
    const maxValue = d3.max(processedData, d => d3.max(d.values, v => v.value));
    const yLeft = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height, 0])
        .nice();
    
    // FIXED: Scale for risk line (but no axis will be shown)
    const yRight = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.lateDeliveryRisk)])
        .range([height, 0])
        .nice();
    
    // Line generator for late delivery risk
    const line = d3.line()
        .x(d => x0(d.month) + x0.bandwidth() / 2)
        .y(d => yRight(d.lateDeliveryRisk))
        .curve(d3.curveMonotoneX);
    
    // FIXED: Custom format function for showing every 6 months
    const formatMonth = (monthStr) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(year, month - 1);
        return d3.timeFormat("%b %Y")(date);
    };
    
    // FIXED: Filter ticks to show every 6 months
    const filteredTicks = data.filter((d, i) => {
        const [year, month] = d.month.split('-');
        return parseInt(month) === 1 || parseInt(month) === 7; // January and July only
    }).map(d => d.month);
    
    // Create axes
    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0)
            .tickValues(filteredTicks)
            .tickFormat(formatMonth)
            .tickSize(0) // Remove tick marks
        );
    
    // Remove domain line for x-axis
    xAxis.select(".domain").remove();
    
    // X-axis labels - straight
    xAxis.selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", "9px")
        .attr("dy", "1em");
    
    // FIXED: Left Y-axis without tick marks
    const yAxisLeft = g.append("g")
        .attr("class", "y-axis-left")
        .call(d3.axisLeft(yLeft)
            .tickFormat(d3.format(".0f"))
            .tickSize(0) // Remove tick marks
        );
    
    // Remove domain line for left axis
    yAxisLeft.select(".domain").remove();
    
    yAxisLeft.selectAll("text")
        .style("text-anchor", "end")
        .style("font-size", "9px")
        .attr("dx", "-5px");
    
    // FIXED: NO RIGHT Y-AXIS - COMPLETELY REMOVED
    
    // FIXED: Only left axis label, positioned better
    g.append("text")
        .attr("class", "y-label-left")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 10)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#666")
        .text("Order Quantity");
    
    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "11px")
        .style("z-index", "1000");
    
    // Create grouped bars
    const monthGroups = g.selectAll(".month-group")
        .data(processedData)
        .enter().append("g")
        .attr("class", "month-group")
        .attr("transform", d => `translate(${x0(d.month)},0)`);
    
    const bars = monthGroups.selectAll(".bar")
        .data(d => d.values)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("data-category", d => d.category)
        .attr("x", d => x1(d.category))
        .attr("width", x1.bandwidth())
        .attr("y", d => yLeft(d.value))
        .attr("height", d => Math.max(0, height - yLeft(d.value)))
        .attr("fill", d => d.color)
        .style("opacity", 0.8)
        .on("mouseover", function(event, d) {
            const state = window.deliveryChartState;
            // Only show hover effects for visible bars
            if (!state.hiddenCategories.has(d.category)) {
                d3.select(this).style("opacity", 1);
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`
                    <strong>${d.label}</strong><br/>
                    Order Quantity: ${d.value.toLocaleString()}<br/>
                    Month: ${formatMonth(d3.select(this.parentNode).datum().month)}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        })
        .on("mouseout", function(d) {
            const state = window.deliveryChartState;
            // Reset to correct opacity based on visibility state
            if (!state.hiddenCategories.has(d.category)) {
                d3.select(this).style("opacity", 0.8);
            }
            tooltip.transition().duration(500).style("opacity", 0);
        })
        .on("click", function(event, d) {
            toggleCategory(d.category);
        });
    
    // Add late delivery risk line (only if we have data)
    if (data.some(d => d.lateDeliveryRisk > 0)) {
        const riskLine = g.append("path")
            .datum(data)
            .attr("class", "risk-line")
            .attr("fill", "none")
            .attr("stroke", "#E91E63")
            .attr("stroke-width", 2)
            .attr("d", line);
        
        // Add risk line points
        const riskPoints = g.selectAll(".risk-point")
            .data(data)
            .enter().append("circle")
            .attr("class", "risk-point")
            .attr("cx", d => x0(d.month) + x0.bandwidth() / 2)
            .attr("cy", d => yRight(d.lateDeliveryRisk))
            .attr("r", 3)
            .attr("fill", "#E91E63")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("r", 5);
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`
                    <strong>Late Delivery Risk</strong><br/>
                    Risk Rate: ${(d.lateDeliveryRisk * 100).toFixed(1)}%<br/>
                    Month: ${formatMonth(d.month)}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                d3.select(this).attr("r", 3);
                tooltip.transition().duration(500).style("opacity", 0);
            });
    }
    
    // FIXED: Compact legend positioning
    createDeliveryStatusLegend(categories, g, width, height);
    
    // Store chart state for interactions
    window.deliveryChartState = {
        hiddenCategories: new Set(),
        isolatedCategory: null,
        bars: bars,
        categories: categories
    };
    
    console.log('Delivery status chart created successfully');
}

function createDeliveryStatusLegend(categories, g, width, height) {
    // FIXED: More compact legend positioning
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width / 2 - 200}, -20)`);
    
    const legendItems = legend.selectAll(".legend-item")
        .data(categories)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 100}, 0)`)
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            toggleCategory(d.key);
        });
    
    legendItems.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => d.color)
        .attr("class", "legend-color");
    
    legendItems.append("text")
        .attr("x", 14)
        .attr("y", 8)
        .style("font-size", "9px")
        .style("fill", "#666")
        .text(d => d.label);
    
    // FIXED: Risk line legend in same row with tighter spacing
    const riskLegend = legend.append("g")
        .attr("class", "risk-legend")
        .attr("transform", "translate(300, 0)");
    
    riskLegend.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 5)
        .attr("y2", 5)
        .attr("stroke", "#E91E63")
        .attr("stroke-width", 2);
    
    riskLegend.append("text")
        .attr("x", 18)
        .attr("y", 8)
        .style("font-size", "9px")
        .style("fill", "#666")
        .text("Late Delivery Risk");
}

// Toggle function
function toggleCategory(categoryKey) {
    const state = window.deliveryChartState;
    
    if (state.isolatedCategory === categoryKey) {
        // If clicking the same category, show all categories
        state.hiddenCategories.clear();
        state.isolatedCategory = null;
    } else {
        // Hide all categories except the selected one
        state.hiddenCategories.clear();
        state.categories.forEach(cat => {
            if (cat.key !== categoryKey) {
                state.hiddenCategories.add(cat.key);
            }
        });
        state.isolatedCategory = categoryKey;
    }
    
    // Update visibility
    updateBarsVisibility();
    updateLegendVisibility();
}

// Bars visibility update
function updateBarsVisibility() {
    const state = window.deliveryChartState;
    
    state.bars
        .style("opacity", d => {
            return state.hiddenCategories.has(d.category) ? 0 : 0.8;
        })
        .style("pointer-events", d => {
            return state.hiddenCategories.has(d.category) ? "none" : "all";
        });
}

// Legend visibility update
function updateLegendVisibility() {
    const state = window.deliveryChartState;
    
    d3.selectAll(".legend-item")
        .style("opacity", d => {
            return state.hiddenCategories.has(d.key) ? 0.3 : 1;
        });
}
