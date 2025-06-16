// country_risk_chart.js
let countryRiskSvg = null;
let countryRiskTooltip = null;
let currentGeographicLevel = 'orderCountry';
let currentSortMetric = 'totalOrderVolume';
let countryDataCache = null;
let activeKey = 'onTimeDeliveries';
let drillDownStack = []; // Stack to keep track of drill-down hierarchy

// Initialize tooltip once when the script loads
document.addEventListener('DOMContentLoaded', function() {
    countryRiskTooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0,0,0,0.9)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "12px");

    // FIXED: Use a different ID for the country chart's geographic level selector
    const countryGeographicLevelSelect = document.querySelector('#country-risk-chart').parentElement.querySelector('#geographic-level-select');
    if (countryGeographicLevelSelect) {
        countryGeographicLevelSelect.addEventListener('change', function() {
            currentGeographicLevel = this.value;
            // Reset drill-down stack when changing geographic level manually
            drillDownStack = [];
            initCountryRiskChart();
        });
    } else {
        console.warn('Country chart geographic level select element not found in DOM.');
    }
});

// Helper function to get geographic level display name
function getGeographicDisplayName(level) {
    const displayNames = {
        'orderCountry': 'Country',
        'orderRegion': 'Region', 
        'orderState': 'State',
        'orderCity': 'City'
    };
    return displayNames[level] || 'Geographic Unit';
}

// Helper function to get chart title
function getChartTitle(level) {
    const displayName = getGeographicDisplayName(level);
    return `Top 10 ${displayName}s by Delivery Risk`;
}

// Modify the initCountryRiskChart function to accept filtered data
async function initCountryRiskChart(filteredData) {
    // FIXED: Don't override globalData, use local variable
    let dataToUse = filteredData;
    
    if (typeof filteredData === 'undefined' || !filteredData) {
        if (typeof globalData === 'undefined' || !globalData || globalData.length === 0) {
            try {
                await initializeDataLoader();
            } catch (error) {
                console.error("Error loading data:", error);
                return;
            }
        }
        dataToUse = globalData;
    }

    // Update chart title
    updateChartTitle();

    // Filter data based on drill-down stack
    if (drillDownStack.length > 0) {
        dataToUse = applyDrillDownFilters(dataToUse);
    }

    countryDataCache = processCountryRiskData(dataToUse);
    if (countryDataCache.length === 0) {
        showNoDataMessage("No country risk data to display based on current filters.", true);
        return;
    }

    createCountryRiskChart(countryDataCache);
}

// Show a message when there's no data, with optional reset button
function showNoDataMessage(message, showResetButton) {
    const container = d3.select("#country-risk-chart");
    container.selectAll("*").remove();
    
    const messageContainer = container.append("div")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("height", "100%")
        .style("padding", "20px");
    
    messageContainer.append("p")
        .style("text-align", "center")
        .style("color", "#666")
        .style("margin-bottom", showResetButton ? "20px" : "0")
        .text(message);
    
    if (showResetButton) {
        messageContainer.append("button")
            .attr("class", "reset-filters-btn")
            .style("padding", "8px 16px")
            .style("background", "#f0f0f0")
            .style("border", "1px solid #333")
            .style("border-radius", "4px")
            .style("cursor", "pointer")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("box-shadow", "0px 1px 3px rgba(0,0,0,0.2)")
            .text("Reset Filters")
            .on("click", function() {
                // Reset everything to initial state
                drillDownStack = [];
                currentGeographicLevel = 'orderCountry';
                // Update dropdown if it exists - use the correct selector
                const select = document.querySelector('#country-risk-chart').parentElement.querySelector('#geographic-level-select');
                if (select) select.value = 'orderCountry';
                initCountryRiskChart();
            });
    }
}

// Apply filters based on drill-down stack
function applyDrillDownFilters(data) {
    let filtered = data;
    
    drillDownStack.forEach(level => {
        filtered = filtered.filter(d => d[level.field] === level.value);
    });
    
    return filtered;
}

// Function to update the chart title in the existing HTML element
function updateChartTitle() {
    const titleSpan = document.getElementById('geographic-level-title');
    if (titleSpan) {
        const displayName = getGeographicDisplayName(currentGeographicLevel);
        // Make it plural for the title
        const pluralName = displayName === 'Country' ? 'Countries' : 
                          displayName === 'State' ? 'States' : 
                          displayName === 'City' ? 'Cities' : 
                          displayName === 'Region' ? 'Regions' : displayName + 's';
        
        // Add drill-down context to title
        let titleText = pluralName;
        if (drillDownStack.length > 0) {
            const lastLevel = drillDownStack[drillDownStack.length - 1];
            titleText = `${pluralName} in ${lastLevel.value}`;
        }
        
        titleSpan.textContent = titleText;
    }
}

