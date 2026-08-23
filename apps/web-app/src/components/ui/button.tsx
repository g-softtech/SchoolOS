import React from 'react';
export const Button = ({ children, className, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string, size?: string }) => <button className={className} {...props}>{children}</button>;
