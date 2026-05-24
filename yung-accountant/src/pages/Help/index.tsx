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
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-10 pt-4 animate-fade-in-down">
        <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
          Help & FAQ
        </h1>
        <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
          Find answers to common questions and get support
        </p>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {supportOptions.map((option, idx) => (
          <div 
            key={idx} 
            className="group rounded-[1.75rem] p-6 text-center transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-2 cursor-default glass-md"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 glass-sm"
              style={{ boxShadow: '0 4px 16px -4px var(--theme-primary)' }}>
              <option.icon className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
            </div>
            <h3 className="text-[15px] font-medium tracking-[0.01em] mb-1.5" style={{ color: 'var(--theme-text-primary)' }}>{option.title}</h3>
            <p className="text-[12px] tracking-[0.03em] mb-4" style={{ color: 'var(--theme-text-tertiary)' }}>{option.description}</p>
            {option.isEmail ? (
              <a 
                href={`mailto:${option.action}`} 
                className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[0.02em] transition-all duration-300 hover:opacity-80"
                style={{ color: 'var(--theme-primary)' }}
              >
                {option.action}
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
              </a>
            ) : (
              <button 
                onClick={option.onClick} 
                className="text-[13px] font-medium tracking-[0.02em] transition-all duration-300 hover:opacity-80"
                style={{ color: 'var(--theme-primary)' }}
              >
                {option.action}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="rounded-[2rem] overflow-hidden glass-md animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
            <HelpCircle className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-[15px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>
            Frequently Asked Questions
          </h2>
        </div>
        <div>
          {faqs.map((faq, idx) => {
            const isOpen = openFAQs.includes(idx);
            return (
              <div 
                key={idx} 
                className="transition-all duration-500"
                style={{ borderBottom: idx < faqs.length - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)]"
                >
                  <span className="text-sm font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{faq.question}</span>
                  <div className={`p-1 rounded-2xl transition-all duration-500 ${isOpen ? 'glass-sm rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 animate-fade-in-down">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="mt-8 p-8 rounded-[2rem] text-center glass-aero animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <div className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 glass-sm">
          <MessageCircle className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-medium tracking-[0.02em] mb-5" style={{ color: 'var(--theme-text-secondary)' }}>
          Still need help? Contact our support team and we'll get back to you within 24 hours.
        </p>
        <button 
          className="px-6 py-3 rounded-2xl text-[13px] font-medium tracking-[0.04em] uppercase transition-all duration-500 hover:-translate-y-1 active:scale-95"
          style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 4px 20px -6px var(--theme-primary)' }}
        >
          Contact Support
        </button>
      </div>
    </div>
  );
};

export default Help;