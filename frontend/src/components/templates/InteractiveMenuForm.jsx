import { useState } from 'react';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import FileUpload from '@/components/ui/FileUpload';
import { Plus, Trash2, GripVertical } from 'lucide-react';

const MENU_TYPES = [
  { value: 'button', label: 'Botões de ação' },
  { value: 'list', label: 'Lista em seções' },
  { value: 'poll', label: 'Enquete' }
];

const BUTTON_ACTIONS = [
  { value: 'reply', label: 'Resposta rápida' },
  { value: 'url', label: 'Abrir URL' },
  { value: 'call', label: 'Ligar' },
  { value: 'copy', label: 'Copiar texto' }
];

const actionPlaceholders = {
  reply: 'Identificador (ex: suporte)',
  url: 'URL (ex: https://exemplo.com)',
  call: 'Telefone (ex: +5511999999999)',
  copy: 'Texto a copiar (ex: PROMO20)'
};

const defaultValue = {
  menuType: 'button',
  text: '',
  footerText: '',
  listButton: '',
  imageButton: '',
  selectableCount: 1,
  choices: []
};

function encodeButtonChoice(item) {
  if (item.type === 'url') return `${item.text}|url:${item.value}`;
  if (item.type === 'call') return `${item.text}|call:${item.value}`;
  if (item.type === 'copy') return `${item.text}|copy:${item.value}`;
  return `${item.text}|${item.value}`;
}

function decodeButtonChoice(str) {
  const [text, rawValue = ''] = str.split('|');
  if (rawValue.startsWith('url:')) return { text, type: 'url', value: rawValue.slice(4) };
  if (rawValue.startsWith('call:')) return { text, type: 'call', value: rawValue.slice(5) };
  if (rawValue.startsWith('copy:')) return { text, type: 'copy', value: rawValue.slice(5) };
  // compatibilidade: URLs digitadas diretamente sem prefixo
  if (rawValue.startsWith('https://') || rawValue.startsWith('http://')) return { text, type: 'url', value: rawValue };
  return { text, type: 'reply', value: rawValue };
}

function encodeListChoice(item) {
  if (item.isSection) return `[${item.text}]`;
  return [item.text, item.id || '', item.description || ''].join('|').replace(/\|+$/, '');
}

function decodeListChoice(str) {
  if (str.startsWith('[') && str.endsWith(']')) return { isSection: true, text: str.slice(1, -1), id: '', description: '' };
  const [text = '', id = '', description = ''] = str.split('|');
  return { isSection: false, text, id, description };
}

function ButtonChoicesEditor({ choices, onChange }) {
  const items = choices.map(decodeButtonChoice);

  const update = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next.map(encodeButtonChoice));
  };

  const add = () => onChange([...choices, '|']);

  const remove = (idx) => onChange(choices.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Select value={item.type} onValueChange={(val) => update(idx, { type: val, value: '' })}>
            <SelectTrigger className="w-36 h-8 text-sm shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="flex-1 h-8 text-sm"
            placeholder="Texto do botão"
            value={item.text}
            onChange={(e) => update(idx, { text: e.target.value })}
          />
          <Input
            className="flex-1 h-8 text-sm"
            placeholder={actionPlaceholders[item.type] || 'Valor'}
            value={item.value}
            onChange={(e) => update(idx, { value: e.target.value })}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar botão
      </Button>
    </div>
  );
}

