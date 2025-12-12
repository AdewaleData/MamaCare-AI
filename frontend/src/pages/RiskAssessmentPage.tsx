import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { pregnancyApi, predictionApi, recommendationsApi } from '../services/api';
import { 
  ShieldAlert, 
  AlertTriangle, 
  TrendingUp, 
  Loader2, 
  RefreshCw, 
  Plus, 
  History,
  Brain,
  HeartPulse,
  TestTube,
  Baby,
  Sparkles,
  ExternalLink,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  FileSearch,
  ArrowRight,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';

export default function RiskAssessmentPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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

  // Get personalized recommendations based on health status
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['recommendations', 'quick'],
    queryFn: () => recommendationsApi.getPersonalized(),
    enabled: !!pregnancy?.id,
    staleTime: 30000, // Cache for 30 seconds
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
      <div className="card text-center py-16 glass">
        <div className="inline-block p-4 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl mb-6">
          <Baby className="h-16 w-16 text-primary-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Pregnancy Record Required</h3>
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">Please create a pregnancy record first to generate risk assessments</p>
        <Link to="/app/pregnancy" className="btn-primary inline-flex items-center shadow-lg hover:shadow-xl">
          <Plus className="mr-2 h-5 w-5" />
          Add Pregnancy Record
        </Link>
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
    <div className="space-y-8 fade-in">
          {/* Enhanced Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('risk_assessment', 'Risk Assessment')}</h1>
              <p className="text-lg text-gray-600">AI-powered pregnancy risk analysis</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/app/risk-assessment/history" className="btn-secondary inline-flex items-center shadow-sm hover:shadow-md">
                <History className="mr-2 h-5 w-5" />
                {t('view_history', 'View History')}
              </Link>
              <button
                onClick={handleForceRefresh}
                className="btn-secondary inline-flex items-center shadow-sm hover:shadow-md"
                title="Force refresh risk assessment with latest health records"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                {t('force_refresh', 'Force Refresh')}
              </button>
              <Link
                to="/app/health/new"
                className="btn-primary inline-flex items-center shadow-lg hover:shadow-xl"
                title="Add a new health record to update risk assessment"
              >
                <Plus className="mr-2 h-5 w-5" />
                {t('add_health_record', 'Add Health Record')}
              </Link>
            </div>
          </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">{t('analyzing_health_data', 'Analyzing your health data...')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('this_may_take_few_moments', 'This may take a few moments')}</p>
          </div>
        </div>
      ) : riskAssessment ? (
        <>
          {/* Overall Risk Card */}
          <div className="card hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg mr-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('overall_risk_assessment', 'Overall Risk Assessment')}</h2>
                  <p className="text-sm text-gray-600">{t('based_on_your_latest_health_records', 'Based on your latest health records')}</p>
                </div>
              </div>
              <div className="scale-125">
                {getRiskBadge(riskAssessment.overall_risk || riskAssessment.risk_level)}
              </div>
            </div>

            <div className="space-y-6">
              {riskAssessment.specialized_assessments && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-200">
                  {riskAssessment.specialized_assessments.preeclampsia && (
                    <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-xl border-2 border-yellow-200/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-yellow-500/20 rounded-lg mr-3">
                          <HeartPulse className="h-6 w-6 text-warning-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Preeclampsia</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {riskAssessment.specialized_assessments.preeclampsia.risk}
                      </p>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Probability: {(riskAssessment.specialized_assessments.preeclampsia.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}

                  {riskAssessment.specialized_assessments.preterm_labor && (
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border-2 border-orange-200/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-orange-500/20 rounded-lg mr-3">
                          <AlertTriangle className="h-6 w-6 text-orange-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Preterm Labor</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {riskAssessment.specialized_assessments.preterm_labor.risk}
                      </p>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Probability: {(riskAssessment.specialized_assessments.preterm_labor.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}

                  {riskAssessment.specialized_assessments.gestational_diabetes && (
                    <div className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border-2 border-red-200/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-red-500/20 rounded-lg mr-3">
                          <TestTube className="h-6 w-6 text-red-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Gestational Diabetes</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {riskAssessment.specialized_assessments.gestational_diabetes.risk}
                      </p>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Probability: {(riskAssessment.specialized_assessments.gestational_diabetes.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Recommendations - Based on health status */}
          {recommendationsLoading ? (
            <div className="card">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-600">Loading recommendations...</span>
              </div>
            </div>
          ) : recommendations && (recommendations.urgent?.length > 0 || recommendations.important?.length > 0) ? (
            <div className="card hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg mr-4">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Quick Recommendations</h2>
                    <p className="text-sm text-gray-600 mt-1">Personalized advice based on your health status</p>
                  </div>
                </div>
                <Link
                  to="/app/recommendations"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 text-sm"
                >
                  <span>View All</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              
              <ul className="space-y-3">
                {/* Show urgent recommendations first */}
                {recommendations.urgent?.slice(0, 3).map((rec: any, idx: number) => (
                  <li key={rec.id || idx} className="flex items-start p-4 bg-danger-50 border border-danger-200 rounded-lg hover:bg-danger-100 transition-colors">
                    <div className="flex-shrink-0 w-6 h-6 bg-danger-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-xs font-bold">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-gray-900 font-semibold text-sm mb-1.5">{rec.title}</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{rec.description}</p>
                      {rec.action && (
                        <p className="text-danger-700 font-medium text-xs mt-2 flex items-center">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          {rec.action}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
                
                {/* Then show important recommendations */}
                {recommendations.important?.slice(0, 5 - (recommendations.urgent?.length || 0)).map((rec: any, idx: number) => (
                  <li key={rec.id || idx} className="flex items-start p-4 bg-warning-50 border border-warning-200 rounded-lg hover:bg-warning-100 transition-colors">
                    <div className="flex-shrink-0 w-6 h-6 bg-warning-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-xs font-bold">{(recommendations.urgent?.length || 0) + idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-gray-900 font-semibold text-sm mb-1.5">{rec.title}</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{rec.description}</p>
                      {rec.action && (
                        <p className="text-warning-700 font-medium text-xs mt-2 flex items-center">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          {rec.action}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              
              {(recommendations.urgent?.length || 0) + (recommendations.important?.length || 0) > 5 && (
                <div className="mt-4 text-center">
                  <Link
                    to="/app/recommendations"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
                  >
                    View all recommendations
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-6">
                <Sparkles className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No recommendations available. Complete a risk assessment to get personalized recommendations.</p>
              </div>
            </div>
          )}


          {/* Information Card */}
          <div className="card bg-gradient-to-br from-primary-50 via-primary-100/50 to-primary-50 border-2 border-primary-200/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start">
              <div className="p-3 bg-primary-500/20 rounded-xl mr-4 flex-shrink-0">
                <Brain className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2 text-lg">About Risk Assessment</h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  This assessment is based on your health records and uses AI/ML models to evaluate
                  potential risks. It's important to consult with your healthcare provider for
                  professional medical advice. This tool is meant to complement, not replace,
                  professional medical care.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://www.who.int/health-topics/maternal-health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium group"
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    WHO Maternal Health
                    <ExternalLink className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                  <a
                    href="https://www.acog.org/womens-health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium group"
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    ACOG Resources
                    <ExternalLink className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : error ? (
        <div className="card text-center py-16 glass">
          <div className="inline-block p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl mb-6">
            <BarChart3 className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Assessment Available</h3>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            {error && typeof error === 'object' && 'response' in error && error.response?.data?.detail
              ? error.response.data.detail
              : 'Please add health records to generate a risk assessment'}
          </p>
          <Link
            to="/app/health/new"
            className="btn-primary inline-flex items-center shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Health Record
          </Link>
        </div>
      ) : (
        <div className="card text-center py-16 glass">
          <div className="inline-block p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl mb-6">
            <BarChart3 className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Assessment Available</h3>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">Please add health records to generate a risk assessment</p>
          <Link
            to="/app/health/new"
            className="btn-primary inline-flex items-center shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Health Record
          </Link>
        </div>
      )}

    </div>
  );
}

