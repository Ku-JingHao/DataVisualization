// treemap_chart.js
let treemapSvg = null;
let treemapTooltip = null; 
let currentHierarchyLevel = "categoryName"; // Default level
let currentHierarchyPath = []; // Track the drill-down path

// Initialize tooltip once when the script loads
document.addEventListener('DOMContentLoaded', function() {
    treemapTooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0,0,0,0.9)")
        .style("color", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "12px");
});

// Update the initialization function to remove the static filter
async function initTreemapChart(filteredData) {
    console.log('Initializing Treemap Chart...');
    try {
        // First, always clean up everything in the chart container
        d3.select("#treemap-chart").selectAll("*").remove();
        
        // Use provided filtered data or global data
        const dataToUse = filteredData || globalData;
        
        if (!dataToUse || dataToUse.length === 0) {
            await initializeDataLoader();
            if (!globalData || globalData.length === 0) {
                console.error('No data available for treemap chart');
                return;
            }
        }

        // Add hierarchy level selector if it doesn't exist
        addHierarchyLevelSelector();

        // Process data based on current hierarchy level and path
        const processedData = processTreemapData(dataToUse);
        console.log('Treemap Chart: Processed data (root hierarchy):', processedData);

        // Check if we have data to display
        if (!processedData || !processedData.children || processedData.children.length === 0) {
            // Create container for the message
            const noDataContainer = d3.select("#treemap-chart")
                .append("div")
                .attr("class", "no-data-message")
                .style("text-align", "center")
                .style("padding-top", "50px");
            
            noDataContainer.append("p")
                .style("color", "#666")
                .text("No data available for the current selection.");
            
            return;
        }

        createTreemapChart(processedData);
        console.log('Treemap Chart initialized successfully');
    } catch (error) {
        console.error('Error initializing treemap chart:', error);
    }
}

function addHierarchyLevelSelector() {
    const container = d3.select("#treemap-chart");
    
    // Check if the selector already exists
    if (container.select(".hierarchy-controls").empty()) {
        // Create the controls container
        const controls = container.append("div")
            .attr("class", "hierarchy-controls")
            .style("position", "absolute")
            .style("top", "0")
            .style("right", "10px")
            .style("display", "flex")
            .style("gap", "10px")
            .style("align-items", "center")
            .style("z-index", "10");
        
        // Add level selector
        controls.append("select")
            .attr("id", "hierarchy-level-select")
            .style("padding", "5px")
            .style("border-radius", "4px")
            .style("border", "1px solid #ddd")
            .style("font-size", "12px")
            .on("change", function() {
                currentHierarchyLevel = this.value;
                currentHierarchyPath = []; // Reset path when changing level
                initTreemapChart();
            })
            .selectAll("option")
            .data([
                {value: "departmentName", text: "Department"},
                {value: "categoryName", text: "Category"},
                {value: "productName", text: "Product"}
            ])
            .enter()
            .append("option")
            .attr("value", d => d.value)
            .property("selected", d => d.value === currentHierarchyLevel)
            .text(d => d.text);
        
        // Add navigation controls
        controls.append("div")
            .attr("class", "navigation-controls")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin-left", "10px");
    } else {
        // Update the existing selector to reflect the current hierarchy level
        container.select("#hierarchy-level-select")
            .selectAll("option")
            .property("selected", d => d.value === currentHierarchyLevel);
    }
    
    updateNavigationControls();
}

