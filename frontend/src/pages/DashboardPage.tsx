import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { pregnancyApi, healthApi, predictionApi, statisticsApi } from '../services/api';
import {
  Baby,
  ClipboardList,
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
  Scale,
  HeartPulse,
  Droplet,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Brain,
  FileSearch,
  ClipboardCheck,
  ShieldAlert,
  ScanSearch,
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
import { useTranslation } from '../contexts/TranslationContext';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('health_dashboard', 'Health Dashboard')}</h1>
          <p className="text-lg text-gray-600">
            {t('welcome_back', 'Welcome back')}, <span className="font-semibold text-primary-600">{user?.full_name || t('user', 'User')}</span>. {t('dashboard_description', 'Monitor your pregnancy health and track vital signs.')}
          </p>
        </div>
        <button
          onClick={handleForceRefresh}
          className="btn-secondary inline-flex items-center shadow-sm hover:shadow-md"
          title="Force refresh all data including risk assessment"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          {t('refresh', 'Refresh')}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-gradient bg-gradient-to-br from-blue-50 via-blue-100/50 to-white border-blue-200/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 group relative overflow-hidden glow-border">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-300/30 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">{t('pregnancy_week', 'Pregnancy Week')}</p>
              <p className="text-4xl font-bold text-blue-900 mb-1">
                {pregnancy?.current_week || 'N/A'}
              </p>
              <p className="text-xs font-medium text-blue-600">
                {pregnancy?.trimester ? `${t('trimester', 'Trimester')} ${pregnancy.trimester}` : t('not_set', 'Not set')}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <Baby className="h-10 w-10 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card-gradient bg-gradient-to-br from-green-50 via-green-100/50 to-white border-green-200/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 group relative overflow-hidden glow-border">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-green-300/30 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">{t('health_records', 'Health Records')}</p>
              <p className="text-4xl font-bold text-green-900 mb-1">
                {healthRecords?.total || 0}
              </p>
              <p className="text-xs font-medium text-green-600">{t('total_records_tracked', 'Total records tracked')}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <ClipboardList className="h-10 w-10 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card-gradient bg-gradient-to-br from-purple-50 via-purple-100/50 to-white border-purple-200/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 group relative overflow-hidden glow-border">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-300/30 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-2">{t('risk_level', 'Risk Level')}</p>
              <div className="mt-1">
                {riskLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                ) : riskAssessment ? (
                  <>
                    {getRiskBadge(riskAssessment.overall_risk || riskAssessment.risk_level)}
                    <p className="mt-2 text-xs font-medium text-purple-600">
                      {t('score', 'Score')}: {typeof riskAssessment.risk_score === 'number'
                        ? Math.min(riskAssessment.risk_score, 100).toFixed(2)
                        : riskAssessment.risk_score}%
                    </p>
                  </>
                ) : (
                  <span className="text-sm text-purple-700">Not assessed</span>
                )}
              </div>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <BarChart3 className="h-10 w-10 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card-gradient bg-gradient-to-br from-orange-50 via-orange-100/50 to-white border-orange-200/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 group relative overflow-hidden glow-border">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-orange-300/30 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-2">Due Date</p>
              <p className="text-2xl font-bold text-orange-900 mb-1">
                {pregnancy?.due_date
                  ? format(new Date(pregnancy.due_date), 'MMM dd')
                  : 'Not set'}
              </p>
              {pregnancy?.due_date && (
                <p className="text-xs font-medium text-orange-600">
                  {Math.ceil(
                    (new Date(pregnancy.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )}{' '}
                  days remaining
                </p>
              )}
            </div>
            <div className="p-3 bg-orange-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <Calendar className="h-10 w-10 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Health Trends Charts */}
      {healthTrendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weight Trend */}
          {healthTrendData.some(d => d.weight !== null && d.weight !== undefined && d.weight > 0) && (
            <div className="card hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Weight Trend</h2>
                {weightTrend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(weightTrend)}
                    <span className="text-xs text-gray-600">
                      {weightTrend === 'up' ? 'Increasing' : weightTrend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart 
                  data={healthTrendData.filter(d => d.weight !== null && d.weight !== undefined && d.weight > 0)} 
                  margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={0.9} />
                      <stop offset="50%" stopColor="#0ea5e9" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.15} />
                    </linearGradient>
                    <filter id="shadowWeight">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280', fontWeight: 600 } }}
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                    labelStyle={{ 
                      color: '#111827', 
                      fontWeight: 600, 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}
                    formatter={(value: any) => [
                      <span key="value" style={{ color: '#0284c7', fontWeight: 600 }}>
                        {value} kg
                      </span>,
                      'Weight'
                    ]}
                    cursor={{ stroke: '#0284c7', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#0284c7"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorWeight)"
                    name="Weight (kg)"
                    dot={{ fill: '#0284c7', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 3, fill: '#0284c7' }}
                    connectNulls={false}
                    style={{ filter: 'url(#shadowWeight)' }}
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
            <div className="card hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Blood Pressure Trend</h2>
                {bpTrend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(bpTrend)}
                    <span className="text-xs text-gray-600">
                      {bpTrend === 'up' ? 'Increasing' : bpTrend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={healthTrendData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <defs>
                    <filter id="shadowBP">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    label={{ value: 'Blood Pressure (mmHg)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280', fontWeight: 600 } }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  {/* Risk threshold lines */}
                  <ReferenceLine 
                    y={140} 
                    stroke="#dc2626" 
                    strokeDasharray="6 4" 
                    strokeWidth={2}
                    strokeOpacity={0.7} 
                    label={{ 
                      value: "High Systolic (140)", 
                      position: "right", 
                      style: { fontSize: '11px', fill: '#dc2626', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px' } 
                    }} 
                  />
                  <ReferenceLine 
                    y={90} 
                    stroke="#d97706" 
                    strokeDasharray="6 4" 
                    strokeWidth={2}
                    strokeOpacity={0.7} 
                    label={{ 
                      value: "High Diastolic (90)", 
                      position: "right", 
                      style: { fontSize: '11px', fill: '#d97706', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px' } 
                    }} 
                  />
                  <ReferenceLine 
                    y={120} 
                    stroke="#10b981" 
                    strokeDasharray="3 3" 
                    strokeWidth={1.5}
                    strokeOpacity={0.5} 
                    label={{ 
                      value: "Normal Systolic", 
                      position: "right", 
                      style: { fontSize: '10px', fill: '#10b981', fontWeight: 500 } 
                    }} 
                  />
                  <ReferenceLine 
                    y={80} 
                    stroke="#10b981" 
                    strokeDasharray="3 3" 
                    strokeWidth={1.5}
                    strokeOpacity={0.5} 
                    label={{ 
                      value: "Normal Diastolic", 
                      position: "right", 
                      style: { fontSize: '10px', fill: '#10b981', fontWeight: 500 } 
                    }} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                    labelStyle={{ 
                      color: '#111827', 
                      fontWeight: 600, 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}
                    formatter={(value: any, name: string) => {
                      const isHighRisk = name === 'Systolic' ? value >= 140 : value >= 90;
                      return [
                        <span key={name} style={{ color: isHighRisk ? '#dc2626' : '#374151', fontWeight: isHighRisk ? 700 : 600 }}>
                          {value} mmHg
                          {isHighRisk && ' ⚠️'}
                        </span>,
                        name
                      ];
                    }}
                    cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '15px', fontSize: '13px', fontWeight: 500 }}
                    iconType="line"
                    iconSize={16}
                  />
                  <Line
                    type="monotone"
                    dataKey="systolic_bp"
                    stroke="#dc2626"
                    strokeWidth={3}
                    name="Systolic"
                    dot={(props: any) => {
                      const isHighRisk = props.payload.systolic_bp >= 140;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={isHighRisk ? 5 : 4}
                          fill={isHighRisk ? '#dc2626' : '#ef4444'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#dc2626' }}
                    style={{ filter: 'url(#shadowBP)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic_bp"
                    stroke="#d97706"
                    strokeWidth={3}
                    name="Diastolic"
                    dot={(props: any) => {
                      const isHighRisk = props.payload.diastolic_bp >= 90;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={isHighRisk ? 5 : 4}
                          fill={isHighRisk ? '#d97706' : '#f59e0b'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#d97706' }}
                    style={{ filter: 'url(#shadowBP)' }}
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
            <div className="card hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Blood Sugar Trend</h2>
                {sugarTrend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(sugarTrend)}
                    <span className="text-xs text-gray-600">
                      {sugarTrend === 'up' ? 'Increasing' : sugarTrend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={healthTrendData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorSugar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.9} />
                      <stop offset="50%" stopColor="#22c55e" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0.15} />
                    </linearGradient>
                    <filter id="shadowSugar">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    label={{ value: 'Blood Sugar (mg/dL)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280', fontWeight: 600 } }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  {/* Risk threshold lines */}
                  <ReferenceLine 
                    y={140} 
                    stroke="#dc2626" 
                    strokeDasharray="6 4" 
                    strokeWidth={2}
                    strokeOpacity={0.7} 
                    label={{ 
                      value: "High (140)", 
                      position: "right", 
                      style: { fontSize: '11px', fill: '#dc2626', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px' } 
                    }} 
                  />
                  <ReferenceLine 
                    y={100} 
                    stroke="#d97706" 
                    strokeDasharray="6 4" 
                    strokeWidth={2}
                    strokeOpacity={0.7} 
                    label={{ 
                      value: "Elevated (100)", 
                      position: "right", 
                      style: { fontSize: '11px', fill: '#d97706', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px' } 
                    }} 
                  />
                  <ReferenceLine 
                    y={90} 
                    stroke="#16a34a" 
                    strokeDasharray="3 3" 
                    strokeWidth={1.5}
                    strokeOpacity={0.5} 
                    label={{ 
                      value: "Normal", 
                      position: "right", 
                      style: { fontSize: '10px', fill: '#16a34a', fontWeight: 500 } 
                    }} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                    labelStyle={{ 
                      color: '#111827', 
                      fontWeight: 600, 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}
                    formatter={(value: any) => {
                      const isHighRisk = value >= 140;
                      const isElevated = value >= 100 && value < 140;
                      return [
                        <span key="value" style={{ color: isHighRisk ? '#dc2626' : isElevated ? '#d97706' : '#374151', fontWeight: isHighRisk ? 700 : isElevated ? 600 : 600 }}>
                          {value} mg/dL
                          {isHighRisk && ' ⚠️ High'}
                          {isElevated && ' ⚠️ Elevated'}
                        </span>,
                        'Blood Sugar'
                      ];
                    }}
                    cursor={{ stroke: '#16a34a', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="blood_sugar"
                    stroke="#16a34a"
                    strokeWidth={3}
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
                          r={isHighRisk ? 5 : isElevated ? 4.5 : 4}
                          fill={isHighRisk ? '#dc2626' : isElevated ? '#d97706' : '#16a34a'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#16a34a' }}
                    style={{ filter: 'url(#shadowSugar)' }}
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
            <div className="card hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Heart Rate Trend</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={healthTrendData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorHeartRate" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={1} />
                      <stop offset="100%" stopColor="#f472b6" stopOpacity={1} />
                    </linearGradient>
                    <filter id="shadowHeartRate">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280', fontWeight: 600 } }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                    labelStyle={{ 
                      color: '#111827', 
                      fontWeight: 600, 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}
                    formatter={(value: any) => [
                      <span key="value" style={{ color: '#ec4899', fontWeight: 600 }}>
                        {value} bpm
                      </span>,
                      'Heart Rate'
                    ]}
                    cursor={{ stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="heart_rate"
                    stroke="url(#colorHeartRate)"
                    strokeWidth={3}
                    name="Heart Rate (bpm)"
                    dot={{ fill: '#ec4899', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#ec4899' }}
                    style={{ filter: 'url(#shadowHeartRate)' }}
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
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Weekly Activity Summary</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              <span>Last 7 days</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={weeklyTrendData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="gradientWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="gradientBP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="gradientSugar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="gradientHR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  fontSize: '13px',
                  fontWeight: 500
                }}
                labelStyle={{ 
                  color: '#111827', 
                  fontWeight: 600, 
                  marginBottom: '8px',
                  fontSize: '13px'
                }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                iconType="circle"
                iconSize={12}
              />
              <Bar 
                dataKey="weight" 
                fill="url(#gradientWeight)" 
                name="Weight (kg)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="systolic_bp" 
                fill="url(#gradientBP)" 
                name="Systolic BP (mmHg)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="blood_sugar" 
                fill="url(#gradientSugar)" 
                name="Blood Sugar (mg/dL)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="heart_rate" 
                fill="url(#gradientHR)" 
                name="Heart Rate (bpm)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pregnancy Info & Health Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pregnancy Status */}
          <div className="card hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pregnancy Status</h2>
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
          <div className="card hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('recent_health_records', 'Recent Health Records')}</h2>
              <Link
                to="/app/health"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('view_all', 'View All')}
              </Link>
            </div>

            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : healthError ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">{t('error_loading_health_records', 'Error loading health records')}</p>
                <p className="text-xs text-gray-500 mb-4">
                  {healthError instanceof Error ? healthError.message : t('unknown_error', 'Unknown error')}
                </p>
                <Link to="/app/health/new" className="btn-primary inline-flex items-center">
                  {t('add_health_record', 'Add Health Record')}
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
                        <ClipboardList className="h-5 w-5 text-primary-600" />
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
                              {t('weight', 'Weight')}: {record.weight}kg
                            </span>
                          )}
                          {record.systolic_bp && record.diastolic_bp && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                              {t('bp', 'BP')}: {record.systolic_bp}/{record.diastolic_bp} mmHg
                            </span>
                          )}
                          {record.blood_sugar && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                              {t('sugar', 'Sugar')}: {record.blood_sugar} mg/dL
                            </span>
                          )}
                          {record.heart_rate && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                              {t('hr', 'HR')}: {record.heart_rate} bpm
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
                      {t('showing', 'Showing')} 5 {t('of', 'of')} {healthRecords.total} {t('records', 'records')}
                    </p>
                  </div>
                )}
              </div>
            ) : !pregnancy ? (
              <div className="text-center py-8">
                <Baby className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">{t('please_add_pregnancy_info_first', 'Please add pregnancy information first')}</p>
                <Link to="/app/pregnancy" className="btn-primary inline-flex items-center">
                  {t('add_pregnancy_info', 'Add Pregnancy Info')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">{t('no_health_records_yet', 'No health records yet')}</p>
                <Link to="/app/health/new" className="btn-primary inline-flex items-center">
                  {t('add_health_record', 'Add Health Record')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Risk Assessment & Quick Actions */}
        <div className="space-y-6">
          {/* Risk Assessment Summary */}
          <div className="card hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {(() => {
                  // Determine risk level and colors
                  let riskLevel = 'low';
                  let iconBgClass = 'bg-gradient-to-br from-success-100 to-success-50 border-success-200/50';
                  let iconColorClass = 'text-success-600';
                  
                  if (riskAssessment) {
                    const riskLower = (riskAssessment.overall_risk || riskAssessment.risk_level || 'low').toLowerCase();
                    if (riskLower.includes('high')) {
                      riskLevel = 'high';
                      iconBgClass = 'bg-gradient-to-br from-danger-100 to-danger-50 border-danger-200/50';
                      iconColorClass = 'text-danger-600';
                    } else if (riskLower.includes('medium') || riskLower.includes('middle')) {
                      riskLevel = 'medium';
                      iconBgClass = 'bg-gradient-to-br from-warning-100 to-warning-50 border-warning-200/50';
                      iconColorClass = 'text-warning-600';
                    }
                  }
                  
                  return (
                    <div className={`p-2 ${iconBgClass} rounded-xl border transition-all duration-300`}>
                      <Activity className={`h-6 w-6 ${iconColorClass}`} />
                    </div>
                  );
                })()}
                <h2 className="text-2xl font-bold text-gray-900">{t('risk_assessment', 'Risk Assessment')}</h2>
              </div>
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
                  <span className="ml-2 text-sm text-gray-600">{t('assessing_risk_from_health_records', 'Assessing risk from health records...')}</span>
              </div>
            ) : riskError ? (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-warning-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  {riskError instanceof Error && riskError.message.includes('No health records')
                    ? t('add_health_records_to_generate_risk_assessment', 'Add health records to generate risk assessment')
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
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                        <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-warning-600" />
                        Key Risk Factors
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {riskAssessment.risk_factors.slice(0, 3).map((factor: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-warning-50 text-warning-800 border border-warning-300 shadow-sm">
                            <AlertTriangle className="h-3 w-3 mr-1.5 text-warning-600" />
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
                <div className="inline-block p-3 bg-warning-50 rounded-full mb-3">
                  <Activity className="h-8 w-8 text-warning-500" />
                </div>
                <p className="text-sm text-gray-600 mb-3">Generate risk assessment from your health records</p>
                <Link to="/risk-assessment" className="btn-primary text-sm inline-flex items-center">
                  Generate Assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="inline-block p-3 bg-gray-50 rounded-full mb-3">
                  <Stethoscope className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mb-3">Add health records to generate risk assessment</p>
                <Link to="/app/health/new" className="btn-primary text-sm inline-flex items-center">
                  Add Health Record
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/app/health/new"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-xl hover:from-primary-100 hover:to-primary-200 transition-all duration-200 border-2 border-primary-200/50 hover:border-primary-300 transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-500/10 rounded-lg group-hover:bg-primary-500/20 transition-colors">
                    <Stethoscope className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Add Health Record</span>
                </div>
                <ArrowRight className="h-5 w-5 text-primary-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/app/recommendations"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-xl hover:from-primary-100 hover:to-primary-200 transition-all duration-200 border-2 border-primary-200/50 hover:border-primary-300 transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-500/10 rounded-lg group-hover:bg-primary-500/20 transition-colors">
                    <Sparkles className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{t('recommendations', 'Recommendations')}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-primary-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/app/risk-assessment"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100/50 rounded-xl hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 border-2 border-yellow-200/50 hover:border-yellow-300 transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                  <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                    <Brain className="h-5 w-5 text-warning-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{t('risk_assessment', 'Risk Assessment')}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-yellow-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/emergency"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-danger-50 to-danger-100/50 rounded-xl hover:from-danger-100 hover:to-danger-200 transition-all duration-200 border-2 border-danger-200/50 hover:border-danger-300 transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-danger-500/10 rounded-lg group-hover:bg-danger-500/20 transition-colors">
                    <AlertTriangle className="h-5 w-5 text-danger-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Emergency</span>
                </div>
                <ArrowRight className="h-5 w-5 text-danger-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
