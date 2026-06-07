import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('oceaneyes_darkmode');
    return saved ? saved === 'true' : false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('oceaneyes_darkmode', isDarkMode ? 'true' : 'false');
  }, [isDarkMode]);

  return { isDarkMode, setIsDarkMode };
};
