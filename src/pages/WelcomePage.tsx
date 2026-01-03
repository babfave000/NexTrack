// src/pages/WelcomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const WelcomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">NT</span>
                </div>
                <h1 className="text-xl font-bold text-white">NexTrack</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-white/80 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent"></div>
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              <span className="text-sm text-white/80 font-medium">Trusted by 500+ businesses worldwide</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Smart Accounting
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed">
              NexTrack provides enterprise-grade inventory management, sales tracking, and financial reporting 
              in an intuitive offline-first platform. Scale your business with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
              <Link
                to="/login"
                className="group bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center space-x-3"
              >
                <span>Start Free Trial</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <button className="group border border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/5 transition-all backdrop-blur-sm flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col items-center space-y-8">
              <p className="text-white/60 text-sm uppercase tracking-wider font-medium">Trusted by innovative teams at</p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                {['TechCorp', 'RetailPlus', 'GlobalTrade', 'SupplyChain', 'EcomPro'].map((company) => (
                  <div key={company} className="text-white/40 font-semibold text-lg">
                    {company}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-white/5 backdrop-blur-md border-t border-b border-white/10 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Scale
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Powerful features designed to streamline your operations and drive growth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '📊',
                title: 'Real-time Analytics',
                description: 'Make data-driven decisions with live dashboards and comprehensive business insights.',
                features: ['Live Sales Metrics', 'Inventory Turnover', 'Profit Margins', 'Trend Analysis']
              },
              {
                icon: '📦',
                title: 'Inventory Management',
                description: 'Track stock levels, automate reordering, and manage suppliers with precision.',
                features: ['Stock Alerts', 'Supplier Management', 'Barcode Support', 'Batch Tracking']
              },
              {
                icon: '💳',
                title: 'Sales & POS',
                description: 'Process transactions, manage customer relationships, and track payment status.',
                features: ['Multi-payment Support', 'Customer Database', 'Receipt Printing', 'Returns Management']
              },
              {
                icon: '🛒',
                title: 'Purchase Orders',
                description: 'Streamline procurement with automated purchase orders and vendor management.',
                features: ['Auto-generated POs', 'Vendor Portal', 'Payment Tracking', 'Delivery Scheduling']
              },
              {
                icon: '📈',
                title: 'Financial Reports',
                description: 'Generate comprehensive financial statements and compliance-ready reports.',
                features: ['Profit & Loss', 'Balance Sheets', 'Tax Reports', 'Custom Reporting']
              },
              {
                icon: '🌐',
                title: 'Offline-First Design',
                description: 'Work seamlessly without internet, with automatic sync when connection returns.',
                features: ['Local Data Storage', 'Conflict Resolution', 'Background Sync', 'Data Encryption']
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 rounded-xl flex items-center justify-center mb-6 group-hover:from-blue-500/30 group-hover:to-cyan-400/30 transition-colors">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/60 mb-4 leading-relaxed">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-white/50">
                      <svg className="w-4 h-4 text-cyan-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { number: '99.9%', label: 'Uptime Reliability' },
              { number: '500+', label: 'Active Businesses' },
              { number: '24/7', label: 'Customer Support' },
              { number: '50+', label: 'Countries Served' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-white/60 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-cyan-500 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses that trust NexTrack for their daily operations. 
            Start your free trial today - no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-colors shadow-2xl flex items-center space-x-3"
            >
              <span>Start Free Trial</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="border border-white/30 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Schedule a Demo
            </Link>
          </div>
          <p className="text-white/70 text-sm mt-6">
            Free 14-day trial • No setup fees • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/50 backdrop-blur-md border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NT</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">NexTrack</h2>
                <p className="text-white/60 text-sm">Smart Offline Accounting Solutions</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/60">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/security" className="hover:text-white transition-colors">Security</a>
              <a href="/compliance" className="hover:text-white transition-colors">Compliance</a>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-white/40 text-sm">
              © 2025 NEXAI SYSTEMS HUB. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;