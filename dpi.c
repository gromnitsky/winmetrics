// Win8.1+

#include <stdio.h>
#include <err.h>
#include <windows.h>

// https://msdn.microsoft.com/en-us/library/windows/desktop/dn280510.aspx
HRESULT (WINAPI* pGetDpiForMonitor)(HMONITOR, int, uint*, uint*) = 0;

void
fn_load() {
  HMODULE lib = LoadLibrary("shcore.dll");
  if (!lib) errx(1, "failed to load shcore.dll");
  pGetDpiForMonitor = (void *)GetProcAddress(lib, "GetDpiForMonitor");
}

int main() {
  fn_load(); // for cygwin 2.10.0 doesn't GetDpiForMonitor() it by default

  HMONITOR mon = MonitorFromWindow(GetDesktopWindow(), MONITOR_DEFAULTTONEAREST);
  uint _, dpi;
  pGetDpiForMonitor(mon, 0, &_, &dpi);
  printf("%d\n", dpi);

  return 0;
}
