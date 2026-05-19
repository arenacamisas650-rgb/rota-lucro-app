import React from 'react';

export const Button = ({
  children,
  onClick,
  variant = 'primary', // 'primary', 'secondary', 'glass', 'danger', 'block'
  type = 'button',
  disabled = false,
  icon = null,
  className = '',
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn btn-primary';
      case 'secondary': return 'btn btn-secondary';
      case 'glass': return 'btn btn-glass';
      case 'danger': return 'btn btn-danger';
      case 'text': return 'btn-text-icon';
      default: return 'btn btn-primary';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${getVariantClass()} ${className}`}
      {...props}
    >
      {icon && <i className={`bx ${icon} btn-icon-left`}></i>}
      {children}
    </button>
  );
};
export default Button;
