#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#include <libgen.h>
#include <stdbool.h>

#include <windows.h>

void
errx(char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  char s[BUFSIZ];

  vsnprintf(s, BUFSIZ, fmt, ap);
  MessageBox(NULL, s, "winmetrics error", MB_OK | MB_ICONSTOP);
  exit(1);
}

void
dlog(char *fmt, ...) {
  if (!getenv("WINMETRICS_DEBUG")) return;

  va_list ap;
  fprintf(stderr, "winmetrics: ");
  va_start(ap, fmt);
  vfprintf(stderr, fmt, ap);
  va_end(ap);
  fprintf(stderr, "\n");
}

bool
dlg_font(LOGFONT *logfont) {
  CHOOSEFONT cf;
  ZeroMemory(&cf, sizeof(CHOOSEFONT));
  cf.lStructSize = sizeof(CHOOSEFONT); // coredumps if unset
  cf.lpLogFont = logfont;
  cf.hwndOwner = NULL; // exits immediately if unset
  cf.Flags = CF_SCREENFONTS | CF_INITTOLOGFONTSTRUCT | CF_FORCEFONTEXIST | CF_NOSCRIPTSEL;
  return ChooseFont(&cf);
}

char*
logfont2hex(LOGFONT *logfont) {
  size_t src_len = sizeof(LOGFONT);
  unsigned char raw[src_len];
  memset(raw, 0x00, src_len);
  memcpy(raw, logfont, src_len);

  size_t dest_len = src_len*2 + 1;
  char *hexx = "0123456789ABCDEF";

  char *dest = malloc(dest_len);
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
logfont2str(LOGFONT *lf) {
  static const char template[] = "%d,%d,%d,%d,%d,%u,%u,%u,%u,%u,%u,%u,%u,%s";
  int dest_len = 10*13 + LF_FACESIZE + 1;
  char *dest = malloc(dest_len);
  snprintf(dest, dest_len, template,
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



int main(int argc, char **argv) {
  if (argc != 4) errx("Usage: %s logfont height width", basename(argv[0]));

  LOGFONT *lf = (LOGFONT*)hex2bin(argv[1]);
  if (!dlg_font(lf)) exit(1);

  //fwrite(&lf, 1, sizeof(lf), stdout);
  printf("%s\n", logfont2hex(lf));
  dlog("%s", logfont2str(lf));

  return 0;
}
