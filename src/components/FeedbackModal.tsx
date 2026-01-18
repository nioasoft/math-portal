'use client';

import { useState } from 'react';
import { X, Send, MessageSquare, Loader2, CheckCircle } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
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

    const handleClose = () => {
        setSubmitStatus('idle');
        setErrorMessage('');
        setFeedbackId('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-xl">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">שלחו לנו משוב</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="סגור"
                    >
                        <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
                    </button>
                </div>

                {submitStatus === 'success' ? (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">תודה על המשוב!</h3>
                        <p className="text-slate-600 mb-2">קיבלנו את ההודעה שלכם ונחזור אליכם בהקדם.</p>
                        {feedbackId && (
                            <p className="text-sm bg-orange-50 text-orange-700 px-3 py-2 rounded-lg inline-block mb-4">
                                מספר פנייה: <span className="font-bold">{feedbackId}</span>
                            </p>
                        )}
                        <div>
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                            >
                                סגור
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                סוג הפנייה <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white text-slate-800"
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
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                תיאור <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none text-slate-800"
                                placeholder="ספרו לנו מה עובר עליכם..."
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                אימייל לחזרה <span className="text-slate-400">(אופציונלי)</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-slate-800"
                                placeholder="your@email.com"
                            />
                        </div>

                        {/* Error message */}
                        {submitStatus === 'error' && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    שולח...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    שלח משוב
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
