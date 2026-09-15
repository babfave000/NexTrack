import { Link } from 'react-router-dom';

export default function GuidelinePage() {
  const faqs = [
    {
      question: "How do I add a new product?",
      answer: "Go to the Inventory page and click the 'Add Product' button. Fill in the required information including product name, cost price, sale price, and stock quantity. You can also add categories, brands, and upload product images."
    },
    {
      question: "How do I create a sales order?",
      answer: "Navigate to the Sales Orders page and click 'New Sales Order'. Select the customer, add products with quantities, and the system will automatically calculate totals. You can generate invoices and track order status."
    },
    {
      question: "How do I manage purchase orders?",
      answer: "Go to Purchase Orders page to create new orders, track deliveries, and update inventory. Add suppliers, manage purchase history, and monitor procurement costs."
    },
    {
      question: "Can I export my data?",
      answer: "Yes, administrators can export data in CSV format from the Admin panel. Go to Admin → Database to export users, products, sales, purchases, and other business data."
    },
    {
      question: "How do I track low stock items?",
      answer: "The system automatically highlights products with low stock in red on the Inventory page. Set your low stock threshold in Profile Settings or individual product settings."
    },
    {
      question: "Is my data stored locally?",
      answer: "Yes, all data is stored locally in your browser using IndexedDB. This means your data remains on your device and works offline. Optional cloud sync is available."
    },
    {
      question: "How do I reset my password?",
      answer: "Currently, password reset requires contacting your system administrator. They can reset your password from the Admin panel."
    },
    {
      question: "What are user roles and permissions?",
      answer: "NexTrack has two main roles: Users can manage inventory and sales, while Managers have additional permissions including user management, reports, and system settings."
    },
    {
      question: "How do I backup my data?",
      answer: "Go to Settings → Backup & Restore to create manual backups or set up automatic backups. You can also export data as JSON files for external backup."
    },
    {
      question: "Can I use NexTrack offline?",
      answer: "Yes! NexTrack is designed to work completely offline. All features are available without internet connection. Data syncs when you're back online if cloud sync is enabled."
    },
    {
      question: "How do I configure business settings?",
      answer: "Navigate to Profile → Business Profile to set up your business information, logo, contact details, and preferences like low stock alerts and backup frequency."
    },
    {
      question: "What reports are available?",
      answer: "Access comprehensive reports from the Reports menu including sales analytics, inventory reports, purchase summaries, profit & loss statements, and custom date-range reports."
    }
  ];

  const quickGuides = [
    {
      title: "Getting Started",
      description: "Learn the basics of NexTrack inventory management",
      icon: "🚀",
      steps: [
        "1. Create your account and set up your business profile",
        "2. Add your products in the Inventory section with details and images",
        "3. Set up your suppliers in the Purchase Orders section",
        "4. Create your first sales order and generate invoice",
        "5. Configure backup settings and explore reports"
      ]
    },
    {
      title: "Inventory Management",
      description: "Best practices for managing your inventory efficiently",
      icon: "📦",
      steps: [
        "1. Regularly update stock levels after sales and purchases",
        "2. Set appropriate low stock alerts for each product",
        "3. Use categories and brands to organize products better",
        "4. Track product performance with sales reports",
        "5. Conduct regular inventory audits and adjustments"
      ]
    },
    {
      title: "Sales Process",
      description: "Complete guide to processing sales and managing orders",
      icon: "💰",
      steps: [
        "1. Create sales orders for customer purchases",
        "2. Update inventory automatically after each sale",
        "3. Generate professional invoices and receipts",
        "4. Track order status from pending to completed",
        "5. Handle returns and change left transactions"
      ]
    },
    {
      title: "Purchase Management",
      description: "Managing procurement and supplier relationships",
      icon: "📥",
      steps: [
        "1. Add and manage supplier information",
        "2. Create purchase orders for restocking",
        "3. Track order deliveries and receipts",
        "4. Update inventory from purchase deliveries",
        "5. Monitor purchase costs and supplier performance"
      ]
    },
    {
      title: "Financial Reporting",
      description: "Understanding your business financial health",
      icon: "📊",
      steps: [
        "1. Generate daily, weekly, and monthly sales reports",
        "2. Track profit margins on products and overall business",
        "3. Monitor expenses through purchase reports",
        "4. Analyze best-selling products and customer trends",
        "5. Export financial data for accounting purposes"
      ]
    },
    {
      title: "Data Management",
      description: "Backup, restore, and secure your business data",
      icon: "🔐",
      steps: [
        "1. Set up automatic backup schedules",
        "2. Create manual backups before major changes",
        "3. Test restore procedures regularly",
        "4. Export data for external analysis or migration",
        "5. Manage user access and permissions"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-xl font-bold text-emerald-700">
                NexTrack
              </Link>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            NexTrack Help Center
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your complete guide to mastering NexTrack inventory management.
            Find answers, learn best practices, and get the most out of your business management system.
          </p>
        </div>

        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-emerald-600 text-2xl">📚</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
              <p className="text-gray-600 mb-4">
                Comprehensive guides and tutorials
              </p>
              <Link
                to="/guideline"
                className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
              >
                View Guides →
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl">❓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">FAQs</h3>
              <p className="text-gray-600 mb-4">
                Answers to frequently asked questions
              </p>
              <a href="#faq-section" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                Browse FAQs →
              </a>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-amber-600 text-2xl">📞</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Us</h3>
              <p className="text-gray-600 mb-4">
                Get in touch with our support team
              </p>
              <Link
                to="/contact"
                className="text-amber-600 hover:text-amber-700 font-semibold transition-colors"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickGuides.map((guide, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{guide.icon}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{guide.title}</h3>
                </div>
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

        <div id="faq-section" className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 lg:p-10 text-center shadow-2xl shadow-emerald-600/20">
          <h2 className="text-2xl font-bold text-white mb-4">Still Need Help?</h2>
          <p className="text-emerald-50 mb-6 max-w-2xl mx-auto">
            Our support team is here to help you get the most out of NexTrack.
            Contact us for technical assistance, feature requests, or any other questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Contact Support Team
            </Link>
            <button className="border-2 border-white/40 hover:bg-white/10 text-white px-6 py-3.5 rounded-xl font-semibold transition-all">
              Schedule a Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
