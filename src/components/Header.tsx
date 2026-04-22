import { useState, useEffect } from 'react';
import { colors, typography } from '../styles/tokens';

const BREAKPOINT = 1000;

export default function Header() {
    const [isNarrow, setIsNarrow] = useState(window.innerWidth < BREAKPOINT);

    useEffect(() => {
        const handleResize = () => setIsNarrow(window.innerWidth < BREAKPOINT);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <header style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: isNarrow ? '44px' : '8px',
            paddingRight: '24px',
            flexShrink: 0,
            transition: 'padding-left 0.25s ease',
        }}>
            {/* 로고 + 플랫폼명 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                    padding: '3px 0px 0px 6px',
                    fontSize: typography.size.ti,
                    fontWeight: typography.weight.regular,
                    color: colors.slate[500],
                    letterSpacing: '-0.01em',
                }}>
                    Plasma AI
                </span>
            </div>
        </header>
    );
}