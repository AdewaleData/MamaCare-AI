import React from 'react';

interface RiskGaugePlotlyProps {
  riskLevel: string;
  riskScore: number; // 0-100
}

export default function RiskGaugePlotly({ riskLevel, riskScore }: RiskGaugePlotlyProps) {
  // Normalize risk level
  const riskLower = riskLevel?.toLowerCase() || 'low';
  
  // Determine risk category and colors
  let riskCategory: 'low' | 'medium' | 'high';
  let bgColor: string;
  let textColor: string;
  let borderColor: string;
  
  if (riskLower.includes('high')) {
    riskCategory = 'high';
    bgColor = '#fee2e2'; // Light red
    textColor = '#dc2626'; // Dark red
    borderColor = '#ef4444'; // Red
  } else if (riskLower.includes('medium') || riskLower.includes('middle')) {
    riskCategory = 'medium';
    bgColor = '#fef3c7'; // Light yellow
    textColor = '#d97706'; // Dark orange
    borderColor = '#f59e0b'; // Orange
  } else {
    riskCategory = 'low';
    bgColor = '#d1fae5'; // Light green
    textColor = '#059669'; // Dark green
    borderColor = '#10b981'; // Green
  }
  
  return (
    <div className="w-full flex justify-center py-8">
      <div 
        className="rounded-xl p-12 text-center shadow-lg border-4 transition-all duration-300"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          maxWidth: '600px',
          width: '100%'
        }}
      >
        {/* Risk Level Text */}
        <div 
          className="font-bold mb-4"
          style={{ 
            fontSize: '72px',
            color: textColor,
            lineHeight: '1'
          }}
        >
          {riskCategory.toUpperCase()}
        </div>
        
        {/* Risk Score */}
        <div 
          className="font-semibold"
          style={{ 
            fontSize: '48px',
            color: textColor,
            opacity: 0.8
          }}
        >
          {riskScore.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
