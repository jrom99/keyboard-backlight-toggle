import Gio from "gi://Gio";

const APP_ID = "keyboard-backlight-toggle@jrom99.github.com";

/* Gio.Subprocess */
Gio._promisify(Gio.Subprocess.prototype, "communicate_async");
Gio._promisify(Gio.Subprocess.prototype, "communicate_utf8_async");
Gio._promisify(Gio.Subprocess.prototype, "wait_async");
Gio._promisify(Gio.Subprocess.prototype, "wait_check_async");

/* Ancillary Methods */
Gio._promisify(Gio.DataInputStream.prototype, "read_line_async", "read_line_finish_utf8");
Gio._promisify(Gio.OutputStream.prototype, "write_bytes_async");

/**
 * Run a process synchronously
 * @param {string[]} argv
 */
export function runProcess(argv) {
  const proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

  const [, stdout, stderr] = proc.communicate_utf8(null, null);
  const status = proc.get_exit_status();

  if (status !== 0) {
    console.error(`${APP_ID}: Comand "${argv.join(" ")}" failed with exit code ${status}, stderr: ${stderr.trim()}`);
  }
  return status;
}

export class Color {
  /**
   * Converts between color spaces `[0-255, 0-255, 0-255]` to `[0-360, 0-100, 0-100]`
   * @see {@link https://css-tricks.com/converting-color-spaces-in-javascript/}
   * @param {{red: number, green: number, blue: number }} param0
   */
  static RGBToHSL({ red, green, blue }) {
    // Make r, g, and b fractions of 1
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;

    // Find greatest and smallest channel values
    let cmin = Math.min(r, g, b),
      cmax = Math.max(r, g, b),
      delta = cmax - cmin,
      h = 0,
      s = 0,
      l = 0;

    // Calculate hue
    // No difference
    if (delta == 0) h = 0;
    // Red is max
    else if (cmax == r) h = ((g - b) / delta) % 6;
    // Green is max
    else if (cmax == g) h = (b - r) / delta + 2;
    // Blue is max
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    // Make negative hues positive behind 360°
    if (h < 0) h += 360;

    // Calculate lightness
    l = (cmax + cmin) / 2;

    // Calculate saturation
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    // Multiply l and s by 100
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { hue: h, saturation: s, lightness: l };
  }

  /**
   * Convertes between color spaces `[0-360, 0-100, 0-100]` to `[0-255, 0-255, 0-255]`
   * @see {@link https://css-tricks.com/converting-color-spaces-in-javascript/}
   * @param {{hue: number, saturation: number, lightness: number}} param0
   * @returns
   */
  static HSLToRGB({ hue, saturation, lightness }) {
    const h = hue;
    // Must be fractions of 1
    const s = saturation / 100;
    const l = lightness / 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;

    if (0 <= h && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= h && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      g = 0;
      b = x;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return { red: r, green: g, blue: b };
  }
}

/**
 *
 * @param {number} n
 * @param {number} digits
 */
export function roundTo(n, digits) {
  if (digits === undefined) {
    digits = 0;
  }

  var multiplicator = Math.pow(10, digits);
  n = parseFloat((n * multiplicator).toFixed(11));
  var test = Math.round(n) / multiplicator;
  return Number(test.toFixed(digits));
}

/** Returns x clamped to the inclusive range of min and max.
 *
 * @param {number} x
 * @param {number} min
 * @param {number} max
 */
export function clampInt(x, min, max) {
  return Math.clamp(Math.round(x), min, max);
}
