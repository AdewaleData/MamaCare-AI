import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, pregnancyApi } from '../services/api';
import {
  Users,
  AlertTriangle,
  Calendar,
  Activity,
  TrendingUp,
  Heart,
  Loader2,
  Phone,
  Clock,
  FileText,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import { useTranslation } from '../contexts/TranslationContext';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

function PendingConfirmationCard({ patient }: { patient: any }) {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = React.useState(false);

  const confirmMutation = useMutation({
    mutationFn: () => pregnancyApi.confirmProvider(patient.pregnancy_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
      setIsConfirming(false);
    },
    onError: (error: any) => {
      console.error('Error confirming patient:', error);
      alert('Failed to confirm patient. Please try again.');
      setIsConfirming(false);
    },
  });

  const handleConfirm = () => {
    if (window.confirm(`Confirm ${patient.patient_name} as your patient?`)) {
      setIsConfirming(true);
      confirmMutation.mutate();
    }
  };

  return (
    <div className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">{patient.patient_name}</h3>
            <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-xs font-medium rounded">
              Pending
            </span>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            {patient.patient_email && (
              <p className="flex items-center">
                <span className="w-20">Email:</span>
                <span>{patient.patient_email}</span>
              </p>
            )}
            {patient.patient_phone && (
              <p className="flex items-center">
                <span className="w-20">Phone:</span>
                <span>{patient.patient_phone}</span>
              </p>
            )}
            {patient.due_date && (
              <p className="flex items-center">
                <span className="w-20">Due Date:</span>
                <span>{format(new Date(patient.due_date), 'MMM dd, yyyy')}</span>
              </p>
            )}
            {patient.current_week > 0 && (
              <p className="flex items-center">
                <span className="w-20">Week:</span>
                <span>Week {patient.current_week}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="ml-4 btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Confirming...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Confirm Patient</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ProviderDashboardPage() {
  const { t } = useTranslation();
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['provider-dashboard'],
    queryFn: () => dashboardApi.getProvider(),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
    retry: 2,
  });

  // Log for debugging
  React.useEffect(() => {
    if (error) {
      console.error('[ProviderDashboard] Error fetching dashboard:', error);
    }
    if (dashboard) {
      console.log('[ProviderDashboard] Dashboard data received:', dashboard);
    }
  }, [dashboard, error]);

  // Use real weekly activity data from backend
  const weeklyActivityData = dashboard?.weekly_activity || [];

  // Ensure activityData has proper format for charts
  // MUST be before early returns (React hooks rule)
  const activityData = React.useMemo(() => {
    if (Array.isArray(weeklyActivityData) && weeklyActivityData.length > 0) {
      return weeklyActivityData.map((item: any) => ({
        name: item.name || item.date || 'N/A',
        records: item.records || 0,
        assessments: item.assessments || 0,
      }));
    }
    // Return last 7 days with zero data if no activity data
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      name: day,
      records: 0,
      assessments: 0,
    }));
  }, [weeklyActivityData]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <p className="font-semibold">Error loading dashboard</p>
          <p className="text-sm text-gray-600 mt-2">
            {error instanceof Error ? error.message : 'Failed to load dashboard data'}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">{t('no_dashboard_data_available', 'No dashboard data available')}</p>
          <p className="text-sm text-gray-500">
            This may be because there are no patients assigned to you yet, or no data has been recorded.
          </p>
        </div>
      );
  }

  const riskDistributionData = [
    { name: 'High Risk', value: dashboard.risk_distribution?.High || 0, color: '#ef4444' },
    { name: 'Medium Risk', value: dashboard.risk_distribution?.Medium || 0, color: '#f59e0b' },
    { name: 'Low Risk', value: dashboard.risk_distribution?.Low || 0, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('provider_dashboard', 'Provider Dashboard')}</h1>
        <p className="mt-2 text-gray-600">
          {t('welcome', 'Welcome')}, {dashboard.provider_name}. {t('monitor_your_patients_and_manage_high_risk_cases', 'Monitor your patients and manage high-risk cases')}.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_patients', 'Total Patients')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.overview.total_patients || 0}
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
              <p className="text-sm font-medium text-gray-600">{t('active_pregnancies', 'Active Pregnancies')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.overview.active_pregnancies || 0}
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
              <p className="text-sm font-medium text-gray-600">{t('high_risk_cases', 'High Risk Cases')}</p>
              <p className="mt-1 text-2xl font-bold text-danger-600">
                {dashboard.overview.high_risk_cases || 0}
              </p>
            </div>
            <div className="p-3 bg-danger-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('upcoming_appointments', 'Upcoming Appointments')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.overview.upcoming_appointments || 0}
              </p>
            </div>
            <div className="p-3 bg-warning-100 rounded-lg">
              <Calendar className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        {dashboard.overview.pending_confirmations > 0 && (
          <div className="card border-2 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Confirmations</p>
                <p className="mt-1 text-2xl font-bold text-primary-600">
                  {dashboard.overview.pending_confirmations || 0}
                </p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Trends Over Time */}
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Weekly Risk Trends</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Last 7 Days</span>
            </div>
          </div>
          {activityData.length === 0 || activityData.every((d: any) => d.records === 0 && d.assessments === 0) ? (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No trend data available</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={activityData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="gradientAssessments" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="gradientRecords" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={1} />
                </linearGradient>
                <filter id="shadowProvider">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} vertical={false} />
              <XAxis 
                dataKey="name" 
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
                cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                iconType="circle"
                iconSize={12}
              />
              <Line
                type="monotone"
                dataKey="assessments"
                stroke="url(#gradientAssessments)"
                strokeWidth={3}
                name="Risk Assessments"
                dot={{ fill: '#dc2626', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#dc2626' }}
                style={{ filter: 'url(#shadowProvider)' }}
              />
              <Line
                type="monotone"
                dataKey="records"
                stroke="url(#gradientRecords)"
                strokeWidth={3}
                name="Health Records"
                dot={{ fill: '#0284c7', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#0284c7' }}
                style={{ filter: 'url(#shadowProvider)' }}
              />
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Risk Distribution */}
        <div className="card hover:shadow-xl transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Risk Distribution</h2>
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <defs>
                <filter id="shadowPie">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15"/>
                </filter>
              </defs>
              <Pie
                data={riskDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, value }) => 
                  value > 0 ? `${name}\n${value} (${(percent * 100).toFixed(1)}%)` : ''
                }
                outerRadius={110}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                stroke="#fff"
                strokeWidth={3}
                style={{ filter: 'url(#shadowPie)' }}
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
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
                formatter={(value: any, name: string) => [
                  <span key="value" style={{ fontWeight: 600, color: '#111827' }}>
                    {value} patients
                  </span>,
                  name
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                iconType="circle"
                iconSize={12}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Activity */}
        <div className="card hover:shadow-xl transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Weekly Activity</h2>
          {activityData.length === 0 || activityData.every((d: any) => d.records === 0 && d.assessments === 0) ? (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No activity data available</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={activityData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="gradientProviderRecords" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="gradientProviderAssessments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} vertical={false} />
              <XAxis 
                dataKey="name" 
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
                dataKey="records" 
                fill="url(#gradientProviderRecords)" 
                name="Health Records" 
                radius={[8, 8, 0, 0]}
                maxBarSize={70}
              />
              <Bar 
                dataKey="assessments" 
                fill="url(#gradientProviderAssessments)" 
                name="Risk Assessments" 
                radius={[8, 8, 0, 0]}
                maxBarSize={70}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Alerts Summary */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-danger-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-danger-600" />
                <div>
                  <p className="font-medium text-gray-900">Urgent Cases</p>
                  <p className="text-sm text-gray-600">Requires immediate attention</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-danger-600">
                {dashboard.alerts.urgent_cases || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-warning-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-warning-600" />
                <div>
                  <p className="font-medium text-gray-900">Pending Follow-ups</p>
                  <p className="text-sm text-gray-600">Medium risk cases</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-warning-600">
                {dashboard.alerts.pending_followups || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">Recent Activity</p>
                  <p className="text-sm text-gray-600">Last 7 days</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-primary-600">
                {dashboard.alerts.recent_activity || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Patient Confirmations */}
      {dashboard.pending_confirmations && dashboard.pending_confirmations.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-primary-600" />
              Pending Patient Confirmations
            </h2>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {dashboard.pending_confirmations.length}
            </span>
          </div>
          <div className="space-y-3">
            {dashboard.pending_confirmations.map((patient: any) => (
              <PendingConfirmationCard
                key={patient.pregnancy_id}
                patient={patient}
              />
            ))}
          </div>
        </div>
      )}

      {/* High Risk Patients */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">High Risk Patients</h2>
          <span className="badge-danger">
            {dashboard.high_risk_patients?.length || 0} Cases
          </span>
        </div>
        {dashboard.high_risk_patients && dashboard.high_risk_patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboard.high_risk_patients.slice(0, 10).map((patient: any) => (
                  <tr key={patient.patient_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {patient.patient_name}
                        </div>
                        <div className="text-sm text-gray-500">ID: {patient.patient_id.slice(0, 8)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Week {patient.current_week}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge-danger">{patient.risk_level}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-danger-600 h-2 rounded-full"
                            style={{ width: `${(patient.risk_score > 1.0 ? patient.risk_score : patient.risk_score * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">
                          {(patient.risk_score > 1.0 ? patient.risk_score : patient.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(patient.assessed_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`tel:${patient.patient_phone}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        {patient.patient_phone}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No high-risk patients at this time</div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('upcoming_appointments', 'Upcoming Appointments')}</h2>
        {dashboard.upcoming_appointments && dashboard.upcoming_appointments.length > 0 ? (
          <div className="space-y-3">
            {dashboard.upcoming_appointments.slice(0, 5).map((apt: any) => (
              <div
                key={apt.appointment_id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{apt.patient_name}</p>
                    <p className="text-sm text-gray-600">
                      {apt.appointment_type} • Week {apt.pregnancy_week}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {format(new Date(apt.appointment_date), 'MMM dd, yyyy • h:mm a')}
                      </p>
                      {apt.risk_level && apt.risk_level !== 'Not Assessed' && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          apt.risk_level === 'High' ? 'bg-danger-100 text-danger-700' :
                          apt.risk_level === 'Medium' ? 'bg-warning-100 text-warning-700' :
                          'bg-success-100 text-success-700'
                        }`}>
                          {apt.risk_level} Risk
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{apt.clinic_name}</span>
                  <a
                    href={`tel:${apt.patient_phone}`}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">{t('no_upcoming_appointments', 'No upcoming appointments')}</div>
        )}
      </div>

    </div>
  );
}

