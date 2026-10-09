/**
 * Rich mock datasets and initial seed values for Dataverse AI
 */

export const MOCK_DASHBOARD_DATA = {
  stats: [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: '$2,485,920',
      change: '+14.2%',
      trend: 'up',
      subtitle: 'vs. previous period ($2.17M)',
      color: 'primary',
    },
    {
      id: 'queries',
      title: 'Active Queries Processed',
      value: '184,320',
      change: '+28.4%',
      trend: 'up',
      subtitle: 'Average latency: 42ms',
      color: 'cyan',
    },
    {
      id: 'anomaly',
      title: 'Anomalies Flagged',
      value: '12',
      change: '-18.5%',
      trend: 'down',
      subtitle: '9 resolved automatically',
      color: 'amber',
    },
    {
      id: 'ai_confidence',
      title: 'AI Prediction Accuracy',
      value: '98.4%',
      change: '+2.1%',
      trend: 'up',
      subtitle: 'Model: Llama-3.2-Quant',
      color: 'emerald',
    },
  ],
  revenueTrend: [
    { label: 'Jan', value: 145000, secondary: 110000 },
    { label: 'Feb', value: 168000, secondary: 125000 },
    { label: 'Mar', value: 192000, secondary: 140000 },
    { label: 'Apr', value: 215000, secondary: 155000 },
    { label: 'May', value: 248000, secondary: 172000 },
    { label: 'Jun', value: 280000, secondary: 195000 },
    { label: 'Jul', value: 310000, secondary: 210000 },
    { label: 'Aug', value: 345000, secondary: 230000 },
    { label: 'Sep', value: 390000, secondary: 260000 },
    { label: 'Oct', value: 432000, secondary: 290000 },
  ],
  categoryBreakdown: [
    { label: 'Enterprise Cloud', value: 42, color: '#6366f1' },
    { label: 'AI Compute & Tokens', value: 28, color: '#06b6d4' },
    { label: 'Data Warehouse API', value: 18, color: '#10b981' },
    { label: 'Edge Analytics', value: 12, color: '#f59e0b' },
  ],
  sampleInsights: [
    {
      id: 'ins-1',
      type: 'opportunity',
      title: 'Compute surge during peak UTC hours',
      description: 'AI model workloads surged 34% between 14:00 - 18:00 UTC. Auto-scaling cluster elasticity kept P99 latency below 50ms.',
      impact: 'High Impact',
      date: 'Just now',
    },
    {
      id: 'ins-2',
      type: 'anomaly',
      title: 'Unusual query latency spike in EU-West node',
      description: 'Detected 3 database query time anomalies on unindexed partition table. Cache warming applied.',
      impact: 'Medium Impact',
      date: '25m ago',
    },
    {
      id: 'ins-3',
      type: 'recommendation',
      title: 'Potential 18% cost optimization detected',
      description: 'Switching batch statistical jobs to off-peak quantization worker queues could save ~$4,200/month.',
      impact: 'Cost Saving',
      date: '2h ago',
    },
  ],
};

export const MOCK_SAMPLE_DATASET = {
  filename: 'global_sales_intelligence_q4.csv',
  total_rows: 1420,
  total_columns: 6,
  missing_rate: 0.2,
  duplicate_rows: 0,
  columns: [
    { name: 'Transaction_ID', dtype: 'int64', unique_count: 1420, null_count: 0, null_pct: 0, type: 'numeric' },
    { name: 'Region', dtype: 'object', unique_count: 5, null_count: 0, null_pct: 0, type: 'categorical' },
    { name: 'Product_Category', dtype: 'object', unique_count: 4, null_count: 0, null_pct: 0, type: 'categorical' },
    { name: 'Sales_Volume', dtype: 'float64', unique_count: 612, null_count: 2, null_pct: 0.14, type: 'numeric', min: 120, max: 84000, mean: 14850.5, median: 11200 },
    { name: 'Discount_Rate', dtype: 'float64', unique_count: 15, null_count: 0, null_pct: 0, type: 'numeric', min: 0.0, max: 0.35, mean: 0.12, median: 0.1 },
    { name: 'Net_Profit', dtype: 'float64', unique_count: 740, null_count: 1, null_pct: 0.07, type: 'numeric', min: -1200, max: 32400, mean: 4920.8, median: 3800 },
  ],
  preview: [
    { Transaction_ID: 1001, Region: 'North America', Product_Category: 'Enterprise Cloud', Sales_Volume: 34500, Discount_Rate: 0.10, Net_Profit: 12200 },
    { Transaction_ID: 1002, Region: 'Europe', Product_Category: 'AI Compute & Tokens', Sales_Volume: 28900, Discount_Rate: 0.05, Net_Profit: 10400 },
    { Transaction_ID: 1003, Region: 'Asia Pacific', Product_Category: 'Data Warehouse API', Sales_Volume: 18400, Discount_Rate: 0.15, Net_Profit: 5200 },
    { Transaction_ID: 1004, Region: 'Latin America', Product_Category: 'Edge Analytics', Sales_Volume: 9200, Discount_Rate: 0.00, Net_Profit: 3400 },
    { Transaction_ID: 1005, Region: 'North America', Product_Category: 'AI Compute & Tokens', Sales_Volume: 51200, Discount_Rate: 0.12, Net_Profit: 19800 },
    { Transaction_ID: 1006, Region: 'Europe', Product_Category: 'Enterprise Cloud', Sales_Volume: 42100, Discount_Rate: 0.08, Net_Profit: 15600 },
    { Transaction_ID: 1007, Region: 'Asia Pacific', Product_Category: 'Edge Analytics', Sales_Volume: 12400, Discount_Rate: 0.05, Net_Profit: 4100 },
  ]
};
