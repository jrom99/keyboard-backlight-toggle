import Gio from "gi://Gio";
import GUdev from "gi://GUdev?version=1.0";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

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

/* Gio.Subprocess */
Gio._promisify(Gio.Subprocess.prototype, "communicate_async");
Gio._promisify(Gio.Subprocess.prototype, "communicate_utf8_async");
Gio._promisify(Gio.Subprocess.prototype, "wait_async");
Gio._promisify(Gio.Subprocess.prototype, "wait_check_async");

/* Ancillary Methods */
Gio._promisify(
  Gio.DataInputStream.prototype,
  "read_line_async",
  "read_line_finish_utf8",
);
Gio._promisify(Gio.OutputStream.prototype, "write_bytes_async");

/**
 * Run a process synchronously
 * @param {string[]} argv
 */
function runProcess(argv) {
  const proc = Gio.Subprocess.new(
    argv,
    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
  );

  /** @see {@link https://developer.mozilla.org/en-US/docs/Glossary/IIFE} */
  (async () => {
    const [stdout, stderr] = await proc.communicate_utf8_async(null, null);

    const status = proc.get_exit_status();

    if (status !== 0) {
      console.error(
        `${APP_ID}: Comand "${argv.join(" ")}" failed with exit code ${status}: ${stderr.trim()}`,
      );
    } else {
      console.log(`${APP_ID}: Command "${argv.join(" ")}" finished: ${stdout}`);
    }
  })();
}

class Color {
  constructor({ red = 0, green = 0, blue = 0 } = {}) {
    this.red = red;
    this.green = green;
    this.blue = blue;
  }

  toString() {
    return `RGB(${this.red}, ${this.green}, ${this.blue})`;
  }
}

// There is a dbus for brightness, but not for color
// Since we can't monitor sysfs natively, we use polling

export const LedManager = GObject.registerClass(
  {
    Properties: {
      brightness: GObject.ParamSpec.int(
        "brightness",
        "Brightness",
        "Keyboard backlight brightness (from 0 to hardware maximum)",
        GObject.ParamFlags.READWRITE,
        0,
        100, // arbitrary maximum
        0,
      ),
    },
  },
  class LedManager extends GObject.Object {
    constructor() {
      super();

      this._client = new GUdev.Client();
      this._device = this._client.query_by_sysfs_path(`${SYSFS_PREFIX}`);

      this._maxBrightness =
        this._device?.get_sysfs_attr_as_int("max_brightness");
      this._multiIndex = this._device?.get_sysfs_attr_as_strv("multi_index");

      this._brightness = this._device?.get_sysfs_attr_as_int("brightness") ?? 0;
      this._pollIntervalId = null;
    }

    startPolling() {
      const poll = () => {
        this.brightness; // trigger check
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

    /**
     *
     * @param {boolean} off
     */
    toggleBrightness(off) {
      console.log(`${APP_ID}: Toggling brightness ${off ? "off" : "on"}`);
      if (off) {
        /** @type {number} */
        this._oldBrightness = this.brightness;
        this.brightness = 0;
      } else {
        this.brightness = this._oldBrightness ?? this.maxBrightness;
      }
    }

    get maxBrightness() {
      return this._maxBrightness ?? 0;
    }

    get brightness() {
      const newValue =
        this._device?.get_sysfs_attr_as_int_uncached("brightness") ?? 0;
      if (this._brightness !== newValue) {
        this._brightness = newValue;
        this.notify("brightness");
      }
      return this._brightness;
    }

    set brightness(value) {
      value = Math.max(0, Math.min(this.maxBrightness, value));
      if (value === this.brightness) return;

      console.log(
        `${APP_ID}: setting brightness from ${this.brightness} to ${value}`,
      );
      runProcess(["sudo", SCRIPT_PATH, "brightness", value.toString()]);
      this.brightness; // trigger check
    }

    get brightnessPercentage() {
      return (100 * this.brightness) / this.maxBrightness;
    }

    set brightnessPercentage(value) {
      this.brightness = Math.round((value * this.maxBrightness) / 100);
    }

    get multiIndex() {
      return (
        /** @type {[string, string, string]} */ (this._multiIndex) ?? [
          "red",
          "green",
          "blue",
        ]
      );
    }

    get rgb() {
      const colorValues =
        this._device?.get_sysfs_attr_as_strv_uncached("multi_intensity");
      if (!colorValues) return new Color();

      const mergedColor = colorValues
        .map((item, idx) => ({ [this.multiIndex[idx]]: parseInt(item) }))
        .reduce((acc, curr) => ({ ...acc, ...curr }));
      return new Color(mergedColor);
    }
  },
);
