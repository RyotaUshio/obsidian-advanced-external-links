import { Editor, Notice, requestUrl } from 'obsidian';

import AdvancedExternalLinksPlugin from 'main';
import { TemplateProcessor } from 'template';


export async function onEditorPaste(evt: ClipboardEvent, editor: Editor) {
    const plugin = this as AdvancedExternalLinksPlugin;

    if (evt.defaultPrevented) return;

    const data = evt.clipboardData?.getData('text/plain');
    if (!data) return;

    const match = data.match(/^(https:\/\/[^#]*)(#:~:text=(.*))?/);
    if (!match) return;

    const pageUrl = match[1];
    const highlightUrl = match[0];
    const text = decodeURIComponent(match[3]);

    if (match[2] === undefined) {
        if (plugin.settings.handleHighlightUrlOnly) return;

        evt.preventDefault();

        const title = await fetchTitle(plugin, pageUrl);
        editor.replaceSelection(`[${title}](${pageUrl})`);
        return;
    }

    evt.preventDefault();

    const processor = new TemplateProcessor({
        pageUrl,
        highlightUrl,
        url: highlightUrl,
        text
    });

    const format = plugin.settings.formats[plugin.settings.formatIndex];

    if (format.requireFetch) {
        const title = await fetchTitle(plugin, pageUrl);
        processor.setVariable('title', title);
    }

    try {
        const evaluated = processor.evalTemplate(format.template);
        editor.replaceSelection(evaluated);
    } catch (err) {
        console.error(err);
        new Notice(`${plugin.manifest.name}: Paste format is invalid. Error: ${err.message}`);
    }
};

async function fetchTitle(plugin: AdvancedExternalLinksPlugin, url: string) {
    let notice: Notice | null = null;
    if (plugin.settings.noticeWhileFetching) {
        notice = new Notice(`${plugin.manifest.name}: Fetching page title...`, 0);
    }
    const res = await requestUrl(url);
    const doc = new DOMParser().parseFromString(res.text, 'text/html');
    notice?.hide();

    return doc.title;
}
