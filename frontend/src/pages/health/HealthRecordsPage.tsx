import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { healthApi } from '../../services/api';
import { 
  ClipboardList, 
  Plus, 
  Calendar, 
  Scale, 
  HeartPulse, 
  Droplet, 
  Activity,
  Loader2, 
  RefreshCw,
  Stethoscope
} from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from '../../contexts/TranslationContext';

export default function HealthRecordsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: healthRecords, isLoading } = useQuery({
    queryKey: ['health-records'],
    queryFn: () => healthApi.getAll(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const handleRefresh = async () => {
    queryClient.removeQueries({ queryKey: ['health-records'] });
    queryClient.removeQueries({ queryKey: ['risk-assessment'] });
    await queryClient.refetchQueries({ queryKey: ['health-records'], exact: false });
    await queryClient.refetchQueries({ queryKey: ['risk-assessment'], exact: false });
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('health_records', 'Health Records')}</h1>
          <p className="text-lg text-gray-600">{t('track_and_manage_health_measurements', 'Track and manage your health measurements')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="btn-secondary inline-flex items-center shadow-sm hover:shadow-md"
            title="Refresh health records and risk assessment"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Refresh
          </button>
          <Link to="/app/health/new" className="btn-primary inline-flex items-center shadow-lg hover:shadow-xl">
            <Plus className="mr-2 h-5 w-5" />
            New Record
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">{t('loading_health_records', 'Loading health records...')}</p>
          </div>
        </div>
      ) : healthRecords?.records && healthRecords.records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {healthRecords.records.map((record, index) => (
            <Link
              key={record.id}
              to={`/app/health/${record.id}`}
              className="card hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {format(new Date(record.recorded_at), 'MMM dd')}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(record.recorded_at), 'yyyy')}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {record.weight && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group-hover:bg-primary-50 transition-colors">
                    <div className="flex items-center text-sm font-medium text-gray-700">
                      <Scale className="h-4 w-4 mr-2 text-primary-500" />
                      Weight
                    </div>
                    <span className="text-sm font-bold text-gray-900">{record.weight} kg</span>
                  </div>
                )}
                {record.systolic_bp && record.diastolic_bp && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group-hover:bg-primary-50 transition-colors">
                    <div className="flex items-center text-sm font-medium text-gray-700">
                      <HeartPulse className="h-4 w-4 mr-2 text-primary-500" />
                      Blood Pressure
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {record.systolic_bp}/{record.diastolic_bp} <span className="text-xs text-gray-500">mmHg</span>
                    </span>
                  </div>
                )}
                {record.blood_sugar && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group-hover:bg-primary-50 transition-colors">
                    <div className="flex items-center text-sm font-medium text-gray-700">
                      <Droplet className="h-4 w-4 mr-2 text-primary-500" />
                      Blood Sugar
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {record.blood_sugar} <span className="text-xs text-gray-500">mg/dL</span>
                    </span>
                  </div>
                )}
                {record.heart_rate && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group-hover:bg-primary-50 transition-colors">
                    <div className="flex items-center text-sm font-medium text-gray-700">
                      <Activity className="h-4 w-4 mr-2 text-primary-500" />
                      Heart Rate
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {record.heart_rate} <span className="text-xs text-gray-500">bpm</span>
                    </span>
                  </div>
                )}
              </div>

              {record.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 line-clamp-2">{record.notes}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16 glass">
          <div className="inline-block p-4 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl mb-6">
            <Stethoscope className="h-16 w-16 text-primary-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No health records yet</h3>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Start tracking your health measurements to get personalized insights and risk assessments
          </p>
          <Link to="/app/health/new" className="btn-primary inline-flex items-center shadow-lg hover:shadow-xl">
            <Plus className="mr-2 h-5 w-5" />
            Create First Record
          </Link>
        </div>
      )}

    </div>
  );
}

