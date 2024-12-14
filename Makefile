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

.PHONY: all pack install uninstall

$(NAME).zip:
	mkdir -p dist
	gnome-extensions pack . --extra-source=utils --out-dir dist --force

pack: $(NAME).zip

install: $(NAME).zip
	rm -rf "$(HOMEDIR)/.local/share/gnome-shell/extensions/$(UUID)"
	gnome-extensions install "$(NAME).zip"
	@echo "Adding kbd-light script to sudoers file $(SUDOERS_FILE)"
	@if ! sudo grep -qF "$(USER) ALL=(ALL:ALL) NOPASSWD: $(SCRIPT)" $(SUDOERS_FILE); then \
	   echo "$(USER) ALL=(ALL:ALL) NOPASSWD: $(SCRIPT)" | sudo tee -a $(SUDOERS_FILE) > /dev/null; \
	fi

uninstall:
	rm -rf dist $(NAME).zip
	gnome-extensions uninstall "$(UUID)"
	@echo "Removing kbd-light script from sudoers file $(SUDOERS_FILE)"
	sudo sed -i.bak "\~$(USER) ALL=(ALL:ALL) NOPASSWD: $(SCRIPT)~d" $(SUDOERS_FILE);
