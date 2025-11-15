import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../services/api';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Calendar,
  Heart,
  Activity,
  Phone,
  Clock,
  ArrowRight,
  Loader2,
  Lightbulb,
  Stethoscope,
  Baby,
  UtensilsCrossed,
  Dumbbell,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  CalendarDaysIcon: Calendar,
  HeartIcon: Heart,
  BookOpenIcon: BookOpen,
  ExclamationTriangleIcon: AlertCircle,
  PhoneIcon: Phone,
  UserPlusIcon: Baby,
};

const categoryIcons: Record<string, any> = {
  nutrition: UtensilsCrossed,
  exercise: Dumbbell,
  symptoms: Stethoscope,
  basics: BookOpen,
  preparation: Baby,
  comfort: Heart,
};

export default function RecommendationsPage() {
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => recommendationsApi.getPersonalized(),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!recommendations) {
    return <div className="text-center py-8">No recommendations available</div>;
  }

  const getIcon = (iconName: string) => {
    return iconMap[iconName] || BookOpen;
  };

  const getCategoryIcon = (category?: string) => {
    if (!category) return BookOpen;
    return categoryIcons[category] || BookOpen;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-danger-50 border-danger-200 text-danger-800';
      case 'medium':
        return 'bg-warning-50 border-warning-200 text-warning-800';
      default:
        return 'bg-primary-50 border-primary-200 text-primary-800';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    if (urgency === 'urgent' || urgency === 'immediate') {
      return <span className="badge-danger">Urgent</span>;
    }
    if (urgency === 'daily') {
      return <span className="badge-warning">Daily</span>;
    }
    if (urgency === 'weekly') {
      return <span className="badge-primary">Weekly</span>;
    }
    return null;
  };

  const renderRecommendationCard = (rec: any, index: number) => {
    const Icon = getIcon(rec.icon);
    const CategoryIcon = getCategoryIcon(rec.category);

    return (
      <div
        key={rec.id || index}
        className={`p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)} transition-all hover:shadow-lg`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-white rounded-lg">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                {getUrgencyBadge(rec.urgency)}
              </div>
              <p className="text-sm text-gray-700">{rec.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            {rec.category && (
              <div className="flex items-center">
                <CategoryIcon className="h-4 w-4 mr-1" />
                <span className="capitalize">{rec.category}</span>
              </div>
            )}
            {rec.estimatedTime && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{rec.estimatedTime}</span>
              </div>
            )}
          </div>
          <button className="btn-primary text-sm py-1.5 px-3 flex items-center">
            {rec.action}
            <ArrowRight className="ml-1 h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const educationContent = [
    {
      id: 'first-trimester',
      title: 'First Trimester Guide',
      description: 'Everything you need to know about the first 12 weeks of pregnancy',
      category: 'basics',
      duration: '15 min',
      icon: BookOpen,
    },
    {
      id: 'nutrition',
      title: 'Pregnancy Nutrition Essentials',
      description: 'Learn about essential nutrients, foods to eat, and foods to avoid',
      category: 'nutrition',
      duration: '12 min',
      icon: UtensilsCrossed,
    },
    {
      id: 'exercise',
      title: 'Safe Exercise During Pregnancy',
      description: 'Discover safe exercises for each trimester and what to avoid',
      category: 'exercise',
      duration: '10 min',
      icon: Dumbbell,
    },
    {
      id: 'symptoms',
      title: 'Common Pregnancy Symptoms',
      description: 'Understand normal symptoms and when to seek medical attention',
      category: 'symptoms',
      duration: '8 min',
      icon: Stethoscope,
    },
    {
      id: 'preparation',
      title: 'Birth Preparation Guide',
      description: 'Prepare for labor, delivery, and postpartum care',
      category: 'preparation',
      duration: '20 min',
      icon: Baby,
    },
    {
      id: 'mental-health',
      title: 'Mental Health During Pregnancy',
      description: 'Resources for managing stress, anxiety, and emotional well-being',
      category: 'symptoms',
      duration: '10 min',
      icon: Heart,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Personalized Recommendations</h1>
        <p className="mt-2 text-gray-600">
          AI-powered recommendations tailored to your pregnancy journey
        </p>
      </div>

      {/* Urgent Recommendations */}
      {recommendations.urgent && recommendations.urgent.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-danger-600" />
            <h2 className="text-xl font-semibold text-gray-900">Urgent Actions</h2>
          </div>
          <div className="space-y-3">
            {recommendations.urgent.map((rec: any, idx: number) => renderRecommendationCard(rec, idx))}
          </div>
        </div>
      )}

      {/* Important Recommendations */}
      {recommendations.important && recommendations.important.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-warning-600" />
            <h2 className="text-xl font-semibold text-gray-900">Important Actions</h2>
          </div>
          <div className="space-y-3">
            {recommendations.important.map((rec: any, idx: number) => renderRecommendationCard(rec, idx))}
          </div>
        </div>
      )}

      {/* Suggested Recommendations */}
      {recommendations.suggested && recommendations.suggested.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Suggested Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.suggested.map((rec: any, idx: number) => renderRecommendationCard(rec, idx))}
          </div>
        </div>
      )}

      {/* Education Content */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Educational Content</h2>
          </div>
        </div>

        {/* Personalized Education from Recommendations */}
        {recommendations.education && recommendations.education.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Recommended for You</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.education.map((rec: any, idx: number) => (
                <div
                  key={rec.id || idx}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      {React.createElement(getCategoryIcon(rec.category), {
                        className: 'h-5 w-5 text-primary-600',
                      })}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{rec.estimatedTime}</span>
                        </div>
                        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
                          Read More
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Education Content */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">All Educational Topics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {educationContent.map((content) => {
              const Icon = content.icon;
              return (
                <div
                  key={content.id}
                  className="p-5 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{content.title}</h4>
                      <p className="text-sm text-gray-600">{content.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{content.duration}</span>
                    </div>
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
                      Read Article
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-gradient-to-r from-primary-50 to-primary-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/health/new"
            className="p-4 bg-white rounded-lg hover:shadow-md transition-shadow flex items-center space-x-3"
          >
            <Heart className="h-5 w-5 text-primary-600" />
            <span className="font-medium text-gray-900">Add Health Record</span>
          </Link>
          <Link
            to="/risk-assessment"
            className="p-4 bg-white rounded-lg hover:shadow-md transition-shadow flex items-center space-x-3"
          >
            <Activity className="h-5 w-5 text-warning-600" />
            <span className="font-medium text-gray-900">Run Risk Assessment</span>
          </Link>
          <Link
            to="/emergency/contacts"
            className="p-4 bg-white rounded-lg hover:shadow-md transition-shadow flex items-center space-x-3"
          >
            <Phone className="h-5 w-5 text-danger-600" />
            <span className="font-medium text-gray-900">Update Emergency Contacts</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

