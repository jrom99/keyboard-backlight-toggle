# Keyboard Backlight Toggle

This extension replaces the default GNOME quick settings Keyboard toggle with one able to set both lightness and color.

## Requirements

For clevo/tuxedo devices, you'll need to install the drivers from https://gitlab.com/tuxedocomputers/development/packages/tuxedo-drivers.git

You will need `gnome-extensions` and sudo access to install and uninstall.

## Installation

1. **Download:** Download the source code (e.g., as a zip file).
2. **Extract:** Extract the downloaded archive.
3. **Build and Install:** Open your terminal, navigate to the extracted directory, and run `make install`. This will compile the extension and install it.
4. **Enable:** Enable the extension in GNOME Tweaks or GNOME Shell Extensions.

## Uninstallation

Run `make uninstall` in the extracted directory to uninstall the extension and remove the added sudoers entry.

## Note

This extension requires `sudo` access during installation to modify your sudoers file to allow the script to run without password.
The `make install` and `make uninstall` commands will handle this automatically.

**Do not manually edit `/etc/sudoers`**.  Incorrect edits can compromise your system.
