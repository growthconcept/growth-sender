import { File } from 'lucide-react';

/**
 * Componente de pré-visualização de template no estilo WhatsApp
 * Pode ser usado tanto no formulário (modo edição) quanto em visualização somente leitura.
 */
export default function TemplatePreview({
  messageType = 'text',
  textContent = '',
  previewUrl = ''
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
          </div>
        </div>
      </div>
    </div>
  );
}


