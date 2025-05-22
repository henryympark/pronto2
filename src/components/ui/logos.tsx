"use client";

import React from "react";

interface LogoProps {
  className?: string;
}

export function KakaoLogo({ className }: LogoProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 4C7.03 4 3 7.03 3 10.77C3 13.09 4.58 15.12 6.94 16.3L5.82 20.16C5.75 20.38 5.99 20.57 6.18 20.45L10.62 17.62C11.07 17.67 11.53 17.7 12 17.7C16.97 17.7 21 14.67 21 10.77C21 7.03 16.97 4 12 4Z"
        fill="#371D1E"
      />
    </svg>
  );
}

export function NaverLogo({ className }: LogoProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16.273 12.845L7.376 0H0V24H7.727V11.155L16.624 24H24V0H16.273V12.845Z"
        fill="white"
      />
    </svg>
  );
} 