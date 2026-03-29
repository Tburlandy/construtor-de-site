import { ReactNode } from 'react';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-in' | 'fade-in-up' | 'scale-in' | 'slide-in-left' | 'slide-in-right';
  delay?: number;
  threshold?: number;
}

export const RevealOnScroll = ({
  children,
  className,
  animation = 'fade-in-up',
  delay = 0,
  threshold = 0.1,
}: RevealOnScrollProps) => {
  const { ref, isVisible } = useReveal({ threshold });

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700',
        !isVisible && 'opacity-0 translate-y-8',
        isVisible && 'opacity-100 translate-y-0',
        className
      )}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
};
