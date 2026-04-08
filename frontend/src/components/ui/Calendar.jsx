import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday, isAfter, isBefore, isWithinInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const Calendar = ({ mode = 'single', selected, range, onSelect, className = '' }) => {
  // Inicializar no mês da data selecionada ou do início do range
  const getInitialMonth = () => {
    if (mode === 'range' && range?.from) {
      return range.from;
    }
    if (mode === 'single' && selected) {
      return selected;
    }
    return new Date();
  };
  
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
  
  // Atualizar mês quando range ou selected mudarem
  React.useEffect(() => {
    if (mode === 'range' && range?.from) {
      setCurrentMonth(range.from);
    } else if (mode === 'single' && selected) {
      setCurrentMonth(selected);
    }
  }, [range?.from, selected, mode]);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });

  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handleDateClick = (date) => {
    if (mode === 'single') {
      onSelect?.(date);
    } else if (mode === 'range') {
      onSelect?.(date);
    }
  };

  const isSelected = (date) => {
    if (mode === 'single') {
      if (!selected) return false;
      return isSameDay(date, selected);
    } else if (mode === 'range') {
      if (!range || !range.from) return false;
      if (range.from && !range.to) {
        return isSameDay(date, range.from);
      }
      if (range.from && range.to) {
        return isSameDay(date, range.from) || isSameDay(date, range.to);
      }
    }
    return false;
  };

  const isInRange = (date) => {
    if (mode !== 'range' || !range || !range.from || !range.to) return false;
    // Usar startOfDay para garantir comparação correta
    const dateStart = startOfDay(date);
    const rangeStart = startOfDay(range.from);
    const rangeEnd = startOfDay(range.to);
    // Verificar se está dentro do intervalo (excluindo início e fim que são tratados separadamente)
    return (isAfter(dateStart, rangeStart) && isBefore(dateStart, rangeEnd)) ||
           isWithinInterval(dateStart, { start: rangeStart, end: rangeEnd });
  };

  const isRangeStart = (date) => {
    if (mode !== 'range' || !range || !range.from) return false;
    return isSameDay(date, range.from);
  };

  const isRangeEnd = (date) => {
    if (mode !== 'range' || !range || !range.to) return false;
    return isSameDay(date, range.to);
  };

  return (
    <div className={`bg-background rounded-lg border shadow-sm p-4 ${className}`}>
      {/* Header com navegação */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isSelectedDate = isSelected(date);
          const isTodayDate = isToday(date);
          const inRange = isInRange(date);
          const rangeStart = isRangeStart(date);
          const rangeEnd = isRangeEnd(date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!isCurrentMonth}
              className={`
                h-10 w-10 rounded-md text-sm font-medium transition-colors relative
                ${!isCurrentMonth ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-accent'}
                ${isSelectedDate ? 'bg-primary text-primary-foreground hover:bg-primary/90 z-10' : ''}
                ${inRange && !isSelectedDate ? 'bg-primary/20' : ''}
                ${rangeStart ? 'rounded-l-md' : ''}
                ${rangeEnd ? 'rounded-r-md' : ''}
                ${isTodayDate && !isSelectedDate ? 'bg-accent font-semibold' : ''}
                ${isCurrentMonth && !isSelectedDate && !isTodayDate && !inRange ? 'hover:bg-accent' : ''}
              `}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

