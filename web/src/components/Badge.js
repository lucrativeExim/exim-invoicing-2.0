/**
 * Badge Component
 * A reusable badge component for displaying status indicators, labels, etc.
 * 
 * @param {string} children - The content to display in the badge
 * @param {string} variant - The variant/color scheme: 'primary', 'secondary', 'success', 'warning', 'danger', 'info', 'default'
 * @param {string} size - The size: 'sm', 'md', 'lg'
 * @param {string} className - Additional CSS classes
 */
export default function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  // Variant color mappings
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  // Size mappings
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const baseClasses = 'inline-flex items-center font-medium rounded-full border';
  const variantClass = variantClasses[variant] || variantClasses.default;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <span className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}>
      {children}
    </span>
  );
}

