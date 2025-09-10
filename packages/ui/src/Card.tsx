import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  padding?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'elevated' | 'outlined' | 'success' | 'warning' | 'error' | 'compliance';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  padding = 'medium',
  variant = 'default',
}) => {
  const paddingClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  };
  
  const variantClasses = {
    default: 'bg-white border border-secondary-200 shadow-soft',
    elevated: 'bg-white border-0 shadow-medium',
    outlined: 'bg-transparent border-2 border-secondary-200 shadow-none',
    success: 'bg-success-50 border border-success-200 shadow-soft',
    warning: 'bg-warning-50 border border-warning-200 shadow-soft',
    error: 'bg-error-50 border border-error-200 shadow-soft',
    compliance: 'bg-compliance-50 border border-compliance-200 shadow-soft',
  };
  
  return (
    <div className={`rounded-2xl ${paddingClasses[padding]} ${variantClasses[variant]} ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 font-sans">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
