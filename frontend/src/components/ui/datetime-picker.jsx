"use client";

import * as React from "react";
import { add, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

// ---------------------------------------------------------------------------
// Time picker utilities
// ---------------------------------------------------------------------------

function isValidHour(value) {
  return /^(0[0-9]|1[0-9]|2[0-3])$/.test(value);
}

function isValidMinuteOrSecond(value) {
  return /^[0-5][0-9]$/.test(value);
}

function getValidNumber(value, { max, min = 0, loop = false }) {
  let n = parseInt(value, 10);
  if (!isNaN(n)) {
    if (!loop) {
      if (n > max) n = max;
      if (n < min) n = min;
    } else {
      if (n > max) n = min;
      if (n < min) n = max;
    }
    return String(n).padStart(2, "0");
  }
  return "00";
}

function getValidHour(value) {
  return isValidHour(value) ? value : getValidNumber(value, { max: 23 });
}

function getValidMinuteOrSecond(value) {
  return isValidMinuteOrSecond(value) ? value : getValidNumber(value, { max: 59 });
}

function getValidArrowNumber(value, { min, max, step }) {
  let n = parseInt(value, 10);
  if (!isNaN(n)) {
    n += step;
    return getValidNumber(String(n), { min, max, loop: true });
  }
  return "00";
}

function getValidArrowHour(value, step) {
  return getValidArrowNumber(value, { min: 0, max: 23, step });
}

function getValidArrowMinuteOrSecond(value, step) {
  return getValidArrowNumber(value, { min: 0, max: 59, step });
}

function setMinutesOnDate(date, value) {
  const d = new Date(date);
  d.setMinutes(parseInt(getValidMinuteOrSecond(value), 10));
  return d;
}

function setHoursOnDate(date, value) {
  const d = new Date(date);
  d.setHours(parseInt(getValidHour(value), 10));
  return d;
}

function getDateByType(date, type) {
  if (!date) return "00";
  if (type === "minutes") return getValidMinuteOrSecond(String(date.getMinutes()));
  if (type === "hours") return getValidHour(String(date.getHours()));
  return "00";
}

function getArrowByType(value, step, type) {
  if (type === "minutes") return getValidArrowMinuteOrSecond(value, step);
  if (type === "hours") return getValidArrowHour(value, step);
  return "00";
}

function setDateByType(date, value, type) {
  if (type === "minutes") return setMinutesOnDate(date, value);
  if (type === "hours") return setHoursOnDate(date, value);
  return date;
}

// ---------------------------------------------------------------------------
// TimePickerInput
// ---------------------------------------------------------------------------

const TimePickerInput = React.forwardRef(
  (
    {
      className,
      type = "tel",
      value,
      id,
      name,
      date,
      setDate,
      onChange,
      onKeyDown,
      picker,
      onLeftFocus,
      onRightFocus,
      ...props
    },
    ref
  ) => {
    const [flag, setFlag] = React.useState(false);

    React.useEffect(() => {
      if (flag) {
        const timer = setTimeout(() => setFlag(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [flag]);

    const calculatedValue = React.useMemo(
      () => getDateByType(date, picker),
      [date, picker]
    );

    const calculateNewValue = (key) =>
      !flag ? "0" + key : calculatedValue.slice(1, 2) + key;

    const handleKeyDown = (e) => {
      if (e.key === "Tab") return;
      e.preventDefault();
      if (e.key === "ArrowRight") onRightFocus?.();
      if (e.key === "ArrowLeft") onLeftFocus?.();
      if (["ArrowUp", "ArrowDown"].includes(e.key)) {
        const step = e.key === "ArrowUp" ? 1 : -1;
        const newValue = getArrowByType(calculatedValue, step, picker);
        if (flag) setFlag(false);
        const base = date ?? new Date(new Date().setHours(0, 0, 0, 0));
        setDate(setDateByType(base, newValue, picker));
      }
      if (e.key >= "0" && e.key <= "9") {
        const newValue = calculateNewValue(e.key);
        if (flag) onRightFocus?.();
        setFlag((prev) => !prev);
        const base = date ?? new Date(new Date().setHours(0, 0, 0, 0));
        setDate(setDateByType(base, newValue, picker));
      }
    };

    return (
      <Input
        ref={ref}
        id={id || picker}
        name={name || picker}
        className={cn(
          "w-[48px] text-center font-mono text-base tabular-nums caret-transparent focus:bg-accent focus:text-accent-foreground [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        value={value || calculatedValue}
        onChange={(e) => {
          e.preventDefault();
          onChange?.(e);
        }}
        type={type}
        inputMode="decimal"
        onKeyDown={(e) => {
          onKeyDown?.(e);
          handleKeyDown(e);
        }}
        {...props}
      />
    );
  }
);

TimePickerInput.displayName = "TimePickerInput";

// ---------------------------------------------------------------------------
// TimePicker (hours + minutes)
// ---------------------------------------------------------------------------

function TimePicker({ date, setDate }) {
  const minuteRef = React.useRef(null);
  const hourRef = React.useRef(null);

  return (
    <div className="flex items-end gap-2">
      <div className="grid gap-1 text-center">
        <Label htmlFor="hours" className="text-xs">
          Hora
        </Label>
        <TimePickerInput
          picker="hours"
          date={date}
          setDate={setDate}
          ref={hourRef}
          onRightFocus={() => minuteRef.current?.focus()}
        />
      </div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes" className="text-xs">
          Min
        </Label>
        <TimePickerInput
          picker="minutes"
          date={date}
          setDate={setDate}
          ref={minuteRef}
          onLeftFocus={() => hourRef.current?.focus()}
        />
      </div>
      <div className="flex h-10 items-center">
        <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateTimePicker (controlled)
// ---------------------------------------------------------------------------

export function DateTimePicker({ value, onChange, className }) {
  const [open, setOpen] = React.useState(false);

  /**
   * Carry over the current time when the user picks a new day
   * instead of resetting to 00:00.
   */
  const handleSelect = (newDay) => {
    if (!newDay) return;
    if (!value) {
      onChange?.(newDay);
      return;
    }
    const diff = newDay.getTime() - value.getTime();
    const diffInDays = diff / (1000 * 60 * 60 * 24);
    const newDateFull = add(value, { days: Math.ceil(diffInDays) });
    onChange?.(newDateFull);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "PPP HH:mm", { locale: ptBR })
          ) : (
            <span>Selecionar data e hora</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-3 border-b border-border">
          <TimePicker setDate={onChange} date={value} />
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => handleSelect(d)}
        />
      </PopoverContent>
    </Popover>
  );
}
