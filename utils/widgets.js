import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import St from "gi://St";
import Gtk from "gi://Gtk?version=4.0";

import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";

import { Slider } from "resource:///org/gnome/shell/ui/slider.js";

const APP_ID = "keyboard-backlight@jrom99.github.com";

// Slider is a Gtk.Scale re-implementation for quick settings

export const HueSliderItem = GObject.registerClass(
  {
    Properties: {
      value: GObject.ParamSpec.int(
        "value",
        "Value",
        "Keyboard backlight color hue percentage",
        GObject.ParamFlags.READWRITE,
        0,
        100,
        0,
      ),
    },
  },
  class HueSliderItem extends PopupMenu.PopupBaseMenuItem {
    constructor() {
      super({
        activate: false,
        style_class: "keyboard-color-item",
      });

      console.log(`${APP_ID}: Creating HueSliderItem...`);
      this._icon = new St.Icon({ iconName: "preferences-color-symbolic" });
      this._slider = new Slider(0);

      this._sliderChangedId = this._slider.connect("notify::value", () =>
        this.notify("value"),
      );
      this._slider.accessible_name = _("Keyboard Color Hue");

      this.add_child(this._icon);
      this.add_child(this._slider);
    }

    get value() {
      return this._slider.value * 100;
    }

    set value(value) {
      if (this.value === value) return;

      this._slider.block_signal_handler(this._sliderChangedId);
      this._slider.value = value / 100;
      this._slider.unblock_signal_handler(this._sliderChangedId);

      this.notify("value");
    }

    /**
     *
     * @param {Clutter.Event} event
     * @returns {boolean}
     */
    vfunc_key_press_event(event) {
      const key = event.get_key_symbol();
      if (key === Clutter.KEY_Left || key === Clutter.KEY_Right)
        return this._slider.vfunc_key_press_event(event);
      else return super.vfunc_key_press_event(event);
    }
  },
);

export const BrightnessSliderItem = GObject.registerClass(
  {
    Properties: {
      value: GObject.ParamSpec.int(
        "value",
        "Value",
        "Keyboard backlight brightness percentage",
        GObject.ParamFlags.READWRITE,
        0,
        100,
        0,
      ),
    },
  },
  class BrightnessSliderItem extends PopupMenu.PopupBaseMenuItem {
    constructor() {
      super({
        activate: false,
        style_class: "keyboard-brightness-item",
      });
      console.log(`${APP_ID}: Creating brightness slider...`);

      this._icon = new St.Icon({ iconName: "keyboard-brightness-symbolic" });
      this._slider = new Slider(0);

      this._sliderChangedId = this._slider.connect("notify::value", () =>
        this.notify("value"),
      );
      this._slider.accessible_name = _("Keyboard Brightness");

      this.add_child(this._icon);
      this.add_child(this._slider);
    }

    get value() {
      return this._slider.value * 100;
    }

    set value(value) {
      if (this.value === value) return;

      this._slider.block_signal_handler(this._sliderChangedId);
      this._slider.value = value / 100;
      this._slider.unblock_signal_handler(this._sliderChangedId);

      this.notify("value");
    }

    /**
     *
     * @param {Clutter.Event} event
     * @returns {boolean}
     */
    vfunc_key_press_event(event) {
      const key = event.get_key_symbol();
      if (key === Clutter.KEY_Left || key === Clutter.KEY_Right)
        return this._slider.vfunc_key_press_event(event);
      else return super.vfunc_key_press_event(event);
    }
  },
);
