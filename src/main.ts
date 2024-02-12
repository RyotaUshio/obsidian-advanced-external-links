import { Editor, Notice, Plugin, requestUrl } from 'obsidian';

import { AdvancedExternalLinksSettings, DEFAULT_SETTINGS, AdvancedExternalLinksSettingTab } from 'settings';
import { TemplateProcessor } from 'template';
import { replaceSelectionAsync } from 'replace-selection';


export default class AdvancedExternalLinksPlugin extends Plugin {
	settings: AdvancedExternalLinksSettings;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new AdvancedExternalLinksSettingTab(this));

		this.registerEvent(this.app.workspace.on('editor-paste', this.onEditorPaste, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onEditorPaste(evt: ClipboardEvent, editor: Editor) {
		if (evt.defaultPrevented) return;

		const data = evt.clipboardData?.getData('text/plain');
		if (!data) return;

		const match = data.match(/^(https:\/\/[^#]*)(#:~:text=(.*))?/);
		if (!match) return;

		const pageUrl = match[1];
		const highlightUrl = match[0];
		const text = decodeURIComponent(match[3]);

		if (match[2] === undefined) {
			if (this.settings.handleHighlightUrlOnly) return;

			evt.preventDefault();

			replaceSelectionAsync(
				editor,
				this.fetchTitle(pageUrl)
					.then(title => `[${title}](${pageUrl})`)
			);
			return;
		}

		evt.preventDefault();

		replaceSelectionAsync(
			editor,
			this.formatHighlight(pageUrl, highlightUrl, text)
		);
	};

	async fetchTitle(url: string): Promise<string> {
		let notice: Notice | null = null;
		if (this.settings.noticeWhileFetching) {
			notice = new Notice(`${this.manifest.name}: Fetching page title...`, 0);
		}
		const res = await requestUrl(url);
		const doc = new DOMParser().parseFromString(res.text, 'text/html');
		notice?.hide();

		return doc.title;
	}

	async formatHighlight(pageUrl: string, highlightUrl: string, text: string): Promise<string | null> {
		const processor = new TemplateProcessor({
			pageUrl,
			highlightUrl,
			url: highlightUrl,
			text
		});

		const format = this.settings.formats[this.settings.formatIndex];

		if (format.requireFetch) {
			const title = await this.fetchTitle(pageUrl);
			processor.setVariable('title', title);
		}

		let evaluated: string | null = null;

		try {
			evaluated = processor.evalTemplate(format.template);
		} catch (err) {
			console.error(err);
			new Notice(`${this.manifest.name}: Paste format is invalid. Error: ${err.message}`);
		}

		return evaluated;
	}
}
