import { File } from 'lucide-react';

function InteractiveMenuPreview({ interactiveContent, textContent }) {
  const ic = interactiveContent ?? {};
  const text = ic.text || textContent || 'Digite a mensagem do template para visualizar a prévia';
  const choices = ic.choices ?? [];
  const menuType = ic.menuType ?? 'button';

  return (
    <div className="relative max-w-[80%] text-[#111B21] rounded-2xl rounded-br-sm shadow-sm overflow-hidden">
      {/* Bolha principal */}
      <div className="bg-[#DCF7C5] px-3 py-2.5 space-y-1 border border-[#D1E7C5]">
        {ic.imageButton && (
          <img src={ic.imageButton} alt="" className="rounded-xl max-h-32 w-full object-contain bg-white mb-1" />
        )}
        <p className="text-sm whitespace-pre-line">{text}</p>
        {ic.footerText && (
          <p className="text-[10px] text-[#667781]">{ic.footerText}</p>
        )}
        <div className="flex items-center justify-end gap-1 text-[10px] text-[#4F7E67]">
          <span>18:34</span>
          <span>✓✓</span>
        </div>
      </div>

      {/* Botões interativos */}
      <div className="border-t border-[#D1D7DB]">
        {menuType === 'button' && choices.slice(0, 3).map((choice, idx) => {
          const label = choice.split('|')[0] || choice;
          return (
            <div key={idx} className="bg-white text-center text-sm text-[#00A884] font-medium py-2 border-b border-[#D1D7DB] last:border-b-0">
              {label}
            </div>
          );
        })}
        {menuType === 'list' && (
          <div className="bg-white text-center text-sm text-[#00A884] font-medium py-2 flex items-center justify-center gap-1">
            <span>☰</span>
            <span>{ic.listButton || 'Ver opções'}</span>
          </div>
        )}
        {menuType === 'poll' && choices.slice(0, 4).map((choice, idx) => (
          <div key={idx} className="bg-white flex items-center gap-2 px-3 py-1.5 text-sm border-b border-[#D1D7DB] last:border-b-0">
            <div className="w-4 h-4 rounded-full border-2 border-[#00A884] shrink-0" />
            <span>{choice}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarouselPreview({ interactiveContent, textContent }) {
  const ic = interactiveContent ?? {};
  const text = ic.text || textContent;
  const cards = ic.cards ?? [];
  const [activeIdx, setActiveIdx] = useState(0);
  const card = cards[activeIdx] ?? { text: '', image: '', buttons: [] };

  return (
    <div className="max-w-[80%] space-y-1">
      {text && (
        <div className="bg-[#DCF7C5] px-3 py-2.5 rounded-2xl rounded-br-sm shadow-sm border border-[#D1E7C5]">
          <p className="text-sm whitespace-pre-line">{text}</p>
          <div className="flex items-center justify-end gap-1 text-[10px] text-[#4F7E67]">
            <span>18:34</span>
            <span>✓✓</span>
          </div>
        </div>
      )}
      {cards.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D1D7DB]">
          {card.image ? (
            <img src={card.image} alt="" className="w-full max-h-28 object-cover" />
          ) : (
            <div className="w-full h-20 bg-[#E2E8F0] flex items-center justify-center text-[#94A3B8] text-xs">
              Imagem do card
            </div>
          )}
          <div className="px-3 py-2">
            <p className="text-xs whitespace-pre-line line-clamp-2">{card.text || 'Texto do card'}</p>
          </div>
          {card.buttons.length > 0 && (
            <div className="border-t border-[#E2E8F0]">
              {card.buttons.map((btn, i) => (
                <div key={i} className="text-center text-xs text-[#00A884] font-medium py-1.5 border-b border-[#E2E8F0] last:border-b-0">
                  {btn.text || `Botão ${i + 1}`}
                </div>
              ))}
            </div>
          )}
          {cards.length > 1 && (
            <div className="flex items-center justify-between px-2 py-1 bg-[#F8FAFC] border-t border-[#E2E8F0]">
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded text-[#00A884] hover:bg-[#E2E8F0] disabled:opacity-25 transition-colors"
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx((p) => p - 1)}
              >
                ‹
              </button>
              <span className="text-[10px] text-[#94A3B8] tabular-nums">{activeIdx + 1} / {cards.length}</span>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded text-[#00A884] hover:bg-[#E2E8F0] disabled:opacity-25 transition-colors"
                disabled={activeIdx === cards.length - 1}
                onClick={() => setActiveIdx((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// useState é necessário apenas para CarouselPreview
import { useState } from 'react';

/**
 * Componente de pré-visualização de template no estilo WhatsApp.
 * Suporta: text, image, video, audio, document, interactive_menu, carousel.
 */
export default function TemplatePreview({
  messageType = 'text',
  textContent = '',
  previewUrl = '',
  interactiveContent = null
}) {
  return (
    <div className="w-full max-w-xs rounded-[32px] border-[14px] border-black bg-black shadow-2xl overflow-hidden">
      <div className="h-8 border-b border-white/10 flex items-center justify-between px-6 text-white text-xs opacity-70">
        <span>18:34</span>
        <div className="flex gap-1 items-center">
          <span>5G</span>
          <span>100%</span>
        </div>
      </div>
      <div className="bg-[#ECE5DD] min-h-[520px] px-3 pb-6 pt-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#34B7F1] flex items-center justify-center text-white text-sm font-semibold">
            GC
          </div>
          <div>
            <div className="text-sm font-semibold text-[#075E54]">
              Growth Concept
            </div>
            <div className="text-[11px] text-[#667781]">
              online
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex justify-center">
            <div className="text-[10px] px-3 py-1 rounded-full bg-white text-[#54656F] border border-[#D1D7DB]">
              Hoje
            </div>
          </div>
          <div className="flex justify-end">
            {messageType === 'interactive_menu' ? (
              <InteractiveMenuPreview
                interactiveContent={interactiveContent}
                textContent={textContent}
              />
            ) : messageType === 'carousel' ? (
              <CarouselPreview
                interactiveContent={interactiveContent}
                textContent={textContent}
              />
            ) : (
              <div className="relative max-w-[80%] bg-[#DCF7C5] text-[#111B21] px-3 py-2.5 rounded-2xl rounded-br-sm shadow-sm border border-[#D1E7C5] space-y-2">
                {messageType !== 'text' && previewUrl && (
                  <>
                    {messageType === 'image' && (
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="rounded-xl max-h-40 max-w-full object-contain bg-white"
                      />
                    )}
                    {messageType === 'video' && (
                      <video
                        src={previewUrl}
                        controls
                        className="rounded-xl max-h-40 max-w-full object-contain bg-black"
                      />
                    )}
                    {messageType === 'audio' && (
                      <audio controls className="w-full">
                        <source src={previewUrl} type="audio/mpeg" />
                        Seu navegador não suporta áudio.
                      </audio>
                    )}
                    {messageType === 'document' && (
                      <div className="flex items-center gap-2 text-sm text-[#111B21]/80">
                        <File className="h-4 w-4" />
                        <span>Documento anexado</span>
                      </div>
                    )}
                  </>
                )}
                <p className="text-sm whitespace-pre-line">
                  {textContent
                    ? textContent
                    : 'Digite a mensagem do template para visualizar a prévia'}
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-[#4F7E67]">
                  <span>18:34</span>
                  <span>✓✓</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
