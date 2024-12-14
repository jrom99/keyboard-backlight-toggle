import Gio from "gi://Gio";
import GObject from "gi://GObject";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import { QuickMenuToggle, SystemIndicator } from "resource:///org/gnome/shell/ui/quickSettings.js";

import { LightnessSlider, HueSlider } from "./utils/widgets.js";
import { LedManager } from "./utils/manager.js";

const APP_ID = "keyboard-backlight-toggle@jrom99.github.com";

const KeyboardBacklightToggle = GObject.registerClass(
  class KeyboardBacklightToggle extends QuickMenuToggle {
    constructor() {
      super({
        title: _("Keyboard"),
        iconName: "input-keyboard-symbolic",
      });
      this._manager = new LedManager();

      // hide toggle if backlight is not available (driver misconfig)
      if (!this._manager.canRead) {
        this.visible = false;
        console.error(`${APP_ID}: backlight status is not available. Toggle will remain hidden`)
        return;
      }
      if (!this._manager.canWrite) {
        this.visible = false;
        console.error(`${APP_ID}: backlight control is not available. Toggle will remain hidden`);
        return;
      }

      this._lightnessSlider = new LightnessSlider();
      this.menu.box.add_child(this._lightnessSlider);

      this._hueSlider = new HueSlider();
      this.menu.box.add_child(this._hueSlider);

      // connect events
      this.uiHandlers = {
        toggle: this.connect("clicked", () => {
          this._manager.toggleBrightness(this.checked);
        }),
        lightnessSlider: this._lightnessSlider.connect("notify::value", (src) => {
          this._setHardwareListening(false);
          this._manager.lightness = src.value;
          this._setHardwareListening(true);
        }),
        hueSlider: this._hueSlider.connect("notify::value", (src) => {
          this._setHardwareListening(false);
          this._manager.hue = src.value;
          this._setHardwareListening(true);
        }),
      };

      this.hardwareHandlers = {
        brightness: this._manager.connect("hw-brightness-changed", () => this._syncLightnessSlider()),
        color: this._manager.connect("hw-color-changed", () => this._syncHueSlider()),
      };

      // initial slider sync
      this._syncLightnessSlider();
      this._syncHueSlider();
    }

    /** Set UI update behavior due to hardware changes
     * @param {boolean} on
     */
    _setHardwareListening(on) {
      if (this.hardwareHandlers === undefined) return;

      if (on) {
        GObject.signal_handler_unblock(this._manager, this.hardwareHandlers?.brightness);
        GObject.signal_handler_unblock(this._manager, this.hardwareHandlers.color);
      } else {
        GObject.signal_handler_block(this._manager, this.hardwareHandlers?.brightness);
        GObject.signal_handler_block(this._manager, this.hardwareHandlers?.color);
      }
    }

    _syncLightnessSlider() {
      if (this.uiHandlers === undefined || this._lightnessSlider === undefined)
        throw new Error(`${APP_ID}: UI is not available to update.`);

      console.debug(`${APP_ID}: syncing lightness slider...`);

      const lightness = this._manager.lightness;

      this.checked = lightness > 0;

      // change without emitting unnecessary event
      const handlerId = this.uiHandlers.lightnessSlider;

      this._lightnessSlider.block_signal_handler(handlerId);
      this._lightnessSlider.value = lightness;
      this._lightnessSlider.unblock_signal_handler(handlerId);
    }

    _syncHueSlider() {
      if (this.uiHandlers === undefined || this._hueSlider === undefined)
        throw new Error(`${APP_ID}: UI is not available to update.`);

      console.debug(`${APP_ID}: syncing hue slider...`);

      const hue = this._manager.hue;

      // change without emitting unnecessary event
      const handlerId = this.uiHandlers.hueSlider;

      this._hueSlider.block_signal_handler(handlerId);
      this._hueSlider.value = hue;
      this._hueSlider.unblock_signal_handler(handlerId);
    }

    destroy() {
      this._manager.destroy();
      super.destroy();
    }
  },
);

const Indicator = GObject.registerClass(
  class Indicator extends SystemIndicator {
    constructor() {
      super();

      this._indicator = this._addIndicator();
      this._indicator.iconName = "input-keyboard-symbolic";
      this.quickSettingsItems.push(new KeyboardBacklightToggle());

      this._indicator.visible = false;
    }
  },
);

export default class MyExtension extends Extension {
  enable() {
    console.info(`${APP_ID}: Enabling extension...`);
    const quickSettings = Main.panel.statusArea.quickSettings;

    this._indicator = new Indicator();
    quickSettings.addExternalIndicator(this._indicator);

    console.info(`${APP_ID}: Hiding original keyboard toggle...`);

    /** @type {QuickMenuToggle} */
    this._originalToggle = quickSettings._backlight.quickSettingsItems[0];

    // toggle.visible is not reliable
    this._originalToggle?.hide();
    this._signalId = this._originalToggle?.connect("show", (toggle) => toggle.hide());
  }

  disable() {
    console.info(`${APP_ID}: Disabling extension...`);

    console.info(`${APP_ID}: Showing original keyboard toggle...`);
    if (this._signalId !== undefined) {
      this._originalToggle?.disconnect(this._signalId);
      this._originalToggle?.show();
    }

    this._indicator?.quickSettingsItems.forEach((item) => item.destroy());
    this._indicator?.destroy();
    this._indicator = null;
  }
}
