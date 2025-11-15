import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
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

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function ProviderDashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['provider-dashboard'],
    queryFn: () => dashboardApi.getProvider(),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });

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

  if (!dashboard) {
    return <div className="text-center py-8">No dashboard data available</div>;
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
        <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome, {dashboard.provider_name}. Monitor your patients and manage high-risk cases.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
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
              <p className="text-sm font-medium text-gray-600">Active Pregnancies</p>
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
              <p className="text-sm font-medium text-gray-600">High Risk Cases</p>
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
              <p className="text-sm font-medium text-gray-600">Upcoming Appointments</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {dashboard.overview.upcoming_appointments || 0}
              </p>
            </div>
            <div className="p-3 bg-warning-100 rounded-lg">
              <Calendar className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Trends Over Time */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Weekly Risk Trends</h2>
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
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                dataKey="assessments"
                stroke="#ef4444"
                strokeWidth={2.5}
                name="Risk Assessments"
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6 }}
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
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Risk Distribution */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Distribution</h2>
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
        </div>

        {/* Weekly Activity */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Activity</h2>
          {activityData.length === 0 || activityData.every((d: any) => d.records === 0 && d.assessments === 0) ? (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No activity data available</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              <Bar dataKey="records" fill="#3b82f6" name="Health Records" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assessments" fill="#10b981" name="Risk Assessments" radius={[4, 4, 0, 0]} />
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
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
          <div className="text-center py-8 text-gray-500">No upcoming appointments</div>
        )}
      </div>
    </div>
  );
}

