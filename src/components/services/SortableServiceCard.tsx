import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, DollarSign, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Service } from '@/types';

interface SortableServiceCardProps {
  service: Service;
  togglingId: string | null;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  onToggleActive: (service: Service) => void;
}

export function SortableServiceCard({
  service,
  togglingId,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableServiceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={`border-border relative overflow-hidden touch-manipulation h-full ${
          !service.isActive ? 'opacity-60' : ''
        } ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
      >
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: service.color }}
        />
        <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Arrastrar para reordenar"
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base md:text-lg truncate">{service.name}</CardTitle>
                {service.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px] shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="min-h-[44px]" onClick={() => onEdit(service)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive min-h-[44px]"
                  onClick={() => onDelete(service.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desactivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {service.servicePhoto && (
            <div className="mb-3 rounded-md overflow-hidden">
              <img
                src={service.servicePhoto}
                alt={service.name}
                className="w-full h-32 object-cover"
              />
            </div>
          )}
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {service.duration}m
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                €{service.price}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={service.isActive ? 'default' : 'secondary'}>
              {service.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
            <div className="flex items-center gap-2">
              {togglingId === service.id && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={service.isActive}
                onCheckedChange={() => onToggleActive(service)}
                disabled={togglingId === service.id}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
