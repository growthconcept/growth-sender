import { useCallback, useEffect, useState } from 'react';

const defaultTitles = {
  success: 'Sucesso!',
  error: 'Erro!',
  warning: 'Atenção!',
  info: 'Informação'
};

export function useFeedback(autoHideMs = 5000) {
  const [feedback, setFeedback] = useState(null);

  const showFeedback = useCallback((type, message, title) => {
    setFeedback({
      type,
      message,
      title: title || defaultTitles[type] || defaultTitles.info
    });
  }, []);

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!feedback || !autoHideMs) {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, autoHideMs);

    return () => clearTimeout(timeout);
  }, [feedback, autoHideMs]);

  return {
    feedback,
    showFeedback,
    dismissFeedback
  };
}

