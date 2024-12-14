import GUdev from "gi://GUdev?version=1.0";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

import { runProcess, Color, clampInt } from "./helpers.js";

const APP_ID = "keyboard-backlight-toggle@jrom99.github.com";
const SYSFS_PREFIX = "/sys/class/leds/rgb:kbd_backlight";

const SCRIPT_PATH = GLib.build_filenamev([
  GLib.get_home_dir(),
  ".local",
  "share",
  "gnome-shell",
  "extensions",
  APP_ID,
  "utils",
  "kbd-light",
]);

// There is a dbus for brightness, but not for color
// Since we can't monitor sysfs natively, we use polling

export const LedManager = GObject.registerClass(
  {
    Properties: {
      brightness: GObject.ParamSpec.int(
        "lightness",
        "Lightness",
        "Keyboard backlight adjusted lightness",
        GObject.ParamFlags.READWRITE,
        0,
        100,
        0,
      ),
      hue: GObject.ParamSpec.int(
        "hue",
        "Hue",
        "Keyboard backlight adjusted hue color",
        GObject.ParamFlags.READWRITE,
        0,
        360,
        0,
      ),
    },
    Signals: {
      "hw-brightness-changed": {},
      "hw-color-changed": {},
    },
  },
  class LedManager extends GObject.Object {
    constructor() {
      super();

      this._client = new GUdev.Client();
      this._device = this._client.query_by_sysfs_path(`${SYSFS_PREFIX}`);

      const [c1, c2, c3] = this._device?.get_sysfs_attr_as_strv("multi_index") ?? ["red", "green", "blue"];

      /** Order of the colors as defined in the multi_intensity file
       * @type {[string, string, string]}
       */
      this._HWmultiIndex = [c1, c2, c3];

      /** Hardware defined maximum brightness
       * @type {number}
       */
      this._HWmaxBrightness = this._device?.get_sysfs_attr_as_int("max_brightness") ?? 0;

      this._pollIntervalId = null;

      /** HSL internal state holder
       * @type {undefined | number}
       */
      this._hue;
      /** HSL internal state holder
       * @type {undefined | number}
       */
      this._lightness;

      /** HSL (constant) saturation
       * @type {number}
       */
      this.saturation = 100;

      this.startPolling();
    }

    startPolling() {
      const poll = () => {
        this.lightness;
        this.hue;
        this._pollIntervalId = setTimeout(poll, 100);
      };
      poll();
    }

    stopPolling() {
      if (this._pollIntervalId) {
        clearTimeout(this._pollIntervalId);
        this._pollIntervalId = null;
      }
    }

    /** Brightness as reported by the kernel */
    get _HardwareBrightness() {
      return this._device?.get_sysfs_attr_as_int_uncached("brightness") ?? 0;
    }

    set _HardwareBrightness(value) {
      const oldValue = this._HardwareBrightness;
      const newValue = clampInt(value, 0, this._HWmaxBrightness);
      if (oldValue === newValue) return;

      console.debug(`${APP_ID}: changing hardware brightness from ${oldValue} to ${newValue}`);
      const status = runProcess(["sudo", SCRIPT_PATH, "brightness", newValue.toString()]);
      if (status === 0) this.emit("hw-brightness-changed");
    }

    /** RGB as reported by the kernel */
    get _HardwareRgb() {
      const colorValues = this._device?.get_sysfs_attr_as_strv_uncached("multi_intensity");
      if (!colorValues) return { red: 255, green: 255, blue: 255 };

      const mergedColor = colorValues
        .map((item, idx) => ({ [this._HWmultiIndex[idx]]: parseInt(item) }))
        .reduce((acc, curr) => ({ ...acc, ...curr }));

      return {
        red: mergedColor.red,
        green: mergedColor.green,
        blue: mergedColor.blue,
      };
    }

    set _HardwareRgb({ red, green, blue }) {
      const { red: or, green: og, blue: ob } = this._HardwareRgb;

      const nr = clampInt(red, 0, 255);
      const ng = clampInt(green, 0, 255);
      const nb = clampInt(blue, 0, 255);

      if (or === nr && og === ng && ob === nb) return;

      console.debug(`${APP_ID}: changing hardware color from rgb(${or}, ${og}, ${ob}) to rgb(${nr}, ${ng}, ${nb})`);
      const status = runProcess(["sudo", SCRIPT_PATH, "color", nr.toString(), ng.toString(), nb.toString()]);
      if (status === 0) this.emit("hw-color-changed");
    }

    /** If the manager can read hardware changes */
    get canRead() {
      return typeof this._device?.get_sysfs_attr_as_int_uncached("max_brightness") === "number";
    }

    /** If the manager can write changes to hardware */
    get canWrite() {
      return runProcess(["sudo", SCRIPT_PATH, "--help"]) === 0;
    }

    /** Canonical adjusted RGB
     * @see {@link https://www.kernel.org/doc/html/latest/leds/leds-class-multicolor.html}
     */
    get rgb() {
      const { red, green, blue } = this._HardwareRgb;
      const brightness = this._HardwareBrightness;
      const maxBrightness = this._HWmaxBrightness;
      return {
        red: Math.round((red * brightness) / maxBrightness),
        green: Math.round((green * brightness) / maxBrightness),
        blue: Math.round((blue * brightness) / maxBrightness),
      };
    }

    /** Switch brightness between on and off status, remembering the previous brightness
     * @param {boolean} off
     */
    toggleBrightness(off) {
      console.debug(`${APP_ID}: Toggling brightness ${off ? "off" : "on"}`);
      if (off) {
        this._oldBrightness = this._HardwareBrightness;
        this._HardwareBrightness = 0;
      } else {
        this._HardwareBrightness = this._oldBrightness ?? this._HWmaxBrightness;
        this._oldBrightness = null;
      }
    }

    get lightness() {
      const oldValue = this._lightness;
      const newValue = this._HardwareBrightness === 0 ? 0 : Color.RGBToHSL(this.rgb).lightness;
      if (oldValue !== newValue) {
        this._lightness = newValue;
        this.notify("lightness");
      }
      return newValue;
    }

    get hue() {
      const oldValue = this._hue;
      const newValue = Color.RGBToHSL(this.rgb).hue;
      if (oldValue !== newValue) {
        this._hue = newValue;
        this.notify("hue");
      }

      return newValue;
    }

    /** @param {number} value */
    set lightness(value) {
      const newValue = clampInt(value, 0, 100);
      const oldValue = this.lightness;
      const oldHue = this.hue;
      if (oldValue === newValue) return;

      console.debug(`${APP_ID}: setting lightness from ${oldValue}% to ${newValue}%`);

      if (newValue === 0) {
        this._HardwareBrightness = 0;
        return;
      } else if (newValue === 100) {
        this._HardwareBrightness === this._HWmaxBrightness;
        return;
      }

      const { red, green, blue } = Color.HSLToRGB({
        lightness: newValue,
        saturation: this.saturation,
        hue: oldHue,
      });
      const { red: curRed, green: curGreen, blue: curBlue } = this._HardwareRgb;
      const { red: canRed, green: canGreen, blue: canBlue } = this.rgb;
      console.debug(
        `${APP_ID}: canonical color rgb(${red} ${green} ${blue}), current color rgb(${curRed} ${curGreen} ${curBlue}) and brightness ${this._HardwareBrightness} (canonical rgb(${canRed} ${canGreen} ${canBlue}))`,
      );

      this._HardwareRgb = { red, green, blue };
      this._HardwareBrightness = this._HWmaxBrightness;

      this.notify("lightness");
    }

    /** @param {number} value */
    set hue(value) {
      const newValue = clampInt(value, 0, 360);
      const oldValue = this.hue;
      const oldLightness = this.lightness;
      if (oldValue === newValue) return;

      console.debug(`${APP_ID}: setting hue from ${this.hue} to ${value}`);

      const { red, green, blue } = Color.HSLToRGB({
        lightness: oldLightness,
        saturation: this.saturation,
        hue: newValue,
      });
      const { red: curRed, green: curGreen, blue: curBlue } = this._HardwareRgb;
      console.debug(
        `${APP_ID}: canonical color rgb(${red} ${green} ${blue}), current color rgb(${curRed} ${curGreen} ${curBlue}) and brightness ${this._HardwareBrightness}`,
      );

      this._HardwareRgb = { red, green, blue };
      this._HardwareBrightness = this._HWmaxBrightness;

      this.notify("hue");
    }

    destroy() {
      this.stopPolling();
    }
  },
);
