import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateFeedbackId(): string {
    const now = new Date();
    const date = now.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FB-${date}-${random}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, message, email } = body;

        if (!type || !message) {
            return NextResponse.json(
                { error: 'סוג הפנייה והתיאור הם שדות חובה' },
                { status: 400 }
            );
        }

        const feedbackId = generateFeedbackId();

        const typeLabels: Record<string, string> = {
            general: 'משוב כללי',
            bug: 'דיווח על תקלה',
            suggestion: 'הצעה לשיפור',
        };

        const { error } = await resend.emails.send({
            from: 'דפי עבודה חכמים <onboarding@resend.dev>',
            to: 'benatia.asaf@gmail.com',
            subject: `[${feedbackId}] משוב חדש: ${typeLabels[type] || type}`,
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #f97316;">משוב חדש מהאתר</h2>
                    <p style="background: #fef3c7; padding: 10px; border-radius: 8px; display: inline-block;"><strong>מספר פנייה:</strong> ${feedbackId}</p>
                    <p><strong>סוג הפנייה:</strong> ${typeLabels[type] || type}</p>
                    <p><strong>תיאור:</strong></p>
                    <p style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${message}</p>
                    ${email ? `<p><strong>אימייל לחזרה:</strong> ${email}</p>` : '<p><em>לא צוין אימייל לחזרה</em></p>'}
                </div>
            `,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json(
                { error: 'שגיאה בשליחת המייל' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, feedbackId });
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json(
            { error: 'שגיאה בשרת' },
            { status: 500 }
        );
    }
}
