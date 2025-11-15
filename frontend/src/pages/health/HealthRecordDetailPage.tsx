import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../../services/api';
import { ArrowLeft, Calendar, Activity, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function HealthRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: record, isLoading } = useQuery({
    queryKey: ['health-record', id],
    queryFn: () => healthApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Record Not Found</h3>
        <Link to="/health" className="btn-primary mt-4">
          Back to Records
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/health" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Record Details</h1>
          <p className="mt-1 text-gray-600">
            Recorded on {format(new Date(record.recorded_at), 'MMMM dd, yyyy')}
          </p>
        </div>
      </div>

      <div className="card space-y-6">
        {/* Vital Signs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vital Signs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {record.systolic_bp && record.diastolic_bp && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Activity className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Blood Pressure</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {record.systolic_bp}/{record.diastolic_bp} mmHg
                </p>
              </div>
            )}
            {record.blood_sugar && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Activity className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Blood Sugar</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{record.blood_sugar} mg/dL</p>
              </div>
            )}
            {record.body_temp && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Activity className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Body Temperature</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{record.body_temp} °C</p>
              </div>
            )}
            {record.heart_rate && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Activity className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Heart Rate</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{record.heart_rate} bpm</p>
              </div>
            )}
            {record.weight && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Activity className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Weight</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{record.weight} kg</p>
              </div>
            )}
            {record.bmi && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Activity className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">BMI</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{record.bmi}</p>
              </div>
            )}
          </div>
        </div>

        {/* Health Conditions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Conditions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-600 mb-1">Previous Complications</p>
              <p className="text-lg font-semibold text-gray-900">
                {record.previous_complications ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-600 mb-1">Preexisting Diabetes</p>
              <p className="text-lg font-semibold text-gray-900">
                {record.preexisting_diabetes ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-600 mb-1">Gestational Diabetes</p>
              <p className="text-lg font-semibold text-gray-900">
                {record.gestational_diabetes ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-600 mb-1">Mental Health</p>
              <p className="text-lg font-semibold text-gray-900">
                {record.mental_health ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {record.notes && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Created: {format(new Date(record.created_at), 'MMMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

