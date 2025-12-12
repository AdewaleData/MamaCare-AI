import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '../services/api';
import { CreditCard, Check, X, Loader2, Crown, Users, Zap, Building2, Wallet, Copy, CheckCircle } from 'lucide-react';
import type { SubscriptionPlan, UserSubscription } from '../services/api';

type PaymentMethod = 'card' | 'bank_transfer';

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<{
    account_number: string;
    account_name: string;
    bank_name: string;
    support_email: string;
    support_phone: string;
  } | null>(null);

  // Fetch bank details when payment method is bank transfer
  const { data: bankDetailsData } = useQuery({
    queryKey: ['bank-details'],
    queryFn: subscriptionsApi.getBankDetails,
    enabled: paymentMethod === 'bank_transfer',
  });

  useEffect(() => {
    if (bankDetailsData) {
      setBankDetails(bankDetailsData);
    }
  }, [bankDetailsData]);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionsApi.getPlans,
  });

  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: subscriptionsApi.getCurrent,
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ planId, cycle, method }: { planId: string; cycle: 'monthly' | 'yearly'; method: PaymentMethod }) => {
      const provider = method === 'card' ? 'paystack' : undefined;
      return subscriptionsApi.subscribe(planId, cycle, method, provider);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      if (variables.method === 'bank_transfer') {
        setShowPaymentModal(true);
        // Keep selectedPlan so modal can show bank details
      } else {
        setSelectedPlan(null);
        setPaymentMethod('card'); // Reset
        alert('Subscription created successfully! Please complete the payment.');
      }
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Failed to create subscription');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      alert('Subscription cancelled successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Failed to cancel subscription');
    },
  });

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setPaymentMethod('card'); // Reset to default
  };

  const handleSubscribe = () => {
    if (!selectedPlan) return;
    subscribeMutation.mutate({ planId: selectedPlan, cycle: billingCycle, method: paymentMethod });
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get selected plan details for payment modal
  const selectedPlanDetails = plans?.find((p: SubscriptionPlan) => p.id === selectedPlan);
  const paymentAmount = selectedPlanDetails 
    ? (billingCycle === 'yearly' && selectedPlanDetails.price_yearly 
        ? selectedPlanDetails.price_yearly 
        : selectedPlanDetails.price_monthly)
    : 0;

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="mt-2 text-gray-600">Choose a plan that fits your needs</p>
      </div>

      {currentSubscription && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Subscription</h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentSubscription.plan_name} Plan ({currentSubscription.billing_cycle})
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Status: <span className="font-medium">{currentSubscription.status}</span>
                {currentSubscription.end_date && (
                  <> • Expires: {new Date(currentSubscription.end_date).toLocaleDateString()}</>
                )}
              </p>
            </div>
            {currentSubscription.status === 'active' && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to cancel your subscription?')) {
                    cancelMutation.mutate();
                  }
                }}
                className="btn-secondary"
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-5 w-5" />
                    Cancel Subscription
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center space-x-4 mb-6">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            billingCycle === 'monthly'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            billingCycle === 'yearly'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Yearly
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((plan: SubscriptionPlan) => {
          const price = billingCycle === 'yearly' && plan.price_yearly
            ? plan.price_yearly
            : plan.price_monthly;
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const isFree = price === 0;

          return (
            <div
              key={plan.id}
              className={`card relative ${
                isCurrentPlan ? 'border-2 border-primary-600' : ''
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute top-4 right-4">
                  <span className="badge badge-primary">Current</span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {isFree ? 'Free' : `₦${price.toLocaleString()}`}
                  </span>
                  {!isFree && (
                    <span className="text-gray-600 ml-2">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-600">{plan.description}</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm">
                  <Check className="h-5 w-5 text-success-600 mr-2" />
                  <span>{plan.max_pregnancies} {plan.max_pregnancies === 1 ? 'Pregnancy' : 'Pregnancies'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="h-5 w-5 text-success-600 mr-2" />
                  <span>
                    {plan.max_health_records
                      ? `${plan.max_health_records} Health Records`
                      : 'Unlimited Health Records'}
                  </span>
                </div>
                {plan.has_ai_predictions && (
                  <div className="flex items-center text-sm">
                    <Check className="h-5 w-5 text-success-600 mr-2" />
                    <span>AI Risk Predictions</span>
                  </div>
                )}
                {plan.has_emergency_features && (
                  <div className="flex items-center text-sm">
                    <Check className="h-5 w-5 text-success-600 mr-2" />
                    <span>Emergency Features</span>
                  </div>
                )}
                {plan.has_telemedicine && (
                  <div className="flex items-center text-sm">
                    <Check className="h-5 w-5 text-success-600 mr-2" />
                    <span>Telemedicine</span>
                  </div>
                )}
                {plan.has_priority_support && (
                  <div className="flex items-center text-sm">
                    <Check className="h-5 w-5 text-success-600 mr-2" />
                    <span>Priority Support</span>
                  </div>
                )}
                {plan.has_advanced_analytics && (
                  <div className="flex items-center text-sm">
                    <Check className="h-5 w-5 text-success-600 mr-2" />
                    <span>Advanced Analytics</span>
                  </div>
                )}
              </div>

              {!isCurrentPlan && (
                <button
                  onClick={() => {
                    if (isFree) {
                      // Free plan - subscribe directly
                      subscribeMutation.mutate({ planId: plan.id, cycle: billingCycle, method: 'card' });
                    } else {
                      // Paid plan - select first, then show payment method
                      handlePlanSelect(plan.id);
                    }
                  }}
                  disabled={subscribeMutation.isPending}
                  className={`w-full btn-primary inline-flex items-center justify-center ${
                    isFree ? 'bg-success-600 hover:bg-success-700' : ''
                  }`}
                >
                  {subscribeMutation.isPending && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : isFree ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Get Started
                    </>
                  ) : selectedPlan === plan.id ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Selected
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Select Plan
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Method Selection - Only shown after paid plan is selected */}
      {selectedPlan && (() => {
        const selectedPlanData = plans?.find((p: SubscriptionPlan) => p.id === selectedPlan);
        const isFree = selectedPlanData?.price_monthly === 0;
        return !isFree;
      })() && (
        <div className="card mt-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Subscription</h3>
            <p className="text-sm text-gray-600">
              Selected Plan: <span className="font-medium">{plans?.find((p: SubscriptionPlan) => p.id === selectedPlan)?.name}</span>
              {' • '}
              {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Billing
            </p>
            <p className="text-lg font-bold text-primary-600 mt-2">
              Amount: ₦{(() => {
                const plan = plans?.find((p: SubscriptionPlan) => p.id === selectedPlan);
                const amount = billingCycle === 'yearly' && plan?.price_yearly 
                  ? plan.price_yearly 
                  : plan?.price_monthly || 0;
                return amount.toLocaleString();
              })()}
            </p>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Payment Method</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    paymentMethod === 'card' ? 'bg-primary-600' : 'bg-gray-200'
                  }`}>
                    <CreditCard className={`h-6 w-6 ${
                      paymentMethod === 'card' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-left flex-1">
                    <div className={`font-semibold ${
                      paymentMethod === 'card' ? 'text-primary-700' : 'text-gray-900'
                    }`}>
                      Bank Card
                    </div>
                    <div className="text-sm text-gray-600">Credit or Debit Card</div>
                  </div>
                  {paymentMethod === 'card' && (
                    <Check className="h-5 w-5 text-primary-600" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    paymentMethod === 'bank_transfer' ? 'bg-primary-600' : 'bg-gray-200'
                  }`}>
                    <Building2 className={`h-6 w-6 ${
                      paymentMethod === 'bank_transfer' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-left flex-1">
                    <div className={`font-semibold ${
                      paymentMethod === 'bank_transfer' ? 'text-primary-700' : 'text-gray-900'
                    }`}>
                      Bank Transfer
                    </div>
                    <div className="text-sm text-gray-600">Direct Bank Transfer</div>
                  </div>
                  {paymentMethod === 'bank_transfer' && (
                    <Check className="h-5 w-5 text-primary-600" />
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedPlan(null)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubscribe}
              disabled={subscribeMutation.isPending}
              className="flex-1 btn-primary inline-flex items-center justify-center"
            >
              {subscribeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Complete Subscription
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bank Transfer Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Complete Bank Transfer</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-primary-800 mb-2">
                  Please transfer the exact amount to the account below. Your subscription will be activated once payment is confirmed.
                </p>
                <p className="text-lg font-bold text-primary-900">
                  Amount: ₦{paymentAmount.toLocaleString()}
                </p>
              </div>

              {bankDetails ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={bankDetails.account_number}
                        className="flex-1 input bg-gray-50"
                      />
                      <button
                        onClick={() => handleCopy(bankDetails.account_number, 'account_number')}
                        className="btn-secondary px-4 py-2"
                        title="Copy account number"
                      >
                        {copiedField === 'account_number' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Name
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={bankDetails.account_name}
                        className="flex-1 input bg-gray-50"
                      />
                      <button
                        onClick={() => handleCopy(bankDetails.account_name, 'account_name')}
                        className="btn-secondary px-4 py-2"
                        title="Copy account name"
                      >
                        {copiedField === 'account_name' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={bankDetails.bank_name}
                        className="flex-1 input bg-gray-50"
                      />
                      <button
                        onClick={() => handleCopy(bankDetails.bank_name, 'bank_name')}
                        className="btn-secondary px-4 py-2"
                        title="Copy bank name"
                      >
                        {copiedField === 'bank_name' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Loading bank details...</p>
                </div>
              )}

              {bankDetails && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> After making the transfer, please contact support with your transaction reference to activate your subscription. 
                    You can reach us at <a href={`mailto:${bankDetails.support_email}`} className="underline">{bankDetails.support_email}</a> or call {bankDetails.support_phone}.
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPlan(null);
                    setPaymentMethod('card');
                  }}
                  className="flex-1 btn-secondary"
                >
                  I'll Transfer Later
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPlan(null);
                    setPaymentMethod('card');
                    alert('Please complete the bank transfer and contact support with your transaction reference.');
                  }}
                  className="flex-1 btn-primary"
                >
                  I've Made the Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

