import React from 'react';

export const Card = ({
  children,
  className = '',
  variant = 'default', // 'default', 'glass', 'glowing-blue', 'glowing-emerald', 'glowing-purple', 'glowing-gold'
  interactive = false,
  onClick,
  ...props
}) => {
  const getCardClasses = () => {
    let classes = 'summary-card';
    if (variant === 'glass') classes = 'glass-card';
    else if (variant.startsWith('glowing-')) {
      const color = variant.split('-')[1];
      classes = `summary-card glowing-card ${color}-theme`;
    }
    
    if (interactive) classes += ' interactive-card';
    return classes;
  };

  return (
    <div
      className={`${getCardClasses()} ${className}`}
      onClick={interactive ? onClick : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
