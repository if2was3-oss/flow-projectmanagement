import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCheck,
  Circle,
  Folder,
  Globe2,
  LoaderCircle,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { Member, Priority, Project, Status } from '../lib/types';
import { priorities, statuses } from '../lib/types';
import { initials } from '../lib/utils';
export function Avatar({
  member,
  size = 'sm',
}: {
  member?: Member;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: member?.color || '#e9ecef' }}
      title={member?.name || 'Nincs felelős'}
    >
      {member ? initials(member.name) : '–'}
    </span>
  );
}
export function PriorityBadge({ value }: { value: Priority }) {
  const Icon = value === 'high' ? ArrowUp : value === 'low' ? ArrowDown : ArrowRight;
  return (
    <span className={`priority priority-${value}`}>
      <Icon size={12} />
      {priorities[value]}
    </span>
  );
}
export function StatusBadge({ value }: { value: Status }) {
  return (
    <span className={`status status-${value}`}>
      <span />
      {statuses[value]}
    </span>
  );
}
export function ProjectIcon({ project, small = false }: { project: Project; small?: boolean }) {
  const Icon =
    project.icon === 'sparkles'
      ? Sparkles
      : project.icon === 'palette'
        ? Palette
        : project.icon === 'globe'
          ? Globe2
          : Folder;
  return (
    <span className={`project-icon ${project.color} ${small ? 'small' : ''}`}>
      <Icon size={small ? 17 : 23} strokeWidth={1.65} />
    </span>
  );
}
export function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex="0"]',
        ) || [],
      ).filter((el) => !el.hasAttribute('disabled'));
    (
      ref.current?.querySelector<HTMLElement>('input:not([type=checkbox]),textarea,select') ||
      focusable()[0]
    )?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const elements = focusable();
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Bezárás" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Submit({ busy, children = 'Mentés' }: { busy: boolean; children?: ReactNode }) {
  return (
    <button type="submit" className="button primary" disabled={busy}>
      {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{' '}
      {busy ? 'Mentés…' : children}
    </button>
  );
}
export function TaskCircle({
  status,
  onClick,
  title,
}: {
  status: Status;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`task-circle ${status === 'done' ? 'completed' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${status === 'done' ? 'Újranyitás' : 'Befejezés'}: ${title}`}
    >
      {status === 'done' ? (
        <CheckCheck size={16} />
      ) : status === 'in_progress' ? (
        <Circle size={16} className="half-circle" />
      ) : (
        <Circle size={16} />
      )}
    </button>
  );
}
