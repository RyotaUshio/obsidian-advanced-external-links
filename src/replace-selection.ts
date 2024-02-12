import { Editor, EditorPosition, EditorRange, EditorSelection } from 'obsidian';


/**
 * Replace the current selections with the text fetched asynchronously from the given promise.
 * Takes care of the selections changing while the text is being fetched.
 */
export const replaceSelectionAsync = async (editor: Editor, textPromise: Promise<string | null>) => {
    // Get the current selections before fetching the text
    // because the selections might change when the text is fetched
    const selections = editor.listSelections();

    const text = await textPromise;
    if (text === null) return; // Do nothing if fetching the text failed

    for (const selection of selections) {
        // the last parameter `origin` is passed to CodeMirror's Transaction.userEvent.of(...)
        // (https://codemirror.net/docs/ref/#state.Transaction^userEvent).
        const { from, to } = editorSelectionToEditorRange(selection);
        editor.replaceRange(text, from, to, 'input.paste');
    }
};

const comesBefore = (pos1: EditorPosition, pos2: EditorPosition) => {
    return pos1.line === pos2.line ? pos1.ch <= pos2.ch : pos1.line < pos2.line;
}

const editorSelectionToEditorRange = (selection: EditorSelection): EditorRange => {
    return comesBefore(selection.anchor, selection.head) ? {
        from: selection.anchor,
        to: selection.head,
    } : {
        from: selection.head,
        to: selection.anchor,
    };
}
