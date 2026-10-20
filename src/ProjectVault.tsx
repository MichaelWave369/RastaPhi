import { useEffect, useRef, useState } from 'react';
import { Archive, Download, FileDown, FileUp, FolderOpen, Save, Trash2 } from 'lucide-react';
import { importProjectFile, exportProjectFile } from './lib/portable';
import { validateProject, type RastaProject } from './lib/project';
import {
  deleteProject, listSavedProjects, readProject, storeProject, type SavedProject,
} from './lib/vault';

interface VaultProps {
  title: string;
  setTitle: (title: string) => void;
  snapshot: (title: string) => Promise<RastaProject>;
  restore: (project: RastaProject) => Promise<void>;
}

function projectDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleString();
}

export default function ProjectVault({ title, setTitle, snapshot, restore }: VaultProps) {
  const [saved, setSaved] = useState<SavedProject[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const picker = useRef<HTMLInputElement>(null);

  async function refresh() {
    const entries = await listSavedProjects();
    setSaved(entries);
  }

  useEffect(() => {
    let active = true;
    listSavedProjects().then(rows => {
      if (active) setSaved(rows);
    }).catch(() => {
      if (active) setMessage('Local project storage is unavailable here. Portable file export still works.');
    });
    return () => { active = false; };
  }, []);

  async function run(fn: () => Promise<void>) {
    if (working) return;
    setWorking(true);
    setMessage('');
    try { await fn(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Project vault operation failed.'); }
    finally { setWorking(false); }
  }

  async function saveLocally() {
    await run(async () => {
      const project = validateProject(await snapshot(title));
      await storeProject(project);
      await refresh();
      setMessage('Saved "' + project.title + '" in this browser. Export a portable copy for backup.');
    });
  }

  async function exportPortable() {
    await run(async () => {
      const project = validateProject(await snapshot(title));
      exportProjectFile(project);
      setMessage('Portable project file prepared with source artwork and all project settings.');
    });
  }

  async function importPortable(file?: File) {
    if (!file) return;
    if (!window.confirm('Opening a project will replace the current unsaved editor state. Continue?')) return;
    await run(async () => {
      const project = await importProjectFile(file);
      await restore(project);
      setMessage('Opened "' + project.title + '". It is not stored in the local vault until you choose Save locally.');
    });
  }

  async function openSaved(id: string) {
    if (!window.confirm('Opening this project will replace the current unsaved editor state. Continue?')) return;
    await run(async () => {
      const project = validateProject(await readProject(id));
      await restore(project);
      setMessage('Opened "' + project.title + '" from your browser vault.');
    });
  }

  async function exportSaved(id: string) {
    await run(async () => {
      const project = validateProject(await readProject(id));
      exportProjectFile(project);
      setMessage('Downloaded portable backup for "' + project.title + '".');
    });
  }

  async function removeSaved(id: string, name: string) {
    if (!window.confirm('Delete "' + name + '" from this browser only? This cannot be undone.')) return;
    await run(async () => {
      await deleteProject(id);
      await refresh();
      setMessage('Deleted local copy of "' + name + '". Any downloaded backups remain untouched.');
    });
  }

  return <section className="setting-card vault-card" aria-label="Project Vault">
    <div className="section-title"><span>07 / PROJECT VAULT</span><Archive size={18} /></div>
    <strong className="setting-label">Keep your wall masterpieces.</strong>
    <p className="helper-text">Save your complete project privately on this device, or download a portable .rastaphi.json file to move it elsewhere.</p>
    <label className="vault-name-label" htmlFor="project-title">PROJECT NAME</label>
    <input id="project-title" className="vault-title-input" type="text" maxLength={100}
      value={title} onChange={e => setTitle(e.target.value)} placeholder="Give this project a name" />
    <div className="vault-actions">
      <button type="button" disabled={working || !title.trim()} onClick={saveLocally}><Save size={16} /> SAVE LOCALLY</button>
      <button type="button" disabled={working || !title.trim()} onClick={exportPortable}><FileDown size={16} /> EXPORT FILE</button>
      <button type="button" disabled={working} onClick={() => picker.current?.click()}><FileUp size={16} /> IMPORT FILE</button>
    </div>
    <input ref={picker} className="visually-hidden" type="file" accept=".json,.rastaphi.json,application/json"
      aria-label="Choose a RastaPhi project file" onChange={e => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) void importPortable(file);
      }} />
    {message && <p className="vault-message" role="status">{message}</p>}
    <div className="vault-list-title"><strong>YOUR LOCAL PROJECTS</strong><span>{saved.length} saved</span></div>
    {saved.length === 0
      ? <div className="vault-empty"><FolderOpen size={20} /><span>No saved projects yet. Your first one gets a seat right here.</span></div>
      : <div className="vault-project-list">
        {saved.map(item => <div key={item.id} className="vault-row">
          <div className="vault-project-info">
            <strong title={item.title}>{item.title}</strong>
            <small>{projectDate(item.savedAt)}</small>
            <small title={item.sourceName}>{item.sourceName}</small>
          </div>
          <div className="vault-row-actions">
            <button type="button" disabled={working} onClick={() => void openSaved(item.id)} aria-label={'Open ' + item.title} title="Open"><FolderOpen size={16}/></button>
            <button type="button" disabled={working} onClick={() => void exportSaved(item.id)} aria-label={'Back up ' + item.title} title="Export backup"><Download size={16}/></button>
            <button type="button" disabled={working} onClick={() => void removeSaved(item.id, item.title)} aria-label={'Delete ' + item.title} title="Delete local copy"><Trash2 size={16}/></button>
          </div>
        </div>)}
      </div>}
    <p className="vault-footnote">No account or upload. Local saves stay in this browser and can disappear when site storage is cleared. Downloaded project files are your backups. Saves are manual, not automatic.</p>
  </section>;
}
