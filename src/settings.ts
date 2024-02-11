import { Component, DropdownComponent, IconName, MarkdownRenderer, Notice, PluginSettingTab, Setting, setIcon, setTooltip } from 'obsidian';

import AdvancedExternalLinksPlugin from 'main';


export interface namedTemplate {
	name: string;
	template: string;
	requireFetch: boolean;
}

export interface AdvancedExternalLinksSettings {
	handleHighlightUrlOnly: boolean;
	formats: namedTemplate[];
	formatIndex: number;
	noticeWhileFetching: boolean;
}

type KeysOfType<Obj, Type> = NonNullable<{ [k in keyof Obj]: Obj[k] extends Type ? k : never }[keyof Obj]>;

export const DEFAULT_SETTINGS: AdvancedExternalLinksSettings = {
	handleHighlightUrlOnly: true,
	formats: [
		{
			name: 'Quote',
			template: '> [{{title}}]({{url}})\n> {{text}}\n',
			requireFetch: true,
		},
		{
			name: 'Link only',
			template: '[{{title}}]({{url}})',
			requireFetch: true,
		},
		{
			name: 'Callout',
			template: '> [!QUOTE] [{{title}}]({{url}})\n> {{text}}\n',
			requireFetch: true,
		},
		{
			name: 'Quote in callout',
			template: '> [!QUOTE] [{{title}}]({{url}})\n> > {{text}}\n> \n> ',
			requireFetch: true,
		},
		{
			name: 'Create new note',
			template: '{{app.vault.create(text + ".md", `[${title}](${url})`).then((file) => app.workspace.getLeaf(true).openFile(file)), ""}}',
			requireFetch: true,
		}
	],
	formatIndex: 0,
	noticeWhileFetching: true,
};


export class AdvancedExternalLinksSettingTab extends PluginSettingTab {
	component: Component;
	items: Partial<Record<keyof AdvancedExternalLinksSettings, Setting>>;
	promises: Promise<any>[];

	constructor(public plugin: AdvancedExternalLinksPlugin) {
		super(plugin.app, plugin);
		this.component = new Component();
		this.items = {};
		this.promises = [];
	}

	addSetting(settingName?: keyof AdvancedExternalLinksSettings) {
		const item = new Setting(this.containerEl);
		if (settingName) this.items[settingName] = item;
		return item;
	}

	addHeading(heading: string, icon?: IconName) {
		return this.addSetting()
			.setName(heading)
			.setHeading()
			.then((setting) => {
				if (icon) {
					const iconEl = createDiv();
					setting.settingEl.prepend(iconEl)
					setIcon(iconEl, icon);
				}
			});
	}

