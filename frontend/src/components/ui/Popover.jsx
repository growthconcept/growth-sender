import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const Popover = ({ open, onOpenChange, children }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
  }, [open]);

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
          className="fixed z-50"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
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
    <div className={`bg-white rounded-md border shadow-md p-1 ${className}`}>
      {children}
    </div>
  );
};

