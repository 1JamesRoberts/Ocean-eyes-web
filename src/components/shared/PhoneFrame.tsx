import React from 'react';
import { StatusBar } from './StatusBar';

interface PhoneFrameProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, navigation }) => {
  return (
    <div className="phone-frame-root">
      <div className="phone-frame">
        <StatusBar />

        <div className="phone-content">
          {children}
        </div>

        {navigation}
      </div>
    </div>
  );
};
