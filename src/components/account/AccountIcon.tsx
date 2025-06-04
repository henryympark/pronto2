"use client";

import { forwardRef } from 'react';
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from '@/lib/utils';
import { useAccountNavigation } from '@/domains/auth/hooks/useAccountNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { NAVIGATION_LABELS } from '@/lib/constants/navigation';

const accountIconVariants = cva(
  "relative flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 font-semibold uppercase",
  {
    variants: {
      variant: {
        authenticated: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          "focus-visible:ring-primary",
        ],
        unauthenticated: [
          "bg-muted text-muted-foreground border border-input",
          "hover:bg-muted/80 hover:text-foreground",
          "focus-visible:ring-ring",
        ],
      },
      size: {
        sm: "h-[35px] w-[35px] text-sm",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-[48px] w-[48px] text-base",
      },
      state: {
        default: "",
        loading: "animate-pulse",
        navigating: "opacity-70 pointer-events-none",
        disabled: "opacity-50 cursor-not-allowed pointer-events-none",
      }
    },
    defaultVariants: {
      variant: "unauthenticated",
      size: "md",
      state: "default",
    },
  },
);

export interface AccountIconProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof accountIconVariants> {
  showTooltip?: boolean;
  className?: string;
  onAfterClick?: () => void;
}

export const AccountIcon = forwardRef<HTMLButtonElement, AccountIconProps>(
  ({ className, size, showTooltip = true, onAfterClick, onClick, ...props }, ref) => {
    const { user, loading } = useAuth();
    const { handleAccountClick, isNavigating, canNavigate, navigationTarget } = useAccountNavigation();

    // 상태에 따른 variant 결정
    const variant = user ? 'authenticated' : 'unauthenticated';
    
    // 현재 상태 결정
    const currentState = loading 
      ? 'loading' 
      : isNavigating 
        ? 'navigating' 
        : !canNavigate 
          ? 'disabled' 
          : 'default';

    // 툴팁 텍스트 결정
    const tooltipText = loading 
      ? NAVIGATION_LABELS.LOADING 
      : user 
        ? NAVIGATION_LABELS.MY_PAGE 
        : NAVIGATION_LABELS.LOGIN;

    // aria-label 결정
    const ariaLabel = `${tooltipText}로 이동`;

    // 통합 클릭 핸들러
    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      // 기본 onClick 먼저 실행
      if (onClick) {
        onClick(event);
      }
      
      // 네비게이션 실행
      await handleAccountClick();
      
      // 네비게이션 후 콜백 실행
      if (onAfterClick) {
        onAfterClick();
      }
    };

    // 키보드 네비게이션 핸들러 추가
    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick(event as any);
      }
    };

    return (
      <div className="relative inline-block group">
        <button
          ref={ref}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={!canNavigate}
          aria-label={ariaLabel}
          aria-describedby={showTooltip ? `tooltip-${tooltipText.replace(/\s+/g, '-')}` : undefined}
          role="button"
          tabIndex={0}
          className={cn(
            accountIconVariants({ variant, size, state: currentState }),
            className
          )}
          {...props}
        >
          {/* 로딩 스피너 */}
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className={cn(
                  "border-2 border-current border-t-transparent rounded-full animate-spin",
                  size === "sm" ? "h-4 w-4" : 
                  size === "xl" ? "h-6 w-6" :
                  size === "lg" ? "h-5 w-5" : "h-4 w-4"
                )}
                aria-label="로딩 중"
                role="status"
              />
            </div>
          ) : (
            /* MY 텍스트 */
            <span className="select-none" aria-hidden="true">MY</span>
          )}

          {/* 네비게이션 중 인디케이터 */}
          {isNavigating && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-current/10 rounded-full">
              <div 
                className={cn(
                  "border-2 border-current border-t-transparent rounded-full animate-spin opacity-60",
                  size === "sm" ? "h-4 w-4" : 
                  size === "xl" ? "h-6 w-6" :
                  size === "lg" ? "h-5 w-5" : "h-4 w-4"
                )}
                aria-label="페이지 이동 중"
                role="status"
              />
            </div>
          )}
        </button>

        {/* 툴팁 */}
        {showTooltip && !loading && (
          <div 
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-50"
            id={`tooltip-${tooltipText.replace(/\s+/g, '-')}`}
            role="tooltip"
            aria-live="polite"
          >
            <div className="bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap shadow-md border">
              {tooltipText}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-l border-t rotate-45" />
            </div>
          </div>
        )}
      </div>
    );
  }
);

AccountIcon.displayName = 'AccountIcon'; 