function updateNavigationControls() {
    const navControls = d3.select(".navigation-controls");
    
    if (navControls.empty()) {
        return;
    }
    
    // Clear existing controls
    navControls.html("");
    
    // Only add navigation arrows if we have a path
    if (currentHierarchyPath.length > 0) {
        // Add up arrow for navigation (go up one level)
        navControls.append("button")
            .attr("class", "nav-arrow up-arrow")
            .style("background", "#f0f0f0")
            .style("border", "1px solid #333")
            .style("border-radius", "4px")
            .style("padding", "3px 10px")
            .style("margin-right", "8px")
            .style("cursor", "pointer")
            .style("font-size", "20px")
            .style("color", "#000")
            .style("font-weight", "bolder")
            .style("box-shadow", "0px 1px 3px rgba(0,0,0,0.2)")
            .html("↑")
            .attr("title", "Go up one level")
            .on("click", function(event, d) {
                // Single click: Handle drill-down
                treemapSvg.selectAll("rect").attr("stroke", "#fff").attr("stroke-width", 0.5);
                d3.select(this).attr("stroke", "#2196f3").attr("stroke-width", 3);
                
                // Handle drill-down if applicable
                if (d.data.hasChildren) {
                    handleDrillDown(d.data);
                }
            })
            .on("dblclick", function(event, d) {
                // Double click: Apply cross-chart filter
                const filterType = currentHierarchyLevel; // departmentName, categoryName, productName
                
                // Check if this filter is already active
                if (isCrossChartFilterActive(filterType) && getActiveCrossChartFilter(filterType) === d.data.name) {
                    // Remove the cross-chart filter
                    removeCrossChartFilter(filterType);
                } else {
                    // Apply cross-chart filter
                    applyCrossChartFilter(filterType, d.data.name, 'treemap');
                }
                
                // Update visual state
                updateTreemapVisualState();
                
                // Prevent event from bubbling to single click
                event.stopPropagation();
            });
        
        // Add direct jump to top level
        navControls.append("button")
            .attr("class", "nav-arrow top-level")
            .style("background", "#f0f0f0")
            .style("border", "1px solid #333")
            .style("border-radius", "4px")
            .style("padding", "3px 10px")
            .style("cursor", "pointer")
            .style("font-size", "20px")
            .style("color", "#000")
            .style("font-weight", "bolder")
            .style("box-shadow", "0px 1px 3px rgba(0,0,0,0.2)")
            .html("↟")
            .attr("title", "Return to top level")
            .on("click", function() {
                currentHierarchyPath = [];
                currentHierarchyLevel = "departmentName";
                d3.select("#hierarchy-level-select").property("value", currentHierarchyLevel);
                initTreemapChart();
            });
    }
}

function processTreemapData(data) {
    // Filter data based on the current drill-down path
    let filteredData = data;
    
    if (currentHierarchyPath.length > 0) {
        filteredData = applyHierarchyPathFilter(data);
    }
    
    // Determine field names based on current hierarchy level
    let groupField, parentField, childField;
    
    if (currentHierarchyLevel === "departmentName") {
        groupField = "departmentName";
        childField = "categoryName";
    } else if (currentHierarchyLevel === "categoryName") {
        groupField = "categoryName";
        parentField = "departmentName";
        childField = "productName";
    } else { // productName
        groupField = "productName";
        parentField = "categoryName";
    }
    
    // Group data by the current level
    const groupedData = d3.rollup(
        filteredData,
        v => {
            const totalQuantity = d3.sum(v, d => d.orderQuantity);
            // Count orders with late delivery risk, considering quantity
            const lateOrdersQuantity = d3.sum(v.filter(d => d.lateDeliveryRisk === 1), d => d.orderQuantity);
            // Calculate risk percentage based on quantity
            const avgLateDeliveryRisk = totalQuantity > 0 ? (lateOrdersQuantity / totalQuantity) * 100 : 0;
            
            // For drill-down, collect all unique child values
            let children = [];
            if (childField) {
                // Get unique child items
                children = Array.from(new Set(v.map(d => d[childField])))
                    .filter(name => name) // Remove empty values
                    .map(name => ({
                        name: name,
                        parentName: v[0][groupField] // Store parent name for reference
                    }));
            }
            
            return {
                totalQuantity: totalQuantity,
                avgLateDeliveryRisk: avgLateDeliveryRisk,
                parentName: v[0][parentField], // Store parent for reference
                children: children
            };
        },
        d => d[groupField]
    );

    // Convert to hierarchical data structure for treemap
    let root = {
        name: currentHierarchyPath.length > 0 
            ? `${currentHierarchyPath[currentHierarchyPath.length - 1].name} (${getLevelName(currentHierarchyLevel)})`
            : getLevelName(currentHierarchyLevel),
        children: []
    };
    
    groupedData.forEach((value, key) => {
        if (value.totalQuantity > 0) {
            root.children.push({
                name: key,
                value: value.avgLateDeliveryRisk + 1, // Size by risk percentage (add 1 to avoid zero size)
                totalQuantity: value.totalQuantity,
                lateDeliveryRisk: value.avgLateDeliveryRisk,
                parentName: value.parentName,
                hasChildren: value.children && value.children.length > 0
            });
        }
    });

    // Sort children by lateDeliveryRisk in descending order
    root.children.sort((a, b) => b.lateDeliveryRisk - a.lateDeliveryRisk);

    return root;
}

