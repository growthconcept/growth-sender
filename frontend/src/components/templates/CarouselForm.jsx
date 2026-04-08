import { useState } from 'react';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import FileUpload from '@/components/ui/FileUpload';

const BUTTON_TYPES = [
  { value: 'REPLY', label: 'Resposta rápida' },
  { value: 'URL', label: 'Abrir URL' },
  { value: 'COPY', label: 'Copiar texto' },
  { value: 'CALL', label: 'Ligar' }
];

const buttonIdLabels = {
  REPLY: 'Resposta enviada ao clicar',
  URL: 'URL (ex: https://...)',
  COPY: 'Texto a copiar',
  CALL: 'Número de telefone'
};

const MAX_CARDS = 10;
const MAX_BUTTONS_PER_CARD = 4;

const defaultButton = () => ({ id: '', text: '', type: 'REPLY' });
const defaultCard = () => ({ text: '', image: '', buttons: [defaultButton()] });
const defaultValue = { text: '', cards: [defaultCard()] };

function CardEditor({ card, cardIndex, onUpdate, onRemove, isOnly, onUploadStart, onUploadEnd }) {
  const [collapsed, setCollapsed] = useState(false);

  const updateField = (field, val) => onUpdate({ ...card, [field]: val });

  const updateButton = (btnIdx, patch) => {
    const buttons = card.buttons.map((b, i) => (i === btnIdx ? { ...b, ...patch } : b));
    onUpdate({ ...card, buttons });
  };

  const addButton = () => {
    if (card.buttons.length >= MAX_BUTTONS_PER_CARD) return;
    onUpdate({ ...card, buttons: [...card.buttons, defaultButton()] });
  };

  const removeButton = (btnIdx) => {
    onUpdate({ ...card, buttons: card.buttons.filter((_, i) => i !== btnIdx) });
  };

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 cursor-pointer" onClick={() => setCollapsed((p) => !p)}>
        <span className="text-sm font-medium">Card {cardIndex + 1}</span>
        <div className="flex items-center gap-1">
          {!isOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* Imagem */}
          <div>
            <Label className="text-xs">Imagem (opcional)</Label>
            <div className="mt-1">
              <FileUpload
                messageType="image"
                accept="image/*"
                initialPreview={card.image || null}
                initialName={card.image ? card.image.split('/').pop() : ''}
                onUploadStart={onUploadStart}
                onUploadError={onUploadEnd}
                onFileUploaded={(url) => {
                  updateField('image', url || '');
                  onUploadEnd?.();
                }}
              />
            </div>
          </div>

          {/* Texto */}
          <div>
            <Label className="text-xs">Texto do card *</Label>
            <textarea
              className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              rows={3}
              placeholder={"Título do produto\nDescrição breve"}
              value={card.text ?? ''}
              onChange={(e) => updateField('text', e.target.value)}
            />
          </div>

          {/* Botões */}
          <div>
            <Label className="text-xs">Botões *</Label>
            <div className="mt-2 space-y-2">
              {card.buttons.map((btn, btnIdx) => (
                <div key={btnIdx} className="flex items-center gap-2">
                  <Select value={btn.type} onValueChange={(val) => updateButton(btnIdx, { type: val, id: '' })}>
                    <SelectTrigger className="w-32 h-7 text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1 h-7 text-xs"
                    placeholder="Texto do botão"
                    value={btn.text}
                    onChange={(e) => updateButton(btnIdx, { text: e.target.value })}
                  />
                  <Input
                    className="flex-1 h-7 text-xs"
                    placeholder={buttonIdLabels[btn.type] || 'Valor'}
                    value={btn.id}
                    onChange={(e) => updateButton(btnIdx, { id: e.target.value })}
                  />
                  {card.buttons.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeButton(btnIdx)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {card.buttons.length < MAX_BUTTONS_PER_CARD && (
                <Button type="button" variant="outline" size="sm" onClick={addButton}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar botão
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Formulário de Carrossel para templates.
 *
 * Props:
 *   value: Object | null — interactive_content atual
 *   onChange: (Object) => void — callback para atualizar interactive_content no estado pai
 */
export default function CarouselForm({ value, onChange, onUploadStart, onUploadEnd }) {
  const ic = { ...defaultValue, ...value, cards: value?.cards ?? defaultValue.cards };

  const update = (patch) => onChange({ ...ic, ...patch });

  const addCard = () => {
    if (ic.cards.length >= MAX_CARDS) return;
    update({ cards: [...ic.cards, defaultCard()] });
  };

  const updateCard = (idx, card) => {
    update({ cards: ic.cards.map((c, i) => (i === idx ? card : c)) });
  };

  const removeCard = (idx) => {
    update({ cards: ic.cards.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <h3 className="text-sm font-semibold">Configuração do Carrossel</h3>

      {/* Texto principal */}
      <div>
        <Label>Texto principal</Label>
        <textarea
          className="w-full px-3 py-2 border rounded-md text-sm mt-1"
          rows={2}
          placeholder="Texto que aparece acima do carrossel (opcional)"
          value={ic.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
        />
      </div>

      {/* Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cards ({ic.cards.length}/{MAX_CARDS})</Label>
        </div>
        {ic.cards.map((card, idx) => (
          <CardEditor
            key={idx}
            card={card}
            cardIndex={idx}
            onUpdate={(updated) => updateCard(idx, updated)}
            onRemove={() => removeCard(idx)}
            isOnly={ic.cards.length === 1}
            onUploadStart={onUploadStart}
            onUploadEnd={onUploadEnd}
          />
        ))}
        {ic.cards.length < MAX_CARDS && (
          <Button type="button" variant="outline" size="sm" onClick={addCard}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar card
          </Button>
        )}
      </div>
    </div>
  );
}
