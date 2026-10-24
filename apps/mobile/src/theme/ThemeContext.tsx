import React, { createContext, useContext } from 'react';
import { AppTheme, CreamTheme } from '@imposter/shared';

interface ThemeContextType {
  theme: AppTheme;
  mode: 'cream' | 'sun' | 'night';
  toggleTheme: () => void;
  setMode: (mode: any) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: CreamTheme,
  mode: 'cream',
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider
      value={{
        theme: CreamTheme,
        mode: 'cream',
        toggleTheme: () => {},
        setMode: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
