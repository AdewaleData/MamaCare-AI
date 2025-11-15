import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emergencyApi, pregnancyApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { AlertTriangle, Phone, MapPin, Loader2, History, X, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function EmergencyPage() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertData, setAlertData] = useState({
    emergency_type: 'medical',
    severity: 'high',
    address: '',
  });
  const [realtimeAlerts, setRealtimeAlerts] = useState<any[]>([]);

  // Helper function to extract message text safely
  const extractMessageText = (msg: any): string => {
    if (msg === null || msg === undefined) return 'New alert';
    
    // If it's already a string, return it
    if (typeof msg === 'string') {
      // Check if it's the problematic "[object Object]" string
      if (msg.includes('[object Object]')) {
        return 'New alert';
      }
      return msg;
    }
    
    // If it's an array, process each item
    if (Array.isArray(msg)) {
      const parts = msg.map((m: any) => {
        if (m === null || m === undefined) return '';
        if (typeof m === 'string') return m;
        if (typeof m === 'number' || typeof m === 'boolean') return String(m);
        if (typeof m === 'object') {
          // Try to extract readable text from object
          const text = m.message || m.text || m.body || m.title || m.description;
          if (text && typeof text === 'string') return text;
          // If object has patient_name and risk_level, construct message
          if (m.patient_name && m.risk_level) {
            return `${m.patient_name} - Risk Level: ${m.risk_level}`;
          }
          // Last resort: try to stringify, but avoid "[object Object]"
          try {
            const json = JSON.stringify(m);
            return json.length < 200 ? json : 'Alert data';
          } catch {
            return 'Alert data';
          }
        }
        return String(m);
      }).filter(p => p && p !== '[object Object]');
      
      return parts.length > 0 ? parts.join(', ') : 'New alert';
    }
    
    // If it's an object, extract readable properties
    if (typeof msg === 'object') {
      // Direct message properties
      if (msg.message && typeof msg.message === 'string') return msg.message;
      if (msg.text && typeof msg.text === 'string') return msg.text;
      if (msg.body && typeof msg.body === 'string') return msg.body;
      if (msg.title && typeof msg.title === 'string') return msg.title;
      
      // Construct from patient info
      if (msg.patient_name) {
        const parts = [msg.patient_name];
        if (msg.risk_level) parts.push(`Risk Level: ${msg.risk_level}`);
        if (msg.emergency_type) parts.push(`Type: ${msg.emergency_type}`);
        return parts.join(' - ');
      }
      
      // Try JSON stringify as last resort
      try {
        const json = JSON.stringify(msg);
        // If it's too long or just "[object Object]", return a default
        if (json === '{}' || json.length > 200) {
          return 'New alert';
        }
        return json;
      } catch {
        return 'New alert';
      }
    }
    
    // For primitives, convert to string
    return String(msg);
  };

  // WebSocket connection for real-time alerts
  const { isConnected, lastMessage } = useWebSocket(token, (message) => {
    if (message.type === 'emergency_alert' || message.type === 'risk_assessment') {
      setRealtimeAlerts((prev) => [message, ...prev].slice(0, 10));
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const notificationBody = extractMessageText(message.message || message);
        new Notification('MamaCare Alert', {
          body: notificationBody,
          icon: '/favicon.ico',
        });
      }
    }
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const { data: pregnancy } = useQuery({
    queryKey: ['pregnancy', 'current'],
    queryFn: () => pregnancyApi.getCurrent(),
  });

  const { data: alertHistory } = useQuery({
    queryKey: ['emergency-history'],
    queryFn: () => emergencyApi.getHistory(),
  });

  const triggerMutation = useMutation({
    mutationFn: emergencyApi.triggerAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-history'] });
      setShowAlertForm(false);
      alert('Emergency alert triggered! Your contacts have been notified.');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Failed to trigger alert');
    },
  });

  const handleTriggerAlert = () => {
    if (window.confirm('Are you sure you want to trigger an emergency alert? Your emergency contacts will be notified immediately.')) {
      triggerMutation.mutate({
        pregnancy_id: pregnancy?.id,
        emergency_type: alertData.emergency_type,
        severity: alertData.severity,
        address: alertData.address || undefined,
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityLower = severity.toLowerCase();
    if (severityLower === 'critical') {
      return <span className="badge-danger">Critical</span>;
    } else if (severityLower === 'high') {
      return <span className="badge-danger">High</span>;
    } else if (severityLower === 'medium') {
      return <span className="badge-warning">Medium</span>;
    } else {
      return <span className="badge-info">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency</h1>
          <p className="mt-2 text-gray-600">Get immediate help when you need it</p>
        </div>
        <div className="flex items-center space-x-3">
          {isConnected ? (
            <div className="flex items-center space-x-2 text-success-600">
              <Wifi className="h-5 w-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-400">
              <WifiOff className="h-5 w-5" />
              <span className="text-sm">Disconnected</span>
            </div>
          )}
          <Link
            to="/app/emergency/contacts"
            className="btn-secondary inline-flex items-center"
          >
            Manage Contacts
          </Link>
        </div>
      </div>

      {/* Real-time Alerts */}
      {realtimeAlerts.length > 0 && (
        <div className="card bg-warning-50 border-warning-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Real-time Alerts</h2>
            <button
              onClick={() => setRealtimeAlerts([])}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {realtimeAlerts.map((alert, idx) => {
              // Debug logging
              console.log('Processing alert:', alert);
              console.log('Alert.message:', alert.message);
              console.log('Alert type:', typeof alert.message);
              
              // Use the helper function to extract message text
              // Try alert.message first, then the whole alert object
              let messageText = 'New alert';
              if (alert.message !== undefined) {
                messageText = extractMessageText(alert.message);
              } else {
                // If no message property, try to construct from alert object
                messageText = extractMessageText(alert);
              }
              
              console.log('Extracted message text:', messageText);
              
              // Format timestamp
              const timestamp = alert?.timestamp || alert?.created_at || alert?.time || new Date().toISOString();
              let displayTime = 'Just now';
              try {
                displayTime = timestamp instanceof Date 
                  ? timestamp.toLocaleString() 
                  : new Date(timestamp).toLocaleString();
              } catch (e) {
                displayTime = new Date().toLocaleString();
              }
              
              return (
                <div key={idx} className="p-3 bg-white rounded-lg border border-warning-200">
                  <p className="text-sm font-medium text-gray-900">{messageText}</p>
                  {alert?.type && (
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {typeof alert.type === 'string' ? alert.type : String(alert.type)}
                    </p>
                  )}
                  {alert?.patient_name && (
                    <p className="text-xs text-gray-600 mt-1">
                      Patient: {alert.patient_name}
                    </p>
                  )}
                  {alert?.risk_level && (
                    <p className="text-xs text-gray-600 mt-1">
                      Risk: {alert.risk_level}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {displayTime}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emergency Button */}
      <div className="card bg-gradient-to-br from-danger-50 to-danger-100 border-danger-200">
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-danger-600 rounded-full mb-4 animate-pulse">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Emergency Alert</h2>
            <p className="text-gray-700 mb-6">
              Tap the button below to send an emergency alert to your contacts
            </p>
          </div>

          {!showAlertForm ? (
            <button
              onClick={() => setShowAlertForm(true)}
              className="btn-danger text-lg px-8 py-4 inline-flex items-center"
            >
              <Phone className="mr-3 h-6 w-6" />
              Trigger Emergency Alert
            </button>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Emergency Type
                </label>
                <select
                  value={alertData.emergency_type}
                  onChange={(e) => setAlertData({ ...alertData, emergency_type: e.target.value })}
                  className="input"
                >
                  <option value="medical">Medical Emergency</option>
                  <option value="accident">Accident</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Severity
                </label>
                <select
                  value={alertData.severity}
                  onChange={(e) => setAlertData({ ...alertData, severity: e.target.value })}
                  className="input"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={alertData.address}
                  onChange={(e) => setAlertData({ ...alertData, address: e.target.value })}
                  className="input"
                  placeholder="Enter your current location"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTriggerAlert}
                  disabled={triggerMutation.isPending}
                  className="flex-1 btn-danger inline-flex items-center justify-center"
                >
                  {triggerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Send Alert
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAlertForm(false)}
                  className="btn-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert History */}
      {alertHistory && alertHistory.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <History className="mr-2 h-5 w-5" />
              Alert History
            </h2>
          </div>
          <div className="space-y-3">
            {alertHistory.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-danger-600" />
                      <span className="font-medium text-gray-900">
                        {alert.emergency_type.charAt(0).toUpperCase() + alert.emergency_type.slice(1)} Emergency
                      </span>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {format(new Date(alert.created_at), 'MMMM dd, yyyy HH:mm')}
                    </p>
                    {alert.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        {alert.address}
                      </div>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Status: {alert.status}</span>
                      {alert.contacts_notified && <span>✓ Contacts Notified</span>}
                      {alert.healthcare_provider_notified && <span>✓ Provider Notified</span>}
                      {alert.ambulance_called && <span>✓ Ambulance Called</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

