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

all: $(addprefix $(cgi-bin)/, choosefont cygwin1.dll) \
	$(addprefix $(app)/, $(wildcard index.* web.js))

$(cgi-bin)/choosefont: $(cache)/choosefont.o
	$(mkdir)
	$(LINK.c) $^ -o $@

$(cache)/%.o: %.c
	$(mkdir)
	$(COMPILE.c) $< -o $@

$(cgi-bin)/cygwin1.dll:
	cp /cygdrive/c/cygwin/bin/cygwin1.dll $@

$(app)/%: %
	$(mkdir)
	cp $< $@



server: kill all
	node server.js $(app) &

kill:
	-pkill -f 'node.exe. server.js'
