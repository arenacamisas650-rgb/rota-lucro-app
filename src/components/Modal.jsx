import React, { useEffect } from 'react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  maxHeight = '90vh'
}) => {
  // Impede rolagem do background se o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="custom-modal active" style={{ zIndex: 9999 }}>
      <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}></div>
      <div className={`modal-content ${className}`} style={{ maxHeight, overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{title}</h3>
          {onClose && (
            <button className="btn-close-modal" onClick={onClose}>
              <i className="bx bx-x"></i>
            </button>
          )}
        </div>
        <div className="modal-body" style={{ padding: '16px 0 0 0' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
export default Modal;
