"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { logError } from "@/lib/utils";

interface ErrorBoundaryProps {
  /** 에러 발생 시 표시할 대체 컴포넌트 */
  fallback?: ReactNode;
  /** 에러 발생 시 호출될 콜백 함수 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 에러 경계 내부에 렌더링할 자식 컴포넌트 */
  children: ReactNode;
}

interface ErrorBoundaryState {
  /** 에러 발생 여부 */
  hasError: boolean;
  /** 발생한 에러 객체 */
  error: Error | null;
}

/**
 * 에러 경계(Error Boundary) 컴포넌트
 * 
 * 자식 컴포넌트에서 발생하는 에러를 캐치하여 애플리케이션 전체가 중단되는 것을 방지합니다.
 * React의 Error Boundary 기능을 구현한 클래스 컴포넌트입니다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  /**
   * 자식 컴포넌트에서 에러가 발생했을 때 호출되는 정적 메서드
   * 에러 상태를 업데이트합니다.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  /**
   * 에러가 발생한 후 호출되는 생명주기 메서드
   * 에러 로깅 등의 부수 효과를 처리합니다.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 로깅
    logError(error, { componentStack: errorInfo.componentStack });
    
    // 사용자 정의 에러 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * 에러 상태를 초기화하고 컴포넌트를 다시 렌더링합니다.
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    // 에러가 발생한 경우
    if (this.state.hasError) {
      // 사용자 정의 fallback이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // 기본 에러 UI
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-red-200 bg-red-50 text-red-800 min-h-[200px] w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">문제가 발생했습니다</h2>
          <p className="text-sm text-center mb-4">
            컴포넌트 렌더링 중 오류가 발생했습니다.<br />
            {this.state.error?.message && (
              <span className="font-mono text-xs bg-red-100 px-2 py-1 rounded mt-2 block">
                {this.state.error.message}
              </span>
            )}
          </p>
          <Button 
            variant="outline" 
            className="flex items-center" 
            onClick={this.handleReset}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </div>
      );
    }

    // 에러가 없으면 자식 컴포넌트 렌더링
    return this.props.children;
  }
}

/**
 * 에러 경계를 사용하는 함수형 컴포넌트 래퍼
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
} 