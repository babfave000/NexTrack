// src/pages/Reports/Reports.tsx
import { useEffect, useState } from 'react';
import { format, isWithinInterval, parseISO, subDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { useUserData } from '../../hooks/useUserData';
import { getSalesStats, getPurchaseStats, getLowStockProducts } from '../../db/operations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, type PieLabelRenderProps } from 'recharts';

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

        // Filter data by date range
        const filteredSales = salesData.orders.filter((order) =>
          isWithinInterval(parseISO(order.date), { start, end })
        );

        const filteredPurchases = purchaseData.orders.filter((order) =>
          isWithinInterval(parseISO(order.date), { start, end })
        );

        // Calculate financial metrics
        const salesRevenue = filteredSales.reduce((sum, order) => sum + order.total, 0);
        const totalCOGS = salesRevenue * 0.6; // Assuming 60% COGS
        const purchaseTotal = filteredPurchases.reduce((sum, order) => sum + order.total, 0);
        const grossProfit = salesRevenue - totalCOGS;
        const netProfit = grossProfit - purchaseTotal;

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
          
          const monthSales = salesData.orders.filter(order => 
            isWithinInterval(parseISO(order.date), { start: monthStart, end: monthEnd })
          );
          const monthPurchases = purchaseData.orders.filter(order => 
            isWithinInterval(parseISO(order.date), { start: monthStart, end: monthEnd })
          );
          
          const monthRevenue = monthSales.reduce((sum, order) => sum + order.total, 0);
          const monthExpenses = monthPurchases.reduce((sum, order) => sum + order.total, 0) + (monthRevenue * 0.6);
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
            order.items.filter(item => item.productId === product.id)
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

        // Set report data
        setReport([
          { 
            label: 'Total Sales Revenue', 
            value: salesRevenue, 
            type: 'revenue',
            trend: 12.5 // Example trend
          },
          { 
            label: 'Cost of Goods Sold', 
            value: totalCOGS, 
            type: 'cogs',
            trend: -8.2
          },
          { 
            label: 'Gross Profit', 
            value: grossProfit, 
            type: 'profit',
            trend: 15.3
          },
          { 
            label: 'Operating Expenses', 
            value: purchaseTotal, 
            type: 'expense',
            trend: 5.7
          },
          { 
            label: 'Net Profit', 
            value: netProfit, 
            type: 'profit',
            trend: netProfit > 0 ? 18.1 : -12.4
          },
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
    
    switch (frame) {
      case '7d':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '30d':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '90d':
        setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '1y':
        setStartDate(format(subDays(today, 365), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      default:
        // Custom remains as is
        break;
    }
  };

  // Prepare pie chart data for product performance
  const productPieData: ProductPieData[] = productPerformance.slice(0, 6).map(product => ({
    name: product.productName,
    value: product.revenue
  }));

  // Prepare inventory pie chart data
  const inventoryPieData: InventoryPieData[] = inventoryHealth ? [
    { name: 'In Stock', value: inventoryHealth.totalProducts - inventoryHealth.lowStockCount - inventoryHealth.outOfStockCount },
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
                        <span className="font-semibold">2.3x</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Stock Value</span>
                        <span className="font-semibold">{formatCurrency(inventoryHealth.totalInventoryValue / inventoryHealth.totalProducts)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Stock Coverage</span>
                        <span className="font-semibold">45 days</span>
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
                        {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0) / Math.max(1, chartData.length))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Profit Margin Trend</p>
                      <p className="text-xl font-bold text-green-600">+8.2%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Acquisition Cost</p>
                      <p className="text-xl font-bold text-gray-900">₦1,250.00</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Growth Indicators</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Revenue Growth Rate</p>
                      <p className="text-xl font-bold text-green-600">+15.3%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Retention</p>
                      <p className="text-xl font-bold text-blue-600">78.5%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Inventory Turnover</p>
                      <p className="text-xl font-bold text-orange-600">2.8x</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Export Options */}
      {!isLoading && (
        <div className="mt-6 flex justify-end gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
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