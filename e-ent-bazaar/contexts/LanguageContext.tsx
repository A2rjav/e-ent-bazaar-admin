import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
    country: string;
    flag: string;
    phoneCode: string;
}

interface LanguageContextType {
    lastSelectedLanguage: LanguageOption | null;
    setLastSelectedLanguage: (lang: LanguageOption | null) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
    return ctx;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [lastSelectedLanguage, setLastSelectedLanguage] = useState<LanguageOption | null>(null);
    return (
        <LanguageContext.Provider value={{ lastSelectedLanguage, setLastSelectedLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}; 