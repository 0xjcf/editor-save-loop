import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { observer } from "mobx-react-lite";
import { docStore } from "./docStore";
import "./App.css";

/**
 * App is the UI shell: it renders derived view data and forwards user intent
 * to the store. Business rules live in the core, not in the component.
 */
const App = observer(() => {
  // Keep view formatting out of the component by projecting state.
  const {
    saveNow,
    statusClass,
    statusLabel,
    revision,
    lastSavedLabel,
    showError,
    errorText,
    canSaveNow
  } = docStore.view;

  // TipTap emits JSON snapshots; the shell treats them as data events.
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Start typing…</p>",
    onUpdate({ editor }) {
      docStore.onEditorChanged(editor.getJSON());
    },
  });

  return (
    <div className="page">
      <div className="panel">
        <h1>MobX Editor Save Loop</h1>

        <div className="meta">
          <div>
            <span className="label">Status</span>
            <span className={`status-badge ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <div>
            <span className="label">Revision</span>
            <span className="value">{revision}</span>
          </div>
          <div>
            <span className="label">Last saved</span>
            <span className="value">{lastSavedLabel}</span>
          </div>
        </div>

        {showError && <div className="error">{errorText}</div>}

        <div className="editor-shell">
          <EditorContent editor={editor} />
        </div>

        <div className="actions">
          <button
            type="button"
            className="primary-btn"
            onClick={saveNow}
            disabled={!canSaveNow}
          >
            Save now
          </button>
        </div>
      </div>
    </div>
  );
});

export default App;
