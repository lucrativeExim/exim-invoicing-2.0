import React from 'react';

const Button = ({
  type = 'button',
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  className = '',
  size = 'md',
  ...props
}) => {
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const classes = `${variantClasses[variant]} ${sizeClasses[size]} ${className} ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`.trim();

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
