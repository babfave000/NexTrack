// src/pages/Support/GuidelinePage.tsx
import { Link } from 'react-router-dom';

export default function GuidelinePage() {
  const faqs = [
    {
      question: "How do I add a new product?",
      answer: "Go to the Inventory page and click the 'Add Product' button. Fill in the required information including product name, cost price, sale price, and stock quantity."
    },
    {
      question: "How do I create a sales order?",
      answer: "Navigate to the Sales Orders page and click 'New Sales Order'. Select the customer, add products, and set the quantities. The system will automatically calculate totals."
    },
    {
      question: "Can I export my data?",
      answer: "Yes, administrators can export data in CSV format from the Admin panel. Go to Admin → Database to export users, products, sales, or purchase data."
    },
    {
      question: "How do I track low stock items?",
      answer: "The system automatically highlights products with low stock in red on the Inventory page. You can set the low stock threshold in product settings."
    },
    {
      question: "Is my data stored locally?",
      answer: "Yes, all data is stored locally in your browser using IndexedDB. This means your data remains on your device and works offline."
    },
    {
      question: "How do I reset my password?",
      answer: "Currently, password reset requires contacting your system administrator. They can reset your password from the Admin panel."
    }
  ];

  const quickGuides = [
    {
      title: "Getting Started",
      description: "Learn the basics of NexTrack inventory management",
      steps: [
        "1. Add your products in the Inventory section",
        "2. Set up your suppliers in the Purchase Orders section",
        "3. Create your first sales order",
        "4. Generate reports to analyze your business"
      ]
    },
    {
      title: "Inventory Management",
      description: "Best practices for managing your inventory",
      steps: [
        "1. Regularly update stock levels",
        "2. Set appropriate low stock alerts",
        "3. Use categories to organize products",
        "4. Track product performance in reports"
      ]
    },
    {
      title: "Sales Process",
      description: "How to efficiently process sales orders",
      steps: [
        "1. Create sales orders for customer purchases",
        "2. Update inventory automatically",
        "3. Track order status and history",
        "4. Generate sales reports for analysis"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-xl font-bold text-blue-600">
                NexTrack
              </Link>
              <div className="text-sm text-gray-500">Help & Support</div>
            </div>
            <Link
              to="/dashboard"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Help & Support
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions, learn how to use NexTrack, and get the most out of your inventory management system.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Quick Actions */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 text-xl">📚</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
                <p className="text-gray-600 mb-4">
                  Comprehensive guides and tutorials
                </p>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  View Guides
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 text-xl">❓</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">FAQs</h3>
                <p className="text-gray-600 mb-4">
                  Answers to frequently asked questions
                </p>
                <a href="#faq-section" className="text-green-600 hover:text-green-700 font-medium">
                  Browse FAQs
                </a>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 text-xl">📞</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Us</h3>
                <p className="text-gray-600 mb-4">
                  Get in touch with our support team
                </p>
                <Link
                  to="/contact"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Guides */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickGuides.map((guide, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{guide.title}</h3>
                <p className="text-gray-600 mb-4">{guide.description}</p>
                <ul className="space-y-2">
                  {guide.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="text-sm text-gray-600">{step}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq-section" className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {faqs.map((faq, index) => (
              <div key={index} className={`border-gray-200 ${index !== faqs.length - 1 ? 'border-b' : ''}`}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Contact */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our support team is here to help you get the most out of NexTrack. 
            Contact us for technical assistance, feature requests, or any other questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              Contact Support Team
            </Link>
            <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-md font-medium transition-colors">
              Schedule a Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}