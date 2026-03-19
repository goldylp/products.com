import React, { useState } from 'react';
import { getApiUrl } from '../utils/api';
import { isNonEmpty, isValidEmail } from '../utils/validation';
import './StorePages.css';

const FAQ_ITEMS = [
  {
    question: 'How do I choose the right supplement for my goal?',
    answer: 'Start with your actual goal: muscle gain, recovery, daily protein intake, or workout energy. Choose one product that clearly supports that goal instead of buying several products at once.'
  },
  {
    question: 'Can supplements replace meals?',
    answer: 'No. Supplements are support tools. Your main nutrition should still come from balanced meals, enough protein, hydration, and overall calorie control.'
  },
  {
    question: 'How soon will I see results?',
    answer: 'That depends on consistency. Products help most when training, sleep, food quality, and dosage are stable over time.'
  },
  {
    question: 'Do you offer help before ordering?',
    answer: 'Yes. Use the contact form and tell us your goal, training level, and the type of product you are considering. We can guide you toward a more practical choice.'
  }
];

const INITIAL_FORM = {
  name: '',
  email: '',
  subject: '',
  message: ''
};

const INITIAL_ERRORS = {
  name: '',
  email: '',
  subject: '',
  message: ''
};

const Contact = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const validateField = (name, value) => {
    const trimmedValue = String(value ?? '').trim();

    if (name === 'name') {
      if (!isNonEmpty(trimmedValue)) return 'Please enter your name.';
      if (trimmedValue.length < 2) return 'Name must be at least 2 characters.';
      return '';
    }

    if (name === 'email') {
      if (!isNonEmpty(trimmedValue)) return 'Please enter your email address.';
      if (!isValidEmail(trimmedValue)) return 'Please enter a valid email address.';
      return '';
    }

    if (name === 'subject') {
      if (!isNonEmpty(trimmedValue)) return 'Please enter a subject.';
      if (trimmedValue.length < 3) return 'Subject must be at least 3 characters.';
      return '';
    }

    if (name === 'message') {
      if (!isNonEmpty(trimmedValue)) return 'Please enter your message.';
      if (trimmedValue.length < 10) return 'Message must be at least 10 characters.';
      return '';
    }

    return '';
  };

  const validateForm = () => {
    const nextErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      subject: validateField('subject', formData.subject),
      message: validateField('message', formData.message)
    };

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setError('');
    setSuccess('');
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setErrors(INITIAL_ERRORS);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send your message');
      }

      setSuccess(data.message || 'Your message has been sent successfully.');
      setFormData(INITIAL_FORM);
      setErrors(INITIAL_ERRORS);
    } catch (err) {
      setError(err.message || 'Failed to send your message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-page">
      <div className="content-shell">
        <section className="contact-layout">
          <div className="content-panel contact-form-panel">
            <h2>Send Us a Message</h2>
            <p className="content-lead">
              We read every inquiry and reply as quickly as possible.
            </p>

            {success && <div className="contact-alert success">{success}</div>}
            {error && <div className="contact-alert error">{error}</div>}

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div className="contact-field">
                  <label htmlFor="contact-name">Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Your full name"
                    className={errors.name ? 'is-invalid' : ''}
                  />
                  {errors.name && <span className="contact-field-error">{errors.name}</span>}
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="you@example.com"
                    className={errors.email ? 'is-invalid' : ''}
                  />
                  {errors.email && <span className="contact-field-error">{errors.email}</span>}
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="contact-subject">Subject</label>
                <input
                  id="contact-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="How can we help?"
                  className={errors.subject ? 'is-invalid' : ''}
                />
                {errors.subject && <span className="contact-field-error">{errors.subject}</span>}
              </div>

              <div className="contact-field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Tell us your question, goal, or order concern."
                  className={errors.message ? 'is-invalid' : ''}
                />
                {errors.message && <span className="contact-field-error">{errors.message}</span>}
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          <div className="content-panel contact-side-panel" id="faq">
            <div className="faq-section">
              <h2>Frequently Asked Questions</h2>
              <div className="faq-list">
                {FAQ_ITEMS.map((item, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div key={item.question} className="faq-item">
                      <button
                        type="button"
                        className="faq-question"
                        onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                      >
                        <span>{item.question}</span>
                        <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && <div className="faq-answer">{item.answer}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Contact;
