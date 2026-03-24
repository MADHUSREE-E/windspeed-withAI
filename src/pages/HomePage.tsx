import React from 'react';
import { Link } from 'react-router-dom';
import { Wind, TrendingUp, Zap, Shield, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      {/* <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              Adaptive Wind Speed
              <span className="text-blue-600 block">Forecasting</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Enhance clean energy production with our advanced functional data horizon approach 
              for accurate wind speed prediction and power generation optimization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center group"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/about"
                className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section> */}
      <HeroSection />

      {/* Features Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Advanced Forecasting Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <Wind className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Monitoring</h3>
              <p className="text-gray-600">
                Live wind speed data and continuous monitoring for accurate predictions.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Predictive Analytics</h3>
              <p className="text-gray-600">
                Advanced algorithms for precise wind speed forecasting and trend analysis.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Power Generation</h3>
              <p className="text-gray-600">
                Calculate optimal power output based on wind conditions and turbine efficiency.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Platform</h3>
              <p className="text-gray-600">
                Enterprise-grade security with comprehensive admin monitoring capabilities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold text-center mb-8">
              Driving Clean Energy Innovation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">95%</div>
                <div className="text-blue-100">Prediction Accuracy</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-blue-100">Real-time Monitoring</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">1000+</div>
                <div className="text-blue-100">Cities Supported</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Wind className="h-6 w-6" />
            <span className="text-lg font-semibold">WindCast Pro</span>
          </div>
          <p className="text-gray-400">
            © 2026 WindCast Pro. Enhancing clean energy through adaptive forecasting.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;