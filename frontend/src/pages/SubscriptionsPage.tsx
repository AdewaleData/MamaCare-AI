import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '../services/api';
import { CreditCard, Check, X, Loader2, Crown, Users, Zap } from 'lucide-react';
import type { SubscriptionPlan, UserSubscription } from '../services/api';

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionsApi.getPlans,
  });

  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: subscriptionsApi.getCurrent,
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ planId, cycle }: { planId: string; cycle: 'monthly' | 'yearly' }) =>
      subscriptionsApi.subscribe(planId, cycle, 'card', 'paystack'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      setSelectedPlan(null);
      alert('Subscription created successfully!');
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

  const handleSubscribe = (planId: string) => {
    subscribeMutation.mutate({ planId, cycle: billingCycle });
  };

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
          className={`px-4 py-2 rounded-lg font-medium ${
            billingCycle === 'monthly'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-4 py-2 rounded-lg font-medium ${
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
                  onClick={() => handleSubscribe(plan.id)}
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
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Subscribe
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

