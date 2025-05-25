import * as React from "react"

import { cn } from "@/shared/utils"

const Card = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const computedClassName = React.useMemo(() => cn(
    "rounded-lg border bg-card text-card-foreground shadow-sm",
    className
  ), [className]);
  
  return (
    <div
      ref={ref}
      className={computedClassName}
      {...props}
    />
  );
}));
Card.displayName = "Card"

const CardHeader = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const computedClassName = React.useMemo(() => cn(
    "flex flex-col space-y-1.5 p-6", 
    className
  ), [className]);
  
  return (
    <div
      ref={ref}
      className={computedClassName}
      {...props}
    />
  );
}));
CardHeader.displayName = "CardHeader"

const CardTitle = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const computedClassName = React.useMemo(() => cn(
    "text-2xl font-semibold leading-none tracking-tight",
    className
  ), [className]);
  
  return (
    <div
      ref={ref}
      className={computedClassName}
      {...props}
    />
  );
}));
CardTitle.displayName = "CardTitle"

const CardDescription = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const computedClassName = React.useMemo(() => cn(
    "text-sm text-muted-foreground", 
    className
  ), [className]);
  
  return (
    <div
      ref={ref}
      className={computedClassName}
      {...props}
    />
  );
}));
CardDescription.displayName = "CardDescription"

const CardContent = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const computedClassName = React.useMemo(() => cn(
    "p-6 pt-0", 
    className
  ), [className]);
  
  return (
    <div 
      ref={ref} 
      className={computedClassName} 
      {...props} 
    />
  );
}));
CardContent.displayName = "CardContent"

const CardFooter = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const computedClassName = React.useMemo(() => cn(
    "flex items-center p-6 pt-0", 
    className
  ), [className]);
  
  return (
    <div
      ref={ref}
      className={computedClassName}
      {...props}
    />
  );
}));
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }