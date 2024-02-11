import { Plugin } from 'obsidian';

import { onEditorPaste } from 'handle-paste';
import { AdvancedExternalLinksSettings, DEFAULT_SETTINGS, AdvancedExternalLinksSettingTab } from 'settings';


export default class AdvancedExternalLinksPlugin extends Plugin {
	settings: AdvancedExternalLinksSettings;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new AdvancedExternalLinksSettingTab(this));

		this.registerEvent(this.app.workspace.on('editor-paste', onEditorPaste, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
