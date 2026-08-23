import React from 'react';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} className="w-full border rounded px-3 py-2" {...props} />);
Input.displayName = "Input";
