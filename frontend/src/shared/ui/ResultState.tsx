import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ResultStateProps {
  title: string;
  message: ReactNode;
  icon?: LucideIcon;
  headingLevel?: 1 | 2;
  /** Announce failures immediately; empty results are ordinary content. */
  alert?: boolean;
  /** Recovery actions such as retry, reset, or return. */
  children?: ReactNode;
}

export default function ResultState({
  title,
  message,
  icon: Icon,
  headingLevel = 2,
  alert = false,
  children,
}: ResultStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="result-state" role={alert ? 'alert' : undefined}>
      {Icon && <Icon aria-hidden="true" />}
      <Heading>{title}</Heading>
      <p>{message}</p>
      {children}
    </div>
  );
}
