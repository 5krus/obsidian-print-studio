import {App, ButtonComponent, ColorComponent, DropdownComponent, Modal, Setting, TextAreaComponent, TextComponent, ToggleComponent, setIcon} from 'obsidian';
import type {StudioUI} from './ui';

class RemovePresetModal extends Modal {
  private confirmed = false;
  constructor(app: App, private presetName: string, private resolve: (value: boolean) => void) {super(app);}
  onOpen() {
    this.setTitle('Remove preset');
    this.contentEl.createEl('p', {text: `Remove “${this.presetName}”? You can undo this while Print Studio stays open.`});
    const actions = this.contentEl.createDiv({cls: 'modal-button-container'});
    new ButtonComponent(actions).setButtonText('Cancel').onClick(() => this.close());
    new ButtonComponent(actions).setButtonText('Remove').setDestructive().setCta().onClick(() => {this.confirmed = true; this.close();});
  }
  onClose() {this.contentEl.empty(); this.resolve(this.confirmed);}
}

export function obsidianUI(app: App): StudioUI {
  return {
    createElement: (tag, cls = '', text = '') => createEl(tag, {cls, text}),
    setting(parent, name, description) {
      const row = new Setting(parent).setName(name);
      if (description) row.setDesc(description);
      return {element: row.settingEl, control: row.controlEl, name: row.nameEl, description: row.descEl};
    },
    text(parent, value, multiline) {
      return (multiline ? new TextAreaComponent(parent) : new TextComponent(parent)).setValue(value).inputEl;
    },
    dropdown(parent, value, options) {return new DropdownComponent(parent).addOptions(options).setValue(value).selectEl;},
    toggle(parent, value, change) {return new ToggleComponent(parent).setValue(value).onChange(change).toggleEl;},
    color(parent, value, change) {new ColorComponent(parent).setValue(value).onChange(change); return parent.querySelector<HTMLInputElement>('input[type=color]')!;},
    button(parent, label, action, options = {}) {
      const button = new ButtonComponent(parent).onClick(action);
      if (options.icon) button.setIcon(options.icon).setClass('clickable-icon').setTooltip(options.tooltip ?? label);
      else button.setButtonText(label);
      if (options.tooltip && !options.icon) button.setTooltip(options.tooltip);
      if (options.primary) button.setCta();
      button.buttonEl.type = 'button';
      button.buttonEl.setAttribute('aria-label', label);
      return button.buttonEl;
    },
    icon: setIcon,
    confirmRemoval: name => new Promise(resolve => new RemovePresetModal(app, name, resolve).open()),
  };
}
