import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pregnancyApi, healthApi } from '../../services/api';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NewHealthRecordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Safety check - ensure component is mounted
  React.useEffect(() => {
    console.log('[NewHealthRecordPage] Component mounted');
    return () => {
      console.log('[NewHealthRecordPage] Component unmounted');
    };
  }, []);
  
  const [formData, setFormData] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    blood_sugar: '',
    body_temp: '',
    heart_rate: '',
    weight: '',
    bmi: '',
    previous_complications: '0',
    preexisting_diabetes: '0',
    gestational_diabetes: '0',
    mental_health: '0',
    notes: '',
  });

  const { data: pregnancy, isLoading: isLoadingPregnancy, error: pregnancyError } = useQuery({
    queryKey: ['pregnancy', 'current'],
    queryFn: async () => {
      try {
        const result = await pregnancyApi.getCurrent();
        return result;
      } catch (error: any) {
        console.error('[NewHealthRecordPage] Error fetching pregnancy:', error);
        // Return null if 404, throw otherwise
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: healthApi.create,
    onSuccess: async (data) => {
      // CRITICAL: Remove ALL risk-assessment and health-records queries from cache
      // This ensures fresh data is fetched
      queryClient.removeQueries({ queryKey: ['health-records'] });
      queryClient.removeQueries({ queryKey: ['risk-assessment'] });
      
      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refetch health records first
      await queryClient.refetchQueries({ 
        queryKey: ['health-records'],
        exact: false 
      });
      
      // Then refetch risk assessment after health records are updated
      await new Promise(resolve => setTimeout(resolve, 500));
      await queryClient.refetchQueries({ 
        queryKey: ['risk-assessment'],
        exact: false 
      });
      
      navigate('/health');
    },
    onError: (error: any) => {
      console.error('Error creating health record:', error);
      alert(error.response?.data?.detail || 'Failed to save health record. Please try again.');
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Auto-calculate BMI if weight is provided
    if (field === 'weight' && value) {
      // BMI calculation would need height, but we'll let user enter it manually
      // For now, we'll just update the weight
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pregnancy) {
      alert('Please create a pregnancy record first');
      navigate('/pregnancy');
      return;
    }

    const submitData: any = {
      pregnancy_id: pregnancy.id,
      systolic_bp: formData.systolic_bp ? Number(formData.systolic_bp) : undefined,
      diastolic_bp: formData.diastolic_bp ? Number(formData.diastolic_bp) : undefined,
      blood_sugar: formData.blood_sugar ? Number(formData.blood_sugar) : undefined,
      body_temp: formData.body_temp ? Number(formData.body_temp) : undefined,
      heart_rate: formData.heart_rate ? Number(formData.heart_rate) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      bmi: formData.bmi ? Number(formData.bmi) : undefined,
      previous_complications: Number(formData.previous_complications),
      preexisting_diabetes: Number(formData.preexisting_diabetes),
      gestational_diabetes: Number(formData.gestational_diabetes),
      mental_health: Number(formData.mental_health),
      notes: formData.notes || undefined,
    };

    createMutation.mutate(submitData);
  };

  if (isLoadingPregnancy) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading pregnancy data...</p>
        </div>
      </div>
    );
  }

  if (pregnancyError) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-6">
            {pregnancyError instanceof Error ? pregnancyError.message : 'Failed to load pregnancy data'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary inline-flex items-center"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!pregnancy) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pregnancy Record Required</h3>
          <p className="text-gray-600 mb-6">Please create a pregnancy record first to add health records</p>
          <Link to="/app/pregnancy" className="btn-primary inline-flex items-center">
            Go to Pregnancy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
        <div className="flex items-center space-x-4 mb-6">
          <Link to="/app/health" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Health Record</h1>
            <p className="mt-1 text-gray-600">Record your health measurements</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Vital Signs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vital Signs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Systolic BP (mmHg)
              </label>
              <input
                type="number"
                value={formData.systolic_bp}
                onChange={(e) => handleChange('systolic_bp', e.target.value)}
                className="input"
                placeholder="120"
                min="0"
                max="300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Diastolic BP (mmHg)
              </label>
              <input
                type="number"
                value={formData.diastolic_bp}
                onChange={(e) => handleChange('diastolic_bp', e.target.value)}
                className="input"
                placeholder="80"
                min="0"
                max="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Blood Sugar (mg/dL)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.blood_sugar}
                onChange={(e) => handleChange('blood_sugar', e.target.value)}
                className="input"
                placeholder="90"
                min="0"
                max="500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Body Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.body_temp}
                onChange={(e) => handleChange('body_temp', e.target.value)}
                className="input"
                placeholder="36.5"
                min="35"
                max="42"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={formData.heart_rate}
                onChange={(e) => handleChange('heart_rate', e.target.value)}
                className="input"
                placeholder="72"
                min="40"
                max="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                className="input"
                placeholder="65.0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                BMI
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bmi}
                onChange={(e) => handleChange('bmi', e.target.value)}
                className="input"
                placeholder="22.5"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Health Conditions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Conditions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Previous Complications
              </label>
              <select
                value={formData.previous_complications}
                onChange={(e) => handleChange('previous_complications', e.target.value)}
                className="input"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Preexisting Diabetes
              </label>
              <select
                value={formData.preexisting_diabetes}
                onChange={(e) => handleChange('preexisting_diabetes', e.target.value)}
                className="input"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Gestational Diabetes
              </label>
              <select
                value={formData.gestational_diabetes}
                onChange={(e) => handleChange('gestational_diabetes', e.target.value)}
                className="input"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mental Health Concerns
              </label>
              <select
                value={formData.mental_health}
                onChange={(e) => handleChange('mental_health', e.target.value)}
                className="input"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="input"
            rows={4}
            placeholder="Additional notes or observations..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            type="button"
            onClick={() => {
              // Fill form with HIGH RISK test data
              setFormData({
                systolic_bp: '160',
                diastolic_bp: '110',
                blood_sugar: '180',
                body_temp: '38.0',
                heart_rate: '120',
                weight: '85',
                bmi: '35',
                previous_complications: '1',
                preexisting_diabetes: '1',
                gestational_diabetes: '0',
                mental_health: '0',
                notes: 'TEST: High-risk values for risk assessment testing',
              });
            }}
            className="btn-secondary inline-flex items-center text-sm"
            title="Fill form with high-risk test values"
          >
            Fill High-Risk Test Data
          </button>
          <div className="flex items-center space-x-4">
            <Link to="/health" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary inline-flex items-center">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save Record
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}

