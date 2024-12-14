NAME := keyboard-backlight-toggle
DOMAIN := jrom99.github.com
USER := $(shell whoami)
HOMEDIR := $(shell echo $$HOME)
SUDOERS_FILE := /etc/sudoers
UUID := $(NAME)@$(DOMAIN)
SCRIPT := $(HOMEDIR)/.local/share/gnome-shell/extensions/$(UUID)/utils/kbd-light

ifeq ($(USER), root)
$(error This Makefile cannot be run as root)
endif

.PHONY: all install uninstall

install:
	mkdir -p dist
	gnome-extensions pack . --extra-source=utils --out-dir dist --force
	rm -rf "$(HOMEDIR)/.local/share/gnome-shell/extensions/$(UUID)"
	gnome-extensions install "dist/$(UUID).shell-extension.zip"
	@echo "Adding kbd-light script to sudoers file $(SUDOERS_FILE)"
	@if ! sudo grep -qF "$(USER) ALL=(ALL:ALL) NOPASSWD: $(SCRIPT)" $(SUDOERS_FILE); then \
	   echo "$(USER) ALL=(ALL:ALL) NOPASSWD: $(SCRIPT)" | sudo tee -a $(SUDOERS_FILE) > /dev/null; \
	fi

uninstall:
	rm -rf dist "$(HOMEDIR)/.local/share/gnome-shell/extensions/$(UUID)"
	@echo "Removing kbd-light script from sudoers file $(SUDOERS_FILE)"
	sudo sed -i.bak "\~$(USER) ALL=(ALL:ALL) NOPASSWD: $(SCRIPT)~d" $(SUDOERS_FILE);
