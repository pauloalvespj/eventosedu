import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faBuilding, faStar } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, AvatarUpload } from "../../base/index";
import { inserirInstituicao, atualizarInstituicao, deletarInstituicao, uploadLogoInstituicao } from "../../../lib/db";

export function Instituicoes() {
  const { instituicoes, setInstituicoes, participantes, showToast } = useAdmin();
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({});
  const [logoFile, setLogoFile]   = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function abrirNovo() {
    setForm({ ativo: true, realizadora: false, ordem: null });
    setLogoFile(null);
    setLogoPreview(null);
    setModal(true);
  }

  function abrirEditar(inst) {
    setForm({ ...inst });
    setLogoFile(null);
    setLogoPreview(inst.logo_url || null);
    setModal(true);
  }

  async function salvar() {
    if (!form.sigla?.trim() || !form.nome?.trim()) {
      showToast("Sigla e nome são obrigatórios", "error"); return;
    }
    const campos = {
      sigla:       form.sigla.trim(),
      nome:        form.nome.trim(),
      ativo:       form.ativo !== false,
      realizadora: !!form.realizadora,
      ordem:       form.realizadora ? (parseInt(form.ordem) || null) : null,
    };

    let instId = form.id;

    if (form.id) {
      setInstituicoes(prev => prev.map(i => i.id === form.id ? { ...i, ...campos } : i));
      await atualizarInstituicao(form.id, campos);
      showToast("Instituição atualizada!", "success");
    } else {
      const { data, error } = await inserirInstituicao(campos);
      if (error) { showToast("Erro ao salvar: " + error.message, "error"); return; }
      instId = data?.id;
      setInstituicoes(prev => [...prev, data ?? { ...campos, id: Date.now() }]);
      showToast("Instituição criada!", "success");
    }

    if (logoFile && instId) {
      setUploadingLogo(true);
      try {
        const url = await uploadLogoInstituicao(instId, logoFile);
        setInstituicoes(prev => prev.map(i => i.id === instId ? { ...i, logo_url: url } : i));
      } catch (err) {
        showToast("Erro ao enviar logo: " + err.message, "error");
      } finally {
        setUploadingLogo(false);
      }
    }

    setModal(false);
  }

  async function remover(inst) {
    if (!confirm(`Remover "${inst.sigla} – ${inst.nome}"?`)) return;
    setInstituicoes(prev => prev.filter(i => i.id !== inst.id));
    await deletarInstituicao(inst.id);
    showToast("Instituição removida", "info");
  }

  async function toggleAtivo(inst) {
    const novoAtivo = !inst.ativo;
    setInstituicoes(prev => prev.map(i => i.id === inst.id ? { ...i, ativo: novoAtivo } : i));
    await atualizarInstituicao(inst.id, { ativo: novoAtivo });
    showToast(novoAtivo ? "Instituição ativada" : "Instituição desativada", "info");
  }

  const realizadoras = [...instituicoes]
    .filter(i => i.realizadora)
    .sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999));

  const outras = instituicoes.filter(i => !i.realizadora);
  const todasOrdenadas = [...realizadoras, ...outras];
  const ativas = instituicoes.filter(i => i.ativo).length;

  function contarInscritos(inst) {
    return (participantes || []).filter(p =>
      p.instituicao && (
        p.instituicao === inst.nome ||
        p.instituicao === inst.sigla ||
        p.instituicao.toLowerCase().includes(inst.sigla.toLowerCase())
      )
    ).length;
  }

  function renderAcoes(inst) {
    return (
      <div style={{ display: "flex", gap: "0.25rem" }}>
        <button className="btn btn-sm btn-outline" title="Editar" onClick={() => abrirEditar(inst)}>
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
        <button className="btn btn-sm btn-danger" title="Remover" onClick={() => remover(inst)}>
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Instituições</h1><p>{ativas} ativa{ativas !== 1 ? "s" : ""} de {instituicoes.length}</p></div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <FontAwesomeIcon icon={faBuilding} style={{ marginRight: 6 }} />+ Nova Instituição
        </button>
      </div>

      {/* ── Tabela única, realizadoras em destaque no topo ───── */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Lista de Instituições</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 64 }}>Logo</th>
              <th>Sigla</th>
              <th>Nome Completo</th>
              <th style={{ textAlign: "center" }}>Inscritos</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {todasOrdenadas.map(inst => {
              const inscritos = contarInscritos(inst);
              return (
                <tr
                  key={inst.id}
                  style={{
                    opacity: inst.ativo ? 1 : 0.5,
                    background: inst.realizadora ? "var(--gold-tint)" : undefined,
                  }}
                >
                  <td>
                    {inst.logo_url &&
                      <img src={inst.logo_url} alt={inst.sigla} style={{ height: 32, maxWidth: 56, objectFit: "contain", display: "block" }} />
                    }
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.9rem", color: "var(--navy)" }}>
                      {inst.realizadora && (
                        <span title="Instituição realizadora">
                          <FontAwesomeIcon icon={faStar} style={{ color: "var(--gold, #f0a500)", marginRight: 6 }} />
                        </span>
                      )}
                      {inst.sigla}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{inst.nome}</td>
                  <td style={{ textAlign: "center" }}>
                    {inscritos > 0
                      ? <span className="badge badge-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{inscritos}</span>
                      : <span style={{ color: "var(--text3)", fontSize: "0.82rem" }}>—</span>
                    }
                  </td>
                  <td>
                    <button
                      className={`badge badge-${inst.ativo ? "success" : "danger"}`}
                      style={{ cursor: "pointer", border: "none", background: "none", padding: 0 }}
                      onClick={() => toggleAtivo(inst)}
                      title="Clique para alternar"
                    >
                      {inst.ativo ? "Ativa" : "Inativa"}
                    </button>
                  </td>
                  <td>{renderAcoes(inst)}</td>
                </tr>
              );
            })}
            {todasOrdenadas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>
                  Nenhuma instituição cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Criar / Editar ─────────────────────────────── */}
      <Modal show={modal} onClose={() => setModal(false)} title={form.id ? "Editar Instituição" : "Nova Instituição"} wide>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <AvatarUpload
            fotoUrl={logoPreview}
            iniciais={form.sigla || "?"}
            size={96}
            onFileSelected={(file, previewUrl) => { setLogoFile(file); setLogoPreview(previewUrl); }}
            readonly={uploadingLogo}
          />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Sigla *</label>
            <input
              className="form-input"
              placeholder="ex: UFC"
              value={form.sigla || ""}
              onChange={e => set("sigla", e.target.value.toUpperCase())}
              maxLength={20}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.ativo !== false ? "true" : "false"} onChange={e => set("ativo", e.target.value === "true")}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Nome Completo *</label>
            <input
              className="form-input"
              placeholder="ex: Universidade Federal do Ceará"
              value={form.nome || ""}
              onChange={e => set("nome", e.target.value)}
            />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={!!form.realizadora}
                onChange={e => set("realizadora", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--navy)" }}
              />
              <span className="form-label" style={{ margin: 0 }}>
                <FontAwesomeIcon icon={faStar} style={{ color: "var(--gold, #f0a500)", marginRight: 4 }} />
                Instituição Realizadora
              </span>
            </label>
            <p style={{ margin: "0.25rem 0 0 1.5rem", fontSize: "0.78rem", color: "var(--text3)" }}>
              Marcada aqui, aparece na landing page como realizadora do evento.
            </p>
          </div>
          {form.realizadora && (
            <div className="form-group">
              <label className="form-label">Ordem de exibição</label>
              <input
                type="number"
                className="form-input"
                placeholder="ex: 1"
                min={1}
                value={form.ordem ?? ""}
                onChange={e => set("ordem", e.target.value)}
                style={{ maxWidth: 120 }}
              />
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: "0.5rem" }} onClick={salvar} disabled={uploadingLogo}>
          {uploadingLogo ? "Salvando…" : "Salvar"}
        </button>
      </Modal>
    </div>
  );
}
