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

import { BrightnessSliderItem, HueSliderItem } from "./utils/widgets.js";
import { brightnessProxy } from "./utils/manager.js";

const APP_ID = "keyboard-backlight@jrom99.github.com";


const KeyboardBacklightToggle = GObject.registerClass(
  class KeyboardBacklightToggle extends QuickMenuToggle {
    constructor() {
      super({
        title: _("RGB Keyboard"),
        iconName: "input-keyboard-symbolic",
      });

      console.log(`${APP_ID}: Creating QuickMenuToggle...`);
      this._brightnessProxy = brightnessProxy(this);

      this.connect("clicked", () => {
        console.log(`${APP_ID}: Clicked on toggle, switching brightness`);
        this._brightnessProxy.Brightness = this.checked
          ? 0
          : 100;
      });

      this._brightnessSlider = new BrightnessSliderItem();
      this.menu.box.add_child(this._brightnessSlider);

      this._hueSlider = new HueSliderItem();
      this.menu.box.add_child(this._hueSlider);

      this._brightnessSliderItemChangedId = this._brightnessSlider.connect(
        "notify::value",
        () => {
          if (this._brightnessSlider.visible)
            console.log(
              `${APP_ID}: Changed brightness value to ${this._brightnessSlider.value}`,
            );
          this._brightnessProxy.Brightness = this._brightnessSlider.value;
        },
      );

      this._hueSliderItemChangedId = this._hueSlider.connect(
        "notify::value",
        () => {
          if (this._hueSlider.visible)
            console.log(
              `${APP_ID}: Changed hue value to ${this._hueSlider.value}`,
            );
        },
      );

      this._sync(); // first sync
    }

    _sync() {
      this._syncBrightness();
    }

    _syncBrightness() {
      console.log(`${APP_ID}: Syncing brightness...`);

      const brightness = this._brightnessProxy.Brightness;
      const visible = Number.isInteger(brightness) && brightness >= 0;
      this.visible = visible;

      // hide toggle if backlight is not available (driver misconfig)
      if (!visible) return;

      this.checked = brightness > 0;

      this._brightnessSlider.block_signal_handler(
        this._brightnessSliderItemChangedId,
      );
      this._brightnessSlider.value = brightness;
      this._brightnessSlider.unblock_signal_handler(
        this._brightnessSliderItemChangedId,
      );
    }
  },
);

const Indicator = GObject.registerClass(
  class Indicator extends SystemIndicator {
    constructor() {
      super();
      console.log(`${APP_ID}: Creating panel indicator...`);

      this._indicator = this._addIndicator();
      this._indicator.iconName = "input-keyboard-symbolic";
      this.quickSettingsItems.push(new KeyboardBacklightToggle());

      this._indicator.visible = false;
    }
  },
);

// TODO: hide default keyboard
export default class MyExtension extends Extension {
  enable() {
    console.log(`${APP_ID}: Enabling extension...`);
    this._indicator = new Indicator();
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    console.log(`${APP_ID}: Disabling extension...`);
    this._indicator?.quickSettingsItems.forEach((item) => item.destroy());
    this._indicator?.destroy();
    this._indicator = null;
  }
}
