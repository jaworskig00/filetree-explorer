import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ValidationIssue } from '../domain/parseTree';
import { useTreeDocument } from '../state/treeDocument';
import sampleTree from '../samples/sampleTree.json';
import { IssueList } from './IssueList';

/** Reading a bigger file into a textarea stops being useful well before this. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const PASTED_SOURCE = 'Pasted JSON';

export function JsonInputPanel() {
  const { load } = useTreeDocument();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('');
  const [sourceName, setSourceName] = useState(PASTED_SOURCE);
  const [errors, setErrors] = useState<readonly ValidationIssue[]>([]);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  function submit(value: string, source: string) {
    const outcome = load(value, source);
    if (outcome.ok) {
      void navigate('/tree');
      return;
    }
    setErrors(outcome.errors);
  }

  function fail(message: string) {
    setErrors([{ at: 'file', message }]);
  }

  async function acceptFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      fail(`"${file.name}" is larger than 25 MB, which this viewer does not load.`);
      return;
    }

    try {
      const content = await file.text();
      setText(content);
      setSourceName(file.name);
      submit(content, file.name);
    } catch {
      fail(`"${file.name}" could not be read.`);
    }
  }

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file twice fires a change event again.
    event.target.value = '';
    if (file !== undefined) void acceptFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggedOver(false);
    const file = event.dataTransfer.files[0];
    if (file !== undefined) void acceptFile(file);
  }

  function loadSample() {
    const content = JSON.stringify(sampleTree, null, 2);
    setText(content);
    setSourceName('Sample tree');
    submit(content, 'Sample tree');
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggedOver(true);
      }}
      onDragLeave={() => setIsDraggedOver(false)}
      onDrop={onDrop}
      className={`rounded-lg border bg-panel/60 p-5 transition-colors ${
        isDraggedOver ? 'border-accent bg-accent-soft/20' : 'border-edge'
      }`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(text, sourceName === PASTED_SOURCE ? PASTED_SOURCE : sourceName);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="tree-json" className="block text-sm font-medium text-ink">
            Directory tree as JSON
          </label>
          <p className="text-sm text-ink-faint">
            Paste it below, drop a <code className="font-mono text-xs">.json</code> file anywhere on
            this panel, or choose a file.
          </p>
          <textarea
            id="tree-json"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSourceName(PASTED_SOURCE);
              setErrors([]);
            }}
            spellCheck={false}
            rows={14}
            placeholder={'{\n  "name": "root",\n  "type": "folder",\n  "children": []\n}'}
            className="w-full resize-y rounded-md border border-edge bg-canvas px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-faint/60"
          />
        </div>

        <IssueList issues={errors} tone="error" title="This tree could not be loaded" />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={text.trim() === ''}
            className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-canvas hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Visualise tree
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-edge-strong px-3.5 py-2 text-sm font-medium text-ink hover:bg-panel-raised"
          >
            Choose a file
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Load a sample tree
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onFileChosen}
            className="hidden"
            aria-label="Upload a JSON file"
          />
        </div>
      </form>
    </div>
  );
}
