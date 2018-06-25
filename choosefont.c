#include <stdio.h>
#include <stdbool.h>
#include <err.h>

#include <windows.h>

void
dlog(char *fmt, ...) {
  if (!getenv("CHOOSEFONT_DEBUG")) return;

  va_list ap;
  fprintf(stderr, "choosefont: ");
  va_start(ap, fmt);
  vfprintf(stderr, fmt, ap);
  va_end(ap);
  fprintf(stderr, "\n");
}

bool
dlg_font(LOGFONTW *logfont) {
  CHOOSEFONTW cf;
  ZeroMemory(&cf, sizeof(CHOOSEFONT));
  cf.lStructSize = sizeof(CHOOSEFONT); // coredumps if unset
  cf.lpLogFont = logfont;
  cf.hwndOwner = NULL; // exits immediately if unset
  cf.Flags = CF_INITTOLOGFONTSTRUCT | CF_FORCEFONTEXIST | CF_NOSCRIPTSEL;
  return ChooseFontW(&cf);
}

BYTE*
logfont2hex(LOGFONTW *logfont) {
  size_t src_len = sizeof(LOGFONTW);
  BYTE raw[src_len];
  memset(raw, 0x00, src_len);
  memcpy(raw, logfont, src_len);

  size_t dest_len = src_len*2 + 1;
  char *hexx = "0123456789ABCDEF";

  BYTE *dest = malloc(dest_len);
  dest[0] = '\0';

  for (size_t idx = 0; idx < src_len; idx++) {
    dest[idx*2 + 0] = hexx[(raw[idx] >> 4) & 0xf];
    dest[idx*2 + 1] = hexx[(raw[idx]     ) & 0xf];
  }
  dest[dest_len-1] = '\0';
  return dest;
}

uint8_t *
hex2bin(char *src) {
  size_t src_len = strlen(src);
  size_t dest_len = src_len/2 + 1;
  uint8_t * dest = malloc(dest_len);

  for (size_t idx = 0; idx < src_len; ++idx) {
    char c = src[idx];
    uint8_t bin = (c > '9') ? (tolower(c) - 'a' + 10) : (c - '0');
    if (idx % 2 == 0) {
      dest[idx / 2] = bin << 4;
    } else {
      dest[idx / 2] |= bin;
    }
  }
  dest[dest_len-1] = '\0';
  return dest;
}

char *
logfont2str(LOGFONTW *lf) {
  int dest_len = BUFSIZ;
  char *dest = malloc(dest_len);
  snprintf(dest, dest_len, "lfHeight=%ld\n"
	   "\tlfWidth=%ld\n"
	   "\tlfEscapement=%ld\n"
	   "\tlfOrientation=%ld\n"
	   "\tlfWeight=%ld\n"
	   "\tlfItalic=%d\n"
	   "\tlfUnderline=%d\n"
	   "\tlfStrikeOut=%d\n"
	   "\tlfCharSet=%d\n"
	   "\tlfOutPrecision=%d\n"
	   "\tlfClipPrecision=%d\n"
	   "\tlfQuality=%d\n"
	   "\tlfPitchAndFamily=%d\n"
	   "\tlfFaceName=%ls\n",
	   lf->lfHeight,
	   lf->lfWidth,
	   lf->lfEscapement,
	   lf->lfOrientation,
	   lf->lfWeight,
	   lf->lfItalic,
	   lf->lfUnderline,
	   lf->lfStrikeOut,
	   lf->lfCharSet,
	   lf->lfOutPrecision,
	   lf->lfClipPrecision,
	   lf->lfQuality,
	   lf->lfPitchAndFamily,
	   lf->lfFaceName);
    return dest;
}

char*
readline() {
  char *line = NULL;
  size_t line_len = 0;
  if (-1 == getline(&line, &line_len, stdin)) err(1, "getline failure");
  return line;
}

double
font_size(LOGFONTW *lf) {
  HDC hdc = GetDC(GetDesktopWindow());
  DWORD logpixelsy = GetDeviceCaps(hdc, LOGPIXELSY);
  ReleaseDC(GetDesktopWindow(), hdc);

  return -(lf->lfHeight * 72.0) / logpixelsy;
}

void
print_logfont(LOGFONTW *lf) {
  printf("%s,%ls,%ld,%d,%f\n", logfont2hex(lf),
	 lf->lfFaceName, lf->lfWeight, lf->lfItalic, font_size(lf));
}



int main(int argc, char **argv) {
  if (argc > 1) {
    print_logfont((LOGFONTW*)hex2bin(argv[1]));
    return 0;
  }

  char *logfontw, *line = readline();
  if (1 != sscanf(line, "%m[A-F0-9]", &logfontw))
    errx(1, "expected format: [A-F0-9]+");
  free(line);

  LOGFONTW *lf = (LOGFONTW*)hex2bin(logfontw);
  if (!dlg_font(lf)) exit(1);

  print_logfont(lf);
  dlog("%s", logfont2str(lf));

  return 0;
}
