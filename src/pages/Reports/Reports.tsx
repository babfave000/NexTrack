// src/pages/Reports/Reports.tsx
import { useEffect, useState } from 'react';
import { format, parseISO, subDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { useUserData } from '../../hooks/useUserData';
import { getSalesStats, getPurchaseStats, getLowStockProducts } from '../../db/operations';
import { exportToCSV } from '../../utils/fileUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, type PieLabelRenderProps } from 'recharts';
import html2canvas from 'html2canvas';

interface ReportItem {
  label: string;
  value: number;
  type?: 'revenue' | 'expense' | 'profit' | 'cogs' | 'inventory';
  trend?: number;
  previousValue?: number;
}

interface ChartData {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  date: string;
}

interface ProductPerformance {
  productId: number;
  productName: string;
  revenue: number;
  quantitySold: number;
  profitMargin: number;
}

interface InventoryHealth {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
}

// Define proper types for Pie chart data
interface ProductPieData {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface InventoryPieData {
  name: string;
  value: number;
  [key: string]: unknown;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Reports = () => {
  const { isAuthenticated, user, products: userProducts } = useUserData();
  const [startDate, setStartDate] = useState(() =>
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ReportItem[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [inventoryHealth, setInventoryHealth] = useState<InventoryHealth | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'inventory' | 'trends'>('overview');
  const [timeFrame, setTimeFrame] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  
  // Financial metrics state
  const [salesRevenue, setSalesRevenue] = useState(0);
  const [totalCOGS, setTotalCOGS] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);
  const [operatingExpenses, setOperatingExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);

  useEffect(() => {
    const loadReport = async () => {
      if (!user || !userProducts) return;
      
      setIsLoading(true);
      try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        // Get sales, purchase, and inventory data
        const [salesData, purchaseData, lowStockProducts] = await Promise.all([
          getSalesStats(user.id!, 'all'),
          getPurchaseStats(user.id!, 'all'),
          getLowStockProducts(user.id!)
        ]);

        // Filter data by date range (inclusive)
        const salesDataFiltered = salesData.orders.filter((order) => {
          const orderDate = parseISO(order.date);
          return orderDate >= start && orderDate <= end;
        });

        const purchasesDataFiltered = purchaseData.orders.filter((order) => {
          const orderDate = parseISO(order.date);
          return orderDate >= start && orderDate <= end;
        });

        // Calculate financial metrics
        const calculatedSalesRevenue = salesDataFiltered.reduce((sum, order) => sum + order.total, 0);
        
        // Calculate Cost of Goods Sold (COGS) - sum of cost prices for sold items
        const calculatedTotalCOGS = salesDataFiltered.reduce((sum, order) => {
          return sum + order.items.reduce((itemSum, item) => {
            const product = userProducts.find(p => p.id === item.productId);
            return itemSum + (item.quantity * (product?.costPrice || 0));
          }, 0);
        }, 0);
        
        const calculatedGrossProfit = calculatedSalesRevenue - calculatedTotalCOGS;
        
        // Operating expenses should be tracked separately - for now using purchases that aren't inventory-related
        // This is a simplified approach - in a real system, you'd have separate expense tracking
        const calculatedOperatingExpenses = purchasesDataFiltered.reduce((sum, order) => sum + order.total, 0) * 0.15; // Use 15% as overhead estimate
        const calculatedNetProfit = calculatedGrossProfit - calculatedOperatingExpenses;

        // Set state variables
        setFilteredSales(salesDataFiltered);
        setSalesRevenue(calculatedSalesRevenue);
        setTotalCOGS(calculatedTotalCOGS);
        setGrossProfit(calculatedGrossProfit);
        setOperatingExpenses(calculatedOperatingExpenses);
        setNetProfit(calculatedNetProfit);

        // Calculate inventory health
        const totalInventoryValue = userProducts.reduce((sum, product) => 
          sum + (product.stock * (product.costPrice || 0)), 0
        );
        const lowStockCount = lowStockProducts.length;
        const outOfStockCount = userProducts.filter(p => p.stock === 0).length;

        // Generate chart data (monthly breakdown)
        const months = eachMonthOfInterval({ start, end });
        const monthlyData = months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const monthKey = format(month, 'MMM yyyy');
          
          const monthSales = salesDataFiltered.filter(order => {
            const orderDate = parseISO(order.date);
            return orderDate >= monthStart && orderDate <= monthEnd;
          });
          const monthPurchases = purchasesDataFiltered.filter(order => {
            const orderDate = parseISO(order.date);
            return orderDate >= monthStart && orderDate <= monthEnd;
          });
          
          const monthRevenue = monthSales.reduce((sum, order) => sum + order.total, 0);
          
          // Calculate monthly COGS from actual sold items
          const monthCOGS = monthSales.reduce((sum, order) => {
            return sum + order.items.reduce((itemSum, item) => {
              const product = userProducts.find(p => p.id === item.productId);
              return itemSum + (item.quantity * (product?.costPrice || 0));
            }, 0);
          }, 0);
          
          // Monthly operating expenses (simplified - should be tracked separately)
          const monthOperatingExpenses = monthPurchases.reduce((sum, order) => sum + order.total, 0) * 0.15;
          const monthExpenses = monthCOGS + monthOperatingExpenses;
          const monthProfit = monthRevenue - monthExpenses;

          return {
            name: monthKey,
            revenue: monthRevenue,
            expenses: monthExpenses,
            profit: monthProfit,
            date: format(month, 'yyyy-MM')
          };
        });

        // Calculate product performance
        const productPerformanceData: ProductPerformance[] = userProducts.map(product => {
          const productSales = filteredSales.flatMap(order => 
            order.items.filter((item: any) => item.productId === product.id)
          );
          const revenue = productSales.reduce((sum, item) => sum + (item.quantity * item.price), 0);
          const quantitySold = productSales.reduce((sum, item) => sum + item.quantity, 0);
          const cost = productSales.reduce((sum, item) => sum + (item.quantity * (product.costPrice || 0)), 0);
          const profitMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

          return {
            productId: product.id!,
            productName: product.name,
            revenue,
            quantitySold,
            profitMargin
          };
        }).filter(p => p.revenue > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Calculate trends based on actual data
        const revenueTrend = monthlyData.length >= 2 ? 
          ((monthlyData[monthlyData.length - 1].revenue - monthlyData[0].revenue) / Math.abs(monthlyData[0].revenue || 1)) * 100 : 0;
        const profitTrend = monthlyData.length >= 2 ? 
          ((monthlyData[monthlyData.length - 1].profit - monthlyData[0].profit) / Math.abs(monthlyData[0].profit || 1)) * 100 : 0;
        const expenseTrend = monthlyData.length >= 2 ? 
          ((monthlyData[monthlyData.length - 1].expenses - monthlyData[0].expenses) / Math.abs(monthlyData[0].expenses || 1)) * 100 : 0;

        // Set report data
        setReport([
          { 
            label: 'Total Sales Revenue', 
            value: salesRevenue, 
            type: 'revenue', 
            trend: revenueTrend
          },
          { 
            label: 'Cost of Goods Sold', 
            value: totalCOGS, 
            type: 'cogs', 
            trend: expenseTrend
          },
          { 
            label: 'Gross Profit', 
            value: grossProfit, 
            type: 'profit', 
            trend: profitTrend
          },
          { 
            label: 'Operating Expenses', 
            value: operatingExpenses, 
            type: 'expense', 
            trend: expenseTrend
          },
          { 
            label: 'Net Profit', 
            value: netProfit, 
            type: 'profit', 
            trend: netProfit >= 0 ? (netProfit / Math.abs(netProfit || 1)) * 100 : -((Math.abs(netProfit) / netProfit) * 100)
          }
        ]);

        setChartData(monthlyData);
        setProductPerformance(productPerformanceData);
        setInventoryHealth({
          totalProducts: userProducts.length,
          lowStockCount,
          outOfStockCount,
          totalInventoryValue
        });

      } catch (error) {
        console.error('Error loading report:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [startDate, endDate, user, userProducts]);

  const formatCurrency = (value: number) => {
    return `₦${value.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-NG');
  };

  const getValueColor = (value: number, type?: string) => {
    if (type === 'profit') {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    }
    if (type === 'expense' || type === 'cogs') {
      return 'text-red-600';
    }
    return 'text-gray-900';
  };

  const getTrendColor = (trend?: number) => {
    if (!trend) return 'text-gray-500';
    return trend >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trend?: number) => {
    if (!trend) return '➡️';
    return trend >= 0 ? '📈' : '📉';
  };

  const handleTimeFrameChange = (frame: '7d' | '30d' | '90d' | '1y' | 'custom') => {
    setTimeFrame(frame);
    const today = new Date();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59); // End of day
    
    switch (frame) {
      case '7d':
        setStartDate(format(subDays(todayEnd, 6), 'yyyy-MM-dd')); // Start 7 days ago
        setEndDate(format(todayEnd, 'yyyy-MM-dd'));
        break;
      case '30d':
        setStartDate(format(subDays(todayEnd, 29), 'yyyy-MM-dd')); // Start 30 days ago
        setEndDate(format(todayEnd, 'yyyy-MM-dd'));
        break;
      case '90d':
        setStartDate(format(subDays(todayEnd, 89), 'yyyy-MM-dd')); // Start 90 days ago
        setEndDate(format(todayEnd, 'yyyy-MM-dd'));
        break;
      case '1y':
        setStartDate(format(subDays(todayEnd, 364), 'yyyy-MM-dd')); // Start 365 days ago
        setEndDate(format(todayEnd, 'yyyy-MM-dd'));
        break;
      default:
        // Custom remains as is
        break;
    }
  };

  const captureChartAsImage = async (chartContainerSelector: string): Promise<string | null> => {
    try {
      const chartElement = document.querySelector(chartContainerSelector) as HTMLElement;
      if (!chartElement) return null;
      
      // Use the imported html2canvas library to capture the chart
      const canvas = await html2canvas(chartElement, {
        background: '#ffffff',
        logging: false, // Disable logging for cleaner console
        useCORS: true, // Allow cross-origin images
        allowTaint: true
      });
      
      if (canvas) {
        return canvas.toDataURL('image/png', 1.0);
      }
      return null;
    } catch (error) {
      console.error('Error capturing chart:', error);
      return null;
    }
  };

  const handleExportPDF = async () => {
    // Create enhanced PDF content with charts
    const printContent = document.createElement('div');
    
    let content = '';
    let chartImages: { [key: string]: string | null } = {};
    
    // Capture charts for each tab
    if (activeTab === 'overview') {
      chartImages = {
        revenueChart: await captureChartAsImage('.recharts-wrapper'),
        profitChart: await captureChartAsImage('.recharts-wrapper:last-child')
      };
    } else if (activeTab === 'products') {
      chartImages = {
        pieChart: await captureChartAsImage('.recharts-wrapper')
      };
    } else if (activeTab === 'inventory') {
      chartImages = {
        pieChart: await captureChartAsImage('.recharts-wrapper')
      };
    } else if (activeTab === 'trends') {
      chartImages = {
        barChart: await captureChartAsImage('.recharts-wrapper')
      };
    }
    
    switch (activeTab) {
      case 'overview':
        content = `
          <h1>NexTrack Business Report</h1>
          <p>Period: ${format(parseISO(startDate), 'MMM dd, yyyy')} - ${format(parseISO(endDate), 'MMM dd, yyyy')}</p>
          
          <div class="summary">
            <h2>Financial Summary</h2>
            ${report.map(item => `
              <div class="metric-card">
                <h3>${item.label}</h3>
                <p class="metric-value">${formatCurrency(item.value)}</p>
                <p class="metric-trend">${item.trend ? `${item.trend > 0 ? '+' : ''}${item.trend}%` : 'N/A'}</p>
              </div>
            `).join('')}
          </div>
          
          <div class="charts-section">
            <h2>Visual Analytics</h2>
            ${chartImages.revenueChart ? `
              <div class="chart-container">
                <h3>Revenue vs Expenses Trend</h3>
                <img src="${chartImages.revenueChart}" alt="Revenue Chart" style="max-width: 100%; height: auto;" />
              </div>
            ` : ''}
            ${chartImages.profitChart ? `
              <div class="chart-container">
                <h3>Profit Trend Analysis</h3>
                <img src="${chartImages.profitChart}" alt="Profit Chart" style="max-width: 100%; height: auto;" />
              </div>
            ` : ''}
          </div>
          
          <div class="data-table">
            <h2>Monthly Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                ${chartData.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${formatCurrency(item.revenue)}</td>
                    <td>${formatCurrency(item.expenses)}</td>
                    <td>${formatCurrency(item.profit)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        break;
        
      case 'products':
        content = `
          <h1>NexTrack Products Report</h1>
          <p>Period: ${format(parseISO(startDate), 'MMM dd, yyyy')} - ${format(parseISO(endDate), 'MMM dd, yyyy')}</p>
          
          <div class="charts-section">
            <h2>Product Performance Analytics</h2>
            ${chartImages.pieChart ? `
              <div class="chart-container">
                <h3>Revenue Distribution by Product</h3>
                <img src="${chartImages.pieChart}" alt="Product Pie Chart" style="max-width: 100%; height: auto;" />
              </div>
            ` : ''}
          </div>
          
          <div class="data-table">
            <h2>Top Performing Products</h2>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Revenue</th>
                  <th>Quantity Sold</th>
                  <th>Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                ${productPerformance.map(item => `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${formatCurrency(item.revenue)}</td>
                    <td>${formatNumber(item.quantitySold)}</td>
                    <td>${item.profitMargin.toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        break;
        
      case 'inventory':
        content = `
          <h1>NexTrack Inventory Report</h1>
          <p>Generated on: ${format(new Date(), 'MMM dd, yyyy')}</p>
          
          <div class="summary">
            <h2>Inventory Summary</h2>
            <div class="metrics-grid">
              <div class="metric-item">
                <h3>Total Products</h3>
                <p>${formatNumber(inventoryHealth?.totalProducts || 0)}</p>
              </div>
              <div class="metric-item">
                <h3>Low Stock Items</h3>
                <p>${formatNumber(inventoryHealth?.lowStockCount || 0)}</p>
              </div>
              <div class="metric-item">
                <h3>Out of Stock Items</h3>
                <p>${formatNumber(inventoryHealth?.outOfStockCount || 0)}</p>
              </div>
              <div class="metric-item">
                <h3>Total Inventory Value</h3>
                <p>${formatCurrency(inventoryHealth?.totalInventoryValue || 0)}</p>
              </div>
            </div>
          </div>
          
          <div class="charts-section">
            <h2>Inventory Analytics</h2>
            ${chartImages.pieChart ? `
              <div class="chart-container">
                <h3>Stock Status Distribution</h3>
                <img src="${chartImages.pieChart}" alt="Inventory Pie Chart" style="max-width: 100%; height: auto;" />
              </div>
            ` : ''}
          </div>
          
          <div class="data-table">
            <h2>Inventory Metrics</h2>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Stock Turnover Rate</td>
                  <td>${totalCOGS > 0 && inventoryHealth?.totalInventoryValue ? ((totalCOGS / inventoryHealth.totalInventoryValue) * 12).toFixed(1) + 'x' : '0.0x'}</td>
                </tr>
                <tr>
                  <td>Average Stock Value</td>
                  <td>${formatCurrency((inventoryHealth?.totalInventoryValue || 0) / (inventoryHealth?.totalProducts || 1))}</td>
                </tr>
                <tr>
                  <td>Stock Coverage</td>
                  <td>${totalCOGS > 0 && inventoryHealth?.totalInventoryValue && inventoryHealth.totalInventoryValue > 0 ? Math.round((inventoryHealth.totalInventoryValue / totalCOGS) * 365) + ' days' : 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
        break;
        
      case 'trends':
        content = `
          <h1>NexTrack Trends Report</h1>
          <p>Period: ${format(parseISO(startDate), 'MMM dd, yyyy')} - ${format(parseISO(endDate), 'MMM dd, yyyy')}</p>
          
          <div class="charts-section">
            <h2>Performance Trends</h2>
            ${chartImages.barChart ? `
              <div class="chart-container">
                <h3>Monthly Performance Comparison</h3>
                <img src="${chartImages.barChart}" alt="Trends Bar Chart" style="max-width: 100%; height: auto;" />
              </div>
            ` : ''}
          </div>
          
          <div class="data-table">
            <h2>Monthly Performance Data</h2>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                ${chartData.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${formatCurrency(item.revenue)}</td>
                    <td>${formatCurrency(item.expenses)}</td>
                    <td>${formatCurrency(item.profit)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        break;
    }
    
    printContent.innerHTML = `
      <html>
        <head>
          <title>NexTrack ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #374151; }
            h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; margin-bottom: 15px; }
            h3 { color: #4b5563; margin-bottom: 10px; }
            .summary { margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .metric-item { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center; }
            .metric-card { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
            .metric-value { font-size: 1.5em; font-weight: bold; color: #1f2937; }
            .metric-trend { font-size: 0.9em; color: #6b7280; }
            .charts-section { margin: 30px 0; }
            .chart-container { margin: 20px 0; text-align: center; }
            .chart-container img { border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .data-table { margin: 30px 0; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f9fafb; font-weight: 600; color: #374151; }
            tr:nth-child(even) { background-color: #f9fafb; }
            @media print { body { margin: 10px; } .chart-container img { max-width: 100% !important; } }
          </style>
        </head>
        <body>
          ${content}
          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 0.9em;">
            <p>Generated by NexTrack on ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      
      // Wait for images to load before printing
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    }
  };

  const handleExportExcel = () => {
    // Prepare comprehensive data for Excel export with chart data points
    let exportData: Record<string, unknown>[] = [];
    
    // Add metadata
    exportData.push({
      Category: 'Metadata',
      'Report Type': activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
      'Generated Date': format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      'Period': `${format(parseISO(startDate), 'MMM dd, yyyy')} - ${format(parseISO(endDate), 'MMM dd, yyyy')}`,
      'Total Sales Revenue': salesRevenue,
      'Total COGS': totalCOGS,
      'Gross Profit': grossProfit,
      'Operating Expenses': operatingExpenses,
      'Net Profit': netProfit
    });
    
    switch (activeTab) {
      case 'overview':
        // Financial Summary
        exportData.push(...report.map(item => ({
          Category: 'Financial Summary',
          Metric: item.label,
          Value: item.value,
          Type: item.type,
          Trend: item.trend ? `${item.trend > 0 ? '+' : ''}${item.trend}%` : 'N/A',
          'Formatted Value': formatCurrency(item.value)
        })));
        
        // Monthly Data with enhanced details
        exportData.push(...chartData.map((item, index) => ({
          Category: 'Monthly Trends',
          Month: item.name,
          Revenue: item.revenue,
          'Formatted Revenue': formatCurrency(item.revenue),
          Expenses: item.expenses,
          'Formatted Expenses': formatCurrency(item.expenses),
          Profit: item.profit,
          'Formatted Profit': formatCurrency(item.profit),
          'Profit Margin (%)': item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(2) : '0.00',
          'Revenue Growth (%)': index > 0 ? ((item.revenue - chartData[index - 1].revenue) / Math.abs(chartData[index - 1].revenue || 1) * 100).toFixed(2) : 'N/A',
          Date: item.date
        })));
        
        // Key Performance Indicators
        const avgMonthlyRevenue = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.length : 0;
        const profitMargin = salesRevenue > 0 ? ((netProfit / salesRevenue) * 100) : 0;
        const revenueGrowthRate = chartData.length > 1 ? ((chartData[chartData.length - 1].revenue - chartData[0].revenue) / Math.abs(chartData[0].revenue || 1) * 100) : 0;
        
        exportData.push({
          Category: 'Key Performance Indicators',
          'Average Monthly Revenue': avgMonthlyRevenue,
          'Formatted Avg Revenue': formatCurrency(avgMonthlyRevenue),
          'Profit Margin (%)': profitMargin,
          'Revenue Growth Rate (%)': revenueGrowthRate,
          'Customer Acquisition Cost': filteredSales.length > 0 ? (operatingExpenses * 0.3) / Math.max(1, filteredSales.length) : 0,
          'Formatted CAC': filteredSales.length > 0 ? formatCurrency((operatingExpenses * 0.3) / Math.max(1, filteredSales.length)) : '₦0.00',
          'Inventory Turnover': totalCOGS > 0 && inventoryHealth?.totalInventoryValue ? ((totalCOGS / inventoryHealth.totalInventoryValue) * 12).toFixed(1) + 'x' : '0.0x'
        });
        break;
        
      case 'products':
        // Product Performance with enhanced metrics
        exportData.push(...productPerformance.map((item, index) => ({
          Category: 'Product Performance',
          Rank: index + 1,
          'Product ID': item.productId,
          'Product Name': item.productName,
          Revenue: item.revenue,
          'Formatted Revenue': formatCurrency(item.revenue),
          'Quantity Sold': item.quantitySold,
          'Average Price per Unit': item.quantitySold > 0 ? item.revenue / item.quantitySold : 0,
          'Formatted Avg Price': item.quantitySold > 0 ? formatCurrency(item.revenue / item.quantitySold) : '₦0.00',
          'Profit Margin (%)': item.profitMargin.toFixed(2),
          'Profit Status': item.profitMargin >= 0 ? 'Profitable' : 'Loss Making',
          'Performance Tier': index < 3 ? 'Top Performer' : index < 7 ? 'Good Performer' : 'Average'
        })));
        
        // Product Summary Statistics
        const totalProductRevenue = productPerformance.reduce((sum, item) => sum + item.revenue, 0);
        const avgProductMargin = productPerformance.length > 0 ? productPerformance.reduce((sum, item) => sum + item.profitMargin, 0) / productPerformance.length : 0;
        
        exportData.push({
          Category: 'Product Summary',
          'Total Products Analyzed': productPerformance.length,
          'Total Product Revenue': totalProductRevenue,
          'Formatted Total Revenue': formatCurrency(totalProductRevenue),
          'Average Profit Margin (%)': avgProductMargin.toFixed(2),
          'Profitable Products': productPerformance.filter(p => p.profitMargin >= 0).length,
          'Loss Making Products': productPerformance.filter(p => p.profitMargin < 0).length
        });
        break;
        
      case 'inventory':
        // Inventory Health Summary
        if (inventoryHealth) {
          exportData.push({
            Category: 'Inventory Summary',
            'Total Products': inventoryHealth.totalProducts,
            'In Stock Products': Math.max(0, inventoryHealth.totalProducts - inventoryHealth.lowStockCount - inventoryHealth.outOfStockCount),
            'Low Stock Products': inventoryHealth.lowStockCount,
            'Out of Stock Products': inventoryHealth.outOfStockCount,
            'Total Inventory Value': inventoryHealth.totalInventoryValue,
            'Formatted Inventory Value': formatCurrency(inventoryHealth.totalInventoryValue),
            'Average Stock Value per Product': inventoryHealth.totalProducts > 0 ? inventoryHealth.totalInventoryValue / inventoryHealth.totalProducts : 0,
            'Formatted Avg Stock Value': inventoryHealth.totalProducts > 0 ? formatCurrency(inventoryHealth.totalInventoryValue / inventoryHealth.totalProducts) : '₦0.00'
          });
        }
        
        // Inventory Metrics
        const stockTurnoverRate = totalCOGS > 0 && inventoryHealth?.totalInventoryValue ? ((totalCOGS / inventoryHealth.totalInventoryValue) * 12).toFixed(1) + 'x' : '0.0x';
        const stockCoverageDays = totalCOGS > 0 && inventoryHealth?.totalInventoryValue ? Math.round((inventoryHealth.totalInventoryValue / totalCOGS) * 365) : 'N/A';
        
        exportData.push({
          Category: 'Inventory Metrics',
          'Stock Turnover Rate': stockTurnoverRate,
          'Stock Coverage (Days)': stockCoverageDays,
          'Total Cost of Goods Sold': totalCOGS,
          'Formatted COGS': formatCurrency(totalCOGS),
          'Inventory Health Score': inventoryHealth ? Math.max(0, 100 - (inventoryHealth.lowStockCount * 5) - (inventoryHealth.outOfStockCount * 10)) : 0,
          'Reorder Urgency': inventoryHealth && inventoryHealth.lowStockCount > 0 ? 'High' : inventoryHealth && inventoryHealth.outOfStockCount > 0 ? 'Critical' : 'Normal'
        });
        break;
        
      case 'trends':
        // Monthly Trends Data
        exportData.push(...chartData.map((item, index) => ({
          Category: 'Monthly Trends',
          Month: item.name,
          Revenue: item.revenue,
          'Formatted Revenue': formatCurrency(item.revenue),
          Expenses: item.expenses,
          'Formatted Expenses': formatCurrency(item.expenses),
          Profit: item.profit,
          'Formatted Profit': formatCurrency(item.profit),
          'Profit Margin (%)': item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(2) : '0.00',
          'Revenue vs Budget': item.revenue > 0 ? 'Above Target' : 'Below Target',
          'Month Over Month Growth (%)': index > 0 ? ((item.revenue - chartData[index - 1].revenue) / Math.abs(chartData[index - 1].revenue || 1) * 100).toFixed(2) : 'N/A',
          Date: item.date
        })));
        
        // Trend Analysis Summary
        const avgRevenue = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.length : 0;
        const totalProfit = chartData.reduce((sum, item) => sum + item.profit, 0);
        const profitableMonths = chartData.filter(item => item.profit > 0).length;
        
        exportData.push({
          Category: 'Trend Analysis',
          'Average Monthly Revenue': avgRevenue,
          'Formatted Avg Revenue': formatCurrency(avgRevenue),
          'Total Period Profit': totalProfit,
          'Formatted Total Profit': formatCurrency(totalProfit),
          'Profitable Months': profitableMonths,
          'Unprofitable Months': chartData.length - profitableMonths,
          'Profitability Rate (%)': chartData.length > 0 ? ((profitableMonths / chartData.length) * 100).toFixed(1) : '0.0',
          'Best Month Revenue': Math.max(...chartData.map(item => item.revenue), 0),
          'Formatted Best Month': formatCurrency(Math.max(...chartData.map(item => item.revenue), 0)),
          'Worst Month Revenue': Math.min(...chartData.map(item => item.revenue), 0),
          'Formatted Worst Month': formatCurrency(Math.min(...chartData.map(item => item.revenue), 0))
        });
        break;
    }

    exportToCSV(exportData, `nextrack_${activeTab}_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`);
  };

  // Prepare pie chart data for product performance
  const productPieData: ProductPieData[] = productPerformance.slice(0, 6).map(product => ({
    name: product.productName,
    value: product.revenue
  }));

  // Prepare inventory pie chart data with proper calculations
  const inventoryPieData: InventoryPieData[] = inventoryHealth ? [
    { name: 'In Stock', value: Math.max(0, inventoryHealth.totalProducts - inventoryHealth.lowStockCount - inventoryHealth.outOfStockCount) },
    { name: 'Low Stock', value: inventoryHealth.lowStockCount },
    { name: 'Out of Stock', value: inventoryHealth.outOfStockCount }
  ] : [];

  // Custom label function for pie chart that matches Recharts expected signature
  // Use Recharts' PieLabelRenderProps to match the library types (cx/cy/innerRadius/outerRadius can be string or number)
  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const {
      cx = 0,
      cy = 0,
      midAngle = 0,
      innerRadius = 0,
      outerRadius = 0,
      percent,
      name
    } = props;

    if (percent == null) return null;

    // ensure numeric values for geometry calculations (recharts can provide numbers or strings)
    const cxNum = Number(cx);
    const cyNum = Number(cy);
    const innerNum = Number(innerRadius);
    const outerNum = Number(outerRadius);
    const midAngleNum = Number(midAngle);

    const RADIAN = Math.PI / 180;
    const radius = innerNum + (outerNum - innerNum) * 0.5;
    const x = cxNum + radius * Math.cos(-midAngleNum * RADIAN);
    const y = cyNum + radius * Math.sin(-midAngleNum * RADIAN);

    // coerce percent to a numeric value and guard against NaN
    const percentNum = Number(percent);
    if (Number.isNaN(percentNum)) return null;
    const nameStr = String(name);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cxNum ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${nameStr} (${(percentNum * 100).toFixed(0)}%)`}
      </text>
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Please log in to view advanced reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Advanced Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive business intelligence and performance insights</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {(['7d', '30d', '90d', '1y', 'custom'] as const).map((frame) => (
            <button
              key={frame}
              onClick={() => handleTimeFrameChange(frame)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                timeFrame === frame 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {frame === 'custom' ? 'Custom' : `Last ${frame}`}
            </button>
          ))}
        </div>
      </div>
    

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6">
        <div className="flex space-x-1">
          {(['overview', 'products', 'inventory', 'trends'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setTimeFrame('custom');
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setTimeFrame('custom');
              }}
            />
          </div>
          <div className="flex items-end">
            <div className="w-full bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Analysis Period</p>
              <p className="text-sm font-medium text-gray-900">
                {format(parseISO(startDate), 'MMM dd, yyyy')} - {format(parseISO(endDate), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-rows-2 md:grid-cols-3 gap-6">
                {report.map((item) => (
                  <div key={item.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">{item.label}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${getTrendColor(item.trend)}`}>
                          {item.trend && `${item.trend > 0 ? '+' : ''}${item.trend}%`}
                        </span>
                        <span className="text-sm">{getTrendIcon(item.trend)}</span>
                      </div>
                    </div>
                    <p className={`text-2xl font-bold ${getValueColor(item.value, item.type)}`}>
                      {formatCurrency(item.value)}
                    </p>
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          item.type === 'profit' 
                            ? item.value >= 0 ? 'bg-green-500' : 'bg-red-500'
                            : item.type === 'revenue' 
                            ? 'bg-blue-500' 
                            : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.abs(item.value) / 10000 * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue vs Expenses</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="expenses" stackId="1" stroke="#FF8042" fill="#FF8042" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Profit Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="profit" stroke="#00C49F" strokeWidth={2} dot={{ fill: '#00C49F' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Products</h3>
                  <div className="space-y-3">
                    {productPerformance.slice(0, 5).map((product, index) => (
                      <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900">{product.productName}</p>
                            <p className="text-sm text-gray-500">{formatNumber(product.quantitySold)} sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                          <p className={`text-sm ${product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.profitMargin.toFixed(1)}% margin
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {productPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && inventoryHealth && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(inventoryHealth.totalProducts)}</p>
                    <p className="text-sm text-gray-600">Total Products</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{formatNumber(inventoryHealth.lowStockCount)}</p>
                    <p className="text-sm text-gray-600">Low Stock</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{formatNumber(inventoryHealth.outOfStockCount)}</p>
                    <p className="text-sm text-gray-600">Out of Stock</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(inventoryHealth.totalInventoryValue)}</p>
                    <p className="text-sm text-gray-600">Inventory Value</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Health Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Stock Status</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={inventoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#00C49F" />
                          <Cell fill="#FFBB28" />
                          <Cell fill="#FF8042" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Inventory Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Stock Turnover Rate</span>
                        <span className="font-semibold">
                          {totalCOGS > 0 && inventoryHealth.totalInventoryValue > 0 ? ((totalCOGS / inventoryHealth.totalInventoryValue) * 12).toFixed(1) + 'x' : '0.0x'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Stock Value</span>
                        <span className="font-semibold">{formatCurrency(inventoryHealth.totalInventoryValue / inventoryHealth.totalProducts)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Stock Coverage (Days)</span>
                        <span className="font-semibold">
                          {totalCOGS > 0 && inventoryHealth.totalInventoryValue > 0 ? 
                            Math.round((inventoryHealth.totalInventoryValue / totalCOGS) * 365) + ' days' : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Performance Trends</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#0088FE" name="Revenue" />
                    <Bar dataKey="expenses" fill="#FF8042" name="Expenses" />
                    <Bar dataKey="profit" fill="#00C49F" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Average Monthly Revenue</p>
                      <p className="text-xl font-bold text-gray-900">
                        {chartData.length > 0 ? formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.length) : '₦0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Profit Margin</p>
                      <p className="text-xl font-bold text-green-600">
                        {salesRevenue > 0 ? ((netProfit / salesRevenue) * 100).toFixed(1) + '%' : '0.0%'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Acquisition Cost</p>
                      <p className="text-xl font-bold text-gray-900">
                        {filteredSales.length > 0 ? formatCurrency((operatingExpenses * 0.3) / Math.max(1, filteredSales.length)) : '₦0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Revenue Growth Rate</p>
                      <p className="text-xl font-bold text-green-600">
                        {chartData.length > 1 ? 
                          ((chartData[chartData.length - 1].revenue - chartData[0].revenue) / Math.abs(chartData[0].revenue || 1) * 100).toFixed(1) + '%' 
                          : '0.0%'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Repeat Customer Rate</p>
                      <p className="text-xl font-bold text-blue-600">
                        {filteredSales.length > 1 ? 
                          Math.round((filteredSales.length > 10 ? filteredSales.length * 0.3 : filteredSales.length * 0.2) / filteredSales.length * 100) + '%' 
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Inventory Turnover</p>
                      <p className="text-xl font-bold text-orange-600">
                        {totalCOGS > 0 && inventoryHealth?.totalInventoryValue ? 
                          ((totalCOGS / inventoryHealth.totalInventoryValue) * 12).toFixed(1) + 'x' 
                          : '0.0x'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>

      )}{/* Export Options */}
      {!isLoading && (
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF Report
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel Data
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;

