target := i686-pc-cygwin
CC := $(target)-gcc
LD := $(target)-ld
AS := $(target)-as
LDFLAGS := -mwindows -mconsole
CFLAGS := -Wall

out := _out.$(target)
cache := $(out)/.cache
server := $(out)/app
client := $(server)/client
cgi-bin := $(server)/cgi-bin

mkdir = @mkdir -p $(dir $@)
copy = cp $< $@

node := $(server)/node.exe
node_modules := $(server)/package.json

all := $(node) \
	$(addprefix $(cgi-bin)/, choosefont dpi cygwin1.dll) \
	$(addprefix $(server)/, server.js runme.js) \
	$(addprefix $(client)/, index.html web.js square.svg)

all: $(all)

include $(cache)/.node_modules
$(cache)/.node_modules: package.json $(node)
	$(mkdir)
	cp $< $(server)
	cd $(server) && npm i --no-package-lock --no-bin-links --only=prod --no-audit
	touch $@

# 32bit
$(node): ../vendor/node-v10.6.0-win-x86/node.exe
	$(mkdir)
	$(copy)
	chmod +x $@

$(cgi-bin)/%: $(cache)/%.o
	$(mkdir)
	$(LINK.c) $^ -o $@

$(cache)/%.o: %.c
	$(mkdir)
	$(COMPILE.c) $< -o $@

# i686
$(cgi-bin)/cygwin1.dll:
	cp /cygdrive/c/cygwin/bin/cygwin1.dll $@

vendor.src := $(shell adieu -pe '$$("link,script").map((_,e) => $$(e).attr("href") || $$(e).attr("src")).get().filter(v => /node_modules/.test(v)).join`\n`' index.html)
vendor.dest := $(addprefix $(client)/, $(vendor.src))

$(client)/node_modules/%: $(server)/node_modules/%
	$(mkdir)
	$(copy)

all: $(vendor.dest)

$(client)/%: %
	$(mkdir)
	$(copy)

$(server)/%: %
	$(mkdir)
	$(copy)



server: kill all
	cd $(server) && ./node server.js . &

kill:
	-pkill -f 'node.exe server.js'



zip := $(out)/$(shell json -ad- name version < package.json).zip

$(zip): $(all)
	$(mkdir)
	cd $(server) && zip $(CURDIR)/$@ -qr *

zip: $(zip)
