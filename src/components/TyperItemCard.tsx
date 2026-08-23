import React from 'react';
import { DetectedBubble } from '@/types/manga';
import { CATEGORIES } from '@/utils/typerHelper';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TyperItemCardProps {
  item: DetectedBubble;
  index: number;
  isRTL: boolean;
  onUpdate: (field: keyof DetectedBubble, val: string) => void;
}

export const TyperItemCard: React.FC<TyperItemCardProps> = ({
  item,
  index,
  isRTL,
  onUpdate,
}) => {
  return (
    <Card className="p-4 space-y-3 rounded-2xl border-border bg-card shadow-sm">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-muted-foreground font-bold">فقرة #{index + 1}</span>
        <Select
          value={item.category}
          onValueChange={(val) => onUpdate('category', val)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs font-bold rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} className="text-xs font-semibold">
                {cat.label} ({cat.prefix})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-muted-foreground uppercase">
          النص الأصلي (OCR):
        </label>
        <Textarea
          value={item.originalText}
          onChange={(e) => onUpdate('originalText', e.target.value)}
          dir="ltr"
          rows={2}
          className="text-xs font-mono rounded-xl bg-muted/30 resize-none"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase">
            النص المترجم مع كود التايبر:
          </label>
          <span className="text-[10px] text-muted-foreground font-mono"><dyad-write path="src/components/TyperItemCard.tsx" description="Component for editing a single detected bubble/dialogue item with category dropdown">
import React from 'react';
import { DetectedBubble } from '@/types/manga';
import { CATEGORIES } from '@/utils/typerHelper';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TyperItemCardProps {
  item: DetectedBubble;
  index: number;
  isRTL: boolean;
  onUpdate: (field: keyof DetectedBubble, val: string) => void;
}

export const TyperItemCard: React.FC<TyperItemCardProps> = ({
  item,
  index,
  isRTL,
  onUpdate,
}) => {
  return (
    <Card className="p-4 space-y-3 rounded-2xl border-border bg-card shadow-sm">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-muted-foreground font-bold">فقرة #{index + 1}</span>
        <Select
          value={item.category}
          onValueChange={(val) => onUpdate('category', val)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs font-bold rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {<dyad-write path="src/components/TyperItemCard.tsx" description="Single dialogue card editor with category selector">
import React from 'react';
import { DetectedBubble } from '@/types/manga';
import { CATEGORIES } from '@/utils/typerHelper';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TyperItemCardProps {
  item: DetectedBubble;
  index: number;
  isRTL: boolean;
  onUpdate: (field: keyof DetectedBubble, val: string) => void;
}

export const TyperItemCard: React.FC<TyperItemCardProps> = ({
  item,
  index,
  isRTL,
  onUpdate,
}) => {
  return (
    <Card className="p-4 space-y-3 rounded-2xl border-border bg-card shadow-sm">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-muted-foreground font-bold">فقرة #{index + 1}</span>
        <Select
          value={item.category}
          onValueChange={(val) => onUpdate('category', val)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs font-bold rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} className="text-xs font-semibold">
                {cat.label} ({cat.prefix})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-muted-foreground uppercase">
          النص الأصلي (OCR):
        </label>
        <Textarea
          value={item.originalText}
          onChange={(e) => onUpdate('originalText', e.target.value)}
          dir="ltr"
          rows={2}
          className="text-xs font-mono rounded-xl bg-muted/30 resize-none"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase">
            النص المترجم مع كود التايبر:
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {isRTL ? 'RTL' : 'LTR'}
          </span>
        </div>
        <Textarea
          value={item.translatedText}
          onChange={(e) => onUpdate('translatedText', e.target.value)}
          dir={isRTL ? 'rtl' : 'ltr'}
          rows={2}
          className={`text-sm font-semibold rounded-xl border-orange-500/30 focus-visible:ring-orange-500 ${
            isRTL ? 'font-serif text-right' : 'font-sans text-left'
          }`}
        />
      </div>
    </Card>
  );
};