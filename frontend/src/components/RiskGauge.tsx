import React from 'react';

interface RiskGaugeProps {
  riskLevel: string;
  riskScore: number; // 0-100
}

export default function RiskGauge({ riskLevel, riskScore }: RiskGaugeProps) {
  // Normalize risk level
  const riskLower = riskLevel?.toLowerCase() || 'low';
  
  // Determine risk category
  let riskCategory: 'low' | 'medium' | 'high';
  
  if (riskLower.includes('high')) {
    riskCategory = 'high';
  } else if (riskLower.includes('medium') || riskLower.includes('middle')) {
    riskCategory = 'medium';
  } else {
    riskCategory = 'low';
  }
  
  // Calculate arrow rotation based on risk score
  // Semi-circle: 180 degrees total
  // Low (0-40%): -90 to -18 degrees (left side)
  // Medium (40-70%): -18 to 18 degrees (middle)
  // High (70-100%): 18 to 90 degrees (right side)
  let arrowRotation = 0;
  
  if (riskScore < 40) {
    // Low: map 0-40% to -90 to -18 degrees
    arrowRotation = -90 + (riskScore / 40) * 72;
  } else if (riskScore < 70) {
    // Medium: map 40-70% to -18 to 18 degrees
    arrowRotation = -18 + ((riskScore - 40) / 30) * 36;
  } else {
    // High: map 70-100% to 18 to 90 degrees
    arrowRotation = 18 + ((riskScore - 70) / 30) * 72;
  }
  
  // Clamp rotation to valid range
  arrowRotation = Math.max(-90, Math.min(90, arrowRotation));

  // Determine color based on risk level
  const getRiskColor = () => {
    if (riskCategory === 'high') {
      return '#dc2626'; // Red-600
    } else if (riskCategory === 'medium') {
      return '#f59e0b'; // Amber-500
    } else {
      return '#10b981'; // Emerald-500
    }
  };

  const gaugeColor = getRiskColor();

  return (
    <div className="flex flex-col items-center justify-center py-6">
      {/* Risk Gauge - Simplified without arc */}
      <div className="relative w-full max-w-md h-64 flex items-center justify-center">
        {/* Central RISK dial with arrow */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          {/* Arrow pointer - rotates based on risk score */}
          <div
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2 transition-transform duration-700 ease-out"
            style={{
              transform: `translateX(-50%) rotate(${arrowRotation}deg)`,
              transformOrigin: '50% 100%',
            }}
          >
            <div
              className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[100px] border-l-transparent border-r-transparent"
              style={{
                borderBottomColor: '#374151',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }}
            />
          </div>
          
          {/* RISK dial */}
          <div
            className="relative w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center shadow-xl"
            style={{
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 15px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span className="text-white font-bold text-xs tracking-wide">RISK</span>
          </div>
        </div>
      </div>

      {/* Risk Score Display */}
      <div className="mt-6 text-center">
        <div 
          className="text-3xl font-bold transition-colors duration-500"
          style={{ color: gaugeColor }}
        >
          {/* Show 2 decimal places, but cap display at 99.99% to avoid misleading 100% */}
          {Math.min(riskScore, 99.99).toFixed(1)}%
        </div>
        <div 
          className="text-base mt-2 font-semibold transition-colors duration-500"
          style={{ color: gaugeColor }}
        >
          {riskCategory.charAt(0).toUpperCase() + riskCategory.slice(1)} Risk
        </div>
        {/* Show actual P(High) value if very high */}
        {riskScore >= 99.5 && (
          <div className="text-xs text-gray-500 mt-1">
            (Model confidence: {riskScore.toFixed(2)}%)
          </div>
        )}
      </div>
    </div>
  );
}

