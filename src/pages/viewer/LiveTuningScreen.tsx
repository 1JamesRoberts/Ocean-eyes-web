import React from 'react';
import { LiveVideoSection } from '../../components/settings/LiveVideoSection';

export const LiveTuningScreen: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <LiveVideoSection />
      </section>
    </div>
  );
};
