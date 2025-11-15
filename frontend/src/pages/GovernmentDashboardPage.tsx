import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import {
  Users,
  TrendingUp,
  Activity,
  Heart,
  AlertTriangle,
  Target,
  Globe,
  BarChart3,
  Loader2,
  Award,
  MapPin,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import React, { useState } from 'react';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function GovernmentDashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['government-dashboard'],
    queryFn: () => dashboardApi.getGovernment(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: regionalStats } = useQuery({
    queryKey: ['regional-statistics', selectedRegion],
    queryFn: () => dashboardApi.getRegionalStats(selectedRegion),
    enabled: !!selectedRegion,
  });

  // Use real trend data from backend
  const trendData = dashboard?.trend_data || [];

  // Ensure trendData has proper format (must be before early returns for hooks)
  const formattedTrendData = React.useMemo(() => {
    return Array.isArray(trendData) && trendData.length > 0
      ? trendData.map((item: any) => ({
          date: item.date || '',
          date_display: item.date_display || item.date || '',
          users: item.users || 0,
          pregnancies: item.pregnancies || 0,
          assessments: item.assessments || 0,
          high_risk: item.high_risk || 0,
          health_records: item.health_records || 0,
        }))
      : [];
  }, [trendData]);

  // Calculate cumulative trends for monthly view (must be before early returns)
  const monthlyTrend = React.useMemo(() => {
    if (!formattedTrendData.length) {
      // Return last 3 months with zero data if no trend data
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
          month: format(date, 'MMM'),
          users: 0,
          pregnancies: 0,
          assessments: 0,
        });
      }
      return months;
    }
    
    const months: { [key: string]: { users: number; pregnancies: number; assessments: number } } = {};
    
    formattedTrendData.forEach((point: any) => {
      if (!point.date) return;
      try {
        const date = new Date(point.date);
        if (isNaN(date.getTime())) return;
        const monthKey = format(date, 'MMM');
        
        if (!months[monthKey]) {
          months[monthKey] = { users: 0, pregnancies: 0, assessments: 0 };
        }
        
        months[monthKey].users += point.users || 0;
        months[monthKey].pregnancies += point.pregnancies || 0;
        months[monthKey].assessments += point.assessments || 0;
      } catch (e) {
        console.error('Error parsing date:', point.date, e);
      }
    });
    
    // Sort months chronologically
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Object.entries(months)
      .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
      .map(([month, data]) => ({
        month,
        ...data,
      }));
  }, [formattedTrendData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!dashboard) {
    return <div className="text-center py-8">No dashboard data available</div>;
  }

  const riskDistributionData = [
    {
      name: 'High Risk',
      value: dashboard.risk_statistics?.high_risk_count || 0,
      color: '#ef4444',
    },
    {
      name: 'Medium Risk',
      value: dashboard.risk_statistics?.medium_risk_count || 0,
      color: '#f59e0b',
    },
    {
      name: 'Low Risk',
      value: dashboard.risk_statistics?.low_risk_count || 0,
      color: '#10b981',
    },
  ];

  const regionalData = Object.entries(dashboard.geographic_distribution || {}).map(([region, count]) => ({
    name: region.toUpperCase(),
    value: count as number,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Government Health Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Population-level maternal health statistics and impact metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.overview.total_users?.toLocaleString() || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {dashboard.overview.active_users || 0} active
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Pregnancies</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.overview.active_pregnancies?.toLocaleString() || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {dashboard.overview.coverage_rate_percentage?.toFixed(1) || 0}% coverage
              </p>
            </div>
            <div className="p-3 bg-success-100 rounded-lg">
              <Heart className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Risk Assessments</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.risk_statistics.total_assessments?.toLocaleString() || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {dashboard.overview.assessment_rate_percentage?.toFixed(1) || 0}% assessment rate
              </p>
            </div>
            <div className="p-3 bg-warning-100 rounded-lg">
              <Activity className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Risk Cases</p>
              <p className="mt-1 text-2xl font-bold text-danger-600">
                {dashboard.risk_statistics.high_risk_count?.toLocaleString() || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {dashboard.risk_statistics.high_risk_percentage?.toFixed(1) || 0}% of total
              </p>
            </div>
            <div className="p-3 bg-danger-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-danger-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Potential Lives Saved (30d)</p>
              <p className="mt-1 text-3xl font-bold text-green-900">
                {dashboard.impact_metrics.potential_lives_saved_30d || 0}
              </p>
              <p className="mt-2 text-xs text-green-700">
                Based on early detection of high-risk cases
              </p>
            </div>
            <Award className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Early Detections (30d)</p>
              <p className="mt-1 text-3xl font-bold text-blue-900">
                {dashboard.impact_metrics.early_detections_30d || 0}
              </p>
              <p className="mt-2 text-xs text-blue-700">
                High-risk cases identified early
              </p>
            </div>
            <Target className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Preventive Interventions</p>
              <p className="mt-1 text-3xl font-bold text-purple-900">
                {dashboard.impact_metrics.preventive_interventions || 0}
              </p>
              <p className="mt-2 text-xs text-purple-700">
                Medium & high risk cases managed
              </p>
            </div>
            <Heart className="h-12 w-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Population Trends */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">30-Day Population Trends</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={formattedTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPregnancies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorAssessments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date_display" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUsers)"
                name="New Users"
              />
              <Area
                type="monotone"
                dataKey="pregnancies"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPregnancies)"
                name="New Pregnancies"
              />
              <Area
                type="monotone"
                dataKey="assessments"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAssessments)"
                name="Risk Assessments"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Level Distribution</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={riskDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, value }) => 
                  `${name}\n${value} (${(percent * 100).toFixed(1)}%)`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-danger-600">
                {dashboard.risk_statistics.high_risk_percentage?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-600">High Risk</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning-600">
                {dashboard.risk_statistics.medium_risk_percentage?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-600">Medium Risk</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success-600">
                {dashboard.risk_statistics.low_risk_percentage?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-600">Low Risk</p>
            </div>
          </div>
        </div>

        {/* Monthly Growth */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Activity Summary</h2>
          {monthlyTrend && monthlyTrend.length > 0 && monthlyTrend.some((m: any) => (m.users || 0) > 0 || (m.pregnancies || 0) > 0 || (m.assessments || 0) > 0) ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar dataKey="users" fill="#3b82f6" name="New Users" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pregnancies" fill="#10b981" name="New Pregnancies" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assessments" fill="#f59e0b" name="Assessments" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No monthly data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Activity Trend */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Activity Trend</h2>
          {dashboard.weekly_activity && dashboard.weekly_activity.length > 0 && dashboard.weekly_activity.some((d: any) => (d.records || 0) > 0 || (d.assessments || 0) > 0) ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={dashboard.weekly_activity.map((item: any) => ({
                name: item.name || item.date || 'N/A',
                records: item.records || 0,
                assessments: item.assessments || 0,
              }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="records"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  name="Health Records"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="assessments"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  name="Risk Assessments"
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No weekly activity data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Regional Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Regional Distribution</h2>
            <select
              value={selectedRegion || ''}
              onChange={(e) => setSelectedRegion(e.target.value || undefined)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Regions</option>
              <option value="en">English (EN)</option>
              <option value="ha">Hausa (HA)</option>
              <option value="yo">Yoruba (YO)</option>
              <option value="ig">Igbo (IG)</option>
            </select>
          </div>
          {regionalStats && selectedRegion && (
            <div className="mb-4 p-4 bg-primary-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Regional Statistics</p>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Total Assessments</p>
                  <p className="text-lg font-bold text-gray-900">{regionalStats.total_assessments || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">High Risk Cases</p>
                  <p className="text-lg font-bold text-danger-600">{regionalStats.high_risk_cases || 0}</p>
                  <p className="text-xs text-gray-500">{regionalStats.high_risk_percentage?.toFixed(1) || 0}%</p>
                </div>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={regionalData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                type="number" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={80}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Users (30d)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.trends_30_days.new_users || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Pregnancies (30d)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.trends_30_days.new_pregnancies || 0}
              </p>
            </div>
            <Heart className="h-8 w-8 text-success-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Assessments (30d)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.trends_30_days.new_assessments || 0}
              </p>
            </div>
            <Activity className="h-8 w-8 text-warning-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Risk (30d)</p>
              <p className="mt-1 text-2xl font-bold text-danger-600">
                {dashboard.trends_30_days.high_risk_cases || 0}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-danger-600" />
          </div>
        </div>
      </div>


      {/* Performance Metrics */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Total Assessments Processed</p>
            <p className="text-3xl font-bold text-gray-900">
              {dashboard.performance.total_assessments_processed?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">System Status</p>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-lg font-semibold text-green-600">
                {dashboard.performance.system_status || 'Operational'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Average Risk Score</p>
            <p className="text-3xl font-bold text-gray-900">
              {(dashboard.risk_statistics.average_risk_score || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

