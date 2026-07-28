import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarberSchedule, BarberDaySchedule, BarberShift, DAY_NAME_KEYS } from '@/types/barber';
import { useTranslation } from '@/contexts/LanguageContext';
import { Plus, Trash2, Loader2, Save, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ScheduleEditorProps {
  schedule: BarberSchedule;
  onSave: (schedule: BarberSchedule) => Promise<void>;
}

// Generate time options in 15-minute intervals
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      times.push(`${hour}:${minute}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

// Format time for display (e.g., "09:00" -> "9:00 AM")
const formatTimeDisplay = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function ScheduleEditor({ schedule, onSave }: ScheduleEditorProps) {
  const { t } = useTranslation();
  const [editedSchedule, setEditedSchedule] = useState<BarberSchedule>(schedule);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const days = Object.keys(DAY_NAME_KEYS) as (keyof BarberSchedule)[];

  const toggleDayExpand = (day: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const updateDay = (day: keyof BarberSchedule, updates: Partial<BarberDaySchedule>) => {
    setEditedSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }));
    setHasChanges(true);
  };

  const addShift = (day: keyof BarberSchedule) => {
    const currentShifts = editedSchedule[day].shifts;
    const lastShift = currentShifts[currentShifts.length - 1];
    const newStart = lastShift ? lastShift.end : '09:00';
    const newEnd = '20:00';

    updateDay(day, {
      shifts: [...currentShifts, { start: newStart, end: newEnd }],
    });
  };

  const removeShift = (day: keyof BarberSchedule, index: number) => {
    const newShifts = editedSchedule[day].shifts.filter((_, i) => i !== index);
    updateDay(day, { shifts: newShifts });
  };

  const updateShift = (day: keyof BarberSchedule, index: number, updates: Partial<BarberShift>) => {
    const newShifts = editedSchedule[day].shifts.map((shift, i) =>
      i === index ? { ...shift, ...updates } : shift
    );
    updateDay(day, { shifts: newShifts });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedSchedule);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const validateShift = (shift: BarberShift): boolean => {
    return shift.start < shift.end;
  };

  const getShiftSummary = (daySchedule: BarberDaySchedule): string => {
    if (!daySchedule.enabled) return t('barbers.schedule.closed');
    if (daySchedule.shifts.length === 0) return t('barbers.schedule.noShifts');
    return daySchedule.shifts.map(s => `${formatTimeDisplay(s.start)} - ${formatTimeDisplay(s.end)}`).join(', ');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4 px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg">{t('barbers.schedule.weeklyTitle')}</CardTitle>
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button 
                onClick={handleSave} 
                disabled={saving} 
                size="sm"
                className="h-9 sm:h-8 text-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                {t('common.save')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
        {days.map((day) => {
          const daySchedule = editedSchedule[day];
          const isExpanded = expandedDays.has(day) || daySchedule.enabled;
          
          return (
            <motion.div
              key={day}
              layout
              className={cn(
                'rounded-lg border transition-colors overflow-hidden',
                daySchedule.enabled ? 'bg-card border-border' : 'bg-muted/30 border-transparent'
              )}
            >
              {/* Day Header - Always visible, touch-friendly */}
              <div 
                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer active:bg-muted/50 transition-colors"
                onClick={() => toggleDayExpand(day)}
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Large touch-friendly switch */}
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0"
                  >
                    <Switch
                      checked={daySchedule.enabled}
                      onCheckedChange={(enabled) => {
                        updateDay(day, { enabled });
                        if (enabled) {
                          setExpandedDays(prev => new Set([...prev, day]));
                        }
                      }}
                      className="scale-110 sm:scale-100"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Label className="font-semibold text-sm sm:text-base block">
                      {t(DAY_NAME_KEYS[day])}
                    </Label>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                      {getShiftSummary(daySchedule)}
                    </p>
                  </div>
                </div>

                {daySchedule.enabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>

              {/* Expandable shifts section */}
              <AnimatePresence>
                {daySchedule.enabled && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1 space-y-3 border-t border-border/50">
                      {daySchedule.shifts.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          {t('barbers.schedule.noShiftsConfigured')}
                        </p>
                      ) : (
                        daySchedule.shifts.map((shift, index) => {
                          const isValid = validateShift(shift);
                          return (
                            <motion.div 
                              key={index} 
                              className="space-y-2"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              {/* Shift label */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" />
                                  {t('barbers.schedule.shiftN', { number: index + 1 })}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeShift(day, index)}
                                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  <span className="text-xs">{t('common.delete')}</span>
                                </Button>
                              </div>
                              
                              {/* Time selectors - Mobile-friendly dropdowns */}
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground mb-1 block">{t('barbers.schedule.start')}</Label>
                                  <Select
                                    value={shift.start}
                                    onValueChange={(value) => updateShift(day, index, { start: value })}
                                  >
                                    <SelectTrigger 
                                      className={cn(
                                        "h-11 sm:h-10 text-sm font-medium",
                                        !isValid && 'border-destructive focus:ring-destructive'
                                      )}
                                    >
                                      <SelectValue>
                                        {formatTimeDisplay(shift.start)}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[280px]">
                                      {TIME_OPTIONS.map((time) => (
                                        <SelectItem 
                                          key={time} 
                                          value={time}
                                          className="h-10 text-sm"
                                        >
                                          {formatTimeDisplay(time)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <span className="text-muted-foreground mt-5 font-medium">—</span>
                                
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground mb-1 block">{t('barbers.schedule.end')}</Label>
                                  <Select
                                    value={shift.end}
                                    onValueChange={(value) => updateShift(day, index, { end: value })}
                                  >
                                    <SelectTrigger 
                                      className={cn(
                                        "h-11 sm:h-10 text-sm font-medium",
                                        !isValid && 'border-destructive focus:ring-destructive'
                                      )}
                                    >
                                      <SelectValue>
                                        {formatTimeDisplay(shift.end)}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[280px]">
                                      {TIME_OPTIONS.map((time) => (
                                        <SelectItem 
                                          key={time} 
                                          value={time}
                                          className="h-10 text-sm"
                                        >
                                          {formatTimeDisplay(time)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              {!isValid && (
                                <p className="text-xs text-destructive">
                                  {t('barbers.schedule.invalidShift')}
                                </p>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                      
                      {/* Add shift button - Full width on mobile */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addShift(day)}
                        className="w-full h-10 sm:h-9 text-sm font-medium border-dashed"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        {t('barbers.schedule.addShift')}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}