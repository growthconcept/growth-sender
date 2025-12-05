import { useState, useEffect } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './Calendar';
import { Button } from './Button';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export const DateRangePicker = ({ dateFrom, dateTo, onDateFromChange, onDateToChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState({ from: null, to: null });

  // Inicializar tempRange quando dateFrom/dateTo mudarem externamente
  useEffect(() => {
    setTempRange({
      from: dateFrom ? new Date(dateFrom) : null,
      to: dateTo ? new Date(dateTo) : null
    });
  }, [dateFrom, dateTo]);

  const handleDateSelect = (date) => {
    if (!date) return;

    const selectedDate = startOfDay(date);

    // Se não há data inicial ou ambas estão selecionadas, começar novo intervalo
    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      setTempRange({ from: selectedDate, to: null });
    }
    // Se há data inicial mas não final
    else if (tempRange.from && !tempRange.to) {
      // Se a data selecionada é anterior à inicial, trocar
      if (isBefore(selectedDate, tempRange.from)) {
        setTempRange({ from: selectedDate, to: tempRange.from });
      } else {
        setTempRange({ ...tempRange, to: selectedDate });
      }
    }
  };

  // Aplicar filtro apenas quando ambas as datas estiverem selecionadas
  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      onDateFromChange?.(format(tempRange.from, 'yyyy-MM-dd'));
      onDateToChange?.(format(tempRange.to, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  // Limpar seleção temporária ao fechar sem aplicar
  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Resetar para valores atuais se não aplicou
      setTempRange({
        from: dateFrom ? new Date(dateFrom) : null,
        to: dateTo ? new Date(dateTo) : null
      });
    }
  };

  const handleClear = () => {
    setTempRange({ from: null, to: null });
    onClear?.();
    setOpen(false);
  };

  const getDisplayText = () => {
    if (dateFrom && dateTo) {
      return `${format(new Date(dateFrom), "dd 'de' MMM", { locale: ptBR })} - ${format(new Date(dateTo), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`;
    }
    if (dateFrom) {
      return `A partir de ${format(new Date(dateFrom), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`;
    }
    return 'Selecione um período';
  };

  const isRangeComplete = tempRange.from && tempRange.to;

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className={dateFrom || dateTo ? '' : 'text-muted-foreground'}>
              {getDisplayText()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            <Calendar
              mode="range"
              range={tempRange}
              onSelect={handleDateSelect}
            />
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!dateFrom && !dateTo}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={!isRangeComplete}
              >
                Aplicar
              </Button>
            </div>
            {!isRangeComplete && tempRange.from && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Selecione a data final
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