// Helper function to get a friendly name for the current level
function getLevelName(level) {
    switch(level) {
        case "departmentName": return "Departments";
        case "categoryName": return "Categories";
        case "productName": return "Products";
        default: return "Items";
    }
}

// Apply filters based on the current hierarchy path
function applyHierarchyPathFilter(data) {
    if (currentHierarchyPath.length === 0) {
        return data;
    }
    
    // Start with the full dataset
    let filtered = [...data];
    
    // Apply each level of filtering
    currentHierarchyPath.forEach(pathItem => {
        if (pathItem.level === "departmentName") {
            filtered = filtered.filter(d => d.departmentName === pathItem.name);
        } else if (pathItem.level === "categoryName") {
            filtered = filtered.filter(d => d.categoryName === pathItem.name);
        }
        // We don't filter on productName as it's the lowest level
    });
    
    return filtered;
}

function createTreemapChart(data) {
    // Clear existing chart
    d3.select("#treemap-chart").selectAll("svg").remove(); 

    const container = d3.select("#treemap-chart");
    const containerRect = container.node().getBoundingClientRect();

    console.log('Treemap Chart: Container Rect:', containerRect);

    const margin = { top: 40, right: 10, bottom: 60, left: 10 }; // Increased top margin for controls
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;

    console.log('Treemap Chart: Calculated dimensions: Width=', width, 'Height=', height);

    if (width <= 0 || height <= 0) {
        console.error('Treemap Chart: Calculated width or height is non-positive. Cannot render chart.');
        container.html("<p style='text-align: center; color: #666;'>Chart area too small or invalid dimensions.</p>");
        return;
    }

    treemapSvg = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const treemap = d3.treemap()
        .size([width, height])
        .paddingOuter(2)
        .paddingInner(1);

    const root = d3.hierarchy(data)
        .sum(d => d.value) // Use value (risk percentage) for sizing
        .sort((a, b) => b.data.lateDeliveryRisk - a.data.lateDeliveryRisk); 

    treemap(root);

    // FIXED: Dynamic color scale based on actual data range
    const riskValues = root.leaves().map(d => d.data.lateDeliveryRisk);
    const minRisk = d3.min(riskValues);
    const maxRisk = d3.max(riskValues);
    
    console.log('Risk range:', { min: minRisk, max: maxRisk });
    
    // Create dynamic color scale using the actual data range
    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([minRisk, maxRisk]);

    const cell = treemapSvg.selectAll("g")
        .data(root.leaves())
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    cell.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => colorScale(d.data.lateDeliveryRisk))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);
            
            let parentLevel = "";
            if (currentHierarchyLevel === "categoryName") {
                parentLevel = "Department";
            } else if (currentHierarchyLevel === "productName") {
                parentLevel = "Category";
            }
            
            const tooltipContent = `
                <strong>${getLevelName(currentHierarchyLevel).slice(0, -1)}:</strong> ${d.data.name}<br/>
                ${d.data.parentName ? `<strong>${parentLevel}:</strong> ${d.data.parentName}<br/>` : ''}
                <strong>Total Orders:</strong> ${d.data.totalQuantity ? d.data.totalQuantity.toLocaleString() : 'N/A'}<br/>
                <strong>Late Delivery Risk:</strong> ${d.data.lateDeliveryRisk ? d.data.lateDeliveryRisk.toFixed(1) : 'N/A'}%<br/>
                <span style="color:#4CAF50;font-size:10px;">Click to filter all charts</span><br/>
                <span style="color:#1976d2;font-size:10px;">Middle-click to drill down</span>
                ${!d.data.hasChildren ? '<br/><span style="color:#aaa;font-size:10px;">No drill-down available</span>' : ''}
            `;
            
            treemapTooltip.transition()
                .duration(200)
                .style("opacity", .9);
            treemapTooltip.html(tooltipContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.5);
            treemapTooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function(event, d) {
            // Single click: Apply cross-chart filter
            const filterType = currentHierarchyLevel; // departmentName, categoryName, productName
            
            // Check if this filter is already active
            if (isCrossChartFilterActive(filterType) && getActiveCrossChartFilter(filterType) === d.data.name) {
                // Remove the cross-chart filter
                removeCrossChartFilter(filterType);
            } else {
                // Apply cross-chart filter
                applyCrossChartFilter(filterType, d.data.name, 'treemap');
            }
            
            // Update visual state
            updateTreemapVisualState();
        })
        .on("mousedown", function(event, d) {
            // Middle mouse button (button 1): Handle drill-down
            if (event.button === 1) {
                event.preventDefault(); // Prevent default middle-click behavior
                
                // Highlight the cell
                treemapSvg.selectAll("rect").attr("stroke", "#fff").attr("stroke-width", 0.5);
                d3.select(this).attr("stroke", "#2196f3").attr("stroke-width", 3);
                
                // Handle drill-down if applicable
                if (d.data.hasChildren) {
                    handleDrillDown(d.data);
                }
            }
        });

    // Add text labels to cells
    cell.append("text")
        .attr("x", 4)
        .attr("y", 14)
        .text(d => {
            const cellWidth = d.x1 - d.x0;
            const cellHeight = d.y1 - d.y0;
            // Only show text if cell is large enough
            return cellWidth > 50 && cellHeight > 20 
                ? (d.data.name.length > 20 ? d.data.name.substring(0, 20) + "..." : d.data.name)
                : '';
        })
        .attr("font-size", "10px")
        .attr("fill", "white")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)");
        
    // Add drill down indicator for cells with children
    cell.filter(d => d.data.hasChildren)
        .append("text")
        .attr("x", d => (d.x1 - d.x0) - 15)
        .attr("y", d => (d.y1 - d.y0) - 8)
        .text("↓") // Down arrow for drill-down
        .attr("font-size", "10px")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
        .style("pointer-events", "none");

    // FIXED: Create dynamic legend based on actual data range
    createDynamicLegend(treemapSvg, width, height, margin, colorScale, minRisk, maxRisk, riskValues);
}

