# DataCo Supply Chain Intelligence Dashboard

## Overview
This project provides an interactive data visualization suite for analyzing sales, logistics, and delivery performance using a rich set of D3.js-powered dashboards. It is designed for business analysts, operations managers, and anyone interested in exploring order, shipping, and delivery data at multiple granularities.

There are two main dashboards:

1. **Sales Analysis Dashboard**
   - Focuses on sales, profit, and order metrics across categories, segments, regions, and time.

2. **Logistics & Delivery Analysis Dashboard**
   - Focuses on delivery performance, risk, shipping modes, and geographic breakdowns.

## Features

### 1. Sales Analysis Dashboard

#### KPI Cards:
- Total Sales
- Total Profit
- Total Orders
- Profit Margin

#### Unified Filters:
- Category, Segment, Region, Country
- Date range (start/end)
- Clear all filters with one click

#### Charts:
- **Top Categories by Sales**: Horizontal bar chart with tooltips and click-to-filter.
- **Sales by Country & Segment**: Small multiples bar charts, sortable by segment.
- **Region Sales Treemap**: Visualizes sales and order volume by region, with tooltips and click-to-filter.
- **Sales Trend**: Line chart showing sales over time, with month-over-month and year-over-year change indicators.

### 2. Logistics & Delivery Analysis Dashboard

#### KPI Cards:
- On-Time Delivery Rate
- Late Delivery Risk Rate
- Average Delivery Days
- Total Orders

#### Advanced Filters:
- Customer Country, Geographic Level (Market, Region, Country), Customer Segment
- Time (Year, Month)
- Reset all filters

#### Charts:
- **Delivery Status Chart**:  
   - Bar and line chart showing order quantity and late delivery risk over time.
   - Interactive tooltips with pie chart breakdowns.
   - Time grouping (month, quarter, year) and year-over-year comparison.
   - Click to filter all charts by period.

- **Country Risk Chart**:  
   - Horizontal bar chart of top 10 countries/regions/states/cities by delivery risk.
   - Drill-down navigation (middle-click to drill, up arrows to go back).
   - Click to filter all charts by geographic unit.
   - Dynamic sorting and minimum order volume filter.

- **Shipping Scatter Chart**:  
   - Scatter plot of scheduled vs. actual shipping days, colored by shipping mode.
   - Interactive legend with risk analysis by shipping mode.
   - Filter by delivery status (on-time, early, late).
   - Click legend to filter locally, double-click to filter all charts.

- **Treemap Chart**:  
   - Treemap of late delivery risk by department, category, or product.
   - Drill-down navigation and dynamic legend.
   - Click to filter all charts by department/category/product.

#### Cross-Chart Filtering:
- Click on any chart element to filter all other charts by that dimension.
- Active filters are visually indicated.
- Reset filters easily.

## Getting Started

### Prerequisites:
- Node.js (for running a local server, if needed)
- Modern Web Browser (Chrome, Firefox, Edge, etc.)

### Installation:

1. **Clone or Download the Repository**
   
2. **Unzip the Data File**
   - Ensure `cleaned_dataset_complete_orders_country_region.csv` is present in the root directory.
   - If you have a zipped source, extract it so the CSV is accessible.
   
3. **Install a Local Server**
   - For full D3.js functionality (especially with local CSV files), run a local server:
   - python -m http.server --directory "C:/Path/To/Your/Project/Folder"
   
4. **Open the Dashboard**
   - Open `index.html` in your browser for the Sales Analysis Dashboard.
   - Open `delivery_main.html` for the Logistics & Delivery Analysis Dashboard.
   - If using a local server, navigate to:
     - `http://localhost:8000/index.html`
     - `http://localhost:8000/delivery_main.html`

### File Structure:
AAA/
  ├── cleaned_dataset_complete_orders_country_region.csv
  ├── index.html
  ├── delivery_main.html
  ├── main.js
  ├── script.js
  ├── data_loader.js
  ├── filter_manager.js
  ├── kpi_cards.js
  ├── delivery_status_chart.js
  ├── country_risk_chart.js
  ├── shipping_scatter.js
  ├── treemap_chart.js
  ├── cross_chart_interactions.js
  ├── dashboard.css
  ├── styles.css


## Usage
- **Interact with Filters**: Use dropdowns and date pickers to filter data. All charts update in real time.
- **Click on Chart Elements**: Filter all charts by the clicked dimension (e.g., country, segment, period).
- **Drill Down**: In the country risk and treemap charts, middle-click to drill down, use arrows to go back.
- **Hover for Details**: Tooltips provide detailed breakdowns and metrics.
- **Reset Filters**: Use the reset button to clear all filters and return to the default view.

## Technologies Used
- **D3.js**: For all data visualizations and chart interactions.
- **HTML/CSS**: Responsive, modern dashboard layout.
- **JavaScript**: Data processing, filtering, and chart logic.

## Customization
- **Data Source**: Replace `cleaned_dataset_complete_orders_country_region.csv` with your own data, ensuring the column names match those expected in `data_loader.js`.
- **Styling**: Modify `dashboard.css` and `styles.css` for custom themes or branding.
- **Charts**: Extend or modify chart logic in the respective JS files.

## License
- [MIT License] (or your preferred license)

## Screenshots
![image](https://github.com/user-attachments/assets/51662288-44ad-4361-817c-dc454988854e)
![image](https://github.com/user-attachments/assets/0bb73289-9ea0-4824-9d19-b7b5728c66e8)



