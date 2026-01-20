'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, MessageSquare, Mail, HelpCircle } from 'lucide-react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        type: '',
        message: '',
        email: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [feedbackId, setFeedbackId] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.type || !formData.message) {
            setSubmitStatus('error');
            setErrorMessage('יש למלא את כל שדות החובה');
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                setFeedbackId(data.feedbackId || '');
                setSubmitStatus('success');
                setFormData({ type: '', message: '', email: '' });
            } else {
                const data = await response.json();
                setSubmitStatus('error');
                setErrorMessage(data.error || 'שגיאה בשליחת המשוב');
            }
        } catch {
            setSubmitStatus('error');
            setErrorMessage('שגיאה בשליחת המשוב, נסו שוב מאוחר יותר');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSubmitStatus('idle');
        setErrorMessage('');
        setFeedbackId('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-12">
            <div className="container-custom">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
                        <Mail className="w-8 h-8 text-orange-600" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">צור קשר</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        יש לכם שאלה, הצעה לשיפור או משוב? נשמח לשמוע מכם!
                    </p>
                </div>

                <div className="max-w-2xl mx-auto">
                    {/* Contact Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-blue-100 p-2 rounded-xl">
                                    <MessageSquare className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-slate-800">משוב והצעות</h3>
                            </div>
                            <p className="text-sm text-slate-600">
                                שתפו אותנו ברעיונות לשיפור האתר או תרגילים חדשים
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-red-100 p-2 rounded-xl">
                                    <HelpCircle className="w-5 h-5 text-red-600" />
                                </div>
                                <h3 className="font-bold text-slate-800">דיווח על תקלה</h3>
                            </div>
                            <p className="text-sm text-slate-600">
                                נתקלתם בבעיה? ספרו לנו ונטפל בזה במהירות
                            </p>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        {submitStatus === 'success' ? (
                            <div className="text-center py-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">תודה על הפנייה!</h3>
                                <p className="text-slate-600 mb-4">קיבלנו את ההודעה שלכם ונחזור אליכם בהקדם.</p>
                                {feedbackId && (
                                    <p className="text-sm bg-orange-50 text-orange-700 px-4 py-2 rounded-lg inline-block mb-6">
                                        מספר פנייה: <span className="font-bold">{feedbackId}</span>
                                    </p>
                                )}
                                <div>
                                    <button
                                        onClick={resetForm}
                                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                                    >
                                        שליחת פנייה נוספת
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        סוג הפנייה <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white text-slate-800"
                                        required
                                    >
                                        <option value="">בחרו סוג פנייה</option>
                                        <option value="general">משוב כללי</option>
                                        <option value="bug">דיווח על תקלה</option>
                                        <option value="suggestion">הצעה לשיפור</option>
                                    </select>
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        תיאור הפנייה <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        rows={5}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none text-slate-800"
                                        placeholder="ספרו לנו במה נוכל לעזור..."
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        אימייל לחזרה <span className="text-slate-400">(אופציונלי)</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-slate-800"
                                        placeholder="your@email.com"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        השאירו אימייל אם תרצו שנחזור אליכם עם תשובה
                                    </p>
                                </div>

                                {/* Error message */}
                                {submitStatus === 'error' && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            שולח...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            שליחת הפנייה
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
