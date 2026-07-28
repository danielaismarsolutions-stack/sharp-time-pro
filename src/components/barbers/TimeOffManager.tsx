import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TimeOff } from '@/types/barber';
import { Plus, Trash2, CalendarOff, Loader2, CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TimeOffManagerProps {
  timeOff: TimeOff[];
  onSave: (timeOff: TimeOff[]) => Promise<void>;
}

export default function TimeOffManager({ timeOff, onSave }: TimeOffManagerProps) {
  const [items, setItems] = useState<TimeOff[]>(timeOff);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();
  const { t, dateLocale } = useTranslation();

  const handleAdd = async () => {
    if (!startDate || !endDate) return;

    const newItem: TimeOff = {
      id: crypto.randomUUID(),
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      reason: reason.trim() || undefined,
    };

    const newItems = [...items, newItem].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    setSaving(true);
    try {
      await onSave(newItems);
      setItems(newItems);
      setDialogOpen(false);
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setSaving(true);
    try {
      await onSave(newItems);
      setItems(newItems);
    } finally {
      setSaving(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startFormatted = format(parseISO(start), t('barbers.timeOff.rangeStartFormat'), { locale: dateLocale });
    const endFormatted = format(parseISO(end), t('barbers.timeOff.rangeEndFormat'), { locale: dateLocale });
    return `${startFormatted} - ${endFormatted}`;
  };

  const upcomingTimeOff = items.filter(
    (item) => new Date(item.end_date) >= new Date()
  );

  // Date picker component - touch-friendly
  const DatePickerField = ({ 
    label, 
    date, 
    onSelect, 
    minDate 
  }: { 
    label: string; 
    date: Date | undefined; 
    onSelect: (date: Date | undefined) => void;
    minDate?: Date;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full h-12 sm:h-10 justify-start text-left font-normal text-base sm:text-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
            {date ? format(date, t('barbers.timeOff.dateFormat'), { locale: dateLocale }) : t('barbers.timeOff.selectDate')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[60] pointer-events-auto" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            disabled={(date) => minDate ? date < minDate : date < new Date()}
            initialFocus
            locale={dateLocale}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  // Form content - shared between Dialog and Drawer
  // NOTE: This is a JSX variable, NOT a component function, so that React
  // preserves the DOM (and input focus) across re-renders when typing.
  const formContent = (
    <div className="space-y-5 pt-2">
      <DatePickerField
        label={t('barbers.timeOff.startDate')}
        date={startDate}
        onSelect={setStartDate}
        minDate={new Date()}
      />
      <DatePickerField
        label={t('barbers.timeOff.endDate')}
        date={endDate}
        onSelect={setEndDate}
        minDate={startDate || new Date()}
      />
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('barbers.timeOff.reasonLabel')}</Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('barbers.timeOff.reasonPlaceholder')}
          className="h-12 sm:h-10 text-base sm:text-sm"
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3">
        <Button
          variant="outline"
          onClick={() => setDialogOpen(false)}
          className="h-12 sm:h-10 text-base sm:text-sm"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleAdd}
          disabled={saving || !startDate || !endDate}
          className="h-12 sm:h-10 text-base sm:text-sm"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {t('barbers.timeOff.add')}
        </Button>
      </div>
    </div>
  );

  // Add button trigger
  const AddButton = (
    <Button size="sm" className="h-10 px-4">
      <Plus className="h-4 w-4 mr-1" />
      {t('common.add')}
    </Button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          {t('barbers.timeOff.title')}
        </CardTitle>
        
        {/* Mobile: Drawer, Desktop: Dialog */}
        {isMobile ? (
          <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
            <DrawerTrigger asChild>
              {AddButton}
            </DrawerTrigger>
            <DrawerContent className="px-4 pb-8">
              <DrawerHeader className="pb-2">
                <DrawerTitle>{t('barbers.timeOff.add')}</DrawerTitle>
              </DrawerHeader>
              {formContent}
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              {AddButton}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('barbers.timeOff.add')}</DialogTitle>
              </DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {upcomingTimeOff.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('barbers.timeOff.empty')}
          </p>
        ) : (
          <motion.div 
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
          >
            <AnimatePresence>
              {upcomingTimeOff.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between p-4 sm:p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-sm">
                      {formatDateRange(item.start_date, item.end_date)}
                    </p>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.reason}
                      </p>
                    )}
                  </div>
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.id)}
                      className="h-11 w-11 sm:h-9 sm:w-9 text-destructive hover:text-destructive flex-shrink-0 ml-2"
                      disabled={saving}
                    >
                      <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
