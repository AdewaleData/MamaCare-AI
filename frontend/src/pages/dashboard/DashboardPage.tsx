import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  HeartIcon, 
  ExclamationTriangleIcon, 
  CalendarDaysIcon,
  PhoneIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Mock data - in real app, this would come from API
const mockData = {
  riskScore: 15,
  riskLevel: 'low' as 'low' | 'medium' | 'high',
  nextAppointment: {
    date: '2024-01-15',
    time: '10:00 AM',
    doctor: 'Dr. Sarah Johnson',
    type: 'Routine Checkup',
  },
  recentRecords: [
    {
      id: '1',
      date: '2024-01-10',
      type: 'Blood Pressure',
      value: '120/80',
      status: 'normal',
    },
    {
      id: '2',
      date: '2024-01-08',
      type: 'Weight',
      value: '65 kg',
      status: 'normal',
    },
    {
      id: '3',
      date: '2024-01-05',
      type: 'Blood Sugar',
      value: '95 mg/dL',
      status: 'normal',
    },
  ],
  upcomingAppointments: [
    {
      id: '1',
      date: '2024-01-15',
      time: '10:00 AM',
      doctor: 'Dr. Sarah Johnson',
      type: 'Routine Checkup',
    },
    {
      id: '2',
      date: '2024-01-22',
      time: '2:00 PM',
      doctor: 'Dr. Michael Brown',
      type: 'Ultrasound',
    },
  ],
};

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'low':
      return 'text-success-600 bg-success-50 border-success-200';
    case 'medium':
      return 'text-warning-600 bg-warning-50 border-warning-200';
    case 'high':
      return 'text-danger-600 bg-danger-50 border-danger-200';
    default:
      return 'text-neutral-600 bg-neutral-50 border-neutral-200';
  }
};

const getRiskLevelText = (level: string) => {
  switch (level) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
    default:
      return 'Unknown';
  }
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Welcome back, {user?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-neutral-600 mt-1">
              Here's your maternal health overview for today.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="text-right">
              <p className="text-sm text-neutral-500">Current Risk Score</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(mockData.riskLevel)}`}>
                {mockData.riskScore}% - {getRiskLevelText(mockData.riskLevel)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/health/new"
          className="card p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <HeartIcon className="h-8 w-8 text-primary-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">Add Health Record</h3>
              <p className="text-sm text-neutral-500">Log your health data</p>
            </div>
          </div>
        </Link>

        <Link
          to="/risk/history"
          className="card p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-warning-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">Risk Assessment</h3>
              <p className="text-sm text-neutral-500">Check your risk level</p>
            </div>
          </div>
        </Link>

        <Link
          to="/appointments/new"
          className="card p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-success-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">Book Appointment</h3>
              <p className="text-sm text-neutral-500">Schedule with doctor</p>
            </div>
          </div>
        </Link>

        <Link
          to="/emergency"
          className="card p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PhoneIcon className="h-8 w-8 text-danger-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">Emergency</h3>
              <p className="text-sm text-neutral-500">Get help quickly</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Appointment */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-neutral-900">Next Appointment</h2>
          </div>
          <div className="card-body">
            {mockData.nextAppointment ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CalendarDaysIcon className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {mockData.nextAppointment.type}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {mockData.nextAppointment.date} at {mockData.nextAppointment.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">SJ</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {mockData.nextAppointment.doctor}
                    </p>
                    <p className="text-sm text-neutral-500">Obstetrician</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-neutral-200">
                  <Link
                    to="/appointments"
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    View all appointments →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDaysIcon className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 mb-4">No upcoming appointments</p>
                <Link
                  to="/appointments/new"
                  className="btn btn-primary"
                >
                  Book Appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Health Records */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-neutral-900">Recent Health Records</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {mockData.recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <HeartIcon className="h-5 w-5 text-primary-500" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{record.type}</p>
                      <p className="text-sm text-neutral-500">{record.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900">{record.value}</p>
                    <span className="badge badge-success">Normal</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-neutral-200">
              <Link
                to="/health/records"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                View all records →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment Summary */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Risk Assessment Summary</h2>
            <Link
              to="/risk/history"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              View Details
            </Link>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 ${getRiskLevelColor(mockData.riskLevel)}`}>
                <span className="text-2xl font-bold">{mockData.riskScore}%</span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">Current Risk Score</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-neutral-200 bg-neutral-50">
                <ChartBarIcon className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500 mt-2">Last Assessment</p>
              <p className="text-sm font-medium text-neutral-900">Jan 10, 2024</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-neutral-200 bg-neutral-50">
                <ClockIcon className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500 mt-2">Next Assessment</p>
              <p className="text-sm font-medium text-neutral-900">Jan 17, 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
