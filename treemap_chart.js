let treemapSvg = null;
let treemapTooltip = null; 
let currentHierarchyLevel = "categoryName"; // Default level
let currentHierarchyPath = []; // Track the drill-down path

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

// Add this helper function to determine text color based on background lightness
function getTextColor(riskValue, minRisk, maxRisk) {
    const normalizedRisk = (riskValue - minRisk) / (maxRisk - minRisk);
    
    return normalizedRisk < 0.5 ? "#1e293b" : "white"; 
}

// Add this helper function for text shadow
function getTextShadow(riskValue, minRisk, maxRisk) {
    const normalizedRisk = (riskValue - minRisk) / (maxRisk - minRisk);

    if (normalizedRisk < 0.5) {
        return "0 1px 2px rgba(255, 255, 255, 0.8)"; 
    } else {
        return "1px 1px 2px rgba(0, 0, 0, 0.7)"; 
    }
}

async function initTreemapChart(filteredData) {
    console.log('Initializing Treemap Chart...');
    try {
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
    // Remove any existing controls from the chart area
    d3.select("#treemap-chart").select(".hierarchy-controls").remove();
    
    // Find the treemap chart container
    const chartContainer = d3.select("#treemap-chart").node().parentElement;
    
    // Check if title-with-controls already exists
    let titleContainer = d3.select(chartContainer).select(".title-with-controls");
    
    if (titleContainer.empty()) {
        // Find and modify the existing h4 title
        const existingTitle = d3.select(chartContainer).select("h4");
        
        if (!existingTitle.empty()) {
            // Get the title text before removing
            const titleText = existingTitle.text();
            
            // Remove the existing h4
            existingTitle.remove();
            
            // Create new title container with flex layout
            titleContainer = d3.select(chartContainer)
                .insert("div", ":first-child")
                .attr("class", "title-with-controls")
                .style("display", "flex")
                .style("justify-content", "space-between")
                .style("align-items", "center")
                .style("margin-bottom", "8px")
                .style("border-bottom", "1px solid #f0f0f0")
                .style("padding-bottom", "6px")
                .style("flex-shrink", "0");
            
            titleContainer.append("h4")
                .style("color", "#333")
                .style("margin", "0")
                .style("line-height", "1.2")
                .text(titleText);
        }
    }
    
    titleContainer.select(".hierarchy-controls").remove();
    
    const controls = titleContainer.append("div")
        .attr("class", "hierarchy-controls")
        .style("display", "flex")
        .style("gap", "12px") 
        .style("align-items", "center")
        .style("padding", "8px 12px") 
        .style("background", "rgba(255, 255, 255, 0.95)")
        .style("border", "2px solid var(--primary-300)") 
        .style("border-radius", "6px")
        .style("box-shadow", "0 2px 6px rgba(30, 41, 59, 0.1)");
    
    controls.append("span")
        .style("font-size", "14px") 
        .style("color", "var(--primary-700)")
        .style("white-space", "nowrap")
        .style("font-weight", "600") 
        .text("Level:");
    
    controls.append("select")
        .attr("id", "hierarchy-level-select")
        .style("padding", "6px 10px") 
        .style("border-radius", "6px") 
        .style("border", "2px solid var(--primary-300)") 
        .style("font-size", "13px") 
        .style("background", "white")
        .style("min-height", "32px") 
        .style("min-width", "100px") 
        .on("change", function() {
            currentHierarchyLevel = this.value;
            currentHierarchyPath = []; 
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
    
    // Add navigation controls container
    const navControls = controls.append("div")
        .attr("class", "navigation-controls")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "4px");
    
    // Update navigation controls
    updateNavigationControls();
}

function updateNavigationControls() {
    const navControls = d3.select(".navigation-controls");
    
    if (navControls.empty()) {
        return;
    }

    navControls.html("");
    
    if (currentHierarchyPath.length > 0) {
        navControls.append("button")
            .attr("class", "nav-arrow up-arrow")
            .style("background", "#f0f0f0")
            .style("border", "1px solid #ccc")
            .style("border-radius", "3px")
            .style("padding", "2px 6px")
            .style("cursor", "pointer")
            .style("font-size", "20px")
            .style("color", "#333")
            .style("line-height", "1")
            .html("↑")
            .attr("title", "Go up one level")
            .on("click", function() {
                // Go up one level in the hierarchy
                if (currentHierarchyPath.length > 0) {
                    currentHierarchyPath.pop();
                    
                    // If we still have path, stay at current level, otherwise go back
                    if (currentHierarchyPath.length === 0) {
                        currentHierarchyLevel = "departmentName";
                    }
                    
                    d3.select("#hierarchy-level-select").property("value", currentHierarchyLevel);
                    initTreemapChart();
                }
            });
        
        // Add direct jump to top level
        navControls.append("button")
            .attr("class", "nav-arrow top-level")
            .style("background", "#f0f0f0")
            .style("border", "1px solid #ccc")
            .style("border-radius", "3px")
            .style("padding", "2px 6px")
            .style("cursor", "pointer")
            .style("font-size", "20px")
            .style("color", "#333")
            .style("line-height", "1")
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
      
            const uniqueOrders = new Set(v.map(d => d.orderId));
            const totalOrders = uniqueOrders.size;
            
            // Calculate risk based on unique orders
            const orderLevelData = Array.from(d3.group(v, d => d.orderId), ([orderId, orderItems]) => {
                const firstItem = orderItems[0];
                return {
                    orderId: orderId,
                    lateDeliveryRisk: firstItem.lateDeliveryRisk,
                    orderQuantity: d3.sum(orderItems, item => item.orderQuantity)
                };
            });
            
            const lateRiskOrders = orderLevelData.filter(order => order.lateDeliveryRisk === 1).length;
            const avgLateDeliveryRisk = totalOrders > 0 ? (lateRiskOrders / totalOrders) * 100 : 0;
            const totalQuantity = d3.sum(orderLevelData, order => order.orderQuantity);
            
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
                totalOrders: totalOrders, 
                avgLateDeliveryRisk: avgLateDeliveryRisk,
                parentName: v[0][parentField], // Store parent for reference
                children: children
            };
        },
        d => d[groupField]
    );


    let root = {
        name: currentHierarchyPath.length > 0 
            ? `${currentHierarchyPath[currentHierarchyPath.length - 1].name} (${getLevelName(currentHierarchyLevel)})`
            : getLevelName(currentHierarchyLevel),
        children: []
    };
    
    groupedData.forEach((value, key) => {
        if (value.totalOrders > 0) { 
            root.children.push({
                name: key,
                value: value.avgLateDeliveryRisk + 1, 
                totalQuantity: value.totalQuantity,
                totalOrders: value.totalOrders, 
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

function getLevelName(level) {
    switch(level) {
        case "departmentName": return "Departments";
        case "categoryName": return "Categories";
        case "productName": return "Products";
        default: return "Items";
    }
}

function applyHierarchyPathFilter(data) {
    if (currentHierarchyPath.length === 0) {
        return data;
    }

    let filtered = [...data];
    
    currentHierarchyPath.forEach(pathItem => {
        if (pathItem.level === "departmentName") {
            filtered = filtered.filter(d => d.departmentName === pathItem.name);
        } else if (pathItem.level === "categoryName") {
            filtered = filtered.filter(d => d.categoryName === pathItem.name);
        }

    });
    
    return filtered;
}

function createTreemapChart(data) {
    // Clear existing chart SVG only, not the entire container
    d3.select("#treemap-chart").selectAll("svg").remove(); 

    const container = d3.select("#treemap-chart");
    const containerRect = container.node().getBoundingClientRect();

    console.log('Treemap Chart: Container Rect:', containerRect);

    const margin = { top: 10, right: 10, bottom: 60, left: 10 };
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
        .style("display", "block")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const treemap = d3.treemap()
        .size([width, height])
        .paddingOuter(2)
        .paddingInner(1);

    const root = d3.hierarchy(data)
        .sum(d => d.value) 
        .sort((a, b) => b.data.lateDeliveryRisk - a.data.lateDeliveryRisk); 

    treemap(root);

    const riskValues = root.leaves().map(d => d.data.lateDeliveryRisk);
    const minRisk = d3.min(riskValues);
    const maxRisk = d3.max(riskValues);
    
    console.log('Risk range:', { min: minRisk, max: maxRisk });

    const colorScale = d3.scaleSequential()
        .domain([minRisk, maxRisk])
        .interpolator(t => {
    
          if (t <= 0.2) return '#f1f5f9'; // --primary-100
          else if (t <= 0.4) return '#cbd5e1'; // --primary-300
          else if (t <= 0.6) return '#64748b'; // --primary-500
          else if (t <= 0.8) return '#334155'; // --primary-700
          else return '#0f172a'; // --primary-900
        });

    const cell = treemapSvg.selectAll("g")
        .data(root.leaves())
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("opacity", 0); 

    const rects = cell.append("rect")
        .attr("width", 0) // Start with 0 width for animation
        .attr("height", 0) // Start with 0 height for animation
        .attr("fill", d => colorScale(d.data.lateDeliveryRisk)) // Use blue gradient
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
                <strong>Late Delivery Risk:</strong> <span style="color: #F44336;">${d.data.lateDeliveryRisk ? d.data.lateDeliveryRisk.toFixed(1) : 'N/A'}%</span>
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
                event.preventDefault(); 
                
                // Highlight the cell
                treemapSvg.selectAll("rect").attr("stroke", "#fff").attr("stroke-width", 0.5);
                d3.select(this).attr("stroke", "#2196f3").attr("stroke-width", 3);
                
                if (d.data.hasChildren) {
                    handleDrillDown(d.data);
                }
            }
        });

    // Add smooth transition to cells
    cell.transition()
        .duration(750)
        .delay((d, i) => i * 25)
        .ease(d3.easeQuadOut)
        .style("opacity", 1);

    // Add smooth transition to rectangles
    rects.transition()
        .duration(750)
        .delay((d, i) => i * 25)
        .ease(d3.easeQuadOut)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    const labels = cell.append("text")
        .attr("x", 4)
        .attr("y", 14)
        .text(d => {
            const cellWidth = d.x1 - d.x0;
            const cellHeight = d.y1 - d.y0;
            return cellWidth > 50 && cellHeight > 20 
                ? (d.data.name.length > 20 ? d.data.name.substring(0, 20) + "..." : d.data.name)
                : '';
        })
        .attr("font-size", "10px")
        .attr("fill", d => getTextColor(d.data.lateDeliveryRisk, minRisk, maxRisk)) // Dynamic color
        .style("font-weight", "500") // Slightly bolder for better readability
        .style("text-shadow", d => getTextShadow(d.data.lateDeliveryRisk, minRisk, maxRisk)) // Dynamic shadow
        .style("opacity", 0);

    // Animate text labels
    labels.transition()
        .duration(500)
        .delay((d, i) => 750 + i * 25)
        .ease(d3.easeQuadOut)
        .style("opacity", 1);
        
    // UPDATED: Add drill down indicator with dynamic color
    const indicators = cell.filter(d => d.data.hasChildren)
        .append("text")
        .attr("x", d => (d.x1 - d.x0) - 15)
        .attr("y", d => (d.y1 - d.y0) - 8)
        .text("↓") // Down arrow for drill-down
        .attr("font-size", "10px")
        .attr("fill", d => getTextColor(d.data.lateDeliveryRisk, minRisk, maxRisk)) // Dynamic color
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("text-shadow", d => getTextShadow(d.data.lateDeliveryRisk, minRisk, maxRisk)) // Dynamic shadow
        .style("pointer-events", "none")
        .style("opacity", 0);

    // Animate drill down indicators
    indicators.transition()
        .duration(500)
        .delay((d, i) => 1000 + i * 25)
        .ease(d3.easeQuadOut)
        .style("opacity", 1);

    // Create dynamic legend based on actual data range with PRIMARY blue-gray gradient
    createDynamicLegend(treemapSvg, width, height, margin, colorScale, minRisk, maxRisk, riskValues);
}

// Create dynamic legend function with PRIMARY blue-gray gradient
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

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const percent = (i / steps) * 100;
        const value = minRisk + (maxRisk - minRisk) * (i / steps);
        gradient.append("stop")
            .attr("offset", `${percent}%`)
            .attr("stop-color", colorScale(value)); // Use PRIMARY blue-gray gradient
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
}

// Handle drill-down interaction
function handleDrillDown(data) {
    let nextLevel;

    if (currentHierarchyLevel === "departmentName") {
        nextLevel = "categoryName";
    } else if (currentHierarchyLevel === "categoryName") {
        nextLevel = "productName";
    } else {
        return; 
    }

    currentHierarchyPath.push({
        level: currentHierarchyLevel,
        name: data.name
    });

    currentHierarchyLevel = nextLevel;

    d3.select("#hierarchy-level-select").property("value", currentHierarchyLevel);
 
    initTreemapChart();
}

function updateTreemapVisualState() {
    if (!treemapSvg) return;
    
    const currentFilterType = currentHierarchyLevel;
    const isFiltered = isCrossChartFilterActive(currentFilterType);
    const activeFilterValue = isFiltered ? getActiveCrossChartFilter(currentFilterType) : null;
    
    if (isFiltered && activeFilterValue) {
        // Highlight filtered item, dim others
        treemapSvg.selectAll("rect")
            .style("opacity", d => d.data.name === activeFilterValue ? 1 : 0.3);
        
        treemapSvg.selectAll("text")
            .style("opacity", d => d.data.name === activeFilterValue ? 1 : 0.5);
    } else {
        // Reset all to normal
        treemapSvg.selectAll("rect")
            .style("opacity", 1);
        
        treemapSvg.selectAll("text")
            .style("opacity", 1);
    }
}

function cleanupTreemapChart() {
    if (treemapSvg) {
        treemapSvg.selectAll("*").remove();
        treemapSvg.remove();
        treemapSvg = null;
    }
    console.log('Treemap Chart cleaned up.');
}