function updateTreemapVisualState() {
    const activeFilter = getActiveCrossChartFilter(currentHierarchyLevel);
    
    const cells = treemapSvg.selectAll("rect");
    
    if (activeFilter) {
        // Highlight the selected cell
        cells.attr("stroke", d => d.data.name === activeFilter ? "#2196f3" : "#fff")
            .attr("stroke-width", d => d.data.name === activeFilter ? 4 : 0.5)
            .style("opacity", d => d.data.name === activeFilter ? 1 : 0.5);
    } else {
        // Reset all cells
        cells.attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .style("opacity", 1);
    }
}


// ADDED: Create dynamic legend function
function createDynamicLegend(svg, width, height, margin, colorScale, minRisk, maxRisk, riskValues) {
    // Create legend container
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width / 2 - 100}, ${height + margin.bottom - 40})`);

    // Legend dimensions
    const legendWidth = 200;
    const legendHeight = 15;

    // Create gradient definition
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "risk-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    // Add color stops to gradient
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const percent = (i / steps) * 100;
        const value = minRisk + (maxRisk - minRisk) * (i / steps);
        gradient.append("stop")
            .attr("offset", `${percent}%`)
            .attr("stop-color", colorScale(value));
    }

    // Add gradient rectangle
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#risk-gradient)")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1);

    // Add legend labels
    const legendScale = d3.scaleLinear()
        .domain([minRisk, maxRisk])
        .range([0, legendWidth]);

    // Calculate good tick values
    const tickCount = 5;
    const tickValues = [];
    for (let i = 0; i <= tickCount; i++) {
        const value = minRisk + (maxRisk - minRisk) * (i / tickCount);
        tickValues.push(value);
    }

    // Add tick marks and labels
    const ticks = legend.selectAll(".tick")
        .data(tickValues)
        .enter().append("g")
        .attr("class", "tick")
        .attr("transform", d => `translate(${legendScale(d)}, 0)`);

    // Add tick lines
    ticks.append("line")
        .attr("y1", legendHeight)
        .attr("y2", legendHeight + 5)
        .attr("stroke", "#666")
        .attr("stroke-width", 1);

    // Add tick labels
    ticks.append("text")
        .attr("y", legendHeight + 18)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .style("fill", "#555")
        .text(d => `${d.toFixed(1)}%`);

    // Add legend title
    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#555")
        .style("font-weight", "bold")
        .text("Late Delivery Risk (%)");

    // OPTIONAL: Add percentile information
    if (riskValues.length > 1) {
        const sortedValues = [...riskValues].sort(d3.ascending);
        const q1 = d3.quantile(sortedValues, 0.25);
        const median = d3.quantile(sortedValues, 0.5);
        const q3 = d3.quantile(sortedValues, 0.75);

        // Add quartile markers
        const quartiles = [
            { value: q1, label: "Q1" },
            { value: median, label: "Median" },
            { value: q3, label: "Q3" }
        ];

        quartiles.forEach(q => {
            if (q.value >= minRisk && q.value <= maxRisk) {
                legend.append("line")
                    .attr("x1", legendScale(q.value))
                    .attr("x2", legendScale(q.value))
                    .attr("y1", -3)
                    .attr("y2", legendHeight + 3)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "2,2");

                legend.append("text")
                    .attr("x", legendScale(q.value))
                    .attr("y", -6)
                    .attr("text-anchor", "middle")
                    .style("font-size", "8px")
                    .style("fill", "#333")
                    .style("font-weight", "bold")
                    .text(q.label);
            }
        });
    }
}

// Handle drill-down interaction
function handleDrillDown(data) {
    let nextLevel;
    
    // Determine the next level to drill down to
    if (currentHierarchyLevel === "departmentName") {
        nextLevel = "categoryName";
    } else if (currentHierarchyLevel === "categoryName") {
        nextLevel = "productName";
    } else {
        return; // Already at the lowest level
    }
    
    // Add this selection to the path
    currentHierarchyPath.push({
        level: currentHierarchyLevel,
        name: data.name
    });
    
    // Update the current level
    currentHierarchyLevel = nextLevel;
    
    // Update the selector to reflect the new level
    d3.select("#hierarchy-level-select").property("value", currentHierarchyLevel);
    
    // Reinitialize the chart with the new settings
    initTreemapChart();
}

function cleanupTreemapChart() {
    if (treemapSvg) {
        treemapSvg.selectAll("*").remove();
        treemapSvg.remove();
        treemapSvg = null;
    }
    console.log('Treemap Chart cleaned up.');
}
