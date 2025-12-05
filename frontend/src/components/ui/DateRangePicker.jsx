import { useState } from 'react';
import { format, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './Calendar';
import { Button } from './Button';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export const DateRangePicker = ({ dateFrom, dateTo, onDateFromChange, onDateToChange, onClear }) => {
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const handleFromSelect = (date) => {
    if (date) {
      onDateFromChange?.(format(date, 'yyyy-MM-dd'));
      setOpenFrom(false);
    }
  };

  const handleToSelect = (date) => {
    if (date) {
      // Validar que data final não é anterior à data inicial
      if (dateFrom && isBefore(date, new Date(dateFrom))) {
        return;
      }
      onDateToChange?.(format(date, 'yyyy-MM-dd'));
      setOpenTo(false);
    }
  };

  const getMinDate = () => {
    if (!dateFrom) return undefined;
    return new Date(dateFrom);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex-1 w-full">
        <label className="text-sm font-medium mb-2 block">Data Inicial</label>
        <Popover open={openFrom} onOpenChange={setOpenFrom}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? (
                format(new Date(dateFrom), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              ) : (
                <span className="text-muted-foreground">Selecione a data inicial</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom ? new Date(dateFrom) : undefined}
              onSelect={handleFromSelect}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 w-full">
        <label className="text-sm font-medium mb-2 block">Data Final</label>
        <Popover open={openTo} onOpenChange={setOpenTo}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              disabled={!dateFrom}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? (
                format(new Date(dateTo), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              ) : (
                <span className="text-muted-foreground">Selecione a data final</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo ? new Date(dateTo) : undefined}
              onSelect={handleToSelect}
            />
          </PopoverContent>
        </Popover>
      </div>

      {(dateFrom || dateTo) && (
        <div>
          <Button
            variant="outline"
            onClick={onClear}
            className="h-10"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
};

