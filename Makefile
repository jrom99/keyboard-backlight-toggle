NAME=keyboard-backlight-toggle
DOMAIN=jrom99.github.com

pack:
	zip $(NAME).zip -9r extension.js utils/* metadata.json

install:
	rm -rf ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)
	mkdir -p ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)
	cp -r extension.js utils metadata.json ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)/

clean:
	rm -rf ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)
