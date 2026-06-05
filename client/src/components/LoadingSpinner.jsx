import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'default', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className={`${sizeClasses[size]} mb-4 animate-spin text-cyan-200`} aria-hidden="true" />
      <div className="text-sm font-medium text-zinc-300">{text}</div>
    </div>
  );
};

export default LoadingSpinner;
