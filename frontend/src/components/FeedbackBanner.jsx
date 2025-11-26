import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const iconColors = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-sky-500'
};

const variantMap = {
  success: 'success',
  error: 'destructive',
  warning: 'warning',
  info: 'info'
};

export default function FeedbackBanner({ feedback, onDismiss }) {
  if (!feedback) {
    return null;
  }

  const Icon = icons[feedback.type] || Info;
  const colorClass = iconColors[feedback.type] || iconColors.info;
  const variant = variantMap[feedback.type] || 'info';

  return (
    <Alert
      variant={variant}
      className="flex items-start justify-between gap-4"
    >
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
        <div>
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {feedback.message}
          </AlertDescription>
        </div>
      </div>
      {onDismiss && (
        <Button variant="ghost" size="icon" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}

