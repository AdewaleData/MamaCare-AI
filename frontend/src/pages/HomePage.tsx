import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Shield,
  Brain,
  UserCheck,
  ArrowRight,
  CheckCircle,
  Stethoscope,
  Languages,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Background Image */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/pregnant-woman.jpg)',
          }}
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/85 via-primary-800/75 to-primary-900/85"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left fade-in">
              <div className="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                <span className="text-sm font-semibold text-white">AI-Powered Maternal Health</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
                Empowering{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 via-white to-primary-200">
                  African Mothers
                </span>{' '}
                with AI-Powered Care
              </h1>
              <p className="text-xl lg:text-2xl text-white/95 mb-8 leading-relaxed drop-shadow-lg">
                MamaCare AI provides intelligent maternal health risk assessment and personalized care recommendations
                to ensure safe pregnancies for mothers across Africa.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="btn-primary text-lg px-10 py-5 inline-flex items-center justify-center group bg-white text-primary-600 hover:bg-primary-50 shadow-2xl hover:shadow-primary-500/30 transform hover:scale-105 transition-all duration-300"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="btn-secondary text-lg px-10 py-5 inline-flex items-center justify-center bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 backdrop-blur-md hover:border-white/50 transform hover:scale-105 transition-all duration-300"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Right Image - African Pregnant Woman */}
            <div className="relative hidden lg:block fade-in" style={{ animationDelay: '200ms' }}>
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-500">
                {/* Actual image */}
                <img
                  src="/pregnant-woman.jpg"
                  alt="African Pregnant Woman - Beautiful, Strong, Empowered"
                  className="w-full h-auto object-cover aspect-[4/5]"
                />
                {/* Decorative animated elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-200 rounded-full opacity-50 blur-xl animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary-300 rounded-full opacity-50 blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 -right-8 w-16 h-16 bg-primary-100 rounded-full opacity-40 blur-lg animate-pulse" style={{ animationDelay: '2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose MamaCare AI?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive maternal health monitoring designed specifically for African communities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-gradient bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group relative overflow-hidden glow-border">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary-300/30 transition-all duration-500"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">AI Risk Assessment</h3>
              <p className="text-gray-600 leading-relaxed relative z-10">
                Advanced machine learning algorithms analyze your health data to predict potential risks
                and provide early warnings for complications.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-gradient bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group relative overflow-hidden glow-border">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary-300/30 transition-all duration-500"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">24/7 Health Monitoring</h3>
              <p className="text-gray-600 leading-relaxed relative z-10">
                Track your vital signs, weight, blood pressure, and more. Get personalized insights
                and recommendations based on your health data.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-gradient bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group relative overflow-hidden glow-border">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary-300/30 transition-all duration-500"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">Emergency Support</h3>
              <p className="text-gray-600 leading-relaxed relative z-10">
                Instant emergency alerts connect you with healthcare providers and emergency contacts
                when you need help most.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-gradient bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <ClipboardCheck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Provider Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                Healthcare providers can monitor their patients, view risk assessments, and manage
                appointments all in one place.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-gradient bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Languages className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Multi-Language Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Available in English, Hausa, Yoruba, and Igbo to serve diverse African communities
                in their native languages.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-gradient bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Personalized Care</h3>
              <p className="text-gray-600 leading-relaxed">
                Get tailored recommendations based on your pregnancy stage, health conditions,
                and risk factors specific to your situation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="transform hover:scale-110 transition-all duration-300">
              <div className="text-5xl font-bold mb-2 text-gradient-animated">10M+</div>
              <div className="text-primary-100 text-lg">Mothers Served</div>
            </div>
            <div className="transform hover:scale-110 transition-all duration-300">
              <div className="text-5xl font-bold mb-2 text-gradient-animated">95%</div>
              <div className="text-primary-100 text-lg">Risk Detection Accuracy</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <div className="text-primary-100 text-lg">Available Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple steps to better maternal health
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Sign Up", desc: "Create your account and set up your pregnancy profile" },
              { step: "2", title: "Record Health Data", desc: "Track your vital signs and health metrics regularly" },
              { step: "3", title: "Get AI Assessment", desc: "Receive instant risk analysis and recommendations" },
              { step: "4", title: "Stay Connected", desc: "Connect with providers and get ongoing support" },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-20 h-20 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Take Control of Your Maternal Health?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of African mothers who trust MamaCare AI for their pregnancy journey
          </p>
          <Link
            to="/register"
            className="btn-primary text-lg px-10 py-5 inline-flex items-center justify-center group shadow-2xl hover:shadow-primary-500/30 transform hover:scale-105 transition-all duration-300"
          >
            Start Your Journey
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">MamaCare AI</h3>
              <p className="text-gray-400">
                Empowering African mothers with intelligent maternal health care.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                Email: support@mamacare.ai
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 MamaCare AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

