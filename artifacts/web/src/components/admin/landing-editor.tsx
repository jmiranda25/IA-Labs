import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GripVertical,
  Edit3,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  useGetLandingContent,
  getGetLandingContentQueryKey,
  useAdminUpdateLandingSection,
  useAdminReorderLandingSections,
  useAdminResetLandingSection,
  useAdminUpdateLandingFaq,
  useAdminReorderLandingFaqs,
  type LandingSection,
  type LandingFaq,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Section metadata ──────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero — Encabezado principal",
  about: "Nosotros — Descripción",
  benefits: "Beneficios — Qué ofrecemos",
  who_is_for: "¿Para quién? — Perfiles",
  how_it_works: "Cómo funciona — Pasos",
  testimonials: "Testimonios — Miembros",
  cta_final: "CTA — Llamada a acción",
};

// ── Zod schemas ───────────────────────────────────────────────────────────────

const sectionSchema = z.object({
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  imageUrl: z.string().url("URL inválida").or(z.literal("")).nullable().optional(),
});
type SectionFormValues = z.infer<typeof sectionSchema>;

const faqSchema = z.object({
  question: z.string().min(1, "La pregunta es requerida"),
  answer: z.string().min(1, "La respuesta es requerida"),
});
type FaqFormValues = z.infer<typeof faqSchema>;

// ── Section edit dialog ───────────────────────────────────────────────────────