function processCountryRiskData(data) {
    // Check if we have any data after filtering
    if (!data || data.length === 0) {
        return [];
    }

    const minOrderVolume = parseFloat(document.getElementById('country-risk-min-volume')?.value || 0);

    const countryData = d3.rollup(
        data,
        v => {
            const totalOrderQuantity = d3.sum(v, d => d.orderQuantity);
            const lateDeliveryQuantity = d3.sum(v.filter(d => d.lateDeliveryRisk === 1), d => d.orderQuantity);
            const onTimeDeliveryQuantity = d3.sum(v.filter(d => d.lateDeliveryRisk === 0), d => d.orderQuantity);
            const lateDeliveryRate = totalOrderQuantity > 0 ? (lateDeliveryQuantity / totalOrderQuantity) * 100 : 0;
            const onTimeDeliveryRate = totalOrderQuantity > 0 ? (onTimeDeliveryQuantity / totalOrderQuantity) * 100 : 0;

            return {
                totalOrderVolume: totalOrderQuantity,
                onTimeDeliveries: onTimeDeliveryRate,
                lateDeliveries: lateDeliveryRate
            };
        },
        d => d[currentGeographicLevel]
    );

    // Check if we have any data after grouping
    if (countryData.size === 0) {
        return [];
    }

    let processedData = Array.from(countryData, ([key, value]) => ({
        geographicUnit: key,
        ...value
    })).filter(d => d.totalOrderVolume >= minOrderVolume);

    // Check if we have any data after filtering by minimum order volume
    if (processedData.length === 0) {
        return [];
    }

    processedData.sort((a, b) => b[currentSortMetric] - a[currentSortMetric]);
    return processedData.slice(0, 10);
}

