// components/common/TurnstileWidget.tsx
// Cloudflare Turnstile bot verification widget.
// Silently absent when VITE_TURNSTILE_SITE_KEY is not set (local dev).

import React from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onVerify, onError, onExpire }) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  // Graceful: widget hidden when key not configured (local dev)
  if (!siteKey) return null;

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onVerify}
      onError={onError}
      onExpire={onExpire}
      options={{
        theme: 'dark',
        size: 'normal',
        appearance: 'always',
      }}
    />
  );
};

export default TurnstileWidget;
