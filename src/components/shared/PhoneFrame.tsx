import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, navigation }) => {
  return (
    <div className="phone-frame-root">
      <div className="phone-frame">
        <a
          href="#main-content"
          className="sr-only z-[80] rounded-full bg-white px-4 py-2 text-accent-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <div className="phone-content">
          {children}
        </div>

        {navigation}
      </div>
    </div>
  );
};
