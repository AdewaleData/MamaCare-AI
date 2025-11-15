import React from 'react';
import RiskGaugePlotly from './RiskGaugePlotly';

/**
 * Demo component showing all three risk levels side by side
 * This helps verify the arrow points correctly to Low, Medium, and High
 */
export default function RiskGaugeDemo() {
  return (
    <div className="space-y-8 p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Gauge Visualization</h1>
        <p className="text-gray-600">Showing all three risk levels with arrow positions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LOW RISK */}
        <div className="card">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-green-600 mb-2">Low Risk</h2>
            <p className="text-sm text-gray-600">Risk Score: 25%</p>
            <p className="text-xs text-gray-500 mt-1">Arrow should point to LOW (right side)</p>
          </div>
          <RiskGaugePlotly
            riskLevel="Low"
            riskScore={25}
          />
        </div>

        {/* MEDIUM RISK */}
        <div className="card">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-600 mb-2">Medium Risk</h2>
            <p className="text-sm text-gray-600">Risk Score: 55%</p>
            <p className="text-xs text-gray-500 mt-1">Arrow should point to MIDDLE (center)</p>
          </div>
          <RiskGaugePlotly
            riskLevel="Medium"
            riskScore={55}
          />
        </div>

        {/* HIGH RISK */}
        <div className="card">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-red-600 mb-2">High Risk</h2>
            <p className="text-sm text-gray-600">Risk Score: 85%</p>
            <p className="text-xs text-gray-500 mt-1">Arrow should point to HIGH (left side)</p>
          </div>
          <RiskGaugePlotly
            riskLevel="High"
            riskScore={85}
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Gauge Layout:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>LOW</strong> (Green) = Right side of gauge</li>
          <li>• <strong>MIDDLE</strong> (Yellow/Orange) = Center of gauge</li>
          <li>• <strong>HIGH</strong> (Red) = Left side of gauge</li>
          <li>• Arrow rotates from center to point at the current risk level</li>
        </ul>
      </div>
    </div>
  );
}

