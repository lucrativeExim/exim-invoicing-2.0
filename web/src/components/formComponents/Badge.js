import React from 'react';

const Badge = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantClasses = {
    draft: 'bg-blue-500 text-white',
    proforma: 'bg-green-500 text-white',
    canceled: 'bg-red-500 text-white',
    default: 'bg-gray-500 text-white',
  };

  const baseClasses = 'px-2 py-0.5 rounded text-xs font-medium uppercase';

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;
