import React, { useEffect, useState } from 'react';
import { Signal, Wifi, Battery } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const [time, setTime] = useState<string>(() => formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar">
      <div className="status-bar-notch" />
      <div className="status-bar-left">
        <span className="status-bar-time">{time}</span>
      </div>
      <div className="status-bar-right">
        <Signal size={16} className="status-bar-icon" strokeWidth={2.5} />
        <Wifi size={16} className="status-bar-icon" strokeWidth={2.5} />
        <div className="status-bar-battery">
          <Battery size={18} className="status-bar-battery-icon" strokeWidth={2.5} />
          <div className="status-bar-battery-fill" />
        </div>
      </div>
    </div>
  );
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}
