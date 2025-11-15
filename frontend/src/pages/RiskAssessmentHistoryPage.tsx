import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { pregnancyApi, predictionApi } from '../services/api';
import { Activity, Calendar, TrendingUp, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RiskAssessment } from '../types';

export default function RiskAssessmentHistoryPage() {
  const { data: pregnancy } = useQuery({
    queryKey: ['pregnancy', 'current'],
    queryFn: () => pregnancyApi.getCurrent(),
  });

  const { data: historyResponse, isLoading } = useQuery({
    queryKey: ['risk-assessment-history', pregnancy?.id],
    queryFn: () => predictionApi.getHistory(pregnancy!.id),
    enabled: !!pregnancy?.id,
  });

  // Extract assessments array from response (backend returns {assessments: [...], total: ...})
  const history = historyResponse?.assessments || (Array.isArray(historyResponse) ? historyResponse : []);

  const getRiskColor = (riskLevel: string) => {
    const level = riskLevel?.toLowerCase() || '';
    if (level.includes('high')) return 'text-danger-600 bg-danger-50';
    if (level.includes('medium')) return 'text-warning-600 bg-warning-50';
    return 'text-success-600 bg-success-50';
  };

  if (!pregnancy) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Pregnancy</h2>
          <p className="text-gray-600">Please create a pregnancy profile first to view risk assessment history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/risk-assessment" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Assessment History</h1>
          <p className="mt-2 text-gray-600">View your past risk assessments</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </div>
      ) : !history || history.length === 0 ? (
        <div className="card text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No History Available</h2>
          <p className="text-gray-600 mb-4">You don't have any risk assessments yet.</p>
          <Link to="/risk-assessment" className="btn-primary inline-flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Run Risk Assessment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((assessment: any, index: number) => (
            <div key={assessment.id || index} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Activity className="h-5 w-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Assessment #{history.length - index}
                    </h3>
                    <span className={`badge ${getRiskColor(assessment.risk_level || assessment.overall_risk)}`}>
                      {assessment.risk_level || assessment.overall_risk || 'Unknown'}
                    </span>
                  </div>

                  <div className="space-y-2 ml-8">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {assessment.assessed_at 
                        ? new Date(assessment.assessed_at).toLocaleString()
                        : 'Date not available'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Risk Score: {typeof assessment.risk_score === 'number' 
                        ? `${(assessment.risk_score > 1.0 ? assessment.risk_score : assessment.risk_score * 100).toFixed(1)}%`
                        : assessment.risk_score || 'N/A'}
                    </div>

                    {assessment.risk_factors && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Risk Factors:</p>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(assessment.risk_factors) ? assessment.risk_factors : []).map((factor: string, idx: number) => (
                            <span key={idx} className="badge badge-warning text-xs">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessment.recommendations && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {(Array.isArray(assessment.recommendations) ? assessment.recommendations : []).map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

