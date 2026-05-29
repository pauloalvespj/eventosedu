import { useRef, useState } from "react";
import { uploadAvatar } from "../../lib/db";

/**
 * AvatarUpload — exibe avatar (foto ou iniciais) com botão de troca.
 *
 * Props:
 *   userId         — id do profile (para salvar no storage)
 *   fotoUrl        — URL atual da foto (string | null)
 *   iniciais       — fallback de texto quando não há foto
 *   size           — diâmetro em px (padrão 56)
 *   onUploaded     — callback(novaUrl) após upload imediato bem-sucedido
 *   onFileSelected — callback(file, previewUrl) — modo diferido: sem upload automático
 *   onError        — callback(mensagem) quando upload imediato falha
 *   readonly       — desativa botão de troca
 */
export function AvatarUpload({ userId, fotoUrl, iniciais = "?", size = 56, onUploaded, onFileSelected, onError, readonly = false }) {
  const inputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(fotoUrl || null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);

    // Modo diferido: pai decide quando e como fazer o upload
    if (onFileSelected) {
      onFileSelected(file, objUrl);
      return;
    }

    setLoading(true);
    try {
      const url = await uploadAvatar(userId, file);
      setPreview(url);
      onUploaded?.(url);
    } catch (err) {
      console.error("Erro ao enviar foto:", err);
      setPreview(fotoUrl || null);
      onError?.(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: preview ? "transparent" : "var(--navy)",
        border: "3px solid var(--gold)",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Playfair Display',serif", fontWeight: 700,
        color: "var(--gold-light)", fontSize: size * 0.3,
        cursor: readonly ? "default" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.2s",
      }} onClick={() => !readonly && !loading && inputRef.current?.click()}>
        {preview
          ? <img src={preview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : iniciais
        }
      </div>
      {!readonly && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: size * 0.36, height: size * 0.36,
          borderRadius: "50%", background: "var(--gold)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.18, cursor: "pointer", border: "2px solid #fff",
        }} onClick={() => !loading && inputRef.current?.click()}>
          {loading ? "⏳" : "📷"}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}
