import React from 'react';
export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning';
    message: string;
}
interface ToastContextType {
    addToast: (type: ToastMessage['type'], message: string) => void;
}
export declare const ToastContext: React.Context<ToastContextType>;
export declare function ToastProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useToast(): ToastContextType;
export {};
//# sourceMappingURL=Toast.d.ts.map