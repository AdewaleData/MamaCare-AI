import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { healthApi } from '../../services/api';
import { FileText, Plus, Calendar, Activity, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';

export default function HealthRecordsPage() {
  const queryClient = useQueryClient();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Records</h1>
          <p className="mt-2 text-gray-600">Track and manage your health measurements</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="btn-secondary inline-flex items-center"
            title="Refresh health records and risk assessment"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Refresh
          </button>
          <Link to="/health/new" className="btn-primary inline-flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            New Record
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : healthRecords?.records && healthRecords.records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthRecords.records.map((record) => (
            <Link
              key={record.id}
              to={`/health/${record.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <FileText className="h-5 w-5 text-primary-600" />
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(record.recorded_at), 'MMM dd, yyyy')}
                </span>
              </div>

              <div className="space-y-2">
                {record.weight && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Activity className="h-4 w-4 mr-2 text-gray-400" />
                    Weight: {record.weight} kg
                  </div>
                )}
                {record.systolic_bp && record.diastolic_bp && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Activity className="h-4 w-4 mr-2 text-gray-400" />
                    BP: {record.systolic_bp}/{record.diastolic_bp} mmHg
                  </div>
                )}
                {record.blood_sugar && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Activity className="h-4 w-4 mr-2 text-gray-400" />
                    Blood Sugar: {record.blood_sugar} mg/dL
                  </div>
                )}
                {record.heart_rate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Activity className="h-4 w-4 mr-2 text-gray-400" />
                    Heart Rate: {record.heart_rate} bpm
                  </div>
                )}
              </div>

              {record.notes && (
                <p className="mt-4 text-sm text-gray-500 line-clamp-2">{record.notes}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No health records yet</h3>
          <p className="text-gray-600 mb-6">Start tracking your health measurements</p>
          <Link to="/health/new" className="btn-primary inline-flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Create First Record
          </Link>
        </div>
      )}
    </div>
  );
}

