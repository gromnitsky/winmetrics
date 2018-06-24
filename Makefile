target := i686-pc-cygwin
CC := $(target)-gcc
LD := $(target)-ld
AS := $(target)-as
out := _out.$(target)
cache := $(out)/.cache
app := $(out)/app
cgi-bin := $(app)/cgi-bin

LDFLAGS := -mwindows -mconsole
CFLAGS := -Wall

mkdir = @mkdir -p $(dir $@)
copy = cp $< $@

all: $(addprefix $(cgi-bin)/, choosefont dpi cygwin1.dll) \
	$(addprefix $(app)/, $(wildcard index.* web.*))

define link =
$(mkdir)
$(LINK.c) $^ -o $@
endef

$(cgi-bin)/%: $(cache)/%.o
	$(link)

$(cache)/%.o: %.c
	$(mkdir)
	$(COMPILE.c) $< -o $@

$(cgi-bin)/cygwin1.dll:
	cp /cygdrive/c/cygwin/bin/cygwin1.dll $@

$(app)/%: %
	$(mkdir)
	$(copy)



server: kill all
	node server.js $(app) &

kill:
	-pkill -f 'node.exe. server.js'



$(app)/vendor/node_modules/%: node_modules/%
	$(mkdir)
	$(copy)

all: $(addprefix $(app)/vendor/node_modules/, \
	plain-dialogs/index.mjs)
