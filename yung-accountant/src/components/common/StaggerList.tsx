import React from 'react';

interface StaggerListProps {
  /** Array of child elements */
  children: React.ReactNode[];
  /** Additional className for the wrapper */
  className?: string;
  /** Delay per child in ms (default 50) */
  staggerMs?: number;
  /** Animation class to apply (default 'animate-fade-in-up') */
  animationClass?: string;
}

/**
 * StaggerList — Wraps children and auto-applies staggered animation delays.
 * Replaces manual stagger-1 through stagger-8 className usage with
 * programmatic delay calculation for any number of children.
 */
const StaggerList: React.FC<StaggerListProps> = ({
  children,
  className = '',
  staggerMs = 50,
  animationClass = 'animate-fade-in-up',
}) => {
  const validChildren = React.Children.toArray(children);

  return (
    <div className={className}>
      {validChildren.map((child, index) => (
        <div
          key={index}
          className={animationClass}
          style={{
            animationDelay: `${index * staggerMs}ms`,
            opacity: 0,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export default StaggerList;
