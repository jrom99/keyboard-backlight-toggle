import Gio from "gi://Gio";
import GUdev from "gi://GUdev?version=1.0";

import { loadInterfaceXML } from "resource:///org/gnome/shell/misc/fileUtils.js";


const BUS_NAME = "org.gnome.SettingsDaemon.Power";
const OBJECT_PATH = "/org/gnome/SettingsDaemon/Power";


const BrightnessInterface = loadInterfaceXML(
  "org.gnome.SettingsDaemon.Power.Keyboard",
);
const BrightnessProxy = Gio.DBusProxy.makeProxyWrapper(BrightnessInterface);

/**
*
* @param {any} obj
* @returns
*/
export function brightnessProxy(obj) {
  return BrightnessProxy(
    Gio.DBus.session,
    BUS_NAME,
    OBJECT_PATH,
    (proxy, error) => {
      if (error) console.error(error);
      else
        obj._brightnessProxy.connect("g-properties-changed", () =>
          obj._syncBrightness(),
        );
      obj._syncBrightness();
    },
  );
}
