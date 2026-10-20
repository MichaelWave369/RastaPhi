import { useRef, useState } from 'react';
import { ArrowLeftRight, Download, FileUp, Link2, ShieldCheck } from 'lucide-react';
import {
  BRIDGE_FORMAT, createCreativeBridge, bridgeFilename, parseCreativeBridgeJSON,
} from './lib/bridge';
import { MAX_PROJECT_BYTES, type ProjectSettings, type RastaProject } from './lib/project';

interface Props {
  snapshot: () => Promise<RastaProject>;
  restore: (project: RastaProject) => Promise<void>;
  getSettings: () => ProjectSettings;
}

function downloadHandoff(project: RastaProject) {
  const bridge = createCreativeBridge(project);
  const blob = new Blob([JSON.stringify(bridge, null, 2)], { type: 'application/json' });
  if (blob.size > MAX_PROJECT_BYTES) {
    throw new Error('The artwork is too large for a portable 44 MB bridge file.');
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = bridgeFilename(project.title);
  document.body.appendChild(a);
  try { a.click(); }
  finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30000);
  }
}

export default function CreativeBridgePanel({ snapshot, restore, getSettings }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function exportBridge() {
    if (working) return;
    setWorking(true);
    setMessage('');
    try {
      const project = await snapshot();
      downloadHandoff(project);
      setMessage('Creative Bridge file prepared with embedded artwork and current settings. No upload occurred.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to export Creative Bridge.');
    } finally { setWorking(false); }
  }

  async function importBridge(file?: File) {
    if (!file || working) return;
    setWorking(true);
    setMessage('');
    try {
      if (file.size > MAX_PROJECT_BYTES) throw new Error('Creative Bridge files must be under 44 MB.');
      const data = parseCreativeBridgeJSON(await file.text(), getSettings());
      if (!window.confirm(
        'Import "' + data.bridge.title + '" from ' + data.bridge.sourceApp +
        '? This replaces unsaved artwork and current editor settings. Continue?',
      )) return;
      await restore(data.project);
      setMessage('Imported "' + data.bridge.title + '" from ' + data.bridge.sourceApp +
        '". The artwork is local. Save to Project Vault for a durable backup.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import Creative Bridge file.');
    } finally { setWorking(false); }
  }

  return <section className="setting-card creative-bridge-card" aria-label="Creative Bridge">
    <div className="section-title"><span>08 / CREATIVE BRIDGE</span><ArrowLeftRight size={18}/></div>
    <strong className="setting-label">From digital canvas to physical wall.</strong>
    <p className="helper-text">Exchange complete artwork with compatible creative tools using a standalone, versioned handoff file.</p>
    <div className="bridge-actions">
      <button type="button" disabled={working} onClick={() => void exportBridge()}>
        <Download size={16} /> EXPORT BRIDGE
      </button>
      <button type="button" disabled={working} onClick={() => picker.current?.click()}>
        <FileUp size={16}/> IMPORT BRIDGE
      </button>
    </div>
    <input ref={picker} className="visually-hidden" type="file"
      accept=".json,.rastaphi-bridge.json,application/json"
      aria-label="Open a Creative Bridge handoff"
      onChange={e => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) void importBridge(file);
      }} />
    <div className="bridge-protocol">
      <div><ShieldCheck size={15} /><span>EMBEDDED ART ONLY</span></div>
      <p>Imports never fetch remote photos or execute artwork scripts. SVG gets sanitized on restore. A source link is metadata, not an image download.</p>
      <div><Link2 size={15} /><span>{BRIDGE_FORMAT} · V1</span></div>
      <p>Works now for RastaPhi and any app that exports the documented JSON format. Other apps need a compatible exporter first.</p>
    </div>
    {message && <p className="vault-message" role="status">{message}</p>}
    <p className="helper-text">Bridge files can contain the complete image or photo collection. Review them before sharing. Import replaces the current unsaved editor design.</p>
  </section>;
}
