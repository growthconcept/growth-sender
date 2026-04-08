import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export const Popover = ({ open, onOpenChange, children }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const contentRef = useRef(null);
  const positionRef = useRef({ top: 0, left: 0 });

  const computePosition = () => {
    if (!triggerRef.current) return;
    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();
    const contentWidth = contentRef.current?.offsetWidth || 320;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceAbove > spaceBelow;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - contentWidth - 8));
    const top = openUpward ? Math.max(8, rect.top - (contentRef.current?.offsetHeight || 420) - 8) : rect.bottom + 8;
    const maxHeight = openUpward ? spaceAbove : spaceBelow;

    // Only update state if position actually changed to avoid infinite loops
    if (
      positionRef.current.top !== top ||
      positionRef.current.left !== left ||
      positionRef.current.maxHeight !== maxHeight
    ) {
      positionRef.current = { top, left, maxHeight };
      setPosition({ top, left, maxHeight });
    }
  };

  useEffect(() => {
    if (open) {
      computePosition();
    }
  }, [open]);

  useLayoutEffect(() => {
    if (open && contentRef.current) {
      // Reposition after content has rendered with actual dimensions
      computePosition();
    }
  });

  const handleClickOutside = (event) => {
    if (
      contentRef.current &&
      !contentRef.current.contains(event.target) &&
      triggerRef.current &&
      !triggerRef.current.contains(event.target)
    ) {
      onOpenChange?.(false);
    }
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  const childrenArray = React.Children.toArray(children);
  const trigger = childrenArray.find(child => child?.type === PopoverTrigger);
  const content = childrenArray.find(child => child?.type === PopoverContent);

  return (
    <>
      <div ref={triggerRef}>
        {trigger && React.cloneElement(trigger, {
          onClick: () => onOpenChange?.(!open)
        })}
      </div>
      {open && content && createPortal(
        <div
          ref={contentRef}
          className="fixed z-50 overflow-y-auto"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxHeight: position.maxHeight ? `${position.maxHeight}px` : undefined,
          }}
        >
          {React.cloneElement(content)}
        </div>,
        document.body
      )}
    </>
  );
};

export const PopoverTrigger = ({ asChild, children, ...props }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        props.onClick?.(e);
        children.props.onClick?.(e);
      }
    });
  }
  return <div {...props}>{children}</div>;
};

export const PopoverContent = ({ children, className = '', align = 'start', ...props }) => {
  return (
    <div className={`bg-background rounded-md border shadow-md p-1 ${className}`}>
      {children}
    </div>
  );
};

