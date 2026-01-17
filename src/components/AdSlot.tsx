'use client';

interface AdSlotProps {
    slotId: string;
    format?: 'horizontal' | 'vertical' | 'rectangle' | 'responsive';
    className?: string;
}

/**
 * Google AdSense ad slot placeholder component.
 * Replace the placeholder with actual AdSense code after approval.
 *
 * To insert real AdSense ads:
 * 1. Get approved by Google AdSense
 * 2. Create ad units in AdSense dashboard
 * 3. Replace the placeholder content with the ad code
 *
 * Common sizes:
 * - horizontal: 728x90 (leaderboard)
 * - vertical: 160x600 (wide skyscraper)
 * - rectangle: 300x250 (medium rectangle)
 * - responsive: auto-sized
 */
export function AdSlot({ slotId, format = 'responsive', className = '' }: AdSlotProps) {
    // In production, this component will be populated by Google AdSense
    // The placeholder is invisible until AdSense code is integrated

    return (
        <div
            className={`print:hidden ${className}`}
            data-ad-slot={slotId}
            data-ad-format={format}
            aria-hidden="true"
        >
            {/*
                Replace this comment with actual AdSense code after approval:

                <ins className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                    data-ad-slot="XXXXXXXXXX"
                    data-ad-format="auto"
                    data-full-width-responsive="true" />

                <script>
                    (adsbygoogle = window.adsbygoogle || []).push({});
                </script>
            */}
        </div>
    );
}
