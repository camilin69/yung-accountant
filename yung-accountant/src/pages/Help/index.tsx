// pages/Help/index.tsx
import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Mail, BookOpen, MessageCircle, ExternalLink } from 'lucide-react';

const Help: React.FC = () => {
  const [openFAQs, setOpenFAQs] = useState<number[]>([]);

  const faqs = [
    {
      question: "How do I add a transaction?",
      answer: "Go to the Transactions page and click the 'Add Transaction' button. Fill in the amount, category, wallet, and date. You can also add tags and notes for better organization."
    },
    {
      question: "How do I track my debts?",
      answer: "Navigate to the Debts page where you can add new debts, record payments, and track your progress. You can categorize debts as either money you owe (borrowed) or money owed to you (lent)."
    },
    {
      question: "What are goals and how do I use them?",
      answer: "Goals help you save for specific targets. You can set a target amount, deadline, and track your progress. Each goal can be linked to a wallet to monitor your savings."
    },
    {
      question: "How do I analyze my spending?",
      answer: "Use the Dashboard to see your spending trends, category breakdowns, and financial overview. You can filter by date range and view charts of your expenses and income."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, all your financial data is encrypted and stored securely. We use industry-standard security practices to protect your information."
    },
    {
      question: "Can I export my data?",
      answer: "Yes, you can export your transactions, debts, and goals data from the Settings page. Available formats include CSV and PDF."
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const supportOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      action: "support@yungaccountant.com",
      isEmail: true
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our support team",
      action: "Start Chat",
      onClick: () => {}
    },
    {
      icon: BookOpen,
      title: "Documentation",
      description: "Read our detailed guides",
      action: "View Docs",
      onClick: () => {}
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
          Help & FAQ
        </h1>
        <p className="text-xs text-white/40 mt-0.5 font-light">
          Find answers to common questions and get support
        </p>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {supportOptions.map((option, idx) => (
          <div key={idx} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 text-center hover:bg-white/[0.06] transition-all duration-300">
            <option.icon className="w-8 h-8 text-[#6366F1] mx-auto mb-3" />
            <h3 className="text-sm font-light text-white mb-1">{option.title}</h3>
            <p className="text-xs text-white/40 mb-3">{option.description}</p>
            {option.isEmail ? (
              <a href={`mailto:${option.action}`} className="text-xs text-[#6366F1] hover:underline inline-flex items-center gap-1">
                {option.action}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button onClick={option.onClick} className="text-xs text-[#6366F1] hover:underline">
                {option.action}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#6366F1]" />
          <h2 className="text-sm font-light text-white">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-white/5">
          {faqs.map((faq, idx) => (
            <div key={idx} className="transition-all">
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full p-5 text-left flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-light text-white/80">{faq.question}</span>
                {openFAQs.includes(idx) ? (
                  <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40" />
                )}
              </button>
              {openFAQs.includes(idx) && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-white/60 font-light leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="mt-6 p-5 bg-white/[0.02] border border-white/10 rounded-xl text-center">
        <p className="text-sm text-white/60 font-light">
          Still need help? Contact our support team and we'll get back to you within 24 hours.
        </p>
        <button className="mt-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-colors">
          Contact Support
        </button>
      </div>
    </div>
  );
};

export default Help;