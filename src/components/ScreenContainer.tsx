import React from 'react';

export default function ScreenContainer({ children }: { children: React.ReactNode }) {
  return <div className="screen">{children}</div>;
}
