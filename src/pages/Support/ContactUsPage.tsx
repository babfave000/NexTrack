import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataToSend = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        category: formData.category,
        message: formData.message
      };

      const formDataWithHoneypot = {
        ...formDataToSend,
        'form-name': 'contactForm',
        'form-email': formData.email
      };

      const response = await fetch('https://formspree.io/f/xjgedgdz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formDataWithHoneypot)
      });

      console.log('Formspree response:', response);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const responseData = await response.json();
        console.log('Response data:', responseData);
        
        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          category: '',
          message: ''
        });
      } else {
        const errorText = await response.text();
        console.error('Formspree error response:', errorText);
        throw new Error(`Formspree error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setIsSubmitting(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Full error details:', errorMessage);
      
      alert(`Failed to send message: ${errorMessage}. Please:\n\n1. Check your internet connection\n2. Try again later\n3. Contact us directly at nextrack.ink@gmail.com`);
    }
  };

  const contactMethods = [
    {
      icon: '📧',
      title: 'Email Support',
      description: 'Send us an email and we\'ll respond within 24 hours',
      contact: 'nextrack.ink@gmail.com',
      action: 'mailto:nextrack.ink@gmail.com',
      accent: 'emerald'
    },
    {
      icon: '💬',
      title: 'Live Chat',
      description: 'Chat with our support team during business hours',
      contact: 'Available 9AM-6PM WAT',
      action: '#',
      accent: 'teal'
    },
    {
      icon: '📞',
      title: 'Phone Support',
      description: 'Call us for immediate assistance',
      contact: '+234 807 560 8337',
      action: 'tel:+2348075608337',
      accent: 'amber'
    },
    {
      icon: '📍',
      title: 'Office Address',
      description: 'Visit our headquarters',
      contact: 'Lagos, Nigeria',
      action: 'https://maps.google.com/?q=Lagos,Nigeria',
      accent: 'rose'
    }
  ];

  const supportCategories = [
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing Inquiry' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'general', label: 'General Inquiry' },
    { value: 'feedback', label: 'Feedback' }
  ];

  const accentClasses = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'hover:text-emerald-700' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', hover: 'hover:text-teal-700' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'hover:text-amber-700' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-600', hover: 'hover:text-rose-700' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-xl font-bold text-emerald-700">
                NexTrack
              </Link>
              <div className="text-sm text-gray-500">Contact Us</div>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/help"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Help &amp; Support
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're here to help! Get in touch with our support team for assistance with NexTrack.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
            
            {isSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-emerald-600 text-2xl">✓</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-600 mb-4">
                  Thank you for contacting us. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                      style={{ fontSize: '16px' }}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                      style={{ fontSize: '16px' }}
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-800 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                      style={{ fontSize: '16px' }}
                      placeholder="Brief subject line"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-800 mb-2">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="">Select a category</option>
                      {supportCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-800 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all resize-none"
                    style={{ fontSize: '16px' }}
                    placeholder="Please describe your issue or question in detail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3.5 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/25 hover:-translate-y-0.5"
                >
                  {isSubmitting ? 'Sending Message...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Other Ways to Reach Us</h2>
              <div className="grid grid-cols-1 gap-6">
                {contactMethods.map((method, index) => {
                  const a = accentClasses[method.accent as keyof typeof accentClasses];
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-12 h-12 ${a.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                        >
                          <span className={`${a.text} text-xl`}>{method.icon}</span>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {method.title}
                          </h3>
                          <p className="text-gray-600 mb-3">{method.description}</p>
                          {method.action.startsWith('http') ||
                          method.action.startsWith('mailto') ||
                          method.action.startsWith('tel') ? (
                            <a
                              href={method.action}
                              className={`${a.text} ${a.hover} font-semibold transition-colors`}
                            >
                              {method.contact}
                            </a>
                          ) : (
                            <p className="text-gray-900 font-medium whitespace-pre-line">
                              {method.contact}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Hours</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monday - Friday</span>
                  <span className="font-medium">9:00 AM - 6:00 PM EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Saturday</span>
                  <span className="font-medium">10:00 AM - 2:00 PM EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sunday</span>
                  <span className="font-medium">Closed</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <p className="text-sm text-gray-600">
                  Emergency support available for critical issues outside business hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
