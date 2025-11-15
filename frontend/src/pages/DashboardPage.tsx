import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { pregnancyApi, healthApi, predictionApi, statisticsApi } from '../services/api';
import {
  Baby,
  FileText,
  AlertTriangle,
  Activity,
  Calendar,
  TrendingUp,
  Heart,
  ArrowRight,
  Loader2,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import React from 'react';
import RiskGauge from '../components/RiskGauge';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Redirect based on role - MUST check user exists and has valid role
  React.useEffect(() => {
    if (user) {
      if (user.role === 'provider') {
        navigate('/app/provider-dashboard', { replace: true });
      } else if (user.role === 'government') {
        navigate('/app/government-dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  // Show loading if user is not loaded yet
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // If user is provider or government, show loading while redirecting
  if (user.role === 'provider' || user.role === 'government') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const { data: pregnancy, isLoading: pregnancyLoading } = useQuery({
    queryKey: ['pregnancy', 'current'],
    queryFn: () => pregnancyApi.getCurrent(),
    retry: 1,
  });

  const { data: healthRecords, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['health-records', pregnancy?.id],
    queryFn: () => healthApi.getAll(),
    enabled: !!pregnancy?.id,
    retry: 2,
    staleTime: 0, // Always refetch to get latest records
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Risk assessment - backend will automatically use latest health record
  // Use a more reliable query key that changes when health records change
  const healthRecordsHash = healthRecords?.records?.length
    ? `${healthRecords.records.length}-${healthRecords.records[0]?.id || ''}-${healthRecords.records[0]?.recorded_at || ''}`
    : '0';

  const { data: riskAssessment, isLoading: riskLoading, error: riskError } = useQuery({
    queryKey: ['risk-assessment', pregnancy?.id, healthRecordsHash],
    queryFn: () => {
      console.log('[Dashboard] Fetching risk assessment for pregnancy:', pregnancy!.id, 'Hash:', healthRecordsHash);
      return predictionApi.assessRisk(pregnancy!.id);
    },
    enabled: !!pregnancy?.id, // Don't wait for healthRecords - backend will use latest
    retry: 1,
    staleTime: 0, // Always refetch
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: false, // Don't auto-refetch, but allow manual refresh
  });

  // Auto-refresh risk assessment when health records change
  React.useEffect(() => {
    if (healthRecordsHash && healthRecordsHash !== '0' && pregnancy?.id) {
      console.log('[Dashboard] Health records changed, invalidating risk assessment. Hash:', healthRecordsHash);
      queryClient.invalidateQueries({
        queryKey: ['risk-assessment', pregnancy.id],
        exact: false
      });
    }
  }, [healthRecordsHash, pregnancy?.id, queryClient]);

  // User statistics
  const { data: userStats } = useQuery({
    queryKey: ['user-statistics'],
    queryFn: () => statisticsApi.getUserStats(),
    enabled: !!user,
    retry: 1,
  });

  const isLoading = pregnancyLoading || healthLoading;

  // Process health records for trend charts
  const healthTrendData = React.useMemo(() => {
    if (!healthRecords?.records || healthRecords.records.length === 0) return [];

    // Sort by date and take last 30 records for trends
    const sortedRecords = [...healthRecords.records]
      .sort((a, b) => {
        const dateA = typeof a.recorded_at === 'string' ? new Date(a.recorded_at).getTime() : new Date(a.recorded_at).getTime();
        const dateB = typeof b.recorded_at === 'string' ? new Date(b.recorded_at).getTime() : new Date(b.recorded_at).getTime();
        return dateA - dateB;
      })
      .slice(-30);

    return sortedRecords.map((record) => {
      const recordDate = typeof record.recorded_at === 'string'
        ? new Date(record.recorded_at)
        : new Date(record.recorded_at);
      return {
        date: format(recordDate, 'MMM dd'),
        fullDate: record.recorded_at,
        weight: record.weight || null,
        systolic_bp: record.systolic_bp || null,
        diastolic_bp: record.diastolic_bp || null,
        blood_sugar: record.blood_sugar || null,
        heart_rate: record.heart_rate || null,
        bmi: record.bmi || null,
        body_temp: record.body_temp || null,
      };
    });
  }, [healthRecords]);

  // Weekly trend data (last 7 records)
  const weeklyTrendData = React.useMemo(() => {
    if (!healthRecords?.records || healthRecords.records.length === 0) return [];

    const sortedRecords = [...healthRecords.records]
      .sort((a, b) => {
        const dateA = typeof a.recorded_at === 'string' ? new Date(a.recorded_at).getTime() : new Date(a.recorded_at).getTime();
        const dateB = typeof b.recorded_at === 'string' ? new Date(b.recorded_at).getTime() : new Date(b.recorded_at).getTime();
        return dateA - dateB;
      })
      .slice(-7);

    return sortedRecords.map((record) => {
      const recordDate = typeof record.recorded_at === 'string'
        ? new Date(record.recorded_at)
        : new Date(record.recorded_at);
      return {
        date: format(recordDate, 'EEE'),
        fullDate: record.recorded_at,
        weight: record.weight || null,
        systolic_bp: record.systolic_bp || null,
        diastolic_bp: record.diastolic_bp || null,
        blood_sugar: record.blood_sugar || null,
        heart_rate: record.heart_rate || null,
      };
    });
  }, [healthRecords]);

  // Calculate trends (increasing, decreasing, stable)
  const getTrend = (current: number | null | undefined, previous: number | null | undefined) => {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getTrendIcon = (trend: string | null) => {
    if (!trend) return <Minus className="h-4 w-4 text-gray-400" />;
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-danger-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-success-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Get latest vs previous for trends
  const latestRecord = healthRecords?.records?.[0];
  const previousRecord = healthRecords?.records?.[1];

  const weightTrend = latestRecord && previousRecord
    ? getTrend(latestRecord.weight ?? null, previousRecord.weight ?? null)
    : null;
  const bpTrend = latestRecord && previousRecord
    ? getTrend(latestRecord.systolic_bp ?? null, previousRecord.systolic_bp ?? null)
    : null;
  const sugarTrend = latestRecord && previousRecord
    ? getTrend(latestRecord.blood_sugar ?? null, previousRecord.blood_sugar ?? null)
    : null;

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    const riskLower = risk.toLowerCase();
    if (riskLower === 'high') {
      return <span className="badge-danger">High Risk</span>;
    }
    if (riskLower === 'medium') {
      return <span className="badge-warning">Medium Risk</span>;
    }
    return <span className="badge-success">Low Risk</span>;
  };

  // Force refresh function - completely clear cache and refetch
  const handleForceRefresh = async () => {
    console.log('[Dashboard] Force refreshing all data...');
    // Remove all queries from cache
    queryClient.removeQueries({ queryKey: ['health-records'] });
    queryClient.removeQueries({ queryKey: ['risk-assessment'] });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 300));

    // Refetch health records first
    await queryClient.refetchQueries({
      queryKey: ['health-records'],
      exact: false
    });

    // Then refetch risk assessment
    await new Promise(resolve => setTimeout(resolve, 300));
    await queryClient.refetchQueries({
      queryKey: ['risk-assessment'],
      exact: false
    });

    console.log('[Dashboard] Refresh complete');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.full_name || 'User'}. Monitor your pregnancy health and track vital signs.
          </p>
        </div>
        <button
          onClick={handleForceRefresh}
          className="btn-secondary inline-flex items-center"
          title="Force refresh all data including risk assessment"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Pregnancy Week</p>
              <p className="mt-1 text-3xl font-bold text-blue-900">
                {pregnancy?.current_week || 'N/A'}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                {pregnancy?.trimester ? `Trimester ${pregnancy.trimester}` : 'Not set'}
              </p>
            </div>
            <Baby className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Health Records</p>
              <p className="mt-1 text-3xl font-bold text-green-900">
                {healthRecords?.total || 0}
              </p>
              <p className="mt-1 text-xs text-green-700">Total records tracked</p>
            </div>
            <FileText className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Risk Level</p>
              <div className="mt-1">
                {riskLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                ) : riskAssessment ? (
                  <>
                    {getRiskBadge(riskAssessment.overall_risk || riskAssessment.risk_level)}
                    <p className="mt-1 text-xs text-purple-700">
                      Score: {typeof riskAssessment.risk_score === 'number'
                        ? Math.min(riskAssessment.risk_score, 100).toFixed(2)
                        : riskAssessment.risk_score}%
                    </p>
                  </>
                ) : (
                  <span className="text-sm text-purple-700">Not assessed</span>
                )}
              </div>
            </div>
            <Activity className="h-12 w-12 text-purple-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">Due Date</p>
              <p className="mt-1 text-lg font-bold text-orange-900">
                {pregnancy?.due_date
                  ? format(new Date(pregnancy.due_date), 'MMM dd')
                  : 'Not set'}
              </p>
              {pregnancy?.due_date && (
                <p className="mt-1 text-xs text-orange-700">
                  {Math.ceil(
                    (new Date(pregnancy.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )}{' '}
                  days remaining
                </p>
              )}
            </div>
            <Calendar className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Health Trends Charts */}
      {healthTrendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weight Trend */}
          {healthTrendData.some(d => d.weight !== null && d.weight !== undefined && d.weight > 0) && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Weight Trend</h2>
                {weightTrend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(weightTrend)}
                    <span className="text-xs text-gray-600">
                      {weightTrend === 'up' ? 'Increasing' : weightTrend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart 
                  data={healthTrendData.filter(d => d.weight !== null && d.weight !== undefined && d.weight > 0)} 
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#6b7280' } }}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [
                      <span key="value" style={{ color: '#374151', fontWeight: 'normal' }}>
                        {value} kg
                      </span>,
                      'Weight'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorWeight)"
                    name="Weight (kg)"
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {latestRecord?.weight && (
                <div className="mt-2 text-center">
                  <span className="text-sm font-semibold text-gray-900">
                    Current: {latestRecord.weight} kg
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Blood Pressure Trend */}
          {healthTrendData.some(d => d.systolic_bp !== null) && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Blood Pressure Trend</h2>
                {bpTrend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(bpTrend)}
                    <span className="text-xs text-gray-600">
                      {bpTrend === 'up' ? 'Increasing' : bpTrend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={healthTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    label={{ value: 'mmHg', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#6b7280' } }}
                  />
                  {/* Risk threshold lines */}
                  <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: "High (140)", position: "right", style: { fontSize: '10px', fill: '#ef4444' } }} />
                  <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: "High (90)", position: "right", style: { fontSize: '10px', fill: '#f59e0b' } }} />
                  <ReferenceLine y={120} stroke="#10b981" strokeDasharray="2 2" strokeOpacity={0.4} label={{ value: "Normal", position: "right", style: { fontSize: '9px', fill: '#10b981' } }} />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="2 2" strokeOpacity={0.4} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => {
                      const isHighRisk = name === 'Systolic' ? value >= 140 : value >= 90;
                      return [
                        <span key={name} style={{ color: isHighRisk ? '#ef4444' : '#374151', fontWeight: isHighRisk ? 'bold' : 'normal' }}>
                          {value} {name === 'Systolic' || name === 'Diastolic' ? 'mmHg' : ''}
                          {isHighRisk && ' ⚠️'}
                        </span>,
                        name
                      ];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="systolic_bp"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    name="Systolic"
                    dot={(props: any) => {
                      const isHighRisk = props.payload.systolic_bp >= 140;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={isHighRisk ? 5 : 3}
                          fill={isHighRisk ? '#dc2626' : '#ef4444'}
                          stroke={isHighRisk ? '#fff' : 'none'}
                          strokeWidth={isHighRisk ? 1.5 : 0}
                        />
                      );
                    }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic_bp"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    name="Diastolic"
                    dot={(props: any) => {
                      const isHighRisk = props.payload.diastolic_bp >= 90;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={isHighRisk ? 5 : 3}
                          fill={isHighRisk ? '#d97706' : '#f59e0b'}
                          stroke={isHighRisk ? '#fff' : 'none'}
                          strokeWidth={isHighRisk ? 1.5 : 0}
                        />
                      );
                    }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              {latestRecord?.systolic_bp && latestRecord?.diastolic_bp && (
                <div className="mt-2 text-center">
                  <span className={`text-sm font-semibold ${
                    latestRecord.systolic_bp >= 140 || latestRecord.diastolic_bp >= 90
                      ? 'text-danger-600'
                      : 'text-gray-900'
                  }`}>
                    Current: {latestRecord.systolic_bp}/{latestRecord.diastolic_bp} mmHg
                    {(latestRecord.systolic_bp >= 140 || latestRecord.diastolic_bp >= 90) && ' ⚠️ High'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Blood Sugar Trend */}
          {healthTrendData.some(d => d.blood_sugar !== null) && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Blood Sugar Trend</h2>
                {sugarTrend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(sugarTrend)}
                    <span className="text-xs text-gray-600">
                      {sugarTrend === 'up' ? 'Increasing' : sugarTrend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={healthTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSugar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    label={{ value: 'mg/dL', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#6b7280' } }}
                  />
                  {/* Risk threshold lines */}
                  <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: "High (140)", position: "right", style: { fontSize: '10px', fill: '#ef4444' } }} />
                  <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: "Elevated (100)", position: "right", style: { fontSize: '10px', fill: '#f59e0b' } }} />
                  <ReferenceLine y={90} stroke="#10b981" strokeDasharray="2 2" strokeOpacity={0.4} label={{ value: "Normal", position: "right", style: { fontSize: '9px', fill: '#10b981' } }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => {
                      const isHighRisk = value >= 140;
                      const isElevated = value >= 100 && value < 140;
                      return [
                        <span key="value" style={{ color: isHighRisk ? '#ef4444' : isElevated ? '#f59e0b' : '#374151', fontWeight: isHighRisk ? 'bold' : 'normal' }}>
                          {value} mg/dL
                          {isHighRisk && ' ⚠️ High'}
                          {isElevated && ' ⚠️ Elevated'}
                        </span>,
                        'Blood Sugar'
                      ];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="blood_sugar"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSugar)"
                    name="Blood Sugar (mg/dL)"
                    dot={(props: any) => {
                      const value = props.payload.blood_sugar;
                      const isHighRisk = value >= 140;
                      const isElevated = value >= 100 && value < 140;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={isHighRisk ? 5 : isElevated ? 4 : 3}
                          fill={isHighRisk ? '#dc2626' : isElevated ? '#f59e0b' : '#10b981'}
                          stroke={isHighRisk || isElevated ? '#fff' : 'none'}
                          strokeWidth={isHighRisk || isElevated ? 1.5 : 0}
                        />
                      );
                    }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {latestRecord?.blood_sugar && (
                <div className="mt-2 text-center">
                  <span className={`text-sm font-semibold ${
                    latestRecord.blood_sugar >= 140
                      ? 'text-danger-600'
                      : latestRecord.blood_sugar >= 100
                      ? 'text-warning-600'
                      : 'text-gray-900'
                  }`}>
                    Current: {latestRecord.blood_sugar} mg/dL
                    {latestRecord.blood_sugar >= 140 && ' ⚠️ High'}
                    {latestRecord.blood_sugar >= 100 && latestRecord.blood_sugar < 140 && ' ⚠️ Elevated'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Heart Rate Trend */}
          {healthTrendData.some(d => d.heart_rate !== null) && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Heart Rate Trend</h2>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={healthTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="heart_rate"
                    stroke="#ec4899"
                    strokeWidth={2}
                    name="Heart Rate (bpm)"
                    dot={{ fill: '#ec4899', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              {latestRecord?.heart_rate && (
                <div className="mt-2 text-center">
                  <span className="text-sm font-semibold text-gray-900">
                    Current: {latestRecord.heart_rate} bpm
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Weekly Activity Summary */}
      {weeklyTrendData.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Activity Summary</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
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
              <Bar dataKey="weight" fill="#3b82f6" name="Weight (kg)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="systolic_bp" fill="#ef4444" name="Systolic BP" radius={[4, 4, 0, 0]} />
              <Bar dataKey="blood_sugar" fill="#10b981" name="Blood Sugar" radius={[4, 4, 0, 0]} />
              <Bar dataKey="heart_rate" fill="#ec4899" name="Heart Rate" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pregnancy Info & Health Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pregnancy Status */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Pregnancy Status</h2>
              {pregnancy && (
                <Link
                  to="/app/pregnancy"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Edit
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : pregnancy ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                      <Baby className="h-8 w-8 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Active Pregnancy</h3>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          Due Date: {format(new Date(pregnancy.due_date), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                      {pregnancy.doctor_name && (
                        <div className="flex items-center">
                          <Heart className="h-4 w-4 mr-2" />
                          <span>Doctor: {pregnancy.doctor_name}</span>
                        </div>
                      )}
                      {pregnancy.hospital_name && (
                        <div className="flex items-center">
                          <Heart className="h-4 w-4 mr-2" />
                          <span>Hospital: {pregnancy.hospital_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Baby className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No active pregnancy recorded</p>
                <Link to="/app/pregnancy" className="btn-primary inline-flex items-center">
                  Add Pregnancy Info
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Recent Health Records */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Health Records</h2>
              <Link
                to="/app/health"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View All
              </Link>
            </div>

            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : healthError ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Error loading health records</p>
                <p className="text-xs text-gray-500 mb-4">
                  {healthError instanceof Error ? healthError.message : 'Unknown error'}
                </p>
                <Link to="/app/health/new" className="btn-primary inline-flex items-center">
                  Add Health Record
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ) : healthRecords?.records && healthRecords.records.length > 0 ? (
              <div className="space-y-3">
                {healthRecords.records.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 bg-white rounded-lg">
                        <FileText className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {format(
                            typeof record.recorded_at === 'string'
                              ? new Date(record.recorded_at)
                              : new Date(record.recorded_at),
                            'MMM dd, yyyy'
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {record.weight && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                              Weight: {record.weight}kg
                            </span>
                          )}
                          {record.systolic_bp && record.diastolic_bp && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                              BP: {record.systolic_bp}/{record.diastolic_bp} mmHg
                            </span>
                          )}
                          {record.blood_sugar && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                              Sugar: {record.blood_sugar} mg/dL
                            </span>
                          )}
                          {record.heart_rate && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                              HR: {record.heart_rate} bpm
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/app/health/${record.id}`}
                      className="text-primary-600 hover:text-primary-700 ml-2"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                ))}
                {healthRecords.total > 5 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-gray-500">
                      Showing 5 of {healthRecords.total} records
                    </p>
                  </div>
                )}
              </div>
            ) : !pregnancy ? (
              <div className="text-center py-8">
                <Baby className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Please add pregnancy information first</p>
                <Link to="/app/pregnancy" className="btn-primary inline-flex items-center">
                  Add Pregnancy Info
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No health records yet</p>
                <Link to="/app/health/new" className="btn-primary inline-flex items-center">
                  Add Health Record
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Risk Assessment & Quick Actions */}
        <div className="space-y-6">
          {/* Risk Assessment Summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Risk Assessment</h2>
              {riskAssessment && (
                <Link
                  to="/risk-assessment"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Details
                </Link>
              )}
            </div>
            {riskLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-600">Assessing risk from health records...</span>
              </div>
            ) : riskError ? (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-warning-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  {riskError instanceof Error && riskError.message.includes('No health records')
                    ? 'Add health records to generate risk assessment'
                    : 'Unable to generate risk assessment'}
                </p>
                {healthRecords?.records && healthRecords.records.length > 0 ? (
                  <Link to="/risk-assessment" className="btn-primary text-sm inline-flex items-center mt-2">
                    Try Again
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <Link to="/app/health/new" className="btn-primary text-sm inline-flex items-center mt-2">
                    Add Health Record
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                )}
              </div>
            ) : riskAssessment ? (
              <div className="space-y-4">
                {/* Risk Gauge - Exact Icon from Design */}
                <div className="flex justify-center py-2">
                  <RiskGauge
                    riskLevel={riskAssessment.overall_risk || riskAssessment.risk_level || 'Low'}
                    riskScore={typeof riskAssessment.risk_score === 'number'
                      ? Math.min(riskAssessment.risk_score, 99.99)
                      : 0}
                  />
                </div>

                {/* Quick Summary */}
                <div className="pt-4 border-t border-gray-200">

                  {riskAssessment.risk_factors && riskAssessment.risk_factors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1.5">Key Risk Factors</p>
                      <div className="flex flex-wrap gap-1.5">
                        {riskAssessment.risk_factors.slice(0, 3).map((factor: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-warning-50 text-warning-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {factor.split('(')[0].trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link
                    to="/risk-assessment"
                    className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium pt-2 border-t border-gray-200"
                  >
                    View Full Assessment &rarr;
                  </Link>
                </div>
              </div>
            ) : healthRecords?.records && healthRecords.records.length > 0 ? (
              <div className="text-center py-4">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">Generate risk assessment from your health records</p>
                <Link to="/risk-assessment" className="btn-primary text-sm inline-flex items-center">
                  Generate Assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">Add health records to generate risk assessment</p>
                <Link to="/health/new" className="btn-primary text-sm inline-flex items-center">
                  Add Health Record
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/health/new"
                className="flex items-center justify-between p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary-600" />
                  <span className="font-medium text-gray-900">Add Health Record</span>
                </div>
                <ArrowRight className="h-5 w-5 text-primary-400" />
              </Link>

              <Link
                to="/recommendations"
                className="flex items-center justify-between p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  <span className="font-medium text-gray-900">Recommendations</span>
                </div>
                <ArrowRight className="h-5 w-5 text-primary-400" />
              </Link>

              <Link
                to="/risk-assessment"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-warning-600" />
                  <span className="font-medium text-gray-900">Risk Assessment</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </Link>

              <Link
                to="/emergency"
                className="flex items-center justify-between p-3 bg-danger-50 rounded-lg hover:bg-danger-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-danger-600" />
                  <span className="font-medium text-gray-900">Emergency</span>
                </div>
                <ArrowRight className="h-5 w-5 text-danger-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
