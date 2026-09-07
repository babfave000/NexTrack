// src/pages/WelcomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';

const WelcomePage: React.FC = () => {
  return (
    <div className="welcome-page min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="welcome-nav sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="welcome-brand text-2xl font-bold text-emerald-700">
              NexTrack
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="welcome-nav-link text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium">
                Sign In
              </Link>
              <Link to="/login" className="welcome-cta-btn bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="welcome-hero relative overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-white pt-20 pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="welcome-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 mb-8 text-sm font-medium">
            <span className="welcome-badge-dot w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Trusted by 500+ African businesses
          </div>

          {/* Headline */}
          <h1 className="welcome-headline text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Smart Accounting
            <span className="welcome-gradient block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>

          {/* Subheadline */}
          <p className="welcome-subheadline text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Manage inventory, track sales, and organize purchases—all in one intuitive app. Works online or offline.
          </p>

          {/* CTA Buttons */}
          <div className="welcome-cta-group flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to="/login"
              className="welcome-primary-btn bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
            >
              Start Free
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <button className="welcome-secondary-btn border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-2">
              Watch Demo
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="welcome-trust text-gray-500 text-sm">
            <p className="mb-4">Trusted by businesses in</p>
            <div className="welcome-trust flex flex-wrap justify-center gap-6">
              <span className="welcome-trust-item">Nigeria</span>
              <span className="welcome-trust-item">Kenya</span>
              <span className="welcome-trust-item">Ghana</span>
              <span className="welcome-trust-item">South Africa</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="welcome-features py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="welcome-section-title text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="welcome-section-subtitle text-xl text-gray-600">
              Powerful features designed for African small businesses
            </p>
          </div>

          <div className="welcome-features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '📦', title: 'Smart Inventory', desc: 'Track products, stock levels, and get alerts' },
              { icon: '💰', title: 'Sales Management', desc: 'Create invoices and print receipts instantly' },
              { icon: '📥', title: 'Purchase Orders', desc: 'Organize supplier purchases easily' },
              { icon: '📊', title: 'Financial Reports', desc: 'Visualize trends and make decisions' },
              { icon: '🔌', title: 'Offline First', desc: 'Work with or without internet connection' },
              { icon: '📱', title: 'Install as App', desc: 'Use like a native mobile app' }
            ].map((feature, idx) => (
              <div key={idx} className="welcome-feature-card bg-gray-50 rounded-2xl p-8 hover:shadow-lg hover:scale-105 transition-all">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="welcome-benefits py-24 bg-emerald-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Why Choose NexTrack?</h2>
          <div className="space-y-6">
            {[
              'Track all your business data in one place',
              'Works perfectly offline with automatic sync',
              'No complex setup—start using it immediately',
              'Built for African businesses and payment methods',
              'Your data stays private and secure',
              'Affordable pricing for small businesses'
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <CheckIcon className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="welcome-testimonials py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Chidi O.', role: 'Shop Owner', text: 'NexTrack transformed how I manage my shop. The offline feature is a lifesaver!' },
              { name: 'Tunde M.', role: 'Retailer', text: 'Simple, fast, and exactly what I need. No unnecessary features, just what works.' },
              { name: 'Amara K.', role: 'Business Owner', text: 'I recommend NexTrack to all my friends. Best investment for my business.' }
            ].map((testimonial, idx) => (
              <div key={idx} className="welcome-testimonial-card bg-gray-50 rounded-2xl p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <p className="text-emerald-100">Active Businesses</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">99.9%</div>
              <p className="text-emerald-100">Uptime</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <p className="text-emerald-100">Support</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">50+</div>
              <p className="text-emerald-100">Countries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="welcome-final-cta py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of businesses using NexTrack today. Free forever plan available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg"
            >
              Start Free Trial
            </Link>
            <button className="border-2 border-emerald-600 text-emerald-600 px-8 py-4 rounded-xl font-semibold hover:bg-emerald-50 transition-colors">
              Schedule Demo
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-6">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="welcome-footer bg-gray-900 text-gray-300 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-4">NexTrack</h3>
              <p className="text-sm">Smart accounting for African businesses</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>© 2026 NexTrack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