	addToggleSetting(settingName: KeysOfType<AdvancedExternalLinksSettings, boolean>, extraOnChange?: (value: boolean) => void) {
		return this.addSetting(settingName)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addIndexDropdownSetting(settingName: KeysOfType<AdvancedExternalLinksSettings, number>, options: readonly string[], display?: (option: string) => string, extraOnChange?: (value: number) => void): Setting {
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const option of options) {
					const displayName = display?.(option) ?? option;
					dropdown.addOption(option, displayName);
				}
				const index = this.plugin.settings[settingName];
				const option = options[index];
				dropdown.setValue(option)
					.onChange(async (value) => {
						const newIndex = options.indexOf(value);
						if (newIndex !== -1) {
							this.plugin.settings[settingName] = newIndex;
							await this.plugin.saveSettings();
							extraOnChange?.(newIndex);
						}
					});
			});
	}

	addDesc(desc: string) {
		return this.addSetting()
			.setDesc(desc);
	}

	addFundingButton() {
		return this.addHeading('Support development', 'lucide-heart')
			.setDesc('If you find PDF++ helpful, please consider supporting the development to help me keep this plugin alive.\n\nIf you prefer PayPal, please make donations via Ko-fi. Thank you!')
			.then((setting) => {
				const infoEl = setting.infoEl;
				const iconEl = setting.settingEl.firstElementChild;
				if (!iconEl) return;

				const container = setting.settingEl.createDiv();
				container.appendChild(iconEl);
				container.appendChild(infoEl);
				setting.settingEl.prepend(container);

				setting.settingEl.id = 'pdf-plus-funding';
				container.id = 'pdf-plus-funding-icon-info-container';
				iconEl.id = 'pdf-plus-funding-icon';
			})
			.addButton((button) => {
				button
					.setButtonText('GitHub Sponsors')
					.onClick(() => {
						open('https://github.com/sponsors/RyotaUshio');
					});
			})
			.addButton((button) => {
				button
					.setButtonText('Buy Me a Coffee')
					.onClick(() => {
						open('https://www.buymeacoffee.com/ryotaushio');
					});
			})
			.addButton((button) => {
				button
					.setButtonText('Ko-fi')
					.onClick(() => {
						open('https://ko-fi.com/ryotaushio');
					});
			});
	}

	async renderMarkdown(lines: string[] | string, el: HTMLElement) {
		this.promises.push(this._renderMarkdown(lines, el));
		el.addClass('markdown-rendered');
	}

	async _renderMarkdown(lines: string[] | string, el: HTMLElement) {
		await MarkdownRenderer.render(this.app, Array.isArray(lines) ? lines.join('\n') : lines, el, '', this.component);
		if (el.childNodes.length === 1 && el.firstChild instanceof HTMLParagraphElement) {
			el.replaceChildren(...el.firstChild.childNodes);
		}
	}


	addNameValuePairListSetting<Item>(items: Item[], index: number, defaultIndexKey: KeysOfType<AdvancedExternalLinksSettings, number>, accesors: {
		getName: (item: Item) => string,
		setName: (item: Item, value: string) => void,
		getValue: (item: Item) => string,
		setValue: (item: Item, value: string) => void,
	}, configs: {
		name: {
			placeholder: string,
			formSize: number,
			duplicateMessage: string,
		},
		value: {
			placeholder: string,
			formSize: number,
			formRows?: number, // for multi-line value
		},
		delete: {
			deleteLastMessage: string,
		}
	}) {
		const { getName, setName, getValue, setValue } = accesors;
		const item = items[index];
		const name = getName(item);
		const value = getValue(item);

		return this.addSetting()
			.addText((text) => {
				text.setPlaceholder(configs.name.placeholder)
					.then((text) => {
						text.inputEl.size = configs.name.formSize;
						setTooltip(text.inputEl, configs.name.placeholder);
					})
					.setValue(name)
					.onChange(async (newName) => {
						if (items.some((item) => getName(item) === newName)) {
							new Notice(configs.name.duplicateMessage);
							text.inputEl.addClass('error');
							return;
						}
						text.inputEl.removeClass('error');
						setName(item, newName);

						const setting = this.items[defaultIndexKey];
						if (setting) {
							const optionEl = (setting.components[0] as DropdownComponent).selectEl.querySelector<HTMLOptionElement>(`:scope > option:nth-child(${index + 1})`);
							if (optionEl) {
								optionEl.value = newName;
								optionEl.textContent = newName;
							}
						}

						await this.plugin.saveSettings();
					});
			})
			.then((setting) => {
				if (configs.value.hasOwnProperty('formRows')) {
					setting.addTextArea((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((textarea) => {
								textarea.inputEl.rows = configs.value.formRows!;
								textarea.inputEl.cols = configs.value.formSize;
								setTooltip(textarea.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					});
				} else {
					setting.addText((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((text) => {
								text.inputEl.size = configs.value.formSize;
								setTooltip(text.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					})
				}
			})
			.addExtraButton((button) => {
				button.setIcon('trash')
					.setTooltip('Delete')
					.onClick(async () => {
						if (items.length === 1) {
							new Notice(configs.delete.deleteLastMessage);
							return;
						}
						items.splice(index, 1);
						if (this.plugin.settings[defaultIndexKey] >= index) {
							this.plugin.settings[defaultIndexKey]--;
						}
						await this.plugin.saveSettings();
						this.redisplay();
					});
			})
			.setClass('no-border');
	}

	addNamedTemplatesSetting(items: namedTemplate[], index: number, defaultIndexKey: KeysOfType<AdvancedExternalLinksSettings, number>, configs: Parameters<AdvancedExternalLinksSettingTab['addNameValuePairListSetting']>[4]) {
		return this.addNameValuePairListSetting(
			items,
			index,
			defaultIndexKey, {
			getName: (item) => item.name,
			setName: (item, value) => { item.name = value },
			getValue: (item) => item.template,
			setValue: (item, value) => { item.template = value },
		}, configs);
	}

	addFormatsSetting(index: number) {
		return this.addNamedTemplatesSetting(
			this.plugin.settings.formats,
			index,
			'formatIndex', {
			name: {
				placeholder: 'format name',
				formSize: 30,
				duplicateMessage: 'This name is already used.',
			},
			value: {
				placeholder: 'Copied text format',
				formSize: 50,
				formRows: 3,
			},
			delete: {
				deleteLastMessage: 'You cannot delete the last format.',
			}
		});
	}

	/** Refresh the setting tab and then scroll back to the original position. */
	async redisplay() {
		const scrollTop = this.containerEl.scrollTop;
		this.display();
		this.containerEl.scroll({ top: scrollTop });
	}

	async display(): Promise<void> {
		this.containerEl.empty();
		this.containerEl.addClass('paste-link-to-highlight-settings');
		this.promises = [];
		this.component.load();

		this.addToggleSetting('noticeWhileFetching')
			.setName('Show notice while fetching page title');
		this.addToggleSetting('handleHighlightUrlOnly')
			.setName('Handle link to highlight only')
			.setDesc('If disabled, this plugin can be used as a replacement for the Auto Link Title plugin.');

		this.addHeading('Paste formats', 'lucide-clipboard-paste');
		this.addSetting()
			.then((setting) => {
				this.renderMarkdown([
					'Each `{{ ...}}` will be evaluated as a JavaScript expression given the variables listed below.',
					'',
					'- `url` or `highlightUrl`: link to the highlight',
					'- `pageUrl`: link to the page',
					'- `text`: highlighted text',
					'- `title`: title of the page',
				], setting.descEl);
			});
		for (let index = 0; index < this.plugin.settings.formats.length; index++) {
			this.addFormatsSetting(index);
		}
		this.addIndexDropdownSetting('formatIndex', this.plugin.settings.formats.map((format) => format.name));

		this.addFundingButton();

		await Promise.all(this.promises);
	}

	hide() {
		this.plugin.settings.formats = this.plugin.settings.formats.filter((format) => format.name && format.template);

		this.promises = [];
		this.component.unload();
		this.containerEl.empty();
	}
}
