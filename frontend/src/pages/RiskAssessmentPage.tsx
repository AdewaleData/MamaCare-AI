import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { pregnancyApi, predictionApi } from '../services/api';
import { Activity, AlertTriangle, TrendingUp, Loader2, RefreshCw, Plus, History } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function RiskAssessmentPage() {
  const queryClient = useQueryClient();

  const { data: pregnancy } = useQuery({
    queryKey: ['pregnancy', 'current'],
    queryFn: () => pregnancyApi.getCurrent(),
  });

  // Get health records to trigger refetch when they change
  const { data: healthRecords } = useQuery({
    queryKey: ['health-records', pregnancy?.id],
    queryFn: () => import('../services/api').then(m => m.healthApi.getAll()),
    enabled: !!pregnancy?.id,
    staleTime: 0, // Always refetch to get latest records
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Use a more reliable query key that changes when health records change
  const healthRecordsHash = healthRecords?.records?.length 
    ? `${healthRecords.records.length}-${healthRecords.records[0]?.id || ''}-${healthRecords.records[0]?.recorded_at || ''}`
    : '0';
  
  const { data: riskAssessment, isLoading, error, refetch } = useQuery({
    queryKey: ['risk-assessment', pregnancy?.id, healthRecordsHash],
    queryFn: () => {
      console.log('[RiskAssessment] Fetching risk assessment for pregnancy:', pregnancy!.id, 'Hash:', healthRecordsHash);
      return predictionApi.assessRisk(pregnancy!.id);
    },
    enabled: !!pregnancy?.id, // Don't wait for healthRecords - backend will use latest
    retry: false, // Don't retry on error - we'll show helpful message
    staleTime: 0, // Always refetch
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Auto-refresh risk assessment when health records change
  React.useEffect(() => {
    if (healthRecordsHash && healthRecordsHash !== '0' && pregnancy?.id) {
      console.log('[RiskAssessment] Health records changed, invalidating risk assessment. Hash:', healthRecordsHash);
      queryClient.invalidateQueries({ 
        queryKey: ['risk-assessment', pregnancy.id],
        exact: false 
      });
    }
  }, [healthRecordsHash, pregnancy?.id, queryClient]);

  const getRiskColor = (risk?: string) => {
    if (!risk) return 'gray';
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('low')) return 'success';
    if (riskLower.includes('medium')) return 'warning';
    return 'danger';
  };

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('low')) {
      return <span className="badge-success">Low Risk</span>;
    } else if (riskLower.includes('medium')) {
      return <span className="badge-warning">Medium Risk</span>;
    } else {
      return <span className="badge-danger">High Risk</span>;
    }
  };

  if (!pregnancy) {
    return (
      <div className="card text-center py-12">
        <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pregnancy Record Required</h3>
        <p className="text-gray-600 mb-6">Please create a pregnancy record first</p>
      </div>
    );
  }

  // Force refetch function - completely clear cache and refetch
  const handleForceRefresh = async () => {
    console.log('[RiskAssessment] Force refreshing...');
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
    await refetch();
    
    console.log('[RiskAssessment] Refresh complete');
  };

  return (
    <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Risk Assessment</h1>
              <p className="mt-2 text-gray-600">AI-powered pregnancy risk analysis</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/risk-assessment/history" className="btn-secondary inline-flex items-center">
                <History className="mr-2 h-5 w-5" />
                View History
              </Link>
              <button
                onClick={handleForceRefresh}
                className="btn-secondary inline-flex items-center"
                title="Force refresh risk assessment with latest health records"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Force Refresh
              </button>
              <Link
                to="/app/health/new"
                className="btn-primary inline-flex items-center"
                title="Add a new health record to update risk assessment"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Health Record
              </Link>
            </div>
          </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : riskAssessment ? (
        <>
          {/* Overall Risk Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Overall Risk Assessment</h2>
                <p className="text-sm text-gray-600 mt-1">Based on your health records</p>
              </div>
              {getRiskBadge(riskAssessment.overall_risk)}
            </div>

            <div className="space-y-6">
              {riskAssessment.specialized_assessments && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                  {riskAssessment.specialized_assessments.preeclampsia && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 text-warning-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Preeclampsia</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {riskAssessment.specialized_assessments.preeclampsia.risk}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Probability: {(riskAssessment.specialized_assessments.preeclampsia.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}

                  {riskAssessment.specialized_assessments.preterm_labor && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 text-warning-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Preterm Labor</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {riskAssessment.specialized_assessments.preterm_labor.risk}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Probability: {(riskAssessment.specialized_assessments.preterm_labor.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}

                  {riskAssessment.specialized_assessments.gestational_diabetes && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 text-warning-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Gestational Diabetes</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {riskAssessment.specialized_assessments.gestational_diabetes.risk}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Probability: {(riskAssessment.specialized_assessments.gestational_diabetes.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {riskAssessment.recommendations && riskAssessment.recommendations.length > 0 && (
            <div className="card">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Recommendations</h2>
              </div>
              <ul className="space-y-3">
                {riskAssessment.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-primary-600 text-xs font-semibold">{idx + 1}</span>
                    </div>
                    <p className="text-gray-700 flex-1">{rec}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Information Card */}
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-start">
              <Activity className="h-6 w-6 text-primary-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">About Risk Assessment</h3>
                <p className="text-sm text-gray-700">
                  This assessment is based on your health records and uses AI/ML models to evaluate
                  potential risks. It's important to consult with your healthcare provider for
                  professional medical advice. This tool is meant to complement, not replace,
                  professional medical care.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : error ? (
        <div className="card text-center py-12">
          <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessment Available</h3>
          <p className="text-gray-600 mb-6">
            {error && typeof error === 'object' && 'response' in error && error.response?.data?.detail
              ? error.response.data.detail
              : 'Please add health records to generate a risk assessment'}
          </p>
          <Link
            to="/health/new"
            className="btn-primary inline-flex items-center"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Health Record
          </Link>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessment Available</h3>
          <p className="text-gray-600 mb-6">Please add health records to generate a risk assessment</p>
          <Link
            to="/health/new"
            className="btn-primary inline-flex items-center"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Health Record
          </Link>
        </div>
      )}
    </div>
  );
}