function ListChoicesEditor({ choices, onChange }) {
  const items = choices.map(decodeListChoice);

  const update = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next.map(encodeListChoice));
  };

  const addSection = () => onChange([...choices, '[Nova Seção]']);
  const addItem = () => onChange([...choices, 'Item|id|Descrição opcional']);
  const remove = (idx) => onChange(choices.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className={`flex items-start gap-2 ${item.isSection ? 'bg-muted/50 rounded p-2' : 'pl-4'}`}>
          {item.isSection ? (
            <>
              <GripVertical className="h-4 w-4 mt-1.5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <Input
                  className="h-7 text-sm font-semibold"
                  placeholder="Nome da seção"
                  value={item.text}
                  onChange={(e) => update(idx, { text: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 space-y-1">
                <Input className="h-7 text-sm" placeholder="Texto do item" value={item.text} onChange={(e) => update(idx, { text: e.target.value })} />
                <div className="flex gap-1">
                  <Input className="h-6 text-xs" placeholder="ID (opcional)" value={item.id} onChange={(e) => update(idx, { id: e.target.value })} />
                  <Input className="h-6 text-xs" placeholder="Descrição (opcional)" value={item.description} onChange={(e) => update(idx, { description: e.target.value })} />
                </div>
              </div>
            </>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(idx)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar seção
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar item
        </Button>
      </div>
    </div>
  );
}

function PollChoicesEditor({ choices, onChange }) {
  const add = () => onChange([...choices, '']);
  const update = (idx, text) => onChange(choices.map((c, i) => (i === idx ? text : c)));
  const remove = (idx) => onChange(choices.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {choices.map((choice, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            className="flex-1 h-8 text-sm"
            placeholder={`Opção ${idx + 1}`}
            value={choice}
            onChange={(e) => update(idx, e.target.value)}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar opção
      </Button>
    </div>
  );
}

/**
 * Formulário de Menu Interativo para templates.
 *
 * Props:
 *   value: Object | null — interactive_content atual
 *   onChange: (Object) => void — callback para atualizar interactive_content no estado pai
 */
export default function InteractiveMenuForm({ value, onChange, onUploadStart, onUploadEnd }) {
  const ic = { ...defaultValue, ...value, choices: value?.choices ?? defaultValue.choices };

  const update = (patch) => onChange({ ...ic, ...patch });

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <h3 className="text-sm font-semibold">Configuração do Menu Interativo</h3>

      {/* Sub-tipo */}
      <div>
        <Label>Tipo de menu</Label>
        <Select value={ic.menuType ?? 'button'} onValueChange={(val) => update({ menuType: val, choices: [] })}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MENU_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Texto principal */}
      <div>
        <Label>Texto principal *</Label>
        <textarea
          className="w-full px-3 py-2 border rounded-md text-sm mt-1"
          rows={3}
          placeholder="Texto que aparece acima do menu"
          value={ic.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
        />
      </div>

      {/* Footer (button e list) */}
      {(ic.menuType === 'button' || ic.menuType === 'list') && (
        <div>
          <Label>Rodapé (opcional)</Label>
          <Input
            className="mt-1 text-sm"
            placeholder="Texto pequeno abaixo do menu"
            value={ic.footerText ?? ''}
            onChange={(e) => update({ footerText: e.target.value })}
          />
        </div>
      )}

      {/* Botão da lista (list only) */}
      {ic.menuType === 'list' && (
        <div>
          <Label>Texto do botão que abre a lista *</Label>
          <Input
            className="mt-1 text-sm"
            placeholder="Ex: Ver opções"
            value={ic.listButton ?? ''}
            onChange={(e) => update({ listButton: e.target.value })}
          />
        </div>
      )}

      {/* Imagem (button only) */}
      {ic.menuType === 'button' && (
        <div>
          <Label>Imagem (opcional)</Label>
          <div className="mt-1">
            <FileUpload
              messageType="image"
              accept="image/*"
              initialPreview={ic.imageButton || null}
              initialName={ic.imageButton ? ic.imageButton.split('/').pop() : ''}
              onUploadStart={onUploadStart}
              onUploadError={onUploadEnd}
              onFileUploaded={(url) => {
                update({ imageButton: url || '' });
                onUploadEnd?.();
              }}
            />
          </div>
        </div>
      )}

      {/* Quantidade selecionável (poll only) */}
      {ic.menuType === 'poll' && (
        <div>
          <Label>Quantidade de opções selecionáveis</Label>
          <Input
            type="number"
            min={1}
            className="mt-1 text-sm w-24"
            value={ic.selectableCount ?? 1}
            onChange={(e) => update({ selectableCount: parseInt(e.target.value, 10) || 1 })}
          />
        </div>
      )}

      {/* Editor de opções */}
      <div>
        <Label>Opções *</Label>
        <div className="mt-2">
          {ic.menuType === 'button' && (
            <ButtonChoicesEditor
              choices={ic.choices ?? []}
              onChange={(choices) => update({ choices })}
            />
          )}
          {ic.menuType === 'list' && (
            <ListChoicesEditor
              choices={ic.choices ?? []}
              onChange={(choices) => update({ choices })}
            />
          )}
          {ic.menuType === 'poll' && (
            <PollChoicesEditor
              choices={ic.choices ?? []}
              onChange={(choices) => update({ choices })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
