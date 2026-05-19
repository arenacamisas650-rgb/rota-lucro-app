import React from 'react';

const PLATFORM_STYLES = {
  'Shopee': { color: 'var(--orange)', bg: 'rgba(255, 87, 34, 0.1)', border: 'rgba(255, 87, 34, 0.2)', icon: 'bxs-package' },
  'Amazon Flex': { color: 'var(--gold)', bg: 'rgba(255, 153, 0, 0.1)', border: 'rgba(255, 153, 0, 0.2)', icon: 'bxs-box' },
  'Mercado Livre': { color: 'var(--blue)', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', icon: 'bxs-truck' },
  'Lalamove': { color: '#FF8200', bg: 'rgba(255, 130, 0, 0.1)', border: 'rgba(255, 130, 0, 0.2)', icon: 'bx-cycling' },
  'Loggi': { color: '#00AEEF', bg: 'rgba(0, 174, 239, 0.1)', border: 'rgba(0, 174, 239, 0.2)', icon: 'bxs-navigation' },
  'Uber Flash': { color: 'var(--emerald)', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: 'bx-bolt-circle' },
  'Uber': { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', icon: 'bx-car' },
  '99': { color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.2)', icon: 'bx-taxi' },
  'InDrive': { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: 'bx-trip' },
  'Outra': { color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', icon: 'bx-question-mark' }
};

export const PlatformBadge = ({ platform, className = '' }) => {
  const style = PLATFORM_STYLES[platform] || PLATFORM_STYLES['Outra'];

  return (
    <span
      className={`platform-badge ${className}`}
      style={{
        color: style.color,
        backgroundColor: style.bg,
        borderColor: style.border,
        borderWidth: '1px',
        borderStyle: 'solid',
        padding: '3px 8px',
        borderRadius: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        fontWeight: '600'
      }}
    >
      <i className={`bx ${style.icon}`} style={{ fontSize: '0.9rem' }}></i>
      {platform}
    </span>
  );
};
export default PlatformBadge;
