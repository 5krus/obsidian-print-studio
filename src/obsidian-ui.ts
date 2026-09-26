import {App, ButtonComponent, ColorComponent, DropdownComponent, Menu, Modal, Setting, TextAreaComponent, TextComponent, ToggleComponent, setIcon} from 'obsidian';
import type {StudioUI} from './ui';

class PresetConfirmationModal extends Modal {
  private confirmed = false;
  constructor(app: App, private title: string, private description: string, private action: string, private resolve: (value: boolean) => void) {super(app);}
  onOpen() {
    this.setTitle(this.title);
    this.contentEl.createEl('p', {text: this.description});
    const actions = this.contentEl.createDiv({cls: 'modal-button-container'});
    new ButtonComponent(actions).setButtonText('Cancel').onClick(() => this.close());
    new ButtonComponent(actions).setButtonText(this.action).setDestructive().setCta().onClick(() => {this.confirmed = true; this.close();});
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
    menu(anchor, actions) {
      const menu = new Menu().setUseNativeMenu(false);
      let open = true;
      const close = () => {if (open) menu.hide();};
      menu.onHide(() => {
        open = false;
        anchor.setAttribute('aria-expanded', 'false');
        if (anchor.isConnected) anchor.focus();
      });
      for (const action of actions) {
        if (action.separatorBefore) menu.addSeparator();
        menu.addItem(item => item.setTitle(action.label).setIcon(action.icon).setDisabled(!!action.disabled).onClick(() => {close(); action.action();}));
      }
      anchor.focus();
      anchor.setAttribute('aria-expanded', 'true');
      const rect = anchor.getBoundingClientRect();
      menu.showAtPosition({x: rect.left, y: rect.bottom}, anchor.ownerDocument);
      return close;
    },
    icon: setIcon,
    confirmRemoval: name => new Promise(resolve => new PresetConfirmationModal(app,'Remove preset',`Remove “${name}”? You can undo this while Print Studio stays open.`,'Remove',resolve).open()),
    confirmRestoreBuiltIns: () => new Promise(resolve => new PresetConfirmationModal(app,'Restore built-in presets','Reset Studio letterhead, Editorial and Essential, including any renamed originals. Deleted originals will return. Custom and imported presets stay as they are. You can undo this while Print Studio stays open.','Restore',resolve).open()),
  };
}
