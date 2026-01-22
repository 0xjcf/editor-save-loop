import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { observer } from "mobx-react-lite";
import { docStore } from "./docStore";
import { projectDoc } from "./projection";
import "./App.css";

/**
 * App is the UI shell: it renders derived view data and forwards user intent
 * to the store. Business rules live in the core, not in the component.
 */
const App = observer(() => {
  // Keep view formatting out of the component by projecting state.
  const view = projectDoc(docStore.state);

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
            <span className={`status-badge status-badge--${docStore.state.status}`}>
              {view.statusLabel}
            </span>
          </div>
          <div>
            <span className="label">Revision</span>
            <span className="value">{docStore.state.revision}</span>
          </div>
          <div>
            <span className="label">Last saved</span>
            <span className="value">{view.lastSavedLabel}</span>
          </div>
        </div>

        {view.showError && <div className="error">{view.errorText}</div>}

        <div className="editor-shell">
          <EditorContent editor={editor} />
        </div>

        <div className="actions">
          <button
            type="button"
            className="primary-btn"
            onClick={docStore.saveNow}
            disabled={!view.canSaveNow}
          >
            Save now
          </button>
        </div>
      </div>
    </div>
  );
});

export default App;
