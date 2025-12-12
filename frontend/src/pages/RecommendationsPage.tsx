import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../services/api';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';
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
  ExternalLink,
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
  const { t } = useTranslation();
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

  // Map recommendation titles/categories to real article URLs
  const getArticleUrl = (rec: any): string | null => {
    // If URL is already provided, use it
    if (rec.url) return rec.url;
    
    // Map by title keywords
    const title = rec.title?.toLowerCase() || '';
    const category = rec.category?.toLowerCase() || '';
    const description = rec.description?.toLowerCase() || '';
    
    // Nutrition-related
    if (title.includes('nutrition') || title.includes('diet') || category === 'nutrition') {
      return 'https://www.who.int/publications/i/item/9789241599979';
    }
    
    // Exercise-related
    if (title.includes('exercise') || title.includes('physical') || category === 'exercise') {
      return 'https://www.acog.org/womens-health/faqs/exercise-during-pregnancy';
    }
    
    // Blood pressure / hypertension
    if (title.includes('blood pressure') || title.includes('hypertension') || title.includes('bp')) {
      return 'https://www.who.int/news-room/fact-sheets/detail/hypertension';
    }
    
    // Diabetes / blood sugar
    if (title.includes('diabetes') || title.includes('blood sugar') || title.includes('glucose')) {
      return 'https://www.who.int/news-room/fact-sheets/detail/diabetes';
    }
    
    // Weight / BMI
    if (title.includes('weight') || title.includes('bmi') || title.includes('obesity')) {
      return 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight';
    }
    
    // Mental health
    if (title.includes('mental') || title.includes('stress') || title.includes('anxiety') || title.includes('depression')) {
      return 'https://www.who.int/news-room/fact-sheets/detail/mental-health-of-women';
    }
    
    // Symptoms
    if (title.includes('symptom') || category === 'symptoms') {
      return 'https://www.mayoclinic.org/healthy-lifestyle/pregnancy-week-by-week/in-depth/pregnancy/art-20047208';
    }
    
    // First trimester
    if (title.includes('first trimester') || title.includes('early pregnancy')) {
      return 'https://www.who.int/news-room/fact-sheets/detail/maternal-mortality';
    }
    
    // Preparation / birth
    if (title.includes('birth') || title.includes('labor') || title.includes('delivery') || category === 'preparation') {
      return 'https://www.who.int/health-topics/pregnancy#tab=tab_1';
    }
    
    // General pregnancy health
    if (title.includes('pregnancy') || title.includes('maternal')) {
      return 'https://www.who.int/health-topics/pregnancy#tab=tab_1';
    }
    
    // Default WHO pregnancy resource
    return 'https://www.who.int/health-topics/pregnancy#tab=tab_1';
  };

  const renderRecommendationCard = (rec: any, index: number) => {
    const Icon = getIcon(rec.icon);
    const CategoryIcon = getCategoryIcon(rec.category);
    const articleUrl = getArticleUrl(rec);

    // Determine if this should be a link or action button
    const isAction = rec.action === 'Add Health Record' || rec.action === 'View Risk Assessment';
    const hasUrl = rec.url || articleUrl;

    const CardContent = (
      <>
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
          {hasUrl && !isAction ? (
            <div className="flex items-center text-primary-600 text-sm font-medium group">
              Read Article
              <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : rec.action === 'Add Health Record' ? (
            <div className="flex items-center text-primary-600 text-sm font-medium">
              {rec.action}
              <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          ) : rec.action === 'View Risk Assessment' ? (
            <div className="flex items-center text-primary-600 text-sm font-medium">
              {rec.action}
              <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          ) : hasUrl ? (
            <div className="flex items-center text-primary-600 text-sm font-medium group">
              Learn More
              <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : null}
        </div>
      </>
    );

    // Wrap in appropriate link/button
    if (isAction) {
      if (rec.action === 'Add Health Record') {
        return (
          <Link
            key={rec.id || index}
            to="/app/health/new"
            className={`block p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)} transition-all hover:shadow-lg transform hover:scale-[1.01]`}
          >
            {CardContent}
          </Link>
        );
      } else if (rec.action === 'View Risk Assessment') {
        return (
          <Link
            key={rec.id || index}
            to="/app/risk-assessment"
            className={`block p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)} transition-all hover:shadow-lg transform hover:scale-[1.01]`}
          >
            {CardContent}
          </Link>
        );
      }
    }

    // For articles, make the whole card clickable
    if (hasUrl) {
      return (
        <a
          key={rec.id || index}
          href={rec.url || articleUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`block p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)} transition-all hover:shadow-lg transform hover:scale-[1.01] cursor-pointer`}
        >
          {CardContent}
        </a>
      );
    }

    // Fallback: regular card
    return (
      <div
        key={rec.id || index}
        className={`p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)} transition-all hover:shadow-lg`}
      >
        {CardContent}
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
      url: 'https://www.who.int/news-room/fact-sheets/detail/maternal-mortality',
      source: 'WHO',
    },
    {
      id: 'nutrition',
      title: 'Pregnancy Nutrition Essentials',
      description: 'Learn about essential nutrients, foods to eat, and foods to avoid',
      category: 'nutrition',
      duration: '12 min',
      icon: UtensilsCrossed,
      url: 'https://www.who.int/publications/i/item/9789241599979',
      source: 'WHO',
    },
    {
      id: 'exercise',
      title: 'Safe Exercise During Pregnancy',
      description: 'Discover safe exercises for each trimester and what to avoid',
      category: 'exercise',
      duration: '10 min',
      icon: Dumbbell,
      url: 'https://www.acog.org/womens-health/faqs/exercise-during-pregnancy',
      source: 'ACOG',
    },
    {
      id: 'symptoms',
      title: 'Common Pregnancy Symptoms',
      description: 'Understand normal symptoms and when to seek medical attention',
      category: 'symptoms',
      duration: '8 min',
      icon: Stethoscope,
      url: 'https://www.mayoclinic.org/healthy-lifestyle/pregnancy-week-by-week/in-depth/pregnancy/art-20047208',
      source: 'Mayo Clinic',
    },
    {
      id: 'preparation',
      title: 'Birth Preparation Guide',
      description: 'Prepare for labor, delivery, and postpartum care',
      category: 'preparation',
      duration: '20 min',
      icon: Baby,
      url: 'https://www.who.int/health-topics/pregnancy#tab=tab_1',
      source: 'WHO',
    },
    {
      id: 'mental-health',
      title: 'Mental Health During Pregnancy',
      description: 'Resources for managing stress, anxiety, and emotional well-being',
      category: 'symptoms',
      duration: '10 min',
      icon: Heart,
      url: 'https://www.who.int/news-room/fact-sheets/detail/mental-health-of-women',
      source: 'WHO',
    },
  ];

  return (
    <div className="space-y-8 fade-in">
      {/* Enhanced Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('personalized_recommendations', 'Personalized Recommendations')}</h1>
        <p className="text-lg text-gray-600">
          {t('ai_powered_recommendations_tailored', 'AI-powered recommendations tailored to your pregnancy journey')}
        </p>
      </div>

      {/* Urgent Recommendations */}
      {recommendations.urgent && recommendations.urgent.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-danger-600" />
            <h2 className="text-xl font-semibold text-gray-900">{t('urgent_actions', 'Urgent Actions')}</h2>
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
            <h2 className="text-xl font-semibold text-gray-900">{t('important_actions', 'Important Actions')}</h2>
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
            <h2 className="text-xl font-semibold text-gray-900">{t('suggested_actions', 'Suggested Actions')}</h2>
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
              {recommendations.education.map((rec: any, idx: number) => {
                const educationUrl = rec.url || getArticleUrl(rec);
                const CardContent = (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
                        {React.createElement(getCategoryIcon(rec.category), {
                          className: 'h-5 w-5 text-primary-600',
                        })}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{rec.estimatedTime || rec.duration}</span>
                          </div>
                          {educationUrl && (
                            <div className="text-primary-600 group-hover:text-primary-700 text-sm font-medium flex items-center">
                              Read More
                              <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );

                if (educationUrl) {
                  return (
                    <a
                      key={rec.id || idx}
                      href={educationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all transform hover:scale-[1.01] cursor-pointer group"
                    >
                      {CardContent}
                    </a>
                  );
                }

                return (
                  <div
                    key={rec.id || idx}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    {CardContent}
                  </div>
                );
              })}
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
                <a
                  key={content.id}
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-5 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02] group"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="p-2 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{content.title}</h4>
                      <p className="text-sm text-gray-600">{content.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{content.duration}</span>
                      {content.source && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                          {content.source}
                        </span>
                      )}
                    </div>
                    <div className="text-primary-600 group-hover:text-primary-700 text-sm font-medium flex items-center">
                      Read Article
                      <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </a>
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
            to="/app/health/new"
            className="p-4 bg-white rounded-lg hover:shadow-md transition-shadow flex items-center space-x-3 group"
          >
            <Heart className="h-5 w-5 text-primary-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900">Add Health Record</span>
          </Link>
          <Link
            to="/app/risk-assessment"
            className="p-4 bg-white rounded-lg hover:shadow-md transition-shadow flex items-center space-x-3 group"
          >
            <Activity className="h-5 w-5 text-warning-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900">Run Risk Assessment</span>
          </Link>
          <Link
            to="/app/emergency/contacts"
            className="p-4 bg-white rounded-lg hover:shadow-md transition-shadow flex items-center space-x-3 group"
          >
            <Phone className="h-5 w-5 text-danger-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900">Update Emergency Contacts</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

