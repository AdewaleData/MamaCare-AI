import React, { useEffect } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { useVoiceSummary } from './VoiceAssistant';

interface DashboardVoiceSummaryProps {
  pregnancy?: any;
  healthRecords?: any;
  riskAssessment?: any;
  latestRecord?: any;
}

export default function DashboardVoiceSummary({
  pregnancy,
  healthRecords,
  riskAssessment,
  latestRecord
}: DashboardVoiceSummaryProps) {
  const { language, t } = useTranslation();
  const { isEnabled, toggleVoice, speakSummary } = useVoiceSummary();
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [hasPlayed, setHasPlayed] = React.useState(false);

  // Generate summary text based on language
  const generateSummary = (): string => {
    if (!pregnancy && !healthRecords && !riskAssessment) {
      return t('no_data_summary', 'No health data available yet. Please add your pregnancy information and health records.');
    }

    const parts: string[] = [];

    // Pregnancy info
    if (pregnancy) {
      const weekText = t('pregnancy_week', 'Pregnancy Week');
      const week = pregnancy.current_week || 0;
      parts.push(`${weekText} ${week}.`);
      
      if (pregnancy.due_date) {
        const daysRemaining = Math.ceil(
          (new Date(pregnancy.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const daysText = t('days_remaining', 'days remaining');
        parts.push(`${daysText}: ${daysRemaining}.`);
      }
    }

    // Health records count
    if (healthRecords) {
      const recordsText = t('health_records_count', 'You have');
      const totalRecords = healthRecords.total || 0;
      const recordsLabel = t('health_records', 'health records');
      parts.push(`${recordsText} ${totalRecords} ${recordsLabel}.`);
    }

    // Latest health metrics
    if (latestRecord) {
      const latestText = t('latest_measurements', 'Your latest measurements:');
      parts.push(latestText);

      if (latestRecord.weight) {
        const weightText = t('weight', 'Weight');
        parts.push(`${weightText}: ${latestRecord.weight} ${t('kilograms', 'kilograms')}.`);
      }

      if (latestRecord.systolic_bp && latestRecord.diastolic_bp) {
        const bpText = t('blood_pressure', 'Blood Pressure');
        parts.push(`${bpText}: ${latestRecord.systolic_bp} over ${latestRecord.diastolic_bp}.`);
      }

      if (latestRecord.blood_sugar) {
        const sugarText = t('blood_sugar', 'Blood Sugar');
        parts.push(`${sugarText}: ${latestRecord.blood_sugar}.`);
      }

      if (latestRecord.heart_rate) {
        const hrText = t('heart_rate', 'Heart Rate');
        parts.push(`${hrText}: ${latestRecord.heart_rate} ${t('beats_per_minute', 'beats per minute')}.`);
      }
    }

    // Risk assessment
    if (riskAssessment) {
      const riskText = t('risk_level', 'Your risk level is');
      const riskLevel = riskAssessment.overall_risk || riskAssessment.risk_level || 'Low';
      const riskLevelTranslated = t(`risk_${riskLevel.toLowerCase()}`, riskLevel);
      const riskScore = typeof riskAssessment.risk_score === 'number'
        ? Math.min(riskAssessment.risk_score, 100).toFixed(0)
        : riskAssessment.risk_score;
      
      parts.push(`${riskText} ${riskLevelTranslated}. ${t('risk_score', 'Risk score')}: ${riskScore} ${t('percent', 'percent')}.`);
    }

    // Add closing message
    const closingText = t('voice_summary_closing', 'Remember to add your health records regularly for accurate risk assessment.');
    parts.push(closingText);

    return parts.join(' ');
  };

  const summary = generateSummary();

  // Auto-play summary when component mounts (only once)
  useEffect(() => {
    if (isEnabled && !hasPlayed && summary && summary.length > 50) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        speakSummary(summary, true);
        setHasPlayed(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isEnabled, summary, hasPlayed]);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
        title={t('voice_assistant', 'Voice Assistant')}
        aria-label={t('voice_assistant', 'Voice Assistant')}
      >
        <Volume2 className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 glass">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">
              {t('voice_assistant', 'Voice Assistant')}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleVoice}
              className={`p-1.5 rounded-lg transition-colors ${
                isEnabled
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
              title={isEnabled ? t('disable_voice', 'Disable Voice') : t('enable_voice', 'Enable Voice')}
            >
              {isEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              title={t('minimize', 'Minimize')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary Text */}
        <div className="mb-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {summary || t('generating_summary', 'Generating summary...')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setHasPlayed(false);
              speakSummary(summary, true);
            }}
            disabled={!isEnabled || !summary}
            className="flex-1 btn-primary text-sm py-2 flex items-center justify-center"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {t('play_summary', 'Play Summary')}
          </button>
        </div>
      </div>
    </div>
  );
}

