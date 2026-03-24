import React from 'react';
import { Wind, Target, Users, Award, TrendingUp, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            About WindCast Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We are pioneering the future of clean energy through adaptive wind speed forecasting 
            technology that enhances renewable energy production worldwide.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 mb-4">
                To revolutionize wind energy forecasting through advanced functional data analysis 
                and machine learning algorithms, making clean energy more predictable, efficient, 
                and accessible to communities worldwide.
              </p>
              <p className="text-gray-600">
                Our adaptive strategy leverages real-time atmospheric data and predictive modeling 
                to optimize wind turbine performance and maximize energy output while minimizing 
                environmental impact.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-8 rounded-lg">
              <Wind className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">95%+</div>
                <div className="text-gray-700">Forecasting Accuracy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <Target className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Precision Forecasting</h3>
            <p className="text-gray-600">
              Our advanced algorithms analyze multiple atmospheric variables to deliver 
              highly accurate wind speed predictions up to 72 hours in advance.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Adaptive Learning</h3>
            <p className="text-gray-600">
              Machine learning models continuously improve prediction accuracy by 
              learning from real-time data patterns and seasonal variations.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <Zap className="h-12 w-12 text-yellow-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Power Optimization</h3>
            <p className="text-gray-600">
              Calculate optimal power generation potential and turbine efficiency 
              to maximize energy output and reduce operational costs.
            </p>
          </div>
        </div>

        {/* Technology Section */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-8 text-white mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Advanced Technology Stack</h2>
              <ul className="space-y-3">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Functional Data Analysis (FDA) for wind pattern recognition</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Machine Learning algorithms for predictive modeling</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Real-time atmospheric data integration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Cloud-based processing for scalable performance</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/10 p-4 rounded-lg">
                <div className="text-2xl font-bold">1000+</div>
                <div className="text-sm opacity-90">Cities Monitored</div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-sm opacity-90">Real-time Updates</div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <div className="text-2xl font-bold">500+</div>
                <div className="text-sm opacity-90">Wind Farms</div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <div className="text-2xl font-bold">98%</div>
                <div className="text-sm opacity-90">Uptime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Our Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Global Reach</h3>
              <p className="text-gray-600">
                Supporting renewable energy projects across 50+ countries with 
                localized forecasting models.
              </p>
            </div>
            <div>
              <Award className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Industry Recognition</h3>
              <p className="text-gray-600">
                Winner of multiple clean energy innovation awards and recognized 
                by leading environmental organizations.
              </p>
            </div>
            <div>
              <Wind className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibent text-gray-900 mb-2">Clean Energy Focus</h3>
              <p className="text-gray-600">
                Committed to accelerating the global transition to sustainable 
                energy through innovative forecasting solutions.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center bg-gray-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Get In Touch</h2>
          <p className="text-gray-600 mb-6">
            Interested in implementing our wind forecasting technology? 
            Contact our team to learn more about partnership opportunities.
          </p>
          <div className="space-y-2">
            <p className="text-gray-700">
              <strong>Email:</strong> info@windcastpro.com
            </p>
            <p className="text-gray-700">
              <strong>Phone:</strong> +91 123-456-7890
            </p>
            <p className="text-gray-700">
              <strong>Address:</strong> 123 Clean Energy Blvd, Renewable City, RC 12345
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;