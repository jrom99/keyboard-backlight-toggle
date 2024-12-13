import Gio from "gi://Gio";
import GObject from "gi://GObject";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import {
  QuickMenuToggle,
  SystemIndicator,
} from "resource:///org/gnome/shell/ui/quickSettings.js";

import { BrightnessSlider, HueSlider } from "./utils/widgets.js";
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
      this._manager.startPolling();

      this._manager.connect("notify::brightness", () => { this._syncBrightnessSlider() })

      this.connect("clicked", () => {
        this._manager.toggleBrightness(this.checked);
      });

      this._brightnessSlider = new BrightnessSlider();
      this.menu.box.add_child(this._brightnessSlider);

      this._hueSlider = new HueSlider();
      this.menu.box.add_child(this._hueSlider);

      this._brightnessSliderItemChangedId = this._brightnessSlider.connect(
        "notify::value",
        () => {
          this._manager.brightnessPercentage = this._brightnessSlider.value;
        },
      );

      // initial slider sync
      this._syncBrightnessSlider();
    }

    _syncBrightnessSlider() {
      console.log(`${APP_ID}: Syncing brightness slider...`);

      const brightness = this._manager.brightnessPercentage;
      const visible = Number.isInteger(brightness) && brightness >= 0;
      this.visible = visible;

      // hide toggle if backlight is not available (driver misconfig)
      if (!visible) return;

      this.checked = brightness > 0;

      // change without emitting unnecessary event
      this._brightnessSlider.block_signal_handler(
        this._brightnessSliderItemChangedId,
      );
      this._brightnessSlider.value = brightness;
      this._brightnessSlider.unblock_signal_handler(
        this._brightnessSliderItemChangedId,
      );
    }

    destroy() {
      this._manager.stopPolling();
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
    console.log(`${APP_ID}: Enabling extension...`);
    const quickSettings = Main.panel.statusArea.quickSettings;

    this._indicator = new Indicator();
    quickSettings.addExternalIndicator(this._indicator);

    console.log(`${APP_ID}: Hiding original keyboard toggle...`);

    /** @type {QuickMenuToggle} */
    this._originalToggle = quickSettings._backlight.quickSettingsItems[0];

    // toggle.visible is not reliable
    this._originalToggle?.hide();
    this._signalId = this._originalToggle?.connect("show", (toggle) =>
      toggle.hide(),
    );
  }

  disable() {
    console.log(`${APP_ID}: Disabling extension...`);

    console.log(`${APP_ID}: Showing original keyboard toggle...`);
    if (this._signalId !== undefined) {
      this._originalToggle?.disconnect(this._signalId);
      this._originalToggle?.show();
    }

    this._indicator?.quickSettingsItems.forEach((item) => item.destroy());
    this._indicator?.destroy();
    this._indicator = null;
  }
}
