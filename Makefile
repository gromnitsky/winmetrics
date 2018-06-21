target := i686-pc-cygwin
CC := $(target)-gcc
LD := $(target)-ld
AS := $(target)-as
out := _out.$(target)

LDFLAGS := -mwindows -mconsole
CFLAGS := -Wall

mkdir = @mkdir -p $(dir $@)

all: $(addprefix $(out)/, winmetrics cygwin1.dll)

$(out)/winmetrics:  $(out)/main.o
	$(LINK.c) $^ -o $@

$(out)/%.o: %.c
	$(mkdir)
	$(COMPILE.c) $< -o $@

$(out)/cygwin1.dll:
	cp /cygdrive/c/cygwin/bin/cygwin1.dll $@