function SectionEditDialog({
  section,
  open,
  onClose,
}: {
  section: LandingSection;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const update = useAdminUpdateLandingSection();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title: section.title ?? "",
      subtitle: section.subtitle ?? "",
      body: section.body ?? "",
      imageUrl: section.imageUrl ?? "",
    },
  });

  const showBody = section.section === "about";

  const onSubmit = async (values: SectionFormValues) => {
    try {
      await update.mutateAsync({
        id: section.id,
        data: {
          title: values.title || null,
          subtitle: values.subtitle || null,
          body: values.body || null,
          imageUrl: values.imageUrl || null,
        },
      });
      qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
      toast.success("Sección actualizada");
      onClose();
    } catch {
      toast.error("Error al guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Editar: {SECTION_LABELS[section.section] ?? section.section}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!showBody && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="s-title">Título</Label>
                <Input id="s-title" placeholder="Título de la sección" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-subtitle">Subtítulo</Label>
                <Input id="s-subtitle" placeholder="Subtítulo de la sección" {...register("subtitle")} />
                {errors.subtitle && <p className="text-xs text-destructive">{errors.subtitle.message}</p>}
              </div>
            </>
          )}
          {showBody && (
            <div className="space-y-1.5">
              <Label htmlFor="s-body">
                Texto <span className="text-muted-foreground text-xs">(markdown: **negrita**)</span>
              </Label>
              <Textarea
                id="s-body"
                rows={4}
                placeholder="Descripción de la sección…"
                {...register("body")}
              />
              {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="s-image">URL de imagen (opcional)</Label>
            <Input id="s-image" placeholder="https://…" {...register("imageUrl")} />
            {errors.imageUrl && <p className="text-xs text-destructive">{errors.imageUrl.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sortable section row ──────────────────────────────────────────────────────

function SortableSection({
  section,
  onEdit,
  onReset,
  onToggle,
}: {
  section: LandingSection;
  onEdit: () => void;
  onReset: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/30 transition-colors"
    >
      <button
        type="button"
        className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        {...listeners}
        {...attributes}
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {SECTION_LABELS[section.section] ?? section.section}
        </p>
        {section.title && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{section.title}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={section.enabled}
          onCheckedChange={onToggle}
          aria-label={section.enabled ? "Desactivar sección" : "Activar sección"}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} title="Editar">
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onReset} title="Resetear a valores por defecto">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── FAQ edit dialog ───────────────────────────────────────────────────────────

function FaqEditDialog({
  faq,
  open,
  onClose,
}: {
  faq: LandingFaq;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const update = useAdminUpdateLandingFaq();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: { question: faq.question, answer: faq.answer },
  });

  const onSubmit = async (values: FaqFormValues) => {
    try {
      await update.mutateAsync({ id: faq.id, data: values });
      qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
      toast.success("FAQ actualizada");
      onClose();
    } catch {
      toast.error("Error al guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar FAQ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="faq-q">Pregunta</Label>
            <Input id="faq-q" {...register("question")} />
            {errors.question && <p className="text-xs text-destructive">{errors.question.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="faq-a">Respuesta</Label>
            <Textarea id="faq-a" rows={4} {...register("answer")} />
            {errors.answer && <p className="text-xs text-destructive">{errors.answer.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sortable FAQ row ──────────────────────────────────────────────────────────

function SortableFaq({
  faq,
  onEdit,
  onToggle,
}: {
  faq: LandingFaq;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: faq.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/30 transition-colors"
    >
      <button
        type="button"
        className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none mt-0.5"
        {...listeners}
        {...attributes}
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">{faq.question}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{faq.answer}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <Switch
          checked={faq.enabled}
          onCheckedChange={onToggle}
          aria-label={faq.enabled ? "Desactivar FAQ" : "Activar FAQ"}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} title="Editar">
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Main landing editor ───────────────────────────────────────────────────────

export function LandingEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetLandingContent(undefined, {
    query: { queryKey: getGetLandingContentQueryKey() },
  });

  const [sections, setSections] = useState<LandingSection[]>([]);
  const [faqs, setFaqs] = useState<LandingFaq[]>([]);

  const reorderSections = useAdminReorderLandingSections();
  const reorderFaqs = useAdminReorderLandingFaqs();
  const updateSection = useAdminUpdateLandingSection();
  const resetSection = useAdminResetLandingSection();
  const updateFaq = useAdminUpdateLandingFaq();

  const [editSection, setEditSection] = useState<LandingSection | null>(null);
  const [resetTarget, setResetTarget] = useState<LandingSection | null>(null);
  const [editFaq, setEditFaq] = useState<LandingFaq | null>(null);
  const [faqsOpen, setFaqsOpen] = useState(false);

  // Sync server data to local state for optimistic DnD
  const serverSections = (data as any)?.sections as LandingSection[] | undefined;
  const serverFaqs = (data as any)?.faqs as LandingFaq[] | undefined;
  const displaySections = sections.length ? sections : (serverSections ?? []);
  const displayFaqs = faqs.length ? faqs : (serverFaqs ?? []);

  const sectionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const faqSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSectionDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = displaySections.findIndex((s) => s.id === active.id);
      const newIndex = displaySections.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(displaySections, oldIndex, newIndex);
      setSections(reordered);
      try {
        await reorderSections.mutateAsync({ data: { ids: reordered.map((s) => s.id) } });
        qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
      } catch {
        setSections([]);
        toast.error("Error al reordenar");
      }
    },
    [displaySections, reorderSections, qc],
  );

  const handleFaqDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = displayFaqs.findIndex((f) => f.id === active.id);
      const newIndex = displayFaqs.findIndex((f) => f.id === over.id);
      const reordered = arrayMove(displayFaqs, oldIndex, newIndex);
      setFaqs(reordered);
      try {
        await reorderFaqs.mutateAsync({ data: { ids: reordered.map((f) => f.id) } });
        qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
      } catch {
        setFaqs([]);
        toast.error("Error al reordenar");
      }
    },
    [displayFaqs, reorderFaqs, qc],
  );

  const handleToggleSection = async (section: LandingSection, enabled: boolean) => {
    try {
      await updateSection.mutateAsync({ id: section.id, data: { enabled } });
      qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleToggleFaq = async (faq: LandingFaq, enabled: boolean) => {
    try {
      await updateFaq.mutateAsync({ id: faq.id, data: { enabled } });
      qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleConfirmReset = async () => {
    if (!resetTarget) return;
    try {
      await resetSection.mutateAsync({ id: resetTarget.id });
      qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
      setSections([]);
      toast.success("Sección restaurada a los valores por defecto");
    } catch {
      toast.error("Error al restaurar");
    } finally {
      setResetTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" />
            Editor de Landing Page
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Arrastra para reordenar · Activa/desactiva secciones · Edita el contenido
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.open("/?preview=1", "_blank")}
        >
          <Eye className="h-3.5 w-3.5" />
          Vista previa
        </Button>
      </div>

      {/* Sections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Secciones ({displaySections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sectionSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
            <SortableContext items={displaySections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {displaySections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onEdit={() => setEditSection(section)}
                    onReset={() => setResetTarget(section)}
                    onToggle={(enabled) => handleToggleSection(section, enabled)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* FAQs collapsible */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={() => setFaqsOpen((o) => !o)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Preguntas Frecuentes ({displayFaqs.length})
            </CardTitle>
            {faqsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {faqsOpen && (
          <CardContent>
            <DndContext sensors={faqSensors} collisionDetection={closestCenter} onDragEnd={handleFaqDragEnd}>
              <SortableContext items={displayFaqs.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {displayFaqs.map((faq) => (
                    <SortableFaq
                      key={faq.id}
                      faq={faq}
                      onEdit={() => setEditFaq(faq)}
                      onToggle={(enabled) => handleToggleFaq(faq, enabled)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        )}
      </Card>

      {/* Badge count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-xs">
          {displaySections.filter((s) => s.enabled).length}/{displaySections.length} secciones activas
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {displayFaqs.filter((f) => f.enabled).length}/{displayFaqs.length} FAQs activas
        </Badge>
      </div>

      {/* Section edit dialog */}
      {editSection && (
        <SectionEditDialog
          key={editSection.id}
          section={editSection}
          open={!!editSection}
          onClose={() => setEditSection(null)}
        />
      )}

      {/* Reset confirmation */}
      <AlertDialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar sección</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Restaurar <strong>{SECTION_LABELS[resetTarget?.section ?? ""] ?? resetTarget?.section}</strong> a los valores por defecto? Perderás los cambios actuales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAQ edit dialog */}
      {editFaq && (
        <FaqEditDialog
          key={editFaq.id}
          faq={editFaq}
          open={!!editFaq}
          onClose={() => setEditFaq(null)}
        />
      )}
    </div>
  );
}
