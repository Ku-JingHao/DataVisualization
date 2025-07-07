function positionTooltipWithinViewport(tooltipSelection, event, offset = 10) {
      const tooltipNode = tooltipSelection.node();
      if (!tooltipNode) return;
      const tw = tooltipNode.offsetWidth;
      const th = tooltipNode.offsetHeight;
      const pageX = event.pageX;
      const pageY = event.pageY;
      let x = pageX + offset;
      let y = pageY + offset;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (x + tw > vw) {
        x = pageX - tw - offset;
        if (x < 0) x = vw - tw - offset;
      }
      if (y + th > vh) {
        y = pageY - th - offset;
        if (y < 0) y = vh - th - offset;
      }
      tooltipSelection.style("left", x + "px").style("top", y + "px");
    }

    // Parse functions and column mapping
    const parseDateTime = d3.timeParse("%m/%d/%Y %H:%M"),
      parseDateOnly = d3.timeParse("%Y-%m-%d");

    const COL = {
      orderDate: "order date (DateOrders)",
      sales: "Sales",
      profit: "Benefit per order",
      orderId: "Order Id",
      category: "Category Name",
      segment: "Customer Segment",
      region: "Order Region",
      country: "Order Country"
    };

    // Globals
    let rawData = [], filteredData = [];
    let countryFilter = null;
    const categories = new Set(),
      segmentsSet = new Set(),
      regions = new Set(),
      countriesSet = new Set();
    const segments = ["Consumer", "Corporate", "Home Office"];
    let sortOrders = { Consumer: true, Corporate: true, "Home Office": true };
    let currentSort = "Consumer";

    // Globals for full date extent
    let dateExtentStart = null, dateExtentEnd = null;

    // Active month for trend chart
    let activeMonth = null;

    // Create a single reusable tooltip for bar/treemap charts
    const chartTooltip = d3.select("body")
      .append("div")
      .attr("class", "chart-tooltip");

    // Create a single tooltip for the sales trend, once
    const salesTrendTooltip = d3.select("body")
      .append("div")
      .attr("class", "trend-tooltip")
      .style("opacity", 0);

    // Load and preprocess
    d3.csv("cleaned_dataset_complete_orders_country_region.csv", d => ({
      _orderDate: parseDateTime(d[COL.orderDate]),
      _sales: +d[COL.sales],
      _profit: +d[COL.profit],
      _orderId: d[COL.orderId],
      _category: d[COL.category],
      _segment: d[COL.segment],
      _region: d[COL.region],
      _country: d[COL.country]
    })).then(data => {
      rawData = data.filter(d => d._orderDate instanceof Date);
      rawData.forEach(d => {
        categories.add(d._category);
        segmentsSet.add(d._segment);
        regions.add(d._region);
        countriesSet.add(d._country);
      });

      // Compute and store full date extent
      if (rawData.length) {
        const ext = d3.extent(rawData, d => d._orderDate);
        dateExtentStart = ext[0];
        dateExtentEnd = ext[1];
      }

      initFilters();
      applyFiltersAndUpdate();
    });

    function initFilters() {
      const toInput = d => {
        const Y = d.getFullYear(),
          M = String(d.getMonth() + 1).padStart(2, "0"),
          D = String(d.getDate()).padStart(2, "0");
        return `${Y}-${M}-${D}`;
      };

      // Populate Category dropdown
      d3.select("#filter-category")
        .selectAll("option.dynamic")
        .data(Array.from(categories).sort())
        .join("option")
        .classed("dynamic", true)
        .attr("value", d => d)
        .text(d => d);

      // Populate Segment dropdown
      d3.select("#filter-segment")
        .selectAll("option.dynamic")
        .data(Array.from(segmentsSet).sort())
        .join("option")
        .classed("dynamic", true)
        .attr("value", d => d)
        .text(d => d);

      // Populate Region dropdown
      d3.select("#filter-region")
        .selectAll("option.dynamic")
        .data(Array.from(regions).sort())
        .join("option")
        .classed("dynamic", true)
        .attr("value", d => d)
        .text(d => d);

      // Populate Country dropdown
      d3.select("#filter-country")
        .selectAll("option.dynamic")
        .data(Array.from(countriesSet).sort())
        .join("option")
        .classed("dynamic", true)
        .attr("value", d => d)
        .text(d => d);

      // Initialize date pickers to full extent
      if (dateExtentStart && dateExtentEnd) {
        d3.select("#filter-start-date")
          .attr("value", toInput(dateExtentStart))
          .on("change", applyFiltersAndUpdate);
        d3.select("#filter-end-date")
          .attr("value", toInput(dateExtentEnd))
          .on("change", applyFiltersAndUpdate);
      }

      // Wire change listeners for selects
      d3.selectAll("#filters select").on("change", () => {
        const segVal = d3.select("#filter-segment").property("value");
        const countryVal = d3.select("#filter-country").property("value");
        countryFilter = (countryVal && countryVal !== "All") ? countryVal : null;
        if (segVal !== "All") {
          currentSort = segVal;
        }
        applyFiltersAndUpdate();
      });

      // Bind Clear Filters button
      d3.select("#clear-filters").on("click", () => {
        // Reset selects
        d3.select("#filter-category").property("value", "All");
        d3.select("#filter-segment").property("value", "All");
        d3.select("#filter-region").property("value", "All");
        d3.select("#filter-country").property("value", "All");
        // Reset dates
        if (dateExtentStart && dateExtentEnd) {
          d3.select("#filter-start-date").property("value", toInput(dateExtentStart));
          d3.select("#filter-end-date").property("value", toInput(dateExtentEnd));
        } else {
          d3.select("#filter-start-date").property("value", "");
          d3.select("#filter-end-date").property("value", "");
        }
        // Clear other global state
        activeMonth = null;
        countryFilter = null;
        // Reset sort state if desired
        currentSort = segments[0];
        sortOrders = { Consumer: true, Corporate: true, "Home Office": true };
        applyFiltersAndUpdate();
      });
    }

    function applyFiltersAndUpdate() {
      const sd = d3.select("#filter-start-date").property("value"),
        ed = d3.select("#filter-end-date").property("value"),
        cat = d3.select("#filter-category").property("value"),
        segFilter = d3.select("#filter-segment").property("value"),
        reg = d3.select("#filter-region").property("value"),
        countrySel = d3.select("#filter-country").property("value");

      const startDate = sd ? parseDateOnly(sd) : null,
        endDate = ed ? d3.timeDay.offset(parseDateOnly(ed), 1) : null;

      filteredData = rawData.filter(d => {
        if (startDate && d._orderDate < startDate) return false;
        if (endDate && d._orderDate >= endDate) return false;
        if (cat !== "All" && d._category !== cat) return false;
        if (segFilter !== "All" && d._segment !== segFilter) return false;
        if (reg !== "All" && d._region !== reg) return false;
        if (countrySel !== "All" && d._country !== countrySel) return false;
        return true;
      });

      countryFilter = (countrySel && countrySel !== "All") ? countrySel : null;
      if (segFilter !== "All" && segments.includes(segFilter)) {
        currentSort = segFilter;
      }
      updateMetrics();
      renderSegmentControls();
      drawCategoryBySalesChart();
      drawSegmentCountryChart();
      drawRegionSalesTreemap();
      drawSalesTrendChart();
    }

    function updateMetrics() {
      const data = filteredData;
      const totalSales = d3.sum(data, d => d._sales),
        totalProfit = d3.sum(data, d => d._profit),
        totalOrders = new Set(data.map(d => d._orderId)).size,
        profitMargin = totalSales ? totalProfit / totalSales * 100 : 0;

      d3.select("#metric-total-sales").text("$" + d3.format(",.0f")(totalSales));
      d3.select("#metric-total-profit").text("$" + d3.format(",.0f")(totalProfit));
      d3.select("#metric-total-orders").text(totalOrders);
      d3.select("#metric-profit-margin").text(profitMargin.toFixed(1) + "%");
    }

    // Segment controls
    function renderSegmentControls() {
      const ctrl = d3.select("#chart-segment-country .chart-controls")
        .html("");
      segments.forEach(seg => {
        const isActive = seg === currentSort;
        const btn = ctrl.append("div")
          .attr("class", "segment-btn")
          .classed("active", isActive)
          .on("click", () => {
            if (isActive) {
              sortOrders[seg] = !sortOrders[seg];
            } else {
              currentSort = seg;
            }
            renderSegmentControls();
            drawSegmentCountryChart();
          });
        const icon = btn.append("span")
          .attr("class", "sort-icon")
          .html(`
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              ${isActive && sortOrders[seg]
              ? '<path d="M7 10l5 5 5-5z"/>'
              : '<path d="M7 14l5-5 5 5z"/>'}
            </svg>
          `);
      });
    }

    function renderSegmentControls() {
      const ctrl = d3.select("#chart-segment-country .chart-controls").html("");
      segments.forEach(seg => {
        const isActive = seg === currentSort;
        const btn = ctrl.append("div")
          .attr("class", "segment-btn")
          .classed("active", isActive)
          .on("click", () => {
            if (isActive) {
              sortOrders[seg] = !sortOrders[seg];
            } else {
              currentSort = seg;
            }
            renderSegmentControls();
            drawSegmentCountryChart();
          });

        const icon = btn.append("span")
          .attr("class", "sort-icon")
          .html(`
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          ${isActive && sortOrders[seg]
              ? '<path d="M7 10l5 5 5-5z"/>'
              : '<path d="M7 14l5-5 5 5z"/>'}
        </svg>
      `);
      });
    }

    function drawSegmentCountryChart() {
      const segFilter = d3.select("#filter-segment").property("value");
      const segmentsToDraw = segFilter !== "All" ? [segFilter] : segments;
      if (segFilter !== "All") {
        currentSort = segFilter;
      }

  const rollCurrent = d3.rollups(
    filteredData.filter(d => d._segment === currentSort),
    v => ({
      sales: d3.sum(v, d => d._sales),
      profit: d3.sum(v, d => d._profit),
      orders: new Set(v.map(d => d._orderId)).size,
      margin: d3.sum(v, d => d._profit) / d3.sum(v, d => d._sales) * 100
    }),
    d => d._country
  ).map(([country, metrics]) => ({ country, ...metrics }));

      rollCurrent.sort((a, b) =>
        sortOrders[currentSort]
          ? d3.descending(a.sales, b.sales)
          : d3.ascending(a.sales, b.sales)
      );

      const countries = rollCurrent.map(d => d.country);
      const segRolls = segmentsToDraw.map(seg =>
        d3.rollups(
          filteredData.filter(d => d._segment === seg),
          v => d3.sum(v, d => d._sales),
          d => d._country
        )
      );

      const allSales = segRolls.flat().map(([c, s]) => s);
      const globalMax = allSales.length ? d3.max(allSales) : 0;

      const mm = getComputedStyle(document.documentElement);
      const mzT = +mm.getPropertyValue("--margin-top");
      const mzB = +mm.getPropertyValue("--margin-bottom");
      const mzL = +mm.getPropertyValue("--margin-left");
      const gap = +mm.getPropertyValue("--gap");
      const barH = +mm.getPropertyValue("--bar-height");

      const container = d3.select("#chart-segment-country .chart-container");
      const containerNode = container.node();
      if (!containerNode) return;
      const containerWidth = containerNode.clientWidth;

      const n = segmentsToDraw.length;
      const totalGap = gap * (n - 1);
      const availableForBars = containerWidth - mzL - totalGap;
      const barW = availableForBars > 0 ? (availableForBars / n) : 0;

      const H = countries.length * barH;
      const drawingWidth = mzL + n * barW + totalGap;
      const drawingHeight = H + mzT + mzB;

      container.html("");
      const svg = container.append("svg")
        .attr("viewBox", `0 0 ${drawingWidth} ${drawingHeight}`)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("width", "100%")
        .attr("height", drawingHeight)
        .classed("responsive-svg", true);

      const yScale = d3.scaleBand()
        .domain(countries)
        .range([0, H])
        .padding(0.1);

      const yAxisG = svg.append("g")
        .attr("transform", `translate(${mzL},${mzT})`)
        .call(d3.axisLeft(yScale).tickSize(0).tickPadding(4))
        .attr("font-size", "13px");

      yAxisG.selectAll(".tick text")
        .style("cursor", "pointer")
        .on("click", function (event, country) {
          const segSelect = d3.select("#filter-segment");
          if (countryFilter === country) {
            countryFilter = null;
            d3.select("#filter-country").property("value", "All");
          } else {
            countryFilter = country;
            d3.select("#filter-country").property("value", country);
          }
          applyFiltersAndUpdate();
        })
        .each(function (d) {
          const textEl = d3.select(this);
          if (d === countryFilter) {
            textEl.style("font-weight", "700").style("fill", "var(--primary-color)");
          } else {
            textEl.style("font-weight", null).style("fill", "var(--text-primary)");
          }
        });

      segmentsToDraw.forEach((seg, i) => {
        const segData = segRolls[i];
        const salesMap = new Map(segData);
        const segColor = seg === "Consumer"
          ? "var(--primary-color)"
          : seg === "Corporate"
            ? "var(--secondary-color)"
            : "var(--accent-color)";

        const xScale = d3.scaleLinear()
          .domain([0, globalMax]).nice()
          .range([0, barW]);

        const xOffset = mzL + i * (barW + gap);
        const gSeg = svg.append("g")
          .attr("transform", `translate(${xOffset},${mzT})`);

        const headerGroup = gSeg.append("g")
          .attr("class", "segment-header")
          .attr("transform", `translate(${barW / 2}, ${-mzT / 2})`)
          .attr("text-anchor", "middle")
          .style("cursor", "pointer")
          .on("click", () => {
            const sel = d3.select("#filter-segment");
            const currentVal = sel.property("value");
            if (currentVal === seg) {
              sel.property("value", "All");
            } else {
              sel.property("value", seg);
            }
            applyFiltersAndUpdate();
          });

        const isActive = currentSort === seg;
        const textEl = headerGroup.append("text")
          .attr("dy", "0.35em")
          .attr("font-size", "12px")
          .attr("font-weight", "600")
          .classed("active-segment", isActive)
          .classed("inactive-segment", !isActive)
          .text(seg);

        const bbox = textEl.node().getBBox();
        const textWidth = bbox.width;
        const iconSize = 12;
        const padding = 6;
        const iconOffsetX = textWidth / 2 + padding;
        const iconOffsetY = -iconSize / 2;

        const iconWrapper = headerGroup.append("g")
          .attr("class", "sort-icon-wrapper")
          .attr("transform", `translate(${iconOffsetX}, ${iconOffsetY})`)
          .style("cursor", "pointer")
          .on("click", (event) => {
            event.stopPropagation();
            if (currentSort === seg) {
              sortOrders[seg] = !sortOrders[seg];
            } else {
              currentSort = seg;
            }
            drawSegmentCountryChart();
          });

        iconWrapper.append("rect")
          .attr("x", -padding)
          .attr("y", -padding)
          .attr("width", iconSize + padding * 2)
          .attr("height", iconSize + padding * 2)
          .attr("fill", "transparent");

        const arrowPathD = "M2 2 L10 2 L6 8 Z";
        const path = iconWrapper.append("path")
          .attr("d", arrowPathD)
          .attr("fill", isActive ? "var(--text-primary)" : "lightgray");

        if (isActive && !sortOrders[seg]) {
          path.attr("transform",
            `translate(${iconSize / 2}, ${iconSize / 2}) rotate(180) translate(${-iconSize / 2}, ${-iconSize / 2})`
          );
        }

        // Bar transitions
        const bars = gSeg.selectAll("rect.bar")
          .data(countries, d => d);

        bars.join(
          enter => enter.append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d))
            .attr("x", 0)
            .attr("height", yScale.bandwidth())
            .attr("width", 0)
            .attr("fill", segColor)
            .style("cursor", "pointer")
            .on("mouseover", function (event, country) {
              d3.select(this).attr("opacity", 0.7);
              const value = salesMap.get(country) || 0;
              chartTooltip
                .html(`<strong>${seg} - ${country}</strong><br/>Sales: $${d3.format(",.0f")(value)}`)
                .style("opacity", 1);
              positionTooltipWithinViewport(chartTooltip, event, 10);
            })
            .on("mousemove", function (event) {
              positionTooltipWithinViewport(chartTooltip, event, 10);
            })
            .on("mouseout", function () {
              d3.select(this).attr("opacity", 1);
              chartTooltip.style("opacity", 0);
            })
            .on("click", function (event, country) {
              event.stopPropagation();
              const segSelect = d3.select("#filter-segment");
              const countrySelect = d3.select("#filter-country");
              const prevSegVal = segSelect.property("value");
              const prevCountryVal = countrySelect.property("value");

              if (prevCountryVal === country && prevSegVal === seg) {
                countrySelect.property("value", "All");
                segSelect.property("value", "All");
                countryFilter = null;
              } else {
                countrySelect.property("value", country);
                segSelect.property("value", seg);
                countryFilter = country;
                currentSort = seg;
              }
              applyFiltersAndUpdate();
            })
            .transition()
            .duration(750)
            .attr("width", d => xScale(salesMap.get(d) || 0)),

          update => update
            .transition()
            .duration(750)
            .attr("y", d => yScale(d))
            .attr("width", d => xScale(salesMap.get(d) || 0)),

          exit => exit.remove()
        );

        // Label transitions
        const labels = gSeg.selectAll("text.label")
          .data(countries, d => d);

        labels.join(
          enter => enter.append("text")
            .attr("class", "label")
            .attr("y", d => yScale(d) + yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("font-size", "10px")
            .text(d => "$" + d3.format(",.0f")(salesMap.get(d) || 0))
            .attr("x", 0)
            .attr("opacity", 0)
            .transition()

            .duration(750)
            .attr("opacity", 1)
            .attr("x", function (d) {
              const w = xScale(salesMap.get(d) || 0);
              const labelW = this.getBBox().width;
              return (w + 4 + labelW > barW) ? (w - 4) : (w + 4);
            })
            .attr("text-anchor", function (d) {
              const w = xScale(salesMap.get(d) || 0);
              const labelW = this.getBBox().width;
              return (w + 4 + labelW > barW) ? "end" : "start";
            }),

          update => update
            .call(sel => sel
              .transition()
              .duration(750)
              .attr("y", d => yScale(d) + yScale.bandwidth() / 2)
              .text(d => "$" + d3.format(",.0f")(salesMap.get(d) || 0))
            )
            .call(sel => sel
              .transition()
              .delay(750)
              .duration(300)
              .attr("x", function (d) {
                const w = xScale(salesMap.get(d) || 0);
                const labelW = this.getBBox().width;
                return (w + 4 + labelW > barW) ? (w - 4) : (w + 4);
              })
              .attr("text-anchor", function (d) {
                const w = xScale(salesMap.get(d) || 0);
                const labelW = this.getBBox().width;
                return (w + 4 + labelW > barW) ? "end" : "start";
              })
            ),

          exit => exit.remove()
        );
      });
    }
    // Top categories by sales with tooltip and click-to-filter
    function drawCategoryBySalesChart() {
      const container = d3.select("#chart-category-by-sales .chart-container");
      container.html("");

      // roll up & sort top 5 categories
      const data = d3.rollups(
        filteredData,
        v => d3.sum(v, d => d._sales),
        d => d._category
      )
        .map(([category, sales]) => ({ category, sales }))
        .sort((a, b) => d3.descending(a.sales, b.sales))
        .slice(0, 5);

      if (data.length === 0) {
        container.append("div")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("height", "100%")
          .style("color", "var(--text-secondary)")
          .text("No data available");
        return;
      }

      const fullWidth = container.node().clientWidth;
      const fullHeight = container.node().clientHeight;
      const margin = { top: 20, right: 20, bottom: 20, left: 140 };
      const innerWidth = Math.max(fullWidth - margin.left - margin.right, 0);
      const innerHeight = Math.max(fullHeight - margin.top - margin.bottom, 0);

      const svg = container.append("svg")
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .classed("responsive-svg", true);

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.sales)]).nice()
        .range([0, innerWidth]);

      const y = d3.scaleBand()
        .domain(data.map(d => d.category))
        .range([0, innerHeight])
        .paddingInner(0.1)
        .paddingOuter(0);

      // Y-axis
      g.append("g")
        .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
        .attr("font-size", "12px");

      const activeCat = d3.select("#filter-category").property("value");

      // —— BARS: data join —— //
      const bars = g.selectAll(".bar")
        .data(data, d => d.category);

      // EXIT
      bars.exit()
        .transition()
        .duration(500)
        .attr("width", 0)
        .remove();

      // ENTER
      const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.category))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", 0) // start at zero width
        .attr("fill", d => d.category === activeCat
          ? "var(--primary-color)"
          : "var(--primary-color)")
        .style("cursor", "pointer");

      // UPDATE + ENTER
      const barsUpdate = barsEnter.merge(bars);
      barsUpdate.transition()
        .duration(750)
        .attr("y", d => y(d.category))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.sales));

      // attach events
      barsUpdate
        .on("mouseover", function (event, d) {
          d3.select(this).attr("opacity", 0.7);
          chartTooltip
            .html(`<strong>${d.category}</strong><br/>Sales: $${d3.format(",.0f")(d.sales)}`)
            .style("opacity", 1);
          positionTooltipWithinViewport(chartTooltip, event, 10);
        })
        .on("mousemove", function (event) {
          positionTooltipWithinViewport(chartTooltip, event, 10);
        })
        .on("mouseout", function () {
          d3.select(this).attr("opacity", 1);
          chartTooltip.style("opacity", 0);
        })
        .on("click", function (event, d) {
          const sel = d3.select("#filter-category");
          const prev = sel.property("value");
          sel.property("value", prev === d.category ? "All" : d.category);
          applyFiltersAndUpdate();
        });

      // —— LABELS: data join —— //
      const labels = g.selectAll(".bar-label")
        .data(data, d => d.category);

      // EXIT
      labels.exit()
        .transition()
        .duration(500)
        .attr("x", 0)
        .remove();

      // ENTER
      const labelsEnter = labels.enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("font-size", "10px")
        .style("cursor", "pointer")
        .attr("y", d => y(d.category) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("x", 0)  // start at zero
        .attr("fill", "var(--text-primary)")
        .text(d => `$${d3.format(",.0f")(d.sales)}`);

      // UPDATE + ENTER
      const labelsUpdate = labelsEnter.merge(labels);
      labelsUpdate.transition()
        .duration(750)
        .attr("x", function (d) {
          const w = x(d.sales);
          const labelW = this.getBBox().width;
          return (w + 4 + labelW > innerWidth)
            ? (w - 4)
            : (w + 4);
        })
        .attr("text-anchor", function (d) {
          const w = x(d.sales);
          const labelW = this.getBBox().width;
          return (w + 4 + labelW > innerWidth)
            ? "end"
            : "start";
        });

      // attach label events
      labelsUpdate
        .on("click", function (event, d) {
          const sel = d3.select("#filter-category");
          const prev = sel.property("value");
          sel.property("value", prev === d.category ? "All" : d.category);
          applyFiltersAndUpdate();
        })
        .on("mouseover", function (event, d) {
          chartTooltip
            .html(`<strong>${d.category}</strong><br/>Sales: $${d3.format(",.0f")(d.sales)}`)
            .style("opacity", 1);
          positionTooltipWithinViewport(chartTooltip, event, 10);
          g.selectAll(".bar")
            .filter(bd => bd.category === d.category)
            .attr("opacity", 0.7);
        })
        .on("mousemove", function (event) {
          positionTooltipWithinViewport(chartTooltip, event, 10);
        })
        .on("mouseout", function (event, d) {
          chartTooltip.style("opacity", 0);
          g.selectAll(".bar")
            .filter(bd => bd.category === d.category)
            .attr("opacity", 1);
        });
    }

    // Region Sales Treemap with tooltip
    function drawRegionSalesTreemap() {
      const container = d3.select("#chart-region-treemap .chart-container");
      container.html("");
      const width = container.node().clientWidth;
      const height = container.node().clientHeight;

      const data = d3.rollups(
    filteredData,
    v => {
      const sales = d3.sum(v, d => d._sales);
      const orders = new Set(v.map(d => d._orderId)).size;
      
      // Get top category in region
      const topCategory = d3.rollups(
        v, 
        group => d3.sum(group, d => d._sales), 
        d => d._category
      ).sort((a, b) => b[1] - a[1])[0][0];
      
      return { sales, orders, topCategory };
    },
    d => d._region
  ).map(([region, metrics]) => ({ region, ...metrics }))
        .filter(d => d.sales > 0);

      if (data.length === 0) {
        container.append("div")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("height", "100%")
          .style("color", "var(--text-secondary)")
          .text("No data available");
        return;
      }

      const totalSales = d3.sum(data, d => d.sales);

      const root = d3.hierarchy({ children: data })
        .sum(d => d.sales)
        .sort((a, b) => b.value - a.value);

      d3.treemap()
        .size([width, height])
        .paddingInner(2)
        (root);

      const formatSales = d3.format(",.0f");
      const formatPct = d3.format(".1f");
      const maxSales = d3.max(data, d => d.sales);
      
      // UPDATED: Use PRIMARY Blue-Gray Scale instead of d3.interpolateBlues
      const colorScale = d3.scaleSequential()
        .domain([0, maxSales])
        .interpolator(t => {
          // Create custom interpolator using PRIMARY blue-gray colors
          if (t <= 0.2) return '#f1f5f9'; // --primary-100
          else if (t <= 0.4) return '#cbd5e1'; // --primary-300
          else if (t <= 0.6) return '#64748b'; // --primary-500
          else if (t <= 0.8) return '#334155'; // --primary-700
          else return '#0f172a'; // --primary-900
        });

      function textColorFor(bgColor) {
        const c = d3.color(bgColor);
        if (!c) return "#000";
        const luminance = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
        return luminance < 140 ? "#fff" : "#000";
      }

      const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .style("width", "100%")
        .style("height", "100%");

      // DATA JOIN
      const leaf = svg.selectAll("g.leaf")
        .data(root.leaves(), d => d.data.region);

      // EXIT
      leaf.exit()
        .transition()
        .duration(300)
        .style("opacity", 0)
        .remove();

      // ENTER
      const leafEnter = leaf.enter()
        .append("g")
        .attr("class", "leaf")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("opacity", 0)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).select("rect").attr("opacity", 0.7);
          const pct = (d.data.sales / totalSales) * 100;
          chartTooltip
            .html(
              `<strong>${d.data.region}</strong><br/>` +
              `Sales: $${formatSales(d.data.sales)}<br/>` +
              `Orders: ${d.data.orders}<br/>`+
              `Top Category: ${d.data.topCategory}<br/>`+
              `(${formatPct(pct)}% of filtered total sales)`
            )
            .style("opacity", 1);
          positionTooltipWithinViewport(chartTooltip, event, 10);
        })
        .on("mousemove", event => {
          positionTooltipWithinViewport(chartTooltip, event, 10);
        })
        .on("mouseout", function () {
          d3.select(this).select("rect").attr("opacity", 1);
          chartTooltip.style("opacity", 0);
        })
        .on("click", function (event, d) {
          const sel = d3.select("#filter-region");
          const prev = sel.property("value");
          sel.property("value", prev === d.data.region ? "All" : d.data.region);
          applyFiltersAndUpdate();
        });

      leafEnter.append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", 0).attr("height", 0)
        .attr("fill", d => colorScale(d.data.sales));

      leafEnter.append("g")
        .attr("class", "labels");

      // ENTER + UPDATE (MERGE)
      const leafMerge = leafEnter.merge(leaf);

      // Transition group position & opacity
      leafMerge.transition()
        .duration(600)
        .style("opacity", 1)
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

      // Transition rect size & color
      leafMerge.select("rect").transition()
        .duration(600)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", d => colorScale(d.data.sales));

      // Update labels after transition completes
      leafMerge.each(function (d) {
        const g = d3.select(this).select("g.labels");
        g.selectAll("*").remove();

        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        const regionText = d.data.region;
        const salesText = `$${formatSales(d.data.sales)}`;
        const pct = (d.data.sales / totalSales) * 100;
        const pctText = `${formatPct(pct)}%`;
        const fillColor = colorScale(d.data.sales);
        const txtColor = textColorFor(fillColor);

        const fontSize = 10;
        const lineHeight = fontSize + 2;
        const threeLineNeeded = 3 * lineHeight + 4;
        const twoLineNeeded = 2 * lineHeight + 4;
        const oneLineNeeded = lineHeight + 2;

        let linesToShow;
        if (rectHeight >= threeLineNeeded) {
          linesToShow = ["region", "sales", "pct"];
        } else if (rectHeight >= twoLineNeeded) {
          linesToShow = ["sales", "pct"];
        } else if (rectHeight >= oneLineNeeded) {
          linesToShow = ["pct"];
        } else {
          linesToShow = [];
        }

        if (linesToShow.length === 1 && linesToShow[0] === "pct") {
          const textEl = g.append("text")
            .attr("font-size", `${fontSize}px`)
            .attr("fill", txtColor)
            .text(pctText);
          let bbox = textEl.node().getBBox();
          if (bbox.width + 8 > rectWidth) {
            let fullText = pctText;
            let lo = 0, hi = fullText.length;
            while (lo < hi) {
              const mid = Math.floor((lo + hi) / 2);
              textEl.text(fullText.slice(0, mid) + "…");
              bbox = textEl.node().getBBox();
              if (bbox.width + 8 <= rectWidth) lo = mid + 1;
              else hi = mid;
            }
            textEl.text(fullText.slice(0, lo - 1) + "…");
          }
          textEl.attr("x", rectWidth / 2)
            .attr("text-anchor", "middle")
            .attr("y", rectHeight / 2 + fontSize / 2 - 2);
          return;
        }

        let yOffset = 4 + fontSize;
        for (let lineType of linesToShow) {
          let textStr = lineType === "region" ? regionText
            : lineType === "sales" ? salesText
              : pctText;
          const textEl = g.append("text")
            .attr("x", 4)
            .attr("y", yOffset)
            .attr("font-size", `${fontSize}px`)
            .attr("fill", txtColor)
            .text(textStr);

          let bbox = textEl.node().getBBox();
          if (bbox.width + 8 > rectWidth) {
            let fullText = textStr, lo = 0, hi = fullText.length;
            while (lo < hi) {
              const mid = Math.floor((lo + hi) / 2);
              textEl.text(fullText.slice(0, mid) + "…");
              bbox = textEl.node().getBBox();
              if (bbox.width + 8 <= rectWidth) lo = mid + 1;
              else hi = mid;
            }
            textEl.text(fullText.slice(0, lo - 1) + "…");
          }
          yOffset += lineHeight;
          if (yOffset + fontSize > rectHeight) break;
        }
      });
    }

    // Draw the sales trend chart, with domain padding so the line sits to the right of the y-axis
    function drawSalesTrendChart() {
      const container = d3.select("#chart-sales-trend .chart-container");
      container.html("");

      if (filteredData.length === 0) {
        container.append("div")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("height", "100%")
          .style("color", "var(--text-secondary)")
          .text("No data available for selected filters");
        return;
      }

      // Group sales by month
      const salesByMonth = d3.rollups(
        filteredData,
        v => ({
          sales: d3.sum(v, d => d._sales),
          orders: new Set(v.map(d => d._orderId)).size,
          // Get top segment for month
          topSegment: d3.rollups(
            v,
            group => group.length,
            d => d._segment
          ).sort((a, b) => b[1] - a[1])[0][0]
        }),
        d => d3.timeMonth(d._orderDate)
      ).map(([date, metrics]) => ({ date, ...metrics }));

      salesByMonth.sort((a, b) => d3.ascending(a.date, b.date));

      // Compute change from previous month
      salesByMonth.forEach((d, i) => {
        // Month-over-month change
        if (i > 0) {
          const prev = salesByMonth[i - 1].sales;
          d.momChange = prev ? ((d.sales - prev) / prev * 100) : null;
        }
        
        // Year-over-year change
        if (i >= 12) {
          const prevYear = salesByMonth[i - 12].sales;
          d.yoyChange = prevYear ? ((d.sales - prevYear) / prevYear * 100) : null;
        }
      });

      const width = container.node().clientWidth;
      const height = container.node().clientHeight;
      const margin = { top: 30, right: 30, bottom: 50, left: 70 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .classed("responsive-svg", true);

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // X domain with padding
      let domainStart, domainEnd;
      if (salesByMonth.length === 1) {
        const single = salesByMonth[0].date;
        domainStart = d3.timeMonth.offset(single, -1);
        domainEnd = d3.timeMonth.offset(single, 1);
      } else {
        const first = salesByMonth[0].date;
        const second = salesByMonth[1].date;
        const diffFirst = second - first;
        domainStart = new Date(first.getTime() - diffFirst / 2);

        const n = salesByMonth.length;
        const last = salesByMonth[n - 1].date;
        const penult = salesByMonth[n - 2].date;
        const diffLast = last - penult;
        domainEnd = new Date(last.getTime() + diffLast / 2);
      }

      const xScale = d3.scaleTime()
        .domain([domainStart, domainEnd])
        .range([0, innerWidth]);

      const yMax = d3.max(salesByMonth, d => d.sales) || 0;
      const yScale = d3.scaleLinear()
        .domain([0, yMax * 1.1])
        .range([innerHeight, 0]);

      // Line generator
      const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.sales));

      // Draw line with stroke-dash transition
      const path = g.append("path")
        .datum(salesByMonth)
        .attr("class", "trend-line")
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", function () { return this.getTotalLength(); })
        .attr("stroke-dashoffset", function () { return this.getTotalLength(); });

      path.transition()
        .duration(750)
        .ease(d3.easeCubic)
        .attr("stroke-dashoffset", 0);

      const tooltip = salesTrendTooltip; // assumed defined globally
      const formatInput = d3.timeFormat("%Y-%m-%d");

      // Draw circles with fade-in & radius transition
      g.selectAll(".trend-circle")
        .data(salesByMonth)
        .join("circle")
        .attr("class", "trend-circle")
        .attr("cx", d => xScale(d.date))
        .attr("cy", d => yScale(d.sales))
        .attr("r", 0)
        .style("opacity", 0)
        .classed("highlighted", d => activeMonth && +d.date === +activeMonth)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).classed("highlighted", true);
          tooltip.html(`
          <div class="date">${d3.timeFormat("%B %Y")(d.date)}</div>
          <div class="value">$${d3.format(",.0f")(d.sales)}</div>
          <div>Orders: ${d.orders}</div>
          <div>Top Segment: ${d.topSegment}</div>
          ${d.momChange ? `
          <div class="change" style="color:${d.momChange > 0 ? '#4CAF50' : '#F44336'}">
            ${d.momChange > 0 ? '↑' : '↓'} ${Math.abs(d.momChange).toFixed(1)}% ${d.momChange > 0 ? 'increase' : 'decrease'} from previous month
          </div>

        ` : ''}
        ${d.yoyChange ? `
          <div class="change" style="color:${d.yoyChange > 0 ? '#4CAF50' : '#F44336'}">
            ${d.yoyChange > 0 ? '↑' : '↓'} ${Math.abs(d.yoyChange).toFixed(1)}% ${d.yoyChange > 0 ? 'increase' : 'decrease'} from previous year
          </div>
        ` : ''}
      `)
            .style("opacity", 1);
          positionTooltipWithinViewport(tooltip, event, 15);
        })
        .on("mousemove", event => positionTooltipWithinViewport(tooltip, event, 15))
        .on("mouseout", function (event, d) {
          if (!(activeMonth && +d.date === +activeMonth)) {
            d3.select(this).classed("highlighted", false);
          }
          tooltip.style("opacity", 0);
        })
        .on("click", function (event, d) {
          tooltip.style("opacity", 0);
          if (activeMonth && +d.date === +activeMonth) {
            activeMonth = null;
            if (rawData.length) {
              const ext = d3.extent(rawData, d0 => d0._orderDate);
              d3.select("#filter-start-date").property("value", formatInput(ext[0]));
              d3.select("#filter-end-date").property("value", formatInput(d3.timeDay.offset(ext[1], 0)));
            } else {
              d3.select("#filter-start-date").property("value", "");
              d3.select("#filter-end-date").property("value", "");
            }
          } else {
            activeMonth = d.date;
            const monthStart = d3.timeMonth(d.date);
            const nextMonth = d3.timeMonth.offset(monthStart, 1);
            const lastDay = d3.timeDay.offset(nextMonth, -1);
            d3.select("#filter-start-date").property("value", formatInput(monthStart));
            d3.select("#filter-end-date").property("value", formatInput(lastDay));
          }
          applyFiltersAndUpdate();
        })
        .transition()
        .delay((d, i) => i * 10)
        .duration(750)
        .attr("r", 5)
        .style("opacity", 1);

      // X-axis
      const xAxis = salesByMonth.length === 1
        ? d3.axisBottom(xScale)
            .tickValues([salesByMonth[0].date])
            .tickFormat(d3.timeFormat("%b %Y"))
        : d3.axisBottom(xScale)
            .ticks(d3.timeMonth.every(4))
            .tickFormat(d3.timeFormat("%b %Y"));

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "middle");  // center labels, no rotation

      // Y-axis and label
      g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => "$" + d3.format(",.0f")(d)));

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -(margin.left - 10))
        .attr("x", -(innerHeight / 2))
        .attr("dy", "0")
        .attr("text-anchor", "middle")
        .text("Sales (USD)");
    }

    // Redraw on resize
    window.addEventListener("resize", () => {
      if (filteredData.length) {
        drawCategoryBySalesChart();
        drawSegmentCountryChart();
        drawRegionSalesTreemap();
        drawSalesTrendChart();
      }
    });