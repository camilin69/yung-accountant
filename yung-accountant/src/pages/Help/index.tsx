// pages/Help/index.tsx
import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Mail, BookOpen, MessageCircle, ExternalLink } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';

const Help: React.FC = () => {
  const { getGradientTextClass } = useThemeStyles();
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
        <h1 className={`text-2xl font-light tracking-tight ${getGradientTextClass()}`}>
          Help & FAQ
        </h1>
        <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
          Find answers to common questions and get support
        </p>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {supportOptions.map((option, idx) => (
          <div key={idx} className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-5 text-center hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300">
            <option.icon className="w-8 h-8 text-[var(--theme-primary)] mx-auto mb-3" />
            <h3 className="text-sm font-light text-[var(--theme-text-primary)] mb-1">{option.title}</h3>
            <p className="text-xs text-[var(--theme-text-tertiary)] mb-3">{option.description}</p>
            {option.isEmail ? (
              <a href={`mailto:${option.action}`} className="text-xs text-[var(--theme-primary)] hover:underline inline-flex items-center gap-1">
                {option.action}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button onClick={option.onClick} className="text-xs text-[var(--theme-primary)] hover:underline">
                {option.action}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[var(--theme-border-light)] flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[var(--theme-primary)]" />
          <h2 className="text-sm font-light text-[var(--theme-text-primary)]">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-[var(--theme-border-dark)]">
          {faqs.map((faq, idx) => (
            <div key={idx} className="transition-all">
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full p-5 text-left flex items-center justify-between hover:bg-[var(--theme-background-glass-hover)] transition-colors"
              >
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{faq.question}</span>
                {openFAQs.includes(idx) ? (
                  <ChevronUp className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                )}
              </button>
              {openFAQs.includes(idx) && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-[var(--theme-text-secondary)] font-light leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="mt-6 p-5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-xl text-center">
        <p className="text-sm text-[var(--theme-text-secondary)] font-light">
          Still need help? Contact our support team and we'll get back to you within 24 hours.
        </p>
        <button className="mt-3 px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light transition-colors border border-[var(--theme-border-light)]">
          Contact Support
        </button>
      </div>
    </div>
  );
};

export default Help;