NAME := keyboard-backlight-toggle
DOMAIN := jrom99.github.com
USER := $(shell whoami)
HOMEDIR := $(shell echo $$HOME)
SUDOERS_FILE := /etc/sudoers

ifeq ($(USER), root)
$(error This Makefile cannot be run as root)
endif

install: uninstall
	mkdir -p "$(HOMEDIR)/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)"
	cp -r extension.js utils metadata.json "$(HOMEDIR)/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)/"
	@echo "Adding kbd-light script to sudoers file $(SUDOERS_FILE)"
	@if ! sudo grep -qF "$(USER) ALL=(ALL:ALL) NOPASSWD: $(HOMEDIR)/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)/utils/kbd-light" $(SUDOERS_FILE); then \
		echo "$(USER) ALL=(ALL:ALL) NOPASSWD: $(HOMEDIR)/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)/utils/kbd-light" | sudo tee -a $(SUDOERS_FILE) > /dev/null; \
	fi

uninstall:
	rm -rf "$(HOMEDIR)/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)"
	@echo "Removing kbd-light script from sudoers $(SUDOERS_FILE)"
	sudo sed -i.bak "\~$(USER) ALL=(ALL:ALL) NOPASSWD: $(HOMEDIR)/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)/utils/kbd-light~d" $(SUDOERS_FILE);