function createCountryRiskChart(data) {
    d3.select("#country-risk-chart").selectAll("*").remove();

    const container = d3.select("#country-risk-chart");
    const containerRect = container.node().getBoundingClientRect();
    // Increase left margin from 100 to 150 for more padding
    const margin = { top: 35, right: 20, bottom: 60, left: 150 };
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;

    // Create container with breadcrumb navigation
    const chartContainer = container.append("div")
        .style("position", "relative")
        .style("height", "100%");
    
    // Add breadcrumb navigation if we have drill-down active
    if (drillDownStack.length > 0) {
        const breadcrumbContainer = chartContainer.append("div")
            .style("position", "absolute")
            .style("top", "5px")
            .style("left", "5px")
            .style("z-index", "10")
            .style("display", "flex")
            .style("gap", "8px")
            .style("align-items", "center");
        
        // Add navigation arrows similar to treemap style
        
        // Add up arrow for navigation (go back one level)
        if (drillDownStack.length > 0) {
            breadcrumbContainer.append("button")
                .attr("class", "nav-arrow up-arrow")
                .style("background", "#f0f0f0")  // Light gray background
                .style("border", "1px solid #333")  // Darker border
                .style("border-radius", "4px")
                .style("padding", "3px 10px")  // Slightly larger padding
                .style("cursor", "pointer")
                .style("font-size", "20px")  // Larger font size
                .style("color", "#000")  // Black color
                .style("font-weight", "bolder")  // Heavier weight
                .style("box-shadow", "0px 1px 3px rgba(0,0,0,0.2)")  // Add subtle shadow
                .html("↑") // Up arrow
                .attr("title", "Go up one level")
                .on("click", function() {
                    // Pop the last level from the stack
                    drillDownStack.pop();
                    
                    // Update currentGeographicLevel based on drill-down depth
                    if (drillDownStack.length === 0) {
                        currentGeographicLevel = 'orderCountry';
                    } else if (drillDownStack.length === 1) {
                        currentGeographicLevel = 'orderState';
                    } else {
                        currentGeographicLevel = 'orderCity';
                    }
                    
                    // Update dropdown to match - use correct selector
                    const select = document.querySelector('#country-risk-chart').parentElement.querySelector('#geographic-level-select');
                    if (select) select.value = currentGeographicLevel;
                    
                    initCountryRiskChart();
                });
        }
        
        // Add direct jump to top level
        breadcrumbContainer.append("button")
            .attr("class", "nav-arrow top-level")
            .style("background", "#f0f0f0")  // Light gray background
            .style("border", "1px solid #333")  // Darker border
            .style("border-radius", "4px")
            .style("padding", "3px 10px")  // Slightly larger padding
            .style("cursor", "pointer")
            .style("font-size", "20px")  // Larger font size
            .style("color", "#000")  // Black color
            .style("font-weight", "bolder")  // Heavier weight
            .style("box-shadow", "0px 1px 3px rgba(0,0,0,0.2)")  // Add subtle shadow
            .html("↟") // Double up arrow for top level
            .attr("title", "Return to top level")
            .on("click", function() {
                // Reset to country level
                drillDownStack = [];
                currentGeographicLevel = 'orderCountry';
                // Update dropdown to match - use correct selector
                const select = document.querySelector('#country-risk-chart').parentElement.querySelector('#geographic-level-select');
                if (select) select.value = 'orderCountry';
                initCountryRiskChart();
            });
    }

    countryRiskSvg = chartContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Sort the data based on the activeKey (On-Time Deliveries or Late Deliveries)
    data.sort((a, b) => b[activeKey] - a[activeKey]); // Sort descending

    // Find the maximum value for the active key to set the domain dynamically
    // Add 10% padding to make bars more visible
    const maxValue = d3.max(data, d => d[activeKey]) * 1.1;
    // Set the x scale based on the maximum value, not fixed at 100
    const x = d3.scaleLinear().domain([0, maxValue]).range([0, width]);
    
    const y = d3.scaleBand()
        .domain(data.map(d => d.geographicUnit))
        .range([0, height])
        .padding(0.2);

    const keys = ['onTimeDeliveries', 'lateDeliveries'];
    const colors = {
        onTimeDeliveries: '#4CAF50',
        lateDeliveries: '#FF5722'
    };
    const labels = {
        onTimeDeliveries: 'On-Time Delivery',
        lateDeliveries: 'Late Delivery'
    };

    const drawBars = () => {
        countryRiskSvg.selectAll(".bar-group").remove();

        countryRiskSvg.append("g")
            .attr("class", "bar-group")
            .selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", d => y(d.geographicUnit))
            .attr("height", y.bandwidth())
            .attr("width", d => x(d[activeKey]))
            .attr("fill", colors[activeKey])
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", d3.color(colors[activeKey]).brighter(0.2));
                countryRiskTooltip.transition().duration(200).style("opacity", .9);
                
                let tooltipContent = `<strong>${d.geographicUnit}</strong><br/>${labels[activeKey]}: ${d[activeKey].toFixed(1)}%`;
                
                // Add interaction hints
                tooltipContent += `<br/><span style="color:#4CAF50;font-size:10px">Click to filter all charts</span>`;
                tooltipContent += `<br/><span style="color:#1976d2;font-size:10px">Middle-click to drill down</span>`;
                
                // Add drill-down hint based on current level
                if (currentGeographicLevel === 'orderCountry') {
                    tooltipContent += `<br/><span style="color:#aaa;font-size:10px">Middle-click to see states in ${d.geographicUnit}</span>`;
                } else if (currentGeographicLevel === 'orderState') {
                    tooltipContent += `<br/><span style="color:#aaa;font-size:10px">Middle-click to see cities in ${d.geographicUnit}</span>`;
                }
                
                countryRiskTooltip.html(tooltipContent)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", colors[activeKey]);
                countryRiskTooltip.transition().duration(500).style("opacity", 0);
            })
            .on("click", function(event, d) {
                // Single click: Apply cross-chart filter
                const filterType = currentGeographicLevel; // orderCountry, orderState, orderCity
                
                // Check if this filter is already active
                if (isCrossChartFilterActive(filterType) && getActiveCrossChartFilter(filterType) === d.geographicUnit) {
                    // Remove the cross-chart filter
                    removeCrossChartFilter(filterType);
                } else {
                    // Apply cross-chart filter
                    applyCrossChartFilter(filterType, d.geographicUnit, 'country-risk');
                }
                
                // Update visual state
                updateCountryChartVisualState();
            })
            .on("mousedown", function(event, d) {
                // Middle mouse button (button 1): Handle drill-down navigation
                if (event.button === 1) {
                    event.preventDefault(); // Prevent default middle-click behavior
                    
                    // Highlight the clicked bar
                    d3.selectAll(".bar-group rect").attr("stroke", "none").attr("stroke-width", 0);
                    d3.select(this).attr("stroke", "#2196f3").attr("stroke-width", 2);
                    
                    // Handle drill-down if applicable
                    if (currentGeographicLevel === 'orderCountry') {
                        drillDownStack = [{ field: 'orderCountry', value: d.geographicUnit }];
                        currentGeographicLevel = 'orderState';
                        
                        const select = document.querySelector('#country-risk-chart').parentElement.querySelector('#geographic-level-select');
                        if (select) select.value = 'orderState';
                        
                        initCountryRiskChart();
                    } 
                    else if (currentGeographicLevel === 'orderState') {
                        let newDrillDownStack = [];
                        
                        if (drillDownStack.length > 0) {
                            newDrillDownStack = [...drillDownStack];
                        } else {
                            const stateRecords = globalData.filter(item => item.orderState === d.geographicUnit);
                            if (stateRecords.length > 0) {
                                const country = stateRecords[0].orderCountry;
                                newDrillDownStack.push({ field: 'orderCountry', value: country });
                            }
                        }
                        
                        newDrillDownStack.push({ field: 'orderState', value: d.geographicUnit });
                        drillDownStack = newDrillDownStack;
                        
                        currentGeographicLevel = 'orderCity';
                        
                        const select = document.querySelector('#country-risk-chart').parentElement.querySelector('#geographic-level-select');
                        if (select) select.value = 'orderCity';
                        
                        initCountryRiskChart();
                    }
                }
            });
    }

    drawBars();

    // X-axis without tick marks
    countryRiskSvg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d => d.toFixed(1) + "%")
            .tickSize(0)) // Remove tick marks by setting size to 0
        .call(g => g.select(".domain").attr("stroke-opacity", 0.5)) // Make axis line more subtle
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 10)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Delivery Rate (%)");

    // Y-axis without tick marks but with improved spacing
    countryRiskSvg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y)
            .tickSize(0)) 
        .call(g => {
            g.select(".domain").attr("stroke-opacity", 0.5);
            
            // Add more padding between tick text and axis line
            g.selectAll(".tick text")
                .attr("x", -12) // Add more negative space to move text further left
                .style("text-anchor", "end")
                .style("font-size", "11px"); // Slightly reduce font size for better fit
        })
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20) // Increase position to move further from axis
        .attr("x", -height / 2)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(getGeographicDisplayName(currentGeographicLevel));

    const legend = countryRiskSvg.append("g")
        .attr("transform", `translate(0, -30)`)
        .selectAll("g")
        .data(keys)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(${i * 150}, 0)`)
        .style("cursor", "pointer")
        .on("click", function(event, key) {
            activeKey = key;
            // Re-sort data based on the newly active key and redraw bars
            data.sort((a, b) => b[activeKey] - a[activeKey]); // Sort descending
            y.domain(data.map(d => d.geographicUnit)); // Update Y-axis domain
            
            // Find the new maximum value for the new active key
            const newMaxValue = d3.max(data, d => d[activeKey]) * 1.1;
            x.domain([0, newMaxValue]); // Update X-axis domain
            
            // Update x-axis with transition
            countryRiskSvg.select(".x-axis").transition().duration(750)
                .call(d3.axisBottom(x)
                    .tickFormat(d => d.toFixed(1) + "%")
                    .tickSize(0));
                    
            // Update y-axis with transition
            countryRiskSvg.select(".y-axis").transition().duration(750)
                .call(d3.axisLeft(y).tickSize(0))
                .call(g => {
                    g.selectAll(".tick text")
                        .attr("x", -12)
                        .style("text-anchor", "end")
                        .style("font-size", "11px");
                });
                
            drawBars();
            legend.selectAll("rect").style("opacity", d => d === key ? 1 : 0.3);
        });

    legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => colors[d])
        .attr("stroke", "#ccc");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .text(d => labels[d]);
}

function updateCountryChartVisualState() {
    const activeFilter = getActiveCrossChartFilter(currentGeographicLevel);
    
    const bars = countryRiskSvg.selectAll("rect");
    
    if (activeFilter) {
        // Highlight the selected bar
        bars.attr("stroke", d => d.geographicUnit === activeFilter ? "#2196f3" : "none")
            .attr("stroke-width", d => d.geographicUnit === activeFilter ? 3 : 0)
            .style("opacity", d => d.geographicUnit === activeFilter ? 1 : 0.5);
    } else {
        // Reset all bars
        bars.attr("stroke", "none")
            .attr("stroke-width", 0)
            .style("opacity", 1);
    }
}

function cleanupCountryRiskChart() {
    // Remove the SVG and its elements if they exist
    if (countryRiskSvg) {
        countryRiskSvg.selectAll("*").remove();
        countryRiskSvg.remove();
        countryRiskSvg = null;
    }
    // Remove the tooltip if it exists
    if (countryRiskTooltip) {
        countryRiskTooltip.remove();
        countryRiskTooltip = null;
    }

    // Clean up controls to prevent duplicates if chart is re-initialized multiple times
    d3.select("#country-risk-controls").selectAll("*").remove();
